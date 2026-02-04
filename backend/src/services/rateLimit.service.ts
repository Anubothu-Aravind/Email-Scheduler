import redis from '../config/redis';
import { getCurrentHourWindow, getNextHourWindow } from '../utils/time';
import { logger } from '../utils/logger';

const MAX_EMAILS_PER_HOUR = parseInt(
  process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || '100'
);

export interface RateLimitStatus {
  allowed: boolean;
  current: number;
  limit: number;
  resetAt: Date;
  nextWindow: string;
}

/**
 * Check if sender can send an email based on rate limit
 * Uses Redis to track emails sent per hour per sender
 */
export const checkRateLimit = async (senderId: string): Promise<RateLimitStatus> => {
  const hourWindow = getCurrentHourWindow();
  const redisKey = `rate_limit:${senderId}:${hourWindow}`;
  
  try {
    // Get current count
    const currentCount = await redis.get(redisKey);
    const count = currentCount ? parseInt(currentCount) : 0;
    
    // Calculate reset time (end of current hour)
    const now = new Date();
    const resetAt = new Date(now);
    resetAt.setHours(now.getHours() + 1, 0, 0, 0);
    
    const allowed = count < MAX_EMAILS_PER_HOUR;
    
    return {
      allowed,
      current: count,
      limit: MAX_EMAILS_PER_HOUR,
      resetAt,
      nextWindow: getNextHourWindow(),
    };
  } catch (error) {
    logger.error('❌ Failed to check rate limit:', error);
    // Fail open - allow the email in case of Redis error
    return {
      allowed: true,
      current: 0,
      limit: MAX_EMAILS_PER_HOUR,
      resetAt: new Date(),
      nextWindow: getNextHourWindow(),
    };
  }
};

/**
 * Increment the rate limit counter for a sender
 * Called after successfully sending an email
 */
export const incrementRateLimit = async (senderId: string): Promise<number> => {
  const hourWindow = getCurrentHourWindow();
  const redisKey = `rate_limit:${senderId}:${hourWindow}`;
  
  try {
    // Increment counter
    const newCount = await redis.incr(redisKey);
    
    // Set expiry to 2 hours (current + next hour buffer)
    await redis.expire(redisKey, 7200);
    
    logger.info(`📊 Rate limit for sender ${senderId}: ${newCount}/${MAX_EMAILS_PER_HOUR}`);
    
    return newCount;
  } catch (error) {
    logger.error('❌ Failed to increment rate limit:', error);
    throw error;
  }
};

/**
 * Get current rate limit status for a sender
 */
export const getRateLimitStatus = async (senderId: string): Promise<RateLimitStatus> => {
  return checkRateLimit(senderId);
};

/**
 * Reset rate limit for a sender (admin function)
 */
export const resetRateLimit = async (senderId: string): Promise<void> => {
  const hourWindow = getCurrentHourWindow();
  const redisKey = `rate_limit:${senderId}:${hourWindow}`;
  
  try {
    await redis.del(redisKey);
    logger.info(`🔄 Rate limit reset for sender ${senderId}`);
  } catch (error) {
    logger.error('❌ Failed to reset rate limit:', error);
    throw error;
  }
};

/**
 * Get all rate limit keys (for monitoring)
 */
export const getAllRateLimitKeys = async (): Promise<string[]> => {
  try {
    const keys = await redis.keys('rate_limit:*');
    return keys;
  } catch (error) {
    logger.error('❌ Failed to get rate limit keys:', error);
    throw error;
  }
};
