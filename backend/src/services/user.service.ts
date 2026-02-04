import { supabaseServiceClient } from '../config/supabase';
import { logger } from '../utils/logger';

// Database row interface (snake_case - matches Supabase table)
interface UserRow {
  id: string;
  email: string;
  name?: string | null;
  google_id?: string | null;
  created_at: string;
  updated_at: string;
}

// Application interface (camelCase - used in code)
export interface User {
  id: string;
  email: string;
  name?: string | null;
  password?: string; // Optional for OAuth users
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserData {
  email: string;
  name?: string;
  password: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
}

// Transform database row to application object
const transformUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  name: row.name,
  password: undefined, // Password is not stored in DB for OAuth users
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/**
 * Create a new user
 */
export const createUser = async (data: CreateUserData): Promise<User> => {
  try {
    const { data: user, error } = await supabaseServiceClient
      .from('users')
      .insert([
        {
          email: data.email,
          name: data.name || null,
          // Password is not stored in DB - use OAuth instead
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return transformUser(user as UserRow);
  } catch (error: any) {
    logger.error('❌ Create user error:', error);
    throw error;
  }
};

/**
 * Get user by email
 */
export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const { data: user, error } = await supabaseServiceClient
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!user) return null;
    return transformUser(user as UserRow);
  } catch (error: any) {
    logger.error('❌ Get user by email error:', error);
    throw error;
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (id: string): Promise<User | null> => {
  try {
    const { data: user, error } = await supabaseServiceClient
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!user) return null;
    return transformUser(user as UserRow);
  } catch (error: any) {
    logger.error('❌ Get user by ID error:', error);
    throw error;
  }
};

/**
 * Update user
 */
export const updateUser = async (id: string, data: UpdateUserData): Promise<User> => {
  try {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;

    const { data: user, error } = await supabaseServiceClient
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return transformUser(user as UserRow);
  } catch (error: any) {
    logger.error('❌ Update user error:', error);
    throw error;
  }
};

/**
 * Delete user
 */
export const deleteUser = async (id: string): Promise<void> => {
  try {
    const { error } = await supabaseServiceClient.from('users').delete().eq('id', id);

    if (error) throw error;
  } catch (error: any) {
    logger.error('❌ Delete user error:', error);
    throw error;
  }
};

/**
 * Check if user exists
 */
export const userExists = async (email: string): Promise<boolean> => {
  try {
    const { data: users, error } = await supabaseServiceClient
      .from('users')
      .select('id')
      .eq('email', email);

    if (error) throw error;
    return users && users.length > 0;
  } catch (error: any) {
    logger.error('❌ Check user exists error:', error);
    throw error;
  }
};
