import { Queue } from 'bullmq';
import redis from '../config/redis';
import { logger } from '../utils/logger';

export interface EmailJobData {
  emailId: string;
  senderId: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  body: string;
  htmlBody?: string;
  attemptCount: number;
}

// BullMQ Queue Configuration
export const emailQueue = new Queue<EmailJobData>('email-queue', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

// Queue event listeners
emailQueue.on('error', (error) => {
  logger.error('❌ Email queue error:', error);
});

emailQueue.on('waiting', (jobId) => {
  logger.info(`⏳ Job ${jobId} is waiting`);
});

emailQueue.on('active' as any, (job: any) => {
  logger.info(`🔄 Job ${job.id} is now active`);
});

emailQueue.on('completed' as any, (job: any) => {
  logger.info(`✅ Job ${job.id} completed successfully`);
});

emailQueue.on('failed' as any, (job: any, error: any) => {
  logger.error(`❌ Job ${job?.id} failed:`, error);
});

/**
 * Add an email to the queue with delay
 * @param emailData - Email job data
 * @param scheduledAt - When to send the email
 * @param idempotencyKey - Unique key to prevent duplicate jobs
 */
export const addEmailToQueue = async (
  emailData: EmailJobData,
  scheduledAt: Date,
  idempotencyKey?: string
): Promise<string> => {
  try {
    const delay = Math.max(0, new Date(scheduledAt).getTime() - Date.now());
    
    const job = await emailQueue.add(
      'send-email',
      emailData,
      {
        delay,
        jobId: idempotencyKey, // Use idempotency key as job ID to prevent duplicates
        priority: 1,
      }
    );

    logger.info(`📧 Email job added to queue: ${job.id} with delay ${delay}ms`);
    return job.id as string;
  } catch (error) {
    logger.error('❌ Failed to add email to queue:', error);
    throw error;
  }
};

/**
 * Remove a job from the queue
 */
export const removeEmailFromQueue = async (jobId: string): Promise<void> => {
  try {
    const job = await emailQueue.getJob(jobId);
    if (job) {
      await job.remove();
      logger.info(`🗑️  Job ${jobId} removed from queue`);
    }
  } catch (error) {
    logger.error(`❌ Failed to remove job ${jobId}:`, error);
    throw error;
  }
};

/**
 * Get queue metrics
 */
export const getQueueMetrics = async () => {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      emailQueue.getWaitingCount(),
      emailQueue.getActiveCount(),
      emailQueue.getCompletedCount(),
      emailQueue.getFailedCount(),
      emailQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed,
    };
  } catch (error) {
    logger.error('❌ Failed to get queue metrics:', error);
    throw error;
  }
};

/**
 * Graceful shutdown
 */
export const closeQueue = async (): Promise<void> => {
  try {
    await emailQueue.close();
    logger.info('✅ Email queue closed successfully');
  } catch (error) {
    logger.error('❌ Failed to close email queue:', error);
    throw error;
  }
};

export default emailQueue;
