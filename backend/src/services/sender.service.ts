import { supabaseServiceClient } from '../config/supabase';
import { logger } from '../utils/logger';

export interface Sender {
  id: string;
  userId: string;
  name: string;
  email: string;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPass?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSenderData {
  userId: string;
  name: string;
  email: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
}

export interface UpdateSenderData {
  name?: string;
  email?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
}

/**
 * Create a new sender
 * POST /api/senders
 */
export const createSender = async (data: CreateSenderData): Promise<Sender> => {
  try {
    const { data: sender, error } = await supabaseServiceClient
      .from('senders')
      .insert([
        {
          user_id: data.userId,
          name: data.name,
          email: data.email,
          smtp_host: data.smtpHost || null,
          smtp_port: data.smtpPort || null,
          smtp_user: data.smtpUser || null,
          smtp_pass: data.smtpPass || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return sender as Sender;
  } catch (error: any) {
    logger.error('❌ Create sender error:', error);
    throw error;
  }
};

/**
 * Get sender by ID
 * GET /api/senders/:senderId
 */
export const getSenderById = async (id: string, userId?: string): Promise<Sender | null> => {
  try {
    let query = supabaseServiceClient.from('senders').select('*').eq('id', id);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: sender, error } = await query.single();

    if (error && error.code !== 'PGRST116') throw error;
    return sender as Sender | null;
  } catch (error: any) {
    logger.error('❌ Get sender by ID error:', error);
    throw error;
  }
};

/**
 * Get all senders for a user
 * GET /api/senders
 */
export const getSendersByUserId = async (userId: string): Promise<Sender[]> => {
  try {
    logger.info(`🔍 Querying senders for user_id: ${userId}`);
    
    const { data: senders, error } = await supabaseServiceClient
      .from('senders')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      logger.error('❌ Supabase query error:', error);
      throw error;
    }
    
    logger.info(`✅ Query successful, found ${(senders || []).length} senders`);
    return (senders || []) as Sender[];
  } catch (error: any) {
    logger.error('❌ Get senders by user ID error:', error);
    throw error;
  }
};

/**
 * Update sender
 * PUT /api/senders/:senderId
 */
export const updateSender = async (id: string, userId: string, data: UpdateSenderData): Promise<Sender> => {
  try {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.smtpHost !== undefined) updateData.smtp_host = data.smtpHost;
    if (data.smtpPort !== undefined) updateData.smtp_port = data.smtpPort;
    if (data.smtpUser !== undefined) updateData.smtp_user = data.smtpUser;
    if (data.smtpPass !== undefined) updateData.smtp_pass = data.smtpPass;

    const { data: sender, error } = await supabaseServiceClient
      .from('senders')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return sender as Sender;
  } catch (error: any) {
    logger.error('❌ Update sender error:', error);
    throw error;
  }
};

/**
 * Delete sender
 * DELETE /api/senders/:senderId
 */
export const deleteSender = async (id: string, userId: string): Promise<void> => {
  try {
    const { error } = await supabaseServiceClient
      .from('senders')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error: any) {
    logger.error('❌ Delete sender error:', error);
    throw error;
  }
};
