import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  // Auth/User controllers
  register,
  login,
  getProfile,
  updateProfile,
  deleteAccount,
  getAllUsers,
  // Sender controllers
  createSender,
  getSenders,
  getSenderById,
  updateSender,
  deleteSender,
  // Email controllers
  createEmail,
  getEmails,
  getEmailById,
  updateEmail,
  deleteEmail,
  // Email Log controllers
  createEmailLog,
  getEmailLogs,
  getAllEmailLogs,
  deleteEmailLog,
  // Stats
  getStats,
} from '../controllers/supabase.controller';

const router = Router();

// ============================================================================
// AUTH ROUTES (PUBLIC)
// ============================================================================

/**
 * @route   POST /api/supabase/auth/register
 * @desc    Register a new user
 * @access  Public
 * @body    { email: string, password: string, full_name?: string }
 */
router.post('/auth/register', register);

/**
 * @route   POST /api/supabase/auth/login
 * @desc    Login user and get token
 * @access  Public
 * @body    { email: string, password: string }
 */
router.post('/auth/login', login);

// ============================================================================
// AUTH ROUTES (PRIVATE)
// ============================================================================

/**
 * @route   GET /api/supabase/auth/profile
 * @desc    Get current user's profile
 * @access  Private
 */
router.get('/auth/profile', authenticate, getProfile);

/**
 * @route   PUT /api/supabase/auth/profile
 * @desc    Update current user's profile
 * @access  Private
 * @body    { full_name?: string, email?: string }
 */
router.put('/auth/profile', authenticate, updateProfile);

/**
 * @route   DELETE /api/supabase/auth/profile
 * @desc    Delete current user's account
 * @access  Private
 */
router.delete('/auth/profile', authenticate, deleteAccount);

/**
 * @route   GET /api/supabase/users
 * @desc    Get all users (admin)
 * @access  Private
 */
router.get('/users', authenticate, getAllUsers);

// ============================================================================
// SENDER ROUTES
// ============================================================================

/**
 * @route   POST /api/supabase/senders
 * @desc    Create a new sender
 * @access  Private
 * @body    { email: string, name?: string, is_default?: boolean }
 */
router.post('/senders', authenticate, createSender);

/**
 * @route   GET /api/supabase/senders
 * @desc    Get all senders for the authenticated user
 * @access  Private
 */
router.get('/senders', authenticate, getSenders);

/**
 * @route   GET /api/supabase/senders/:senderId
 * @desc    Get a specific sender by ID
 * @access  Private
 */
router.get('/senders/:senderId', authenticate, getSenderById);

/**
 * @route   PUT /api/supabase/senders/:senderId
 * @desc    Update a sender
 * @access  Private
 * @body    { email?: string, name?: string, is_default?: boolean }
 */
router.put('/senders/:senderId', authenticate, updateSender);

/**
 * @route   DELETE /api/supabase/senders/:senderId
 * @desc    Delete a sender
 * @access  Private
 */
router.delete('/senders/:senderId', authenticate, deleteSender);

// ============================================================================
// EMAIL ROUTES
// ============================================================================

/**
 * @route   POST /api/supabase/emails
 * @desc    Schedule a new email
 * @access  Private
 * @body    { 
 *   sender_id: string (UUID),
 *   recipient_email: string,
 *   subject: string,
 *   body: string,
 *   scheduled_time: string (ISO datetime),
 *   idempotency_key?: string
 * }
 */
router.post('/emails', authenticate, createEmail);

/**
 * @route   GET /api/supabase/emails
 * @desc    Get all emails for the authenticated user
 * @access  Private
 * @query   status?: string, sender_id?: string, limit?: number, offset?: number
 */
router.get('/emails', authenticate, getEmails);

/**
 * @route   GET /api/supabase/emails/:emailId
 * @desc    Get a specific email by ID
 * @access  Private
 */
router.get('/emails/:emailId', authenticate, getEmailById);

/**
 * @route   PUT /api/supabase/emails/:emailId
 * @desc    Update an email (only pending/scheduled)
 * @access  Private
 * @body    { 
 *   recipient_email?: string,
 *   subject?: string,
 *   body?: string,
 *   scheduled_time?: string,
 *   status?: 'pending' | 'scheduled' | 'sent' | 'failed' | 'cancelled'
 * }
 */
router.put('/emails/:emailId', authenticate, updateEmail);

/**
 * @route   DELETE /api/supabase/emails/:emailId
 * @desc    Cancel or delete an email
 * @access  Private
 * @query   hard_delete?: boolean (true = delete from DB, false/omit = mark as cancelled)
 */
router.delete('/emails/:emailId', authenticate, deleteEmail);

// ============================================================================
// EMAIL LOG ROUTES
// ============================================================================

/**
 * @route   POST /api/supabase/email-logs
 * @desc    Create an email log entry
 * @access  Private
 * @body    { email_id: string (UUID), status?: string, message?: string }
 */
router.post('/email-logs', authenticate, createEmailLog);

/**
 * @route   GET /api/supabase/email-logs
 * @desc    Get all email logs for the authenticated user
 * @access  Private
 * @query   status?: string, limit?: number, offset?: number
 */
router.get('/email-logs', authenticate, getAllEmailLogs);

/**
 * @route   GET /api/supabase/email-logs/:emailId
 * @desc    Get all logs for a specific email
 * @access  Private
 */
router.get('/email-logs/:emailId', authenticate, getEmailLogs);

/**
 * @route   DELETE /api/supabase/email-logs/:logId
 * @desc    Delete an email log entry
 * @access  Private
 */
router.delete('/email-logs/:logId', authenticate, deleteEmailLog);

// ============================================================================
// STATISTICS ROUTES
// ============================================================================

/**
 * @route   GET /api/supabase/stats
 * @desc    Get dashboard statistics for the authenticated user
 * @access  Private
 */
router.get('/stats', authenticate, getStats);

export default router;
