import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { apiRateLimiter, authRateLimiter } from './middlewares/apiRate.middleware';
import authRoutes from './routes/auth.routes';
import emailRoutes from './routes/email.routes';
import supabaseRoutes from './routes/supabase.routes';
import { logger } from './utils/logger';

const app: Application = express();

// Security headers middleware (must be before CORS)
app.use((_req, res, next) => {
  // Don't set COOP for Google OAuth - it blocks postMessage
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});

// CORS configuration
// When credentials:true is used, Access-Control-Allow-Origin must NOT be '*'.
// If CORS_ORIGIN is '*', enable dynamic origin reflection (origin: true)
const corsOrigin = process.env.CORS_ORIGIN || '*';
const originOption = corsOrigin === '*' ? true : corsOrigin.split(',');
app.use(
  cors({
    origin: originOption,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'X-Kuma-Revision'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global rate limiting
app.use('/api/', apiRateLimiter);

// Auth-specific rate limiting
app.use('/api/auth/login', authRateLimiter);
app.use('/api/auth/register', authRateLimiter);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Root endpoint - API info
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Email Scheduler API',
    version: '2.0.0',
    status: 'running',
    documentation: '/api',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      emails: '/api/emails',
    },
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/supabase', supabaseRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('❌ Unhandled error:', err);
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

export default app;