import { Worker, Job } from 'bullmq';
import redis from '../config/redis';
import { EmailJobData } from '../queues/emailQueue';
import { sendEmail, createMailTransporter } from '../config/mailer';
import { supabaseServiceClient } from '../config/supabase';
import { logger } from '../utils/logger';
import { checkRateLimit, incrementRateLimit } from '../services/rateLimit.service';

// Worker concurrency from environment (configurable)
const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '5');
// Minimum delay between emails (to mimic provider throttling)
const MIN_DELAY_MS = parseInt(process.env.MIN_DELAY_BETWEEN_EMAILS_MS || '2000');

/**
 * Email worker - processes email jobs from the queue
 * 
 * Features:
 * - Configurable concurrency (WORKER_CONCURRENCY env var)
 * - Minimum delay between sends (MIN_DELAY_BETWEEN_EMAILS_MS env var)
 * - Per-sender rate limiting (MAX_EMAILS_PER_HOUR_PER_SENDER env var)
 * - Automatic retry with exponential backoff
 * - Rate limit rescheduling to next hour window
 */
export const emailWorker = new Worker<EmailJobData>(
  'email-queue',
  async (job: Job<EmailJobData>) => {
    const { emailId, senderId, recipientEmail, subject, body, htmlBody } = job.data;
    
    logger.info(`🔄 Processing email job ${job.id} for email ${emailId}`);

    try {
      // 1. Check rate limit before sending
      const rateLimitStatus = await checkRateLimit(senderId);
      
      if (!rateLimitStatus.allowed) {
        logger.warn(
          `⚠️  Rate limit reached for sender ${senderId}. ` +
          `${rateLimitStatus.current}/${rateLimitStatus.limit} emails sent this hour.`
        );
        
        // Reschedule to next hour - throw error to trigger backoff
        throw new Error(
          `RATE_LIMITED: ${rateLimitStatus.current}/${rateLimitStatus.limit} emails sent. ` +
          `Next window: ${rateLimitStatus.nextWindow}`
        );
      }

      // 2. Update email status to RETRYING (processing)
      await supabaseServiceClient
        .from('emails')
        .update({ 
          status: 'RETRYING',
          updated_at: new Date().toISOString() 
        })
        .eq('id', emailId);

      // 3. Get sender SMTP details from Supabase
      const { data: sender } = await supabaseServiceClient
        .from('senders')
        .select('*')
        .eq('id', senderId)
        .single();

      if (!sender) {
        throw new Error(`Sender ${senderId} not found`);
      }

      // 4. Add minimum delay between emails (throttling)
      if (MIN_DELAY_MS > 0) {
        logger.info(`⏱️  Waiting ${MIN_DELAY_MS}ms before sending (throttle delay)`);
        await new Promise(resolve => setTimeout(resolve, MIN_DELAY_MS));
      }

      // 5. Create transporter with sender's SMTP config or use default Ethereal
      const transporter = createMailTransporter({
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.ETHEREAL_USER || '',
          pass: process.env.ETHEREAL_PASS || '',
        },
      });

      // 6. Send the email via Ethereal
      const info = await sendEmail(
        {
          from: `"${sender.name || 'Email Scheduler'}" <${sender.email}>`,
          to: recipientEmail,
          subject: subject,
          text: body,
          html: htmlBody || body,
        },
        transporter
      );

      // 7. Update email status to SENT
      await supabaseServiceClient
        .from('emails')
        .update({
          status: 'SENT',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', emailId);

      // 8. Create email log entry
      await supabaseServiceClient
        .from('email_logs')
        .insert({
          email_id: emailId,
          status: 'SENT',
          message: `Email sent successfully. Message ID: ${info.messageId}`,
          attempted_at: new Date().toISOString(),
        });

      // 9. Increment rate limit counter
      await incrementRateLimit(senderId);

      logger.info(`✅ Email ${emailId} sent successfully to ${recipientEmail}`);
      
      return { success: true, emailId, messageId: info.messageId };
    } catch (error: any) {
      logger.error(`❌ Failed to send email ${emailId}:`, error);
      
      // Update email status based on error type
      if (error.message?.startsWith('RATE_LIMITED')) {
        // Mark as RETRYING for retry in next hour
        await supabaseServiceClient
          .from('emails')
          .update({
            status: 'RETRYING',
            error_message: error.message,
            updated_at: new Date().toISOString(),
          })
          .eq('id', emailId);
      } else {
        // Mark as FAILED for other errors
        await supabaseServiceClient
          .from('emails')
          .update({
            status: 'FAILED',
            error_message: error.message,
            updated_at: new Date().toISOString(),
          })
          .eq('id', emailId);

        // Log the failure
        await supabaseServiceClient
          .from('email_logs')
          .insert({
            email_id: emailId,
            status: 'FAILED',
            message: `Send failed: ${error.message}`,
            attempted_at: new Date().toISOString(),
          });
      }
      
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: WORKER_CONCURRENCY,
    // BullMQ limiter: Max jobs per duration (additional safety layer)
    limiter: {
      max: 10, // Max 10 jobs processed
      duration: 1000, // per second
    },
    settings: {
      // Custom backoff strategy for rate limiting
      backoffStrategy: (attemptsMade: number, err: any) => {
        // If rate limited, delay until next hour
        if (err?.message?.startsWith('RATE_LIMITED')) {
          const now = new Date();
          const nextHour = new Date(now);
          nextHour.setHours(now.getHours() + 1, 0, 0, 0);
          const delay = nextHour.getTime() - now.getTime();
          logger.info(`⏰ Rate limited - rescheduling for next hour (${delay}ms delay)`);
          return delay;
        }
        
        // Exponential backoff for other errors (max 1 minute)
        return Math.min(Math.pow(2, attemptsMade) * 1000, 60000);
      },
    },
  }
);

// Worker event listeners
emailWorker.on('ready', () => {
  logger.info(`🚀 Email worker started with concurrency: ${WORKER_CONCURRENCY}`);
});

emailWorker.on('active', (job) => {
  logger.info(`🔄 Worker processing job ${job.id}`);
});

emailWorker.on('completed', (job) => {
  logger.info(`✅ Worker completed job ${job.id}`);
});

emailWorker.on('failed', (job, error) => {
  logger.error(`❌ Worker failed job ${job?.id}:`, error.message);
});

emailWorker.on('error', (error) => {
  logger.error('❌ Worker error:', error);
});

// Graceful shutdown
export const closeWorker = async (): Promise<void> => {
  try {
    await emailWorker.close();
    logger.info('✅ Email worker closed successfully');
  } catch (error) {
    logger.error('❌ Failed to close email worker:', error);
    throw error;
  }
};

// Start worker if this file is run directly
if (require.main === module) {
  logger.info('🚀 Starting email worker as standalone process...');
  
  process.on('SIGTERM', async () => {
    logger.info('⚠️  SIGTERM received, closing worker...');
    await closeWorker();
    process.exit(0);
  });
  
  process.on('SIGINT', async () => {
    logger.info('⚠️  SIGINT received, closing worker...');
    await closeWorker();
    process.exit(0);
  });
}

export default emailWorker;
