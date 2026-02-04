import { supabaseServiceClient } from '../config/supabase';
import { addEmailToQueue } from '../queues/emailQueue';
import { logger } from '../utils/logger';

/**
 * Re-queue all pending/scheduled emails on server restart
 * This ensures emails are still sent after a restart
 * 
 * PERSISTENCE GUARANTEE:
 * - Emails are stored in PostgreSQL (Supabase)
 * - On restart, we scan for pending emails and re-add to BullMQ
 * - Idempotency keys prevent duplicate jobs
 */
export const requeuePendingEmails = async (): Promise<void> => {
  try {
    logger.info('🔄 Checking for pending emails to requeue...');

    // Get all pending/scheduled emails from Supabase
    const { data: pendingEmails, error } = await supabaseServiceClient
      .from('emails')
      .select('*')
      .in('status', ['SCHEDULED', 'RETRYING'])
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true });

    if (error) {
      // Table might not exist yet - that's okay
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        logger.info('ℹ️  Emails table not found, skipping requeue (run database migrations first)');
        return;
      }
      logger.warn('⚠️  Failed to fetch pending emails:', error.message);
      return;
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      logger.info('✅ No pending emails to requeue');
      return;
    }

    logger.info(`📧 Found ${pendingEmails.length} pending emails to requeue`);

    let requeuedCount = 0;
    let skippedCount = 0;

    for (const email of pendingEmails) {
      try {
        // Check if email is still in the future
        if (new Date(email.scheduled_at) < new Date()) {
          logger.warn(
            `⚠️  Skipping past email ${email.id} scheduled for ${email.scheduled_at}`
          );
          skippedCount++;
          
          // Update status to FAILED
          await supabaseServiceClient
            .from('emails')
            .update({
              status: 'FAILED',
              error_message: 'Email scheduled time has passed during server restart',
              updated_at: new Date().toISOString(),
            })
            .eq('id', email.id);
          
          continue;
        }

        // Add to queue with idempotency key
        const jobId = await addEmailToQueue(
          {
            emailId: email.id,
            senderId: email.sender_id,
            recipientEmail: email.recipient_email,
            recipientName: email.recipient_name || undefined,
            subject: email.subject,
            body: email.body,
            htmlBody: email.html_body || undefined,
            attemptCount: 0,
          },
          new Date(email.scheduled_at),
          email.idempotency_key || email.id
        );

        requeuedCount++;
        logger.info(`✅ Requeued email ${email.id} with job ${jobId}`);
      } catch (error: any) {
        // If job already exists (duplicate), just log and continue
        if (error.message?.includes('already exists')) {
          logger.info(`ℹ️  Email ${email.id} already in queue, skipping`);
          skippedCount++;
        } else {
          logger.error(`❌ Failed to requeue email ${email.id}:`, error);
        }
      }
    }

    logger.info(
      `✅ Requeue complete: ${requeuedCount} requeued, ${skippedCount} skipped`
    );
  } catch (error) {
    logger.error('❌ Failed to requeue pending emails:', error);
    // Don't throw - we don't want to prevent server startup
  }
};
