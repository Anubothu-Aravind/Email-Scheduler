import { Router } from 'express';
import {
  scheduleEmailController,
  cancelEmailController,
  getEmailController,
  getEmailsController,
  getEmailStatsController,
  createSenderController,
  getSendersController,
  updateSenderController,
  deleteSenderController,
} from '../controllers/email.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/emails/schedule
 * @desc    Schedule a new email
 * @access  Private
 */
router.post('/schedule', scheduleEmailController);

/**
 * @route   GET /api/emails
 * @desc    Get all emails for user's senders
 * @access  Private
 * @query   senderId - Filter by sender ID
 * @query   status - Filter by email status
 */
router.get('/', getEmailsController);

/**
 * @route   GET /api/emails/stats
 * @desc    Get email statistics for user
 * @access  Private
 */
router.get('/stats', getEmailStatsController);

/**
 * @route   POST /api/emails/senders
 * @desc    Create a new sender
 * @access  Private
 */
router.post('/senders', createSenderController);

/**
 * @route   GET /api/emails/senders
 * @desc    Get all senders for user
 * @access  Private
 */
router.get('/senders', getSendersController);

/**
 * @route   PUT /api/emails/senders/:senderId
 * @desc    Update a sender
 * @access  Private
 */
router.put('/senders/:senderId', updateSenderController);

/**
 * @route   DELETE /api/emails/senders/:senderId
 * @desc    Delete a sender
 * @access  Private
 */
router.delete('/senders/:senderId', deleteSenderController);

/**
 * @route   GET /api/emails/:emailId
 * @desc    Get email by ID with logs
 * @access  Private
 */
router.get('/:emailId', getEmailController);

/**
 * @route   DELETE /api/emails/:emailId
 * @desc    Cancel a scheduled email
 * @access  Private
 */
router.delete('/:emailId', cancelEmailController);

export default router;
