# 📧 Email Scheduler

A full-stack email scheduling application built with React, Express.js, TypeScript, Supabase, BullMQ, and Redis.

## 🚀 Features

- **Google OAuth Authentication** - Sign in with Google
- **Email Scheduling** - Schedule emails to be sent at a specific time
- **Multi-Sender Support** - Manage multiple email sender identities
- **Rate Limiting** - Per-sender hourly email limits
- **Email Queue** - BullMQ for reliable email delivery
- **Real-time Status** - Track scheduled, sent, and failed emails
- **Responsive UI** - Modern React frontend with Tailwind CSS

---

## 📁 Project Structure

```
email-scheduler/
├── frontend/          # React + TypeScript + Vite
│   ├── src/
│   │   ├── auth/      # Authentication (Google OAuth)
│   │   ├── components/# Reusable UI components
│   │   ├── pages/     # App pages (Dashboard, Compose, etc.)
│   │   ├── services/  # API service layer
│   │   └── types/     # TypeScript types
│   └── ...
├── backend/           # Express.js + TypeScript
│   ├── src/
│   │   ├── config/    # Database, Redis, Mailer config
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── queues/    # BullMQ email queue
│   │   ├── workers/   # Email worker processor
│   │   └── middlewares/
│   └── ...
└── README.md
```

---

## 🛠️ Tech Stack

### Frontend

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS 4** - Styling
- **React Router 7** - Routing
- **@react-oauth/google** - Google authentication
- **Axios** - HTTP client

### Backend

- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Supabase** - PostgreSQL database
- **BullMQ** - Job queue for email scheduling
- **Redis** - Queue storage & rate limiting
- **Nodemailer** - Email sending
- **JWT** - Authentication tokens

---

## ⚡ Quick Start

### Prerequisites

- Node.js 18+
- Redis server running on port 6379
- Supabase account with project created
- Google Cloud Console project for OAuth

### 1. Clone the Repository

```bash
git clone <repository-url>
cd email-scheduler
```

### 2. Setup Backend

```bash
cd backend
npm install
```

Create `.env` file:

```env
# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# SMTP (Ethereal for testing)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your-ethereal-user
SMTP_PASS=your-ethereal-pass
```

Start the backend:

```bash
npm run dev
```

### 3. Setup Frontend

```bash
cd frontend
npm install
```

Create `.env` file:

```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

Start the frontend:

```bash
npm run dev
```

### 4. Access the Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000
- **Health Check:** http://localhost:5000/health

---

## 📖 Documentation

- [Frontend README](./frontend/README.md) - Frontend setup and architecture
- [Backend README](./backend/README.md) - Backend setup and API documentation

---

## 🔐 Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth Client ID
5. Application type: Web application
6. Add authorized JavaScript origins:
   - `http://localhost:5173`
7. Add authorized redirect URIs:
   - `http://localhost:5173`
8. Copy Client ID to frontend `.env`

---

## 🏗️ Architecture Overview

### How Email Scheduling Works

1. **User Schedules Email** → Frontend sends POST request to `/api/emails`
2. **API Validation** → Server validates email format, scheduled time, and sender
3. **Database Persistence** → Email saved to Supabase with status `SCHEDULED`
4. **Queue Job Creation** → BullMQ job created with calculated delay
5. **Worker Processing** → At scheduled time, worker picks up job
6. **Rate Limit Check** → Verifies sender hasn't exceeded hourly limit
7. **Email Sending** → Sends via Nodemailer/SMTP
8. **Status Update** → Updates email status to `SENT` or `FAILED` in database
9. **Logging** → Creates email log entry for audit trail

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐      ┌──────────┐
│   Frontend  │ ───> │  Express API │ ───> │  Supabase   │      │  Redis   │
│   (React)   │      │  (Backend)   │      │  (Postgres) │      │ (BullMQ) │
└─────────────┘      └──────────────┘      └─────────────┘      └──────────┘
                            │                                          │
                            │                                          │
                            ▼                                          ▼
                     ┌──────────────┐                          ┌─────────────┐
                     │   BullMQ     │ <─────────────────────── │   Worker    │
                     │   Queue      │                          │  Processor  │
                     └──────────────┘                          └─────────────┘
                                                                      │
                                                                      ▼
                                                                ┌─────────────┐
                                                                │    SMTP     │
                                                                │   Server    │
                                                                └─────────────┘
```

### Persistence on Restart

**Problem:** When server restarts, in-memory queue jobs are lost.

**Solution:**

1. On server startup, `requeueOnRestart.ts` loader executes
2. Queries all emails with status `SCHEDULED` from database
3. Calculates remaining delay for each email
4. Re-adds jobs to BullMQ queue with correct delays
5. Ensures zero email loss during server restarts

**Implementation:**

```typescript
// backend/src/loaders/requeueOnRestart.ts
- Queries: SELECT * FROM emails WHERE status = 'SCHEDULED'
- For each email:
  - Calculate delay = scheduledAt - now()
  - If delay > 0: Add to queue with delay
  - If delay <= 0: Add to queue immediately (overdue)
```

### Rate Limiting Implementation

**Two-Layer Approach:**

**1. API Rate Limiting** (`apiRate.middleware.ts`)

- **Purpose:** Prevent API abuse
- **Limit:** 100 requests per 15 minutes per IP
- **Implementation:** Express-rate-limit middleware
- **Scope:** All API endpoints

**2. Per-Sender Email Rate Limiting** (`rateLimit.service.ts`)

- **Purpose:** Prevent spam and SMTP server bans
- **Limit:** 50 emails per hour per sender (configurable)
- **Implementation:** Redis counters with TTL
- **Scope:** Email sending in worker

**How it works:**

```typescript
// Redis key: `rate-limit:sender:${senderId}`
// On each email send:
1. Increment counter
2. Set 1-hour expiry
3. Check if counter > limit
4. If exceeded: Reject email, set status to FAILED
```

### Concurrency Implementation

**BullMQ Worker Concurrency:**

- **Setting:** 5 concurrent jobs (`emailWorker.ts`)
- **Behavior:** Worker processes up to 5 emails simultaneously
- **Benefits:** Faster bulk email processing
- **Safety:** Rate limiting prevents sender overload

**Configuration:**

```typescript
// backend/src/workers/emailWorker.ts
worker.concurrency = 5;
```

---

## ✨ Features Implemented

### Backend Features

| Feature                        | Implementation                   | Files                                            |
| ------------------------------ | -------------------------------- | ------------------------------------------------ |
| **Email Scheduling**           | BullMQ delayed jobs              | `queues/emailQueue.ts`, `workers/emailWorker.ts` |
| **Persistence on Restart**     | Requeue scheduled emails from DB | `loaders/requeueOnRestart.ts`                    |
| **Rate Limiting (API)**        | Express-rate-limit middleware    | `middlewares/apiRate.middleware.ts`              |
| **Rate Limiting (Per-Sender)** | Redis counters with TTL          | `services/rateLimit.service.ts`                  |
| **Concurrency Control**        | BullMQ worker concurrency = 5    | `workers/emailWorker.ts`                         |
| **Google OAuth**               | JWT token authentication         | `controllers/auth.controller.ts`                 |
| **Multi-Sender Support**       | Sender CRUD operations           | `services/sender.service.ts`                     |
| **Email CRUD**                 | Create, read, update, delete     | `services/email.service.ts`                      |
| **Email Logging**              | Audit trail for all emails       | `services/emailLog.service.ts`                   |
| **Idempotency**                | Prevent duplicate sends          | `email.service.ts` (idempotency_key)             |
| **SMTP Integration**           | Nodemailer with Ethereal         | `config/mailer.ts`                               |
| **Database**                   | Supabase PostgreSQL              | `config/supabase.ts`                             |
| **Data Transformation**        | Snake_case to camelCase          | `services/email.service.ts`                      |

### Frontend Features

| Feature                    | Implementation                | Files                       |
| -------------------------- | ----------------------------- | --------------------------- |
| **Google OAuth Login**     | @react-oauth/google           | `auth/GoogleAuth.tsx`       |
| **Authentication Context** | React Context API             | `auth/AuthContext.tsx`      |
| **Protected Routes**       | Route wrapper with auth check | `auth/RequireAuth.tsx`      |
| **Dashboard**              | Real-time email stats         | `pages/Dashboard.tsx`       |
| **Compose Email**          | Schedule email form           | `pages/ComposeEmail.tsx`    |
| **Scheduled Emails List**  | View all scheduled emails     | `pages/ScheduledEmails.tsx` |
| **Sent Emails List**       | View all sent emails          | `pages/SentEmails.tsx`      |
| **Card-Based Table**       | Responsive email cards        | `components/Table.tsx`      |
| **Status Badges**          | Color-coded email status      | `components/Badge.tsx`      |
| **Empty States**           | User-friendly no-data display | `components/EmptyState.tsx` |
| **API Service Layer**      | Centralized HTTP client       | `services/api.service.ts`   |
| **Date Formatting**        | Human-readable dates          | `utils/dateFormatter.ts`    |
| **Email Parsing**          | Parse comma/semicolon lists   | `utils/parseEmails.ts`      |

---

## 🚀 How to Run the Complete Application

### Step 1: Start Redis

**Windows:**

```powershell
# Download Redis from https://github.com/microsoftarchive/redis/releases
# Or use WSL
wsl
sudo service redis-server start
redis-cli ping  # Should return PONG
```

**macOS:**

```bash
brew services start redis
redis-cli ping  # Should return PONG
```

**Linux:**

```bash
sudo systemctl start redis
redis-cli ping  # Should return PONG
```

### Step 2: Setup Ethereal Email (for testing)

1. Go to https://ethereal.email/
2. Click **"Create Ethereal Account"**
3. Copy the credentials displayed:
   ```
   Host: smtp.ethereal.email
   Port: 587
   Username: your-generated-username@ethereal.email
   Password: your-generated-password
   ```
4. Use these in backend `.env`:
   ```env
   SMTP_HOST=smtp.ethereal.email
   SMTP_PORT=587
   SMTP_USER=your-generated-username@ethereal.email
   SMTP_PASS=your-generated-password
   ```

### Step 3: Setup Supabase Database

1. Go to https://supabase.com/ and create project
2. Go to **Settings → API**
3. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** → `SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`
4. Go to **SQL Editor** and run schema:
   ```sql
   -- See backend/prisma/schema.prisma for full schema
   -- Create tables: users, senders, emails, email_logs
   ```

### Step 4: Run Backend

```bash
cd backend

# Install dependencies
npm install

# Create .env file (see Backend README for full config)
cp .env.example .env
# Edit .env with your credentials

# Start server (includes BullMQ worker)
npm run dev

# Server will start on http://localhost:5000
# Worker starts automatically with concurrency = 5
```

**What starts:**

- ✅ Express API server on port 5000
- ✅ BullMQ email worker with 5 concurrent jobs
- ✅ Redis connection for queue storage
- ✅ Supabase database connection
- ✅ SMTP connection to Ethereal Email
- ✅ Restart recovery (requeues scheduled emails)

### Step 5: Run Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Add:
# VITE_API_URL=http://localhost:5000/api
# VITE_GOOGLE_CLIENT_ID=your-google-client-id

# Start development server
npm run dev

# Frontend will start on http://localhost:5173
```

### Step 6: Test the Application

1. Open http://localhost:5173
2. Click **"Sign in with Google"**
3. Compose a new email
4. Schedule it for 1 minute from now
5. Watch the dashboard update when email is sent
6. Check Ethereal inbox: https://ethereal.email/messages

---

## 📝 License

MIT
