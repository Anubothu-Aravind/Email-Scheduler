import 'dotenv/config';
import app from './app';
import { testRedisConnection, disconnectRedis } from './config/redis';
import { verifyMailConnection, defaultTransporter } from './config/mailer';
import { closeQueue } from './queues/emailQueue';
import { closeWorker } from './workers/emailWorker';
import { requeuePendingEmails } from './loaders/requeueOnRestart';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 5000;

let server: any;

/**
 * Start the server
 */
const startServer = async () => {
  try {
    logger.info('🚀 Starting Email Scheduler Server...');
    logger.info('📊 Using Supabase PostgreSQL via @supabase/supabase-js');

    // Test Redis connection (optional)
    try {
      await testRedisConnection();
    } catch (error) {
      logger.warn('⚠️  Redis connection failed, continuing without Redis:', error);
    }

    // Verify SMTP connection (optional)
    try {
      await verifyMailConnection(defaultTransporter);
    } catch (error) {
      logger.warn('⚠️  SMTP verification failed, continuing without email service:', error);
    }

    // Re-queue pending emails from previous runs (optional)
    try {
      await requeuePendingEmails();
    } catch (error) {
      logger.warn('⚠️  Failed to requeue pending emails:', error);
    }

    // Start Express server
    server = app.listen(PORT, () => {
      logger.info(`✅ Server is running on port ${PORT}`);
      logger.info(`📧 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

/**
 * Graceful shutdown
 */
let isShuttingDown = false;

const gracefulShutdown = async (signal: string) => {
  if (isShuttingDown) {
    logger.info('⚠️  Shutdown already in progress...');
    return;
  }
  
  isShuttingDown = true;
  logger.info(`⚠️  ${signal} received, starting graceful shutdown...`);

  try {
    // Stop accepting new requests
    if (server) {
      server.close(() => {
        logger.info('✅ HTTP server closed');
      });
    }

    // Close worker (with timeout)
    try {
      await Promise.race([
        closeWorker(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Worker close timeout')), 5000))
      ]);
    } catch (e) {
      logger.warn('⚠️  Worker close timeout or error');
    }

    // Close queue (with timeout)
    try {
      await Promise.race([
        closeQueue(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Queue close timeout')), 5000))
      ]);
    } catch (e) {
      logger.warn('⚠️  Queue close timeout or error');
    }

    // Disconnect from Redis (with timeout)
    try {
      await Promise.race([
        disconnectRedis(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis disconnect timeout')), 5000))
      ]);
    } catch (e) {
      logger.warn('⚠️  Redis disconnect timeout or error');
    }

    logger.info('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions - don't try graceful shutdown, just log and exit
process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit on unhandled rejection, just log it
});

// Start the server
startServer();
