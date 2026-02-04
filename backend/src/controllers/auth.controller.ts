import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import * as UserService from '../services/user.service';
import * as SenderService from '../services/sender.service';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().optional(),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const googleLoginSchema = z.object({
  googleToken: z.string(),
  email: z.string().email(),
  name: z.string(),
  picture: z.string().optional(),
});

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, fullName, name } = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await UserService.getUserByEmail(email);

    if (existingUser) {
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (accept both fullName and name)
    const user = await UserService.createUser({
      email,
      name: fullName || name,
      password: hashedPassword,
    });

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    logger.info(`✅ User registered: ${email}`);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
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

/**
 * Login user
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate the request body format
    loginSchema.parse(req.body);

    // This app uses Google OAuth only
    // Email/password login is not supported since the database schema doesn't store passwords
    res.status(401).json({ 
      error: 'Email/password login is not supported. Please use Google OAuth to login.' 
    });
    return;
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('❌ Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

/**
 * Google OAuth login
 * POST /api/auth/google-login
 */
export const googleLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('➡️ /api/auth/google-login payload:', { body: req.body });
    const { email, name, picture } = googleLoginSchema.parse(req.body);

    // Check if user exists
    logger.info(`🔍 Looking up user: ${email}`);
    let user = await UserService.getUserByEmail(email);

    // If user doesn't exist, create new user
    if (!user) {
      logger.info(`📝 Creating new user: ${email}`);
      user = await UserService.createUser({
        email,
        name,
        password: '', // Google users don't need password
      });
      logger.info(`✅ New Google user created: ${email}`);
    }

    // Check if user has a default sender, if not create one
    logger.info(`🔍 Checking senders for user: ${user.id}`);
    const senders = await SenderService.getSendersByUserId(user.id);
    if (senders.length === 0) {
      logger.info(`📝 Creating default sender for user: ${email}`);
      try {
        await SenderService.createSender({
          userId: user.id,
          name: name || 'Default Sender',
          email: email,
          smtpHost: process.env.SMTP_HOST || 'smtp.ethereal.email',
          smtpPort: parseInt(process.env.SMTP_PORT || '587'),
          smtpUser: process.env.ETHEREAL_USER,
          smtpPass: process.env.ETHEREAL_PASS,
        });
        logger.info(`✅ Default sender created for user: ${email}`);
      } catch (senderError: any) {
        logger.error(`⚠️ Failed to create sender (non-fatal): ${senderError?.message}`);
        // Don't throw - sender creation is optional
      }
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    logger.info(`✅ Google user logged in: ${email}`);

    res.json({
      message: 'Google login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture,
      },
      token,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('❌ Google login error:', error?.stack || error);
    const devMessage = process.env.NODE_ENV === 'development' ? (error?.message || String(error)) : 'Google login failed';
    res.status(500).json({ error: devMessage });
  }
};

/**
 * Get current user profile
 * GET /api/auth/profile
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;

    const user = await UserService.getUserById(userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    logger.error('❌ Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

/**
 * Update user profile
 * PUT /api/auth/profile
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { name, email } = req.body;

    const updateSchema = z.object({
      name: z.string().optional(),
      email: z.string().email().optional(),
    });

    const validatedData = updateSchema.parse({ name, email });

    // If email is being changed, check if it's already used
    if (validatedData.email) {
      const existingUser = await UserService.getUserByEmail(validatedData.email);
      if (existingUser && existingUser.id !== userId) {
        res.status(400).json({ error: 'Email already in use' });
        return;
      }
    }

    const updatedUser = await UserService.updateUser(userId, validatedData);

    logger.info(`✅ User profile updated: ${userId}`);

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        createdAt: updatedUser.createdAt,
      },
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
