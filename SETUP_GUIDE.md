# 🚀 Email Scheduler - Complete Setup & Execution Guide

This guide will help you set up and run the Email Scheduler application step-by-step.

---

## 📋 Prerequisites Checklist

Before starting, make sure you have:

- ✅ Node.js 18+ installed
- ✅ Redis installed (or cloud Redis URL)
- ✅ Supabase account
- ✅ SMTP credentials (Ethereal Email for testing)

---

## ⚡ Quick Start (5 Minutes)

### Step 1: Install Dependencies

```bash
# Navigate to project root
cd email-scheduler

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2: Setup Supabase Database

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**: `jaarbpqxaitkdsyeleuw`
3. **Open SQL Editor**
4. **Run this SQL**:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  google_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create senders table
CREATE TABLE IF NOT EXISTS senders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_user TEXT,
  smtp_pass TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create emails table
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES senders(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  html_body TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  attempt_count INTEGER DEFAULT 0,
  error_message TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_emails_sender_id ON emails(sender_id);
CREATE INDEX IF NOT EXISTS idx_emails_status ON emails(status);
CREATE INDEX IF NOT EXISTS idx_emails_scheduled_at ON emails(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_senders_user_id ON senders(user_id);
```

### Step 3: Create Test User & Sender

**Still in Supabase SQL Editor, run:**

```sql
-- Insert a test user
INSERT INTO users (email, name)
VALUES ('test@example.com', 'Test User')
RETURNING id;

-- Copy the returned ID and use it below
-- Replace 'YOUR_USER_ID_HERE' with the actual ID from above
INSERT INTO senders (user_id, name, email, smtp_host, smtp_port, smtp_user, smtp_pass)
VALUES (
  'YOUR_USER_ID_HERE',
  'Test Sender',
  'test@example.com',
  'smtp.ethereal.email',
  587,
  'your-ethereal-username',
  'your-ethereal-password'
);
```

**Get Ethereal Email credentials**:

1. Go to https://ethereal.email/create
2. Click "Create Ethereal Account"
3. Copy the username and password
4. Replace them in the SQL above

### Step 4: Configure Environment Variables

#### Backend (.env file)

Create `backend/.env`:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Secret (use this exact value for testing)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Supabase Configuration
SUPABASE_URL=https://jaarbpqxaitkdsyeleuw.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphYXJicHF4YWl0a2RzeWVsZXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzQzMDcsImV4cCI6MjA4NTI1MDMwN30.VT_TBg55QGd-L90MQxv13pXYLc6NJAc7J-UGI3yJAyQ
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphYXJicHF4YWl0a2RzeWVsZXV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTY3NDMwNywiZXhwIjoyMDg1MjUwMzA3fQ.your-service-role-key

# Redis Configuration (local)
REDIS_HOST=localhost
REDIS_PORT=6379

# SMTP Configuration (use Ethereal Email for testing)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your-ethereal-username@ethereal.email
SMTP_PASS=your-ethereal-password
SMTP_FROM_NAME=Email Scheduler
SMTP_FROM_EMAIL=noreply@emailscheduler.com
```

**Note**: Replace Ethereal credentials with your actual ones from step 3.

#### Frontend (.env file)

Create `frontend/.env`:

```env
# API Base URL
VITE_API_BASE_URL=http://localhost:5000/api

# Google OAuth (optional)
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### Step 5: Start Redis

**Windows (using Memurai):**

```bash
# Download from https://www.memurai.com/
# Install and start Memurai service
# Or start Redis from command line:
redis-server
```

**Verify Redis is running:**

```bash
redis-cli ping
# Should return: PONG
```

**Alternative: Use Cloud Redis**

- Sign up at https://upstash.com/ (free tier)
- Create a Redis database
- Copy the Redis URL
- Update `backend/.env`:
  ```env
  REDIS_URL=redis://default:your-password@your-redis-url.upstash.io:6379
  ```

### Step 6: Start the Application

**Terminal 1 - Backend:**

```bash
cd backend
npm run dev
```

**Expected output:**

```
🚀 Server running on port 5000
✅ Connected to Supabase
✅ Redis connected
✅ Email worker started
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

**Expected output:**

```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 7: Login to the Application

**Option A: Generate JWT Token (Easiest)**

1. **Create a Node.js script** `generate-token.js`:

```javascript
const jwt = require("jsonwebtoken");

// Get your user ID from Supabase (Step 3)
const userId = "YOUR_USER_ID_HERE"; // Replace with actual UUID
const email = "test@example.com";

const token = jwt.sign(
  { userId, email },
  "your-super-secret-jwt-key-change-this-in-production",
  { expiresIn: "7d" },
);

console.log("\n=== JWT Token ===");
console.log(token);
console.log("\n=== User Data ===");
console.log(JSON.stringify({ id: userId, email, name: "Test User" }));
```

2. **Run it:**

```bash
node generate-token.js
```

3. **Open browser** → Go to `http://localhost:5173`
4. **Open DevTools** (F12) → Console tab
5. **Paste this** (replace with your token and user data):

```javascript
localStorage.setItem("authToken", "YOUR_JWT_TOKEN_HERE");
localStorage.setItem(
  "user",
  '{"id":"YOUR_USER_ID","email":"test@example.com","name":"Test User"}',
);
window.location.reload();
```

**Option B: Use Online JWT Generator**

1. Go to https://jwt.io/
2. **Payload**:
   ```json
   {
     "userId": "YOUR_USER_ID_HERE",
     "email": "test@example.com"
   }
   ```
3. **Secret**: `your-super-secret-jwt-key-change-this-in-production`
4. Copy the token
5. Use step 5 from Option A to set localStorage

---

## ✅ Testing the Compose Feature

### Test 1: Verify Senders Are Loading

1. Open browser DevTools (F12) → Network tab
2. Click "Compose" button
3. Check for `/api/emails/senders` request
4. Should return 200 OK with your senders

**If you get 500 error:**

- Check backend terminal for error logs
- Verify user ID in JWT token matches user in database
- Check Supabase connection

### Test 2: Send a Test Email

1. **Click "Compose"**
2. **From**: Select your sender
3. **To**: Enter `recipient@test.com`
4. **Subject**: "Test Email"
5. **Body**: "Hello, this is a test!"
6. **Click "Send Later"**
7. **Pick tomorrow 11 AM**
8. **Click "Schedule"**

**Expected:**

- Success message: "✅ 1 email(s) scheduled successfully!"
- Compose window closes
- Email appears in "Scheduled" tab

### Test 3: View Scheduled Email

1. Go to **Scheduled** tab
2. You should see your email listed
3. Click on it to view details
4. Hover over email to see cancel button

---

## 🔧 Troubleshooting

### Problem: "500 Internal Server Error" on `/api/emails/senders`

**Solutions:**

1. **Check backend logs** - Look for error messages in the terminal
2. **Verify JWT token**:
   ```javascript
   // In browser console
   console.log(localStorage.getItem("authToken"));
   ```
3. **Check user exists in database**:
   ```sql
   -- In Supabase SQL Editor
   SELECT * FROM users WHERE email = 'test@example.com';
   ```
4. **Verify sender exists**:
   ```sql
   SELECT * FROM senders WHERE user_id = 'YOUR_USER_ID';
   ```

### Problem: "No sender available"

**Solution:**

```sql
-- Run this in Supabase to add a sender
INSERT INTO senders (user_id, name, email, smtp_host, smtp_port, smtp_user, smtp_pass)
VALUES (
  'YOUR_USER_ID',
  'My Sender',
  'sender@example.com',
  'smtp.ethereal.email',
  587,
  'ethereal-username',
  'ethereal-password'
);
```

### Problem: Redis connection error

**Solutions:**

- Make sure Redis is running: `redis-cli ping`
- Check Redis port: default is 6379
- For cloud Redis, verify `REDIS_URL` in `.env`

### Problem: Emails not sending

**Check:**

1. **Backend worker is running** - Look for "✅ Email worker started" in terminal
2. **SMTP credentials are correct** - Check Ethereal Email dashboard
3. **Schedule time is in the future**
4. **Check email_logs table** in Supabase for error messages

### Problem: Frontend can't connect to backend

**Solutions:**

- Verify backend is running on port 5000
- Check `VITE_API_BASE_URL` in `frontend/.env`
- Check CORS settings in backend (should allow `http://localhost:5173`)

---

## 📊 Verify Everything is Working

### Backend Health Check

**Terminal:**

```bash
curl http://localhost:5000/api/health
```

**Expected**: Server response (may need to add health endpoint)

### Database Check

**Supabase SQL Editor:**

```sql
-- Check all data
SELECT * FROM users;
SELECT * FROM senders;
SELECT * FROM emails ORDER BY created_at DESC LIMIT 10;
SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 10;
```

### Redis Check

**Terminal:**

```bash
redis-cli
> KEYS *
> EXIT
```

---

## 🎯 Complete Workflow Test

1. ✅ Start backend → See connection messages
2. ✅ Start frontend → Open in browser
3. ✅ Login → Set JWT token in localStorage
4. ✅ Click Compose → No errors
5. ✅ See sender in dropdown
6. ✅ Add recipient
7. ✅ Fill subject and body
8. ✅ Schedule email
9. ✅ See success message
10. ✅ Check Scheduled tab → Email appears
11. ✅ Check Supabase → Email in database with status "SCHEDULED"

---

## 📝 Common Commands

```bash
# Backend
cd backend
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server

# Frontend
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Redis
redis-cli ping       # Check if Redis is running
redis-cli            # Open Redis CLI
redis-cli FLUSHALL   # Clear all Redis data (use carefully!)

# Database
# Use Supabase dashboard SQL Editor for queries
```

---

## 🐛 Enable Debug Mode

Add to `backend/.env`:

```env
DEBUG=*
LOG_LEVEL=debug
```

This will show detailed logs in the backend terminal.

---

## 📞 Still Having Issues?

1. **Check backend terminal** for error messages
2. **Check browser console** (F12) for frontend errors
3. **Check Supabase logs** in the dashboard
4. **Verify all environment variables** are set correctly
5. **Make sure all services are running**:
   - ✅ Redis
   - ✅ Backend on port 5000
   - ✅ Frontend on port 5173

---

## 🎉 Success!

If you can compose and schedule an email successfully, everything is working!

Next steps:

- Add more senders
- Schedule bulk emails
- Upload CSV recipient lists
- Check email logs
- Monitor sent emails

---

**Need help?** Check the main README.md for more detailed information.
