import { Request, Response } from 'express';
import { supabaseServiceClient } from '../config/supabase';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';


const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const updateUserSchema = z.object({
  full_name: z.string().optional(),
  email: z.string().email().optional(),
});

// Sender schemas
const createSenderSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  is_default: z.boolean().optional().default(false),
});

const updateSenderSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  is_default: z.boolean().optional(),
});

// Email schemas
const createEmailSchema = z.object({
  sender_id: z.string().uuid(),
  recipient_email: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  scheduled_time: z.string().datetime(),
  idempotency_key: z.string().optional(),
});

const updateEmailSchema = z.object({
  recipient_email: z.string().email().optional(),
  subject: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  scheduled_time: z.string().datetime().optional(),
  status: z.enum(['pending', 'scheduled', 'sent', 'failed', 'cancelled']).optional(),
});

// Email Log schemas
const createEmailLogSchema = z.object({
  email_id: z.string().uuid(),
  status: z.string().optional(),
  message: z.string().optional(),
});


export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, full_name } = registerSchema.parse(req.body);

    
    const { data: existingUser } = await supabaseServiceClient
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    
    const password_hash = await bcrypt.hash(password, 10);

    
    const { data: user, error } = await supabaseServiceClient
      .from('users')
      .insert({
        email,
        password_hash,
        full_name,
      })
      .select('id, email, full_name, created_at')
      .single();

    if (error) {
      logger.error('❌ Registration error:', error);
      res.status(500).json({ error: 'Registration failed', details: error.message });
      return;
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    logger.info(`✅ User registered: ${email}`);

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('❌ Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};


export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Find user
    const { data: user, error } = await supabaseServiceClient
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    logger.info(`✅ User logged in: ${email}`);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        created_at: user.created_at,
      },
      token,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('❌ Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};


export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;

    const { data: user, error } = await supabaseServiceClient
      .from('users')
      .select('id, email, full_name, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    logger.error('❌ Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};


export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const updateData = updateUserSchema.parse(req.body);

    const { data: user, error } = await supabaseServiceClient
      .from('users')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('id, email, full_name, created_at, updated_at')
      .single();

    if (error) {
      res.status(500).json({ error: 'Failed to update profile', details: error.message });
      return;
    }

    res.json({
      message: 'Profile updated successfully',
      user,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('❌ Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};


export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;

    const { error } = await supabaseServiceClient
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      res.status(500).json({ error: 'Failed to delete account', details: error.message });
      return;
    }

    logger.info(`✅ User account deleted: ${userId}`);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    logger.error('❌ Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};


export const getAllUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { data: users, error } = await supabaseServiceClient
      .from('users')
      .select('id, email, full_name, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: 'Failed to fetch users', details: error.message });
      return;
    }

    res.json({ users, count: users?.length || 0 });
  } catch (error) {
    logger.error('❌ Get all users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};


export const createSender = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const data = createSenderSchema.parse(req.body);

    // If this sender is set as default, unset other defaults
    if (data.is_default) {
      await supabaseServiceClient
        .from('senders')
        .update({ is_default: false })
        .eq('user_id', userId);
    }

    const { data: sender, error } = await supabaseServiceClient
      .from('senders')
      .insert({
        user_id: userId,
        ...data,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        res.status(400).json({ error: 'Sender with this email already exists for this user' });
        return;
      }
      res.status(500).json({ error: 'Failed to create sender', details: error.message });
      return;
    }

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


export const getSenders = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;

    const { data: senders, error } = await supabaseServiceClient
      .from('senders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: 'Failed to fetch senders', details: error.message });
      return;
    }

    res.json({ senders, count: senders?.length || 0 });
  } catch (error) {
    logger.error('❌ Get senders error:', error);
    res.status(500).json({ error: 'Failed to fetch senders' });
  }
};


export const getSenderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { senderId } = req.params;

    const { data: sender, error } = await supabaseServiceClient
      .from('senders')
      .select('*')
      .eq('id', senderId)
      .eq('user_id', userId)
      .single();

    if (error || !sender) {
      res.status(404).json({ error: 'Sender not found' });
      return;
    }

    res.json({ sender });
  } catch (error) {
    logger.error('❌ Get sender error:', error);
    res.status(500).json({ error: 'Failed to fetch sender' });
  }
};


export const updateSender = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { senderId } = req.params;
    const updateData = updateSenderSchema.parse(req.body);

    // Verify sender belongs to user
    const { data: existingSender } = await supabaseServiceClient
      .from('senders')
      .select('id')
      .eq('id', senderId)
      .eq('user_id', userId)
      .single();

    if (!existingSender) {
      res.status(404).json({ error: 'Sender not found' });
      return;
    }

    // If setting as default, unset other defaults
    if (updateData.is_default) {
      await supabaseServiceClient
        .from('senders')
        .update({ is_default: false })
        .eq('user_id', userId)
        .neq('id', senderId);
    }

    const { data: sender, error } = await supabaseServiceClient
      .from('senders')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', senderId)
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: 'Failed to update sender', details: error.message });
      return;
    }

    res.json({
      message: 'Sender updated successfully',
      sender,
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


export const deleteSender = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { senderId } = req.params;

    // Verify sender belongs to user
    const { data: existingSender } = await supabaseServiceClient
      .from('senders')
      .select('id')
      .eq('id', senderId)
      .eq('user_id', userId)
      .single();

    if (!existingSender) {
      res.status(404).json({ error: 'Sender not found' });
      return;
    }

    const { error } = await supabaseServiceClient
      .from('senders')
      .delete()
      .eq('id', senderId);

    if (error) {
      res.status(500).json({ error: 'Failed to delete sender', details: error.message });
      return;
    }

    logger.info(`✅ Sender deleted: ${senderId}`);

    res.json({ message: 'Sender deleted successfully' });
  } catch (error) {
    logger.error('❌ Delete sender error:', error);
    res.status(500).json({ error: 'Failed to delete sender' });
  }
};


export const createEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const data = createEmailSchema.parse(req.body);

    // Verify sender belongs to user
    const { data: sender } = await supabaseServiceClient
      .from('senders')
      .select('id')
      .eq('id', data.sender_id)
      .eq('user_id', userId)
      .single();

    if (!sender) {
      res.status(403).json({ error: 'Sender not found or access denied' });
      return;
    }

    // Check for duplicate idempotency key
    if (data.idempotency_key) {
      const { data: existingEmail } = await supabaseServiceClient
        .from('emails')
        .select('id')
        .eq('idempotency_key', data.idempotency_key)
        .single();

      if (existingEmail) {
        res.status(409).json({ error: 'Email with this idempotency key already exists' });
        return;
      }
    }

    const { data: email, error } = await supabaseServiceClient
      .from('emails')
      .insert({
        user_id: userId,
        ...data,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: 'Failed to create email', details: error.message });
      return;
    }

    logger.info(`✅ Email scheduled: ${email.id}`);

    res.status(201).json({
      message: 'Email scheduled successfully',
      email,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('❌ Create email error:', error);
    res.status(500).json({ error: 'Failed to schedule email' });
  }
};


export const getEmails = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { status, sender_id, limit = '100', offset = '0' } = req.query;

    let query = supabaseServiceClient
      .from('emails')
      .select('*, senders(id, email, name)')
      .eq('user_id', userId)
      .order('scheduled_time', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status) {
      query = query.eq('status', status as string);
    }

    if (sender_id) {
      query = query.eq('sender_id', sender_id as string);
    }

    const { data: emails, error } = await query;

    if (error) {
      res.status(500).json({ error: 'Failed to fetch emails', details: error.message });
      return;
    }

    res.json({ emails, count: emails?.length || 0 });
  } catch (error) {
    logger.error('❌ Get emails error:', error);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
};


export const getEmailById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { emailId } = req.params;

    const { data: email, error } = await supabaseServiceClient
      .from('emails')
      .select('*, senders(id, email, name)')
      .eq('id', emailId)
      .eq('user_id', userId)
      .single();

    if (error || !email) {
      res.status(404).json({ error: 'Email not found' });
      return;
    }

    res.json({ email });
  } catch (error) {
    logger.error('❌ Get email error:', error);
    res.status(500).json({ error: 'Failed to fetch email' });
  }
};


export const updateEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { emailId } = req.params;
    const updateData = updateEmailSchema.parse(req.body);

    // Verify email belongs to user
    const { data: existingEmail } = await supabaseServiceClient
      .from('emails')
      .select('id, status')
      .eq('id', emailId)
      .eq('user_id', userId)
      .single();

    if (!existingEmail) {
      res.status(404).json({ error: 'Email not found' });
      return;
    }

    // Can only update pending or scheduled emails
    if (!['pending', 'scheduled'].includes(existingEmail.status)) {
      res.status(400).json({ error: 'Cannot update email that has been sent, failed, or cancelled' });
      return;
    }

    const { data: email, error } = await supabaseServiceClient
      .from('emails')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', emailId)
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: 'Failed to update email', details: error.message });
      return;
    }

    res.json({
      message: 'Email updated successfully',
      email,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('❌ Update email error:', error);
    res.status(500).json({ error: 'Failed to update email' });
  }
};


export const deleteEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { emailId } = req.params;
    const { hard_delete } = req.query;

    // Verify email belongs to user
    const { data: existingEmail } = await supabaseServiceClient
      .from('emails')
      .select('id, status')
      .eq('id', emailId)
      .eq('user_id', userId)
      .single();

    if (!existingEmail) {
      res.status(404).json({ error: 'Email not found' });
      return;
    }

    if (hard_delete === 'true') {
      // Hard delete - remove from database
      const { error } = await supabaseServiceClient
        .from('emails')
        .delete()
        .eq('id', emailId);

      if (error) {
        res.status(500).json({ error: 'Failed to delete email', details: error.message });
        return;
      }

      logger.info(`✅ Email hard deleted: ${emailId}`);
      res.json({ message: 'Email deleted successfully' });
    } else {
      // Soft delete - mark as cancelled
      if (!['pending', 'scheduled'].includes(existingEmail.status)) {
        res.status(400).json({ error: 'Cannot cancel email that has been sent or already failed/cancelled' });
        return;
      }

      const { data: email, error } = await supabaseServiceClient
        .from('emails')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', emailId)
        .select()
        .single();

      if (error) {
        res.status(500).json({ error: 'Failed to cancel email', details: error.message });
        return;
      }

      logger.info(`✅ Email cancelled: ${emailId}`);
      res.json({ message: 'Email cancelled successfully', email });
    }
  } catch (error) {
    logger.error('❌ Delete email error:', error);
    res.status(500).json({ error: 'Failed to delete/cancel email' });
  }
};

// ============================================================================
// EMAIL LOG CONTROLLERS
// ============================================================================

/**
 * Create email log entry
 * POST /api/supabase/email-logs
 */
export const createEmailLog = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const data = createEmailLogSchema.parse(req.body);

    // Verify email belongs to user
    const { data: email } = await supabaseServiceClient
      .from('emails')
      .select('id')
      .eq('id', data.email_id)
      .eq('user_id', userId)
      .single();

    if (!email) {
      res.status(403).json({ error: 'Email not found or access denied' });
      return;
    }

    const { data: emailLog, error } = await supabaseServiceClient
      .from('email_logs')
      .insert({
        ...data,
        attempted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: 'Failed to create email log', details: error.message });
      return;
    }

    res.status(201).json({
      message: 'Email log created successfully',
      email_log: emailLog,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('❌ Create email log error:', error);
    res.status(500).json({ error: 'Failed to create email log' });
  }
};


export const getEmailLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { emailId } = req.params;

    // Verify email belongs to user
    const { data: email } = await supabaseServiceClient
      .from('emails')
      .select('id')
      .eq('id', emailId)
      .eq('user_id', userId)
      .single();

    if (!email) {
      res.status(404).json({ error: 'Email not found' });
      return;
    }

    const { data: logs, error } = await supabaseServiceClient
      .from('email_logs')
      .select('*')
      .eq('email_id', emailId)
      .order('attempted_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: 'Failed to fetch email logs', details: error.message });
      return;
    }

    res.json({ logs, count: logs?.length || 0 });
  } catch (error) {
    logger.error('❌ Get email logs error:', error);
    res.status(500).json({ error: 'Failed to fetch email logs' });
  }
};


export const getAllEmailLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { status, limit = '100', offset = '0' } = req.query;

    // First get all user's email IDs
    const { data: emails } = await supabaseServiceClient
      .from('emails')
      .select('id')
      .eq('user_id', userId);

    if (!emails || emails.length === 0) {
      res.json({ logs: [], count: 0 });
      return;
    }

    const emailIds = emails.map((e) => e.id);

    let query = supabaseServiceClient
      .from('email_logs')
      .select('*, emails(id, subject, recipient_email)')
      .in('email_id', emailIds)
      .order('attempted_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status) {
      query = query.eq('status', status as string);
    }

    const { data: logs, error } = await query;

    if (error) {
      res.status(500).json({ error: 'Failed to fetch email logs', details: error.message });
      return;
    }

    res.json({ logs, count: logs?.length || 0 });
  } catch (error) {
    logger.error('❌ Get all email logs error:', error);
    res.status(500).json({ error: 'Failed to fetch email logs' });
  }
};


export const deleteEmailLog = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { logId } = req.params;

    // Get log and verify ownership through email
    const { data: log } = await supabaseServiceClient
      .from('email_logs')
      .select('id, email_id')
      .eq('id', logId)
      .single();

    if (!log) {
      res.status(404).json({ error: 'Email log not found' });
      return;
    }

    // Verify email belongs to user
    const { data: email } = await supabaseServiceClient
      .from('emails')
      .select('id')
      .eq('id', log.email_id)
      .eq('user_id', userId)
      .single();

    if (!email) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const { error } = await supabaseServiceClient
      .from('email_logs')
      .delete()
      .eq('id', logId);

    if (error) {
      res.status(500).json({ error: 'Failed to delete email log', details: error.message });
      return;
    }

    res.json({ message: 'Email log deleted successfully' });
  } catch (error) {
    logger.error('❌ Delete email log error:', error);
    res.status(500).json({ error: 'Failed to delete email log' });
  }
};


export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;

    // Get email counts by status
    const { data: emails } = await supabaseServiceClient
      .from('emails')
      .select('status')
      .eq('user_id', userId);

    const statusCounts = {
      pending: 0,
      scheduled: 0,
      sent: 0,
      failed: 0,
      cancelled: 0,
    };

    emails?.forEach((email) => {
      if (email.status in statusCounts) {
        statusCounts[email.status as keyof typeof statusCounts]++;
      }
    });

    // Get sender count
    const { count: senderCount } = await supabaseServiceClient
      .from('senders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentEmails } = await supabaseServiceClient
      .from('emails')
      .select('id, status, created_at')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString());

    res.json({
      stats: {
        totalEmails: emails?.length || 0,
        emailsByStatus: statusCounts,
        totalSenders: senderCount || 0,
        recentActivity: {
          emailsCreated: recentEmails?.length || 0,
          period: '7 days',
        },
      },
    });
  } catch (error) {
    logger.error('❌ Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};
