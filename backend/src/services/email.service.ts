import { supabaseServiceClient } from '../config/supabase';
import { logger } from '../utils/logger';

export type EmailStatus = 'SCHEDULED' | 'RETRYING' | 'SENT' | 'FAILED';

export interface Email {
  id: string;
  senderId: string;
  recipientEmail: string;
  recipientName?: string | null;
  subject: string;
  body: string;
  htmlBody?: string | null;
  scheduledAt: string;
  sentAt?: string | null;
  status: EmailStatus;
  attemptCount: number;
  errorMessage?: string | null;
  idempotencyKey?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Transform snake_case to camelCase
const transformEmailFromDB = (dbEmail: any): Email => ({
  id: dbEmail.id,
  senderId: dbEmail.sender_id,
  recipientEmail: dbEmail.recipient_email,
  recipientName: dbEmail.recipient_name,
  subject: dbEmail.subject,
  body: dbEmail.body,
  htmlBody: dbEmail.html_body,
  scheduledAt: dbEmail.scheduled_at,
  sentAt: dbEmail.sent_at,
  status: dbEmail.status,
  attemptCount: dbEmail.attempt_count,
  errorMessage: dbEmail.error_message,
  idempotencyKey: dbEmail.idempotency_key,
  createdAt: dbEmail.created_at,
  updatedAt: dbEmail.updated_at,
});

export interface CreateEmailData {
  senderId: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  body: string;
  htmlBody?: string;
  scheduledAt: string;
  idempotencyKey?: string;
}

export interface UpdateEmailData {
  status?: EmailStatus;
  sentAt?: string;
  errorMessage?: string;
  attemptCount?: number;
}

/**
 * Create a new scheduled email
 * POST /api/emails
 */
export const createEmail = async (data: CreateEmailData): Promise<Email> => {
  try {
    const { data: email, error } = await supabaseServiceClient
      .from('emails')
      .insert([
        {
          sender_id: data.senderId,
          recipient_email: data.recipientEmail,
          recipient_name: data.recipientName || null,
          subject: data.subject,
          body: data.body,
          html_body: data.htmlBody || null,
          scheduled_at: data.scheduledAt,
          status: 'SCHEDULED',
          attempt_count: 0,
          idempotency_key: data.idempotencyKey || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return transformEmailFromDB(email);
  } catch (error: any) {
    logger.error('❌ Create email error:', error);
    throw error;
  }
};

/**
 * Get email by ID
 * GET /api/emails/:emailId
 */
export const getEmailById = async (id: string): Promise<Email | null> => {
  try {
    const { data: email, error } = await supabaseServiceClient
      .from('emails')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return email ? transformEmailFromDB(email) : null;
  } catch (error: any) {
    logger.error('❌ Get email by ID error:', error);
    throw error;
  }
};

/**
 * Get all emails for a sender
 * GET /api/emails?senderId=xxx
 */
export const getEmailsBySenderId = async (
  senderId: string,
  filters?: { status?: EmailStatus; limit?: number; offset?: number }
): Promise<Email[]> => {
  try {
    let query = supabaseServiceClient
      .from('emails')
      .select('*')
      .eq('sender_id', senderId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    query = query.order('scheduled_at', { ascending: false });

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data: emails, error } = await query;

    if (error) throw error;
    return (emails || []).map(transformEmailFromDB);
  } catch (error: any) {
    logger.error('❌ Get emails by sender ID error:', error);
    throw error;
  }
};

/**
 * Get all emails for a user's senders
 * GET /api/emails
 */
export const getEmailsByUserId = async (
  userId: string,
  filters?: { status?: EmailStatus; limit?: number; offset?: number }
): Promise<Email[]> => {
  try {
    // First get all sender IDs for this user
    const { data: senders, error: senderError } = await supabaseServiceClient
      .from('senders')
      .select('id')
      .eq('user_id', userId);

    if (senderError) throw senderError;
    
    if (!senders || senders.length === 0) {
      return [];
    }

    const senderIds = senders.map(s => s.id);

    let query = supabaseServiceClient
      .from('emails')
      .select('*')
      .in('sender_id', senderIds);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    query = query.order('scheduled_at', { ascending: false });

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data: emails, error } = await query;

    if (error) throw error;
    return (emails || []).map(transformEmailFromDB);
  } catch (error: any) {
    logger.error('❌ Get emails by user ID error:', error);
    throw error;
  }
};

/**
 * Update email
 * PUT /api/emails/:emailId
 */
export const updateEmail = async (id: string, data: UpdateEmailData): Promise<Email> => {
  try {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.status !== undefined) updateData.status = data.status;
    if (data.sentAt !== undefined) updateData.sent_at = data.sentAt;
    if (data.errorMessage !== undefined) updateData.error_message = data.errorMessage;
    if (data.attemptCount !== undefined) updateData.attempt_count = data.attemptCount;

    const { data: email, error } = await supabaseServiceClient
      .from('emails')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return transformEmailFromDB(email);
  } catch (error: any) {
    logger.error('❌ Update email error:', error);
    throw error;
  }
};

/**
 * Delete/Cancel email
 * DELETE /api/emails/:emailId
 */
export const deleteEmail = async (id: string): Promise<void> => {
  try {
    // Actually delete the email since CANCELLED is not a valid status
    const { error: deleteError } = await supabaseServiceClient
      .from('emails')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;
  } catch (error: any) {
    logger.error('❌ Delete email error:', error);
    throw error;
  }
};

/**
 * Get pending emails to process
 */
export const getPendingEmails = async (limit: number = 100): Promise<Email[]> => {
  try {
    const { data: emails, error } = await supabaseServiceClient
      .from('emails')
      .select('*')
      .in('status', ['SCHEDULED', 'RETRYING'])
      .order('scheduled_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return (emails || []).map(transformEmailFromDB);
  } catch (error: any) {
    logger.error('❌ Get pending emails error:', error);
    throw error;
  }
};

/**
 * Check if email already exists by idempotency key
 */
export const getEmailByIdempotencyKey = async (key: string): Promise<Email | null> => {
  try {
    const { data: email, error } = await supabaseServiceClient
      .from('emails')
      .select('*')
      .eq('idempotency_key', key)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return email ? transformEmailFromDB(email) : null;
  } catch (error: any) {
    logger.error('❌ Get email by idempotency key error:', error);
    throw error;
  }
};
