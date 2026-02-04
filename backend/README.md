# 📧 Email Scheduler - Backend

Express.js + TypeScript backend API for the Email Scheduler application.

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Redis server running on port 6379
- Supabase account with project

### Installation

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Server
PORT=5000
NODE_ENV=development

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis (for BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=        # optional

# SMTP Configuration
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your-ethereal-user
SMTP_PASS=your-ethereal-pass

# Rate Limiting
RATE_LIMIT_PER_SENDER=50  # emails per hour per sender
```

### Running the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The server will be available at **http://localhost:5000**

---

## 📁 Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed-supabase.ts     # Seed script
├── src/
│   ├── config/
│   │   ├── mailer.ts        # Nodemailer SMTP config
│   │   ├── redis.ts         # Redis connection
│   │   └── supabase.ts      # Supabase clients
│   ├── controllers/
│   │   ├── auth.controller.ts    # Auth endpoints
│   │   ├── email.controller.ts   # Email endpoints
│   │   └── supabase.controller.ts
│   ├── routes/
│   │   ├── auth.routes.ts        # /api/auth/*
│   │   ├── email.routes.ts       # /api/emails/*
│   │   └── supabase.routes.ts    # /api/supabase/*
│   ├── services/
│   │   ├── email.service.ts      # Email CRUD
│   │   ├── emailLog.service.ts   # Email logs
│   │   ├── rateLimit.service.ts  # Rate limiting
│   │   ├── sender.service.ts     # Sender management
│   │   └── user.service.ts       # User management
│   ├── queues/
│   │   └── emailQueue.ts         # BullMQ queue config
│   ├── workers/
│   │   └── emailWorker.ts        # Email processor
│   ├── loaders/
│   │   └── requeueOnRestart.ts   # Restart recovery
│   ├── middlewares/
│   │   ├── auth.middleware.ts    # JWT validation
│   │   └── apiRate.middleware.ts # API rate limiting
│   ├── types/
│   │   └── index.ts              # TypeScript types
│   ├── utils/
│   │   ├── logger.ts             # Winston logger
│   │   └── time.ts               # Time utilities
│   ├── app.ts                    # Express app
│   └── server.ts                 # Server entry
├── .env                          # Environment variables
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
└── nodemon.json                  # Nodemon config
```

---

## 🔌 API Endpoints

### Health Check

| Method | Endpoint  | Description          |
| ------ | --------- | -------------------- |
| GET    | `/health` | Server health status |

### Authentication

| Method | Endpoint            | Description        | Auth |
| ------ | ------------------- | ------------------ | ---- |
| POST   | `/api/auth/google`  | Google OAuth login | No   |
| GET    | `/api/auth/profile` | Get user profile   | Yes  |

### Emails

| Method | Endpoint          | Description            | Auth |
| ------ | ----------------- | ---------------------- | ---- |
| GET    | `/api/emails`     | Get all user's emails  | Yes  |
| GET    | `/api/emails/:id` | Get email by ID        | Yes  |
| POST   | `/api/emails`     | Create/schedule email  | Yes  |
| DELETE | `/api/emails/:id` | Cancel scheduled email | Yes  |

### Senders

| Method | Endpoint                    | Description        | Auth |
| ------ | --------------------------- | ------------------ | ---- |
| GET    | `/api/supabase/senders`     | Get user's senders | Yes  |
| POST   | `/api/supabase/senders`     | Create sender      | Yes  |
| DELETE | `/api/supabase/senders/:id` | Delete sender      | Yes  |

---

## 📡 API Details

### Authentication

All protected endpoints require JWT token in header:

```
Authorization: Bearer <jwt-token>
```

### POST /api/auth/google

Google OAuth login/register.

**Request:**

```json
{
  "credential": "google-oauth-jwt-token"
}
```

**Response (200):**

```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@gmail.com",
    "fullName": "John Doe",
    "createdAt": "2026-01-30T10:00:00Z"
  },
  "token": "jwt-token"
}
```

### POST /api/emails

Schedule a new email.

**Request:**

```json
{
  "recipientEmail": "recipient@example.com",
  "subject": "Hello!",
  "body": "Email content here...",
  "scheduledAt": "2026-01-31T10:00:00Z",
  "senderId": "sender-uuid"
}
```

**Response (201):**

```json
{
  "message": "Email scheduled successfully",
  "email": {
    "id": "email-uuid",
    "recipientEmail": "recipient@example.com",
    "subject": "Hello!",
    "body": "Email content here...",
    "status": "SCHEDULED",
    "scheduledAt": "2026-01-31T10:00:00Z",
    "senderId": "sender-uuid",
    "createdAt": "2026-01-30T10:00:00Z"
  }
}
```

### GET /api/emails

Get all emails for authenticated user.

**Query Parameters:**

- `status` - Filter by status (SCHEDULED, SENT, FAILED)
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset

**Response (200):**

```json
{
  "emails": [
    {
      "id": "email-uuid",
      "recipientEmail": "recipient@example.com",
      "subject": "Hello!",
      "status": "SENT",
      "scheduledAt": "2026-01-30T10:00:00Z",
      "sentAt": "2026-01-30T10:00:05Z"
    }
  ]
}
```

### DELETE /api/emails/:id

Cancel a scheduled email.

**Response (200):**

```json
{
  "message": "Email cancelled successfully"
}
```

---

## ⚙️ How Email Scheduling Works

### 1. Email Creation Flow

```
User Request → API → Validate → Save to DB → Add to BullMQ Queue
```

1. User sends POST request with email data
2. Server validates input (email format, schedule time)
3. Email saved to Supabase with status `SCHEDULED`
4. BullMQ job created with delay until scheduled time
5. Response returned to user

### 2. Email Processing Flow

```
BullMQ Worker → Fetch Email → Check Rate Limit → Send via SMTP → Update DB
```

1. Worker picks up job when delay expires
2. Fetches email from database
3. Checks sender's hourly rate limit
4. Sends email via Nodemailer/SMTP
5. Updates email status to `SENT` or `FAILED`
6. Creates email log entry

### 3. Server Restart Recovery

On startup, the server:

1. Queries all emails with status `SCHEDULED`
2. Re-adds them to BullMQ queue with correct delays
3. Ensures no scheduled emails are lost

---

## 🗄️ Database Schema

### Users Table

```sql
- id (UUID, primary key)
- email (string, unique)
- full_name (string)
- password_hash (string, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

### Senders Table

```sql
- id (UUID, primary key)
- user_id (UUID, foreign key)
- email (string)
- name (string)
- smtp_host (string)
- smtp_port (integer)
- smtp_user (string)
- smtp_pass (string, encrypted)
- is_verified (boolean)
- created_at (timestamp)
```

### Emails Table

```sql
- id (UUID, primary key)
- sender_id (UUID, foreign key)
- recipient_email (string)
- subject (string)
- body (text)
- status (enum: SCHEDULED, SENT, FAILED, CANCELLED)
- scheduled_at (timestamp)
- sent_at (timestamp, nullable)
- error_message (string, nullable)
- attempt_count (integer)
- idempotency_key (string, unique)
- created_at (timestamp)
- updated_at (timestamp)
```

### Email Logs Table

```sql
- id (UUID, primary key)
- email_id (UUID, foreign key)
- status (string)
- message (string)
- created_at (timestamp)
```

---

## 🔧 Available Scripts

| Command                 | Description                      |
| ----------------------- | -------------------------------- |
| `npm run dev`           | Start with nodemon (auto-reload) |
| `npm run build`         | Compile TypeScript               |
| `npm start`             | Run production build             |
| `npm run seed:supabase` | Seed database                    |

---

## 🛠️ Tech Stack

| Technology | Version | Purpose             |
| ---------- | ------- | ------------------- |
| Express.js | 4.x     | Web framework       |
| TypeScript | 5.x     | Type safety         |
| Supabase   | 2.x     | PostgreSQL database |
| BullMQ     | 5.x     | Job queue           |
| Redis      | -       | Queue storage       |
| Nodemailer | 6.x     | Email sending       |
| JWT        | -       | Authentication      |
| Winston    | 3.x     | Logging             |
| Zod        | 3.x     | Validation          |

---

## 🔒 Security Features

- **JWT Authentication** - Secure token-based auth
- **Password Hashing** - bcrypt with salt rounds
- **Rate Limiting** - Per-sender and API rate limits
- **Input Validation** - Zod schema validation
- **CORS** - Configured for frontend origin
- **Helmet** - Security headers

---

## 📝 Error Codes

| Code | Description                             |
| ---- | --------------------------------------- |
| 400  | Bad Request - Invalid input             |
| 401  | Unauthorized - Invalid/missing token    |
| 403  | Forbidden - Insufficient permissions    |
| 404  | Not Found - Resource doesn't exist      |
| 429  | Too Many Requests - Rate limit exceeded |
| 500  | Internal Server Error                   |

---

## 🧪 Testing with Ethereal

For development, use [Ethereal Email](https://ethereal.email/):

1. Go to https://ethereal.email/
2. Click "Create Ethereal Account"
3. Copy SMTP credentials to `.env`
4. Sent emails appear in Ethereal inbox (not actually delivered)

---

## 🏗️ Architecture Deep Dive

### Email Scheduling Architecture

**Flow Diagram:**

```
User Input → API Validation → Database → BullMQ Queue → Worker → SMTP → Update DB
```

**Step-by-Step Process:**

1. **User Creates Email**
   - Frontend: `pages/ComposeEmail.tsx` sends POST to `/api/emails`
   - Request includes: recipientEmail, subject, body, scheduledAt, senderId

2. **API Layer** (`controllers/email.controller.ts`)
   - Validates input with Zod schema
   - Checks user authentication via JWT
   - Calls `email.service.ts`

3. **Service Layer** (`services/email.service.ts`)
   - Creates idempotency key to prevent duplicates
   - Saves email to Supabase with status `SCHEDULED`
   - Transforms DB snake_case to camelCase for frontend

4. **Queue Layer** (`queues/emailQueue.ts`)
   - Calculates delay: `scheduledAt - now()`
   - Adds BullMQ job: `emailQueue.add('send-email', { emailId }, { delay })`
   - Job persisted to Redis

5. **Worker Layer** (`workers/emailWorker.ts`)
   - Worker polls queue continuously
   - Processes up to 5 jobs concurrently
   - When delay expires, job executes

6. **Email Sending**
   - Fetches full email from database
   - Checks rate limit: `rateLimit.service.ts`
   - Sends via SMTP: `sender.service.ts` + `mailer.ts`
   - Updates status to `SENT` or `FAILED`
   - Creates log entry: `emailLog.service.ts`

### Persistence on Restart - Implementation

**Problem:**

- BullMQ stores jobs in Redis with TTL
- If server crashes, jobs may be lost
- Scheduled emails must survive restarts

**Solution:** Database as source of truth

**File:** `backend/src/loaders/requeueOnRestart.ts`

**Code Logic:**

```typescript
export const requeueScheduledEmails = async () => {
  // 1. Query all scheduled emails from database
  const pendingEmails = await getPendingEmails(1000);

  // 2. For each email, calculate remaining delay
  for (const email of pendingEmails) {
    const now = new Date();
    const scheduledAt = new Date(email.scheduledAt);
    const delay = scheduledAt.getTime() - now.getTime();

    // 3. Re-add to queue
    if (delay > 0) {
      await emailQueue.add("send-email", { emailId: email.id }, { delay });
    } else {
      // Overdue - send immediately
      await emailQueue.add("send-email", { emailId: email.id });
    }
  }
};
```

**When it runs:** `server.ts` calls this on startup

**Benefits:**

- ✅ Zero email loss on crashes
- ✅ Works across deployments
- ✅ Database is single source of truth

### Rate Limiting - Two-Layer System

#### Layer 1: API Rate Limiting

**File:** `backend/src/middlewares/apiRate.middleware.ts`

**Purpose:** Prevent API abuse and DDoS attacks

**Configuration:**

```typescript
import rateLimit from "express-rate-limit";

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: "Too many requests from this IP",
  standardHeaders: true,
  legacyHeaders: false,
});
```

**Applied to:** All `/api/*` routes in `app.ts`

**How it works:**

- Tracks requests by IP address
- Uses in-memory store (can be Redis for distributed systems)
- Returns 429 status when limit exceeded

#### Layer 2: Per-Sender Email Rate Limiting

**File:** `backend/src/services/rateLimit.service.ts`

**Purpose:** Prevent spam and SMTP server bans

**Configuration:** 50 emails/hour per sender (env: `RATE_LIMIT_PER_SENDER`)

**Redis Key Structure:**

```
rate-limit:sender:{senderId} → count
TTL: 3600 seconds (1 hour)
```

**Implementation:**

```typescript
export const checkRateLimit = async (senderId: string): Promise<boolean> => {
  const key = `rate-limit:sender:${senderId}`;

  // 1. Get current count
  const count = await redis.get(key);

  // 2. Check limit
  if (count && parseInt(count) >= RATE_LIMIT_PER_SENDER) {
    return false; // Rate limit exceeded
  }

  // 3. Increment counter
  await redis.incr(key);

  // 4. Set expiry if first send in window
  if (!count) {
    await redis.expire(key, 3600); // 1 hour TTL
  }

  return true; // OK to send
};
```

**Called in:** `workers/emailWorker.ts` before sending each email

**Error Handling:** If rate limit exceeded, email status set to `FAILED` with error message

### Concurrency Implementation

**File:** `backend/src/workers/emailWorker.ts`

**Configuration:**

```typescript
const worker = new Worker(
  "email-queue",
  async (job) => {
    /* process email */
  },
  {
    connection: redisConnection,
    concurrency: 5, // Process 5 emails simultaneously
  },
);
```

**How it works:**

1. Worker maintains pool of 5 concurrent job processors
2. As soon as one job completes, next job starts
3. All 5 can run in parallel

**Benefits:**

- ⚡ Faster bulk email processing
- 📊 Better resource utilization
- ⏱️ Reduced queue backlog

**Safety:**

- Rate limiting prevents any single sender from overwhelming SMTP
- Each job is independent (no shared state)
- Failed jobs don't block others

**Example:** If 100 emails scheduled for same time:

- Without concurrency: 100 seconds (1 per second)
- With concurrency=5: 20 seconds (5 per second)

### Database Schema Transformation

**Problem:** Supabase returns snake_case, frontend expects camelCase

**File:** `backend/src/services/email.service.ts`

**Solution:**

```typescript
const transformEmailFromDB = (dbEmail: any): Email => ({
  id: dbEmail.id,
  senderId: dbEmail.sender_id,
  recipientEmail: dbEmail.recipient_email,
  subject: dbEmail.subject,
  body: dbEmail.body,
  status: dbEmail.status,
  scheduledAt: dbEmail.scheduled_at,
  sentAt: dbEmail.sent_at,
  errorMessage: dbEmail.error_message,
  attemptCount: dbEmail.attempt_count,
  idempotencyKey: dbEmail.idempotency_key,
  createdAt: dbEmail.created_at,
  updatedAt: dbEmail.updated_at,
});
```

**Applied to all email service functions:**

- `getEmailById`
- `getEmailsBySenderId`
- `getEmailsByUserId`
- `getPendingEmails`
- `createEmail`
- `updateEmail`

---

## 🔧 Running Individual Components

### Run Backend Only (without worker)

Not recommended - worker is integrated. Use full backend:

```bash
npm run dev
```

### Run BullMQ Worker Separately

Worker is auto-started with server, but for testing:

```bash
npm run worker
```

### Check Redis Queue Status

```bash
redis-cli
> KEYS email-queue:*
> LLEN email-queue:wait
> LLEN email-queue:active
> LLEN email-queue:completed
```

### Run Database Migrations

```bash
npm run prisma:push
```

### Seed Database

```bash
npm run seed:supabase
```

---

## 📊 Monitoring & Debugging

### View Logs

All logs use Winston logger (`utils/logger.ts`):

```bash
# Watch logs in real-time
npm run dev

# Logs include:
# - Server startup
# - Redis connection
# - Email queue events
# - Worker processing
# - SMTP sending
# - Rate limit violations
# - Errors with stack traces
```

### Check Scheduled Emails

```bash
# Query database
SELECT * FROM emails WHERE status = 'SCHEDULED';

# Check Redis queue
redis-cli
> LLEN email-queue:wait
```

### Test SMTP Connection

```typescript
// Verify in logs on startup:
// ✅ SMTP connection verified successfully
```

### Debug Rate Limiting

```bash
redis-cli
> KEYS rate-limit:sender:*
> GET rate-limit:sender:{senderId}
> TTL rate-limit:sender:{senderId}
```

---

## 🚨 Common Issues & Solutions

### Issue: Port 5000 already in use

```powershell
# Windows
Get-NetTCPConnection -LocalPort 5000 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }

# macOS/Linux
lsof -ti:5000 | xargs kill -9
```

### Issue: Redis connection failed

```bash
# Check if Redis is running
redis-cli ping

# Start Redis
# Windows: Run Redis server executable
# macOS: brew services start redis
# Linux: sudo systemctl start redis
```

### Issue: SMTP authentication failed

- Verify Ethereal credentials are correct
- Check `.env` file has no extra spaces
- Generate new Ethereal account if expired

### Issue: Emails not sending

1. Check email status in database: `SELECT * FROM emails`
2. Check worker is running: Look for "Email worker started" in logs
3. Check rate limit: `redis-cli GET rate-limit:sender:{senderId}`
4. Check queue: `redis-cli LLEN email-queue:wait`

---

## 🎯 Performance Optimization

### Current Settings

- **Concurrency:** 5 workers
- **Rate Limit:** 50 emails/hour/sender
- **Queue:** Redis persistence enabled
- **Database:** Supabase connection pooling

### Scaling Recommendations

**Horizontal Scaling:**

- Run multiple worker instances
- Use shared Redis instance
- Database handles concurrent connections

**Vertical Scaling:**

- Increase worker concurrency (e.g., 10)
- Increase rate limits
- Add database indexes on `status`, `sender_id`, `scheduled_at`

**Production Optimizations:**

- Use Redis Cluster for high availability
- Add database read replicas
- Implement email batching
- Add monitoring (Datadog, New Relic)

---
