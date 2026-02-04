import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  logger.error('❌ Missing Supabase configuration');
}


export const supabaseClient: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);


export const supabaseServiceClient: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

export const connectSupabase = async (): Promise<void> => {
  try {
    const { error } = await supabaseClient.auth.getSession();
    if (error) {
      logger.warn('⚠️ Supabase connection check:', error.message);
    } else {
      logger.info('✅ Supabase connected successfully');
    }
  } catch (error) {
    logger.error('❌ Supabase connection failed:', error);
    throw error;
  }
};
