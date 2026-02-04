import { supabaseServiceClient } from '../config/supabase';
import { logger } from '../utils/logger';

export interface EmailLog {
  id: string;
  emailId: string;
  status: string;
  message: string;
  metadata?: Record<string, any> | null;
  createdAt: string;
}

export interface CreateEmailLogData {
  emailId: string;
  status: string;
  message: string;
  metadata?: Record<string, any>;
}

/**
 * Create email log entry
 * POST /api/email-logs
 */
export const createEmailLog = async (data: CreateEmailLogData): Promise<EmailLog> => {
  try {
    const { data: log, error } = await supabaseServiceClient
      .from('email_logs')
      .insert([
        {
          email_id: data.emailId,
          status: data.status,
          message: data.message,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return log as EmailLog;
  } catch (error: any) {
    logger.error('❌ Create email log error:', error);
    throw error;
  }
};

/**
 * Get logs for an email
 * GET /api/email-logs/:emailId
 */
export const getEmailLogs = async (emailId: string): Promise<EmailLog[]> => {
  try {
    const { data: logs, error } = await supabaseServiceClient
      .from('email_logs')
      .select('*')
      .eq('email_id', emailId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (logs || []) as EmailLog[];
  } catch (error: any) {
    logger.error('❌ Get email logs error:', error);
    throw error;
  }
};

/**
 * Delete logs for an email
 * DELETE /api/email-logs/:emailId
 */
export const deleteEmailLogs = async (emailId: string): Promise<void> => {
  try {
    const { error } = await supabaseServiceClient
      .from('email_logs')
      .delete()
      .eq('email_id', emailId);

    if (error) throw error;
  } catch (error: any) {
    logger.error('❌ Delete email logs error:', error);
    throw error;
  }
};
