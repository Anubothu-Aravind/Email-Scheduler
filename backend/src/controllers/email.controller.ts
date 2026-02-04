import { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';
import * as EmailService from '../services/email.service';
import * as EmailLogService from '../services/emailLog.service';
import * as SenderService from '../services/sender.service';
import { addEmailToQueue } from '../queues/emailQueue';

// Validation schemas
const scheduleEmailSchema = z.object({
  senderId: z.string().uuid(),
  recipientEmail: z.string().email(),
  recipientName: z.string().optional(),
  subject: z.string().min(1),
  body: z.string().min(1),
  htmlBody: z.string().optional(),
  scheduledAt: z.string().datetime(),
  idempotencyKey: z.string().optional(),
});

const createSenderSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().int().positive().optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
});

const updateSenderSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().int().positive().optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
});


export const scheduleEmailController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const data = scheduleEmailSchema.parse(req.body);

    
    const sender = await SenderService.getSenderById(data.senderId, userId);

    if (!sender) {
      res.status(403).json({ error: 'Sender not found or access denied' });
      return;
    }

    
    if (data.idempotencyKey) {
      const existingEmail = await EmailService.getEmailByIdempotencyKey(data.idempotencyKey);
      if (existingEmail) {
        res.status(200).json({
          message: 'Email already scheduled',
          email: existingEmail,
        });
        return;
      }
    }

    // Create email
    const email = await EmailService.createEmail({
      ...data,
    });

    logger.info(`📧 Email created in DB: ${email.id}, scheduling for: ${email.scheduledAt}`);

    // Add email to BullMQ queue with delay
    try {
      const jobId = await addEmailToQueue(
        {
          emailId: email.id,
          senderId: email.senderId,
          recipientEmail: email.recipientEmail,
          recipientName: email.recipientName || undefined,
          subject: email.subject,
          body: email.body,
          htmlBody: email.htmlBody || undefined,
          attemptCount: 0,
        },
        new Date(email.scheduledAt),
        email.idempotencyKey || undefined
      );
      logger.info(`📧 Email added to queue with job ID: ${jobId}`);
    } catch (queueError: any) {
      logger.error(`❌ Failed to add email to queue:`, queueError);
      // Email is created but queue failed - still return success but log warning
      logger.warn(`⚠️ Email ${email.id} created but queue scheduling may have failed`);
    }

    await EmailLogService.createEmailLog({
      emailId: email.id,
      status: 'SCHEDULED',
      message: 'Email scheduled successfully',
    });

    logger.info(`✅ Email scheduled: ${email.id}`);

    res.status(201).json({
      success: true,
      message: 'Email scheduled successfully',
      data: { email },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('❌ Schedule email error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to schedule email' });
  }
};


export const getEmailsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { senderId, status, limit = '50', offset = '0' } = req.query;

    
    const statusArray = status ? (status as string).split(',').map(s => s.trim().toUpperCase()) : undefined;

    let allEmails: EmailService.Email[] = [];

    if (senderId) {
      
      const sender = await SenderService.getSenderById(senderId as string, userId);
      if (!sender) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
      
      if (statusArray && statusArray.length > 0) {
       
        for (const stat of statusArray) {
          const emails = await EmailService.getEmailsBySenderId(senderId as string, {
            status: stat as EmailService.EmailStatus,
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
          });
          allEmails = [...allEmails, ...emails];
        }
      } else {
        allEmails = await EmailService.getEmailsBySenderId(senderId as string, {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        });
      }
    } else {
      if (statusArray && statusArray.length > 0) {
       
        for (const stat of statusArray) {
          const emails = await EmailService.getEmailsByUserId(userId, {
            status: stat as EmailService.EmailStatus,
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
          });
          allEmails = [...allEmails, ...emails];
        }
      } else {
        allEmails = await EmailService.getEmailsByUserId(userId, {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        });
      }
    }

    
    allEmails.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

    res.json({
      success: true,
      data: {
        data: allEmails,
        total: allEmails.length,
        page: 1,
        pageSize: parseInt(limit as string),
      },
    });
  } catch (error: any) {
    logger.error('❌ Get emails error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get emails' });
  }
};


export const getEmailController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { emailId } = req.params;

    const email = await EmailService.getEmailById(emailId);

    if (!email) {
      res.status(404).json({ error: 'Email not found' });
      return;
    }

    
    const sender = await SenderService.getSenderById(email.senderId, userId);
    if (!sender) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    
    const logs = await EmailLogService.getEmailLogs(emailId);

    res.json({
      email,
      logs,
    });
  } catch (error: any) {
    logger.error('❌ Get email error:', error);
    res.status(500).json({ error: 'Failed to get email' });
  }
};


export const cancelEmailController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { emailId } = req.params;

    const email = await EmailService.getEmailById(emailId);

    if (!email) {
      res.status(404).json({ error: 'Email not found' });
      return;
    }

    
    const sender = await SenderService.getSenderById(email.senderId, userId);
    if (!sender) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    
    await EmailService.deleteEmail(emailId);

    
    await EmailLogService.createEmailLog({
      emailId,
      status: 'CANCELLED',
      message: 'Email cancelled',
    });

    logger.info(`✅ Email cancelled: ${emailId}`);

    res.json({
      message: 'Email cancelled successfully',
    });
  } catch (error: any) {
    logger.error('❌ Cancel email error:', error);
    res.status(500).json({ error: 'Failed to cancel email' });
  }
};


export const createSenderController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const data = createSenderSchema.parse(req.body);

    const sender = await SenderService.createSender({
      ...data,
      userId,
    });

    logger.info(`✅ Sender created: ${sender.id}`);

    res.status(201).json({
      message: 'Sender created successfully',
      sender,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('❌ Create sender error:', error);
    res.status(500).json({ error: 'Failed to create sender' });
  }
};


export const getSendersController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      logger.error('❌ Get senders error: User ID not found in request');
      logger.error('Request headers:', req.headers);
      logger.error('User object:', (req as any).user);
      res.status(401).json({ 
        success: false, 
        error: 'User not authenticated',
        message: 'Please login again. Your session may have expired.'
      });
      return;
    }

    logger.info(`📧 Fetching senders for user: ${userId}`);
    
    try {
      const senders = await SenderService.getSendersByUserId(userId);
      logger.info(`✅ Found ${senders.length} senders for user: ${userId}`);
      
      res.json({
        success: true,
        data: {
          senders,
          count: senders.length,
        },
      });
    } catch (dbError: any) {
      logger.error('❌ Database error fetching senders:', dbError);
      res.status(500).json({ 
        success: false, 
        error: 'Database error',
        message: 'Failed to fetch senders from database. Please check database connection.',
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }
  } catch (error: any) {
    logger.error('❌ Get senders error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get senders',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};


export const updateSenderController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { senderId } = req.params;
    const data = updateSenderSchema.parse(req.body);

    // Verify sender belongs to user
    const sender = await SenderService.getSenderById(senderId, userId);
    if (!sender) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const updatedSender = await SenderService.updateSender(senderId, userId, data);

    logger.info(`✅ Sender updated: ${senderId}`);

    res.json({
      message: 'Sender updated successfully',
      sender: updatedSender,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('❌ Update sender error:', error);
    res.status(500).json({ error: 'Failed to update sender' });
  }
};


export const deleteSenderController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { senderId } = req.params;

    // Verify sender belongs to user
    const sender = await SenderService.getSenderById(senderId, userId);
    if (!sender) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    await SenderService.deleteSender(senderId, userId);

    logger.info(`✅ Sender deleted: ${senderId}`);

    res.json({
      message: 'Sender deleted successfully',
    });
  } catch (error: any) {
    logger.error('❌ Delete sender error:', error);
    res.status(500).json({ error: 'Failed to delete sender' });
  }
};


export const getEmailStatsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user.userId;

    // Get all emails for the user
    const allEmails = await EmailService.getEmailsByUserId(userId, { limit: 10000 });

    // Count by status (using DB constraint values: SCHEDULED, SENT, FAILED, RETRYING)
    const stats = {
      totalScheduled: allEmails.filter(e => ['SCHEDULED', 'RETRYING'].includes(e.status)).length,
      totalSent: allEmails.filter(e => e.status === 'SENT').length,
      totalFailed: allEmails.filter(e => e.status === 'FAILED').length,
      pendingToday: allEmails.filter(e => {
        if (!['SCHEDULED', 'RETRYING'].includes(e.status)) return false;
        const today = new Date();
        const emailDate = new Date(e.scheduledAt);
        return emailDate.toDateString() === today.toDateString();
      }).length,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('❌ Get email stats error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get stats' });
  }
};
