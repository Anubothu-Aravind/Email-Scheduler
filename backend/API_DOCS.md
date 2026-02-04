# Supabase API Documentation

This document describes all available API endpoints for interacting with the Supabase database.

## Base URL

```
http://localhost:3000/api/supabase
```

## Authentication

Most endpoints require a JWT token. Include it in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## 🔐 Auth Endpoints

### Register User

Create a new user account.

**Endpoint:** `POST 
**Access:** Public

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "full_name": "John Doe" // optional
}
```

**Response (201):**

```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "created_at": "2026-01-30T10:00:00Z"
  },
  "token": "jwt-token-here"
}
```

---

### Login

Authenticate and get a JWT token.

**Endpoint:** `POST /auth/login`  
**Access:** Public

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200):**

```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "created_at": "2026-01-30T10:00:00Z"
  },
  "token": "jwt-token-here"
}
```

---

### Get Profile

Get the current user's profile.

**Endpoint:** `GET /auth/profile`  
**Access:** Private (requires token)

**Response (200):**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "created_at": "2026-01-30T10:00:00Z",
    "updated_at": "2026-01-30T10:00:00Z"
  }
}
```

---

### Update Profile

Update the current user's profile.

**Endpoint:** `PUT /auth/profile`  
**Access:** Private (requires token)

**Request Body:**

```json
{
  "full_name": "John Updated Doe",
  "email": "newemail@example.com" // optional
}
```

**Response (200):**

```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "uuid",
    "email": "newemail@example.com",
    "full_name": "John Updated Doe",
    "created_at": "2026-01-30T10:00:00Z",
    "updated_at": "2026-01-30T11:00:00Z"
  }
}
```

---

### Delete Account

Delete the current user's account and all associated data.

**Endpoint:** `DELETE /auth/profile`  
**Access:** Private (requires token)

**Response (200):**

```json
{
  "message": "Account deleted successfully"
}
```

---

### Get All Users (Admin)

Get all registered users.

**Endpoint:** `GET /users`  
**Access:** Private (requires token)

**Response (200):**

```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "created_at": "2026-01-30T10:00:00Z",
      "updated_at": "2026-01-30T10:00:00Z"
    }
  ],
  "count": 1
}
```

---

## 📧 Sender Endpoints

### Create Sender

Create a new sender identity.

**Endpoint:** `POST /senders`  
**Access:** Private (requires token)

**Request Body:**

```json
{
  "email": "marketing@mycompany.com",
  "name": "Marketing Team", // optional
  "is_default": true // optional, default: false
}
```

**Response (201):**

```json
{
  "message": "Sender created successfully",
  "sender": {
    "id": "uuid",
    "user_id": "uuid",
    "email": "marketing@mycompany.com",
    "name": "Marketing Team",
    "is_default": true,
    "created_at": "2026-01-30T10:00:00Z",
    "updated_at": "2026-01-30T10:00:00Z"
  }
}
```

---

### Get All Senders

Get all senders for the authenticated user.

**Endpoint:** `GET /senders`  
**Access:** Private (requires token)

**Response (200):**

```json
{
  "senders": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "email": "marketing@mycompany.com",
      "name": "Marketing Team",
      "is_default": true,
      "created_at": "2026-01-30T10:00:00Z",
      "updated_at": "2026-01-30T10:00:00Z"
    }
  ],
  "count": 1
}
```

---

### Get Sender by ID

Get a specific sender.

**Endpoint:** `GET /senders/:senderId`  
**Access:** Private (requires token)

**Response (200):**

```json
{
  "sender": {
    "id": "uuid",
    "user_id": "uuid",
    "email": "marketing@mycompany.com",
    "name": "Marketing Team",
    "is_default": true,
    "created_at": "2026-01-30T10:00:00Z",
    "updated_at": "2026-01-30T10:00:00Z"
  }
}
```

---

### Update Sender

Update a sender's details.

**Endpoint:** `PUT /senders/:senderId`  
**Access:** Private (requires token)

**Request Body:**

```json
{
  "email": "updated@mycompany.com", // optional
  "name": "Updated Name", // optional
  "is_default": false // optional
}
```

**Response (200):**

```json
{
  "message": "Sender updated successfully",
  "sender": {
    "id": "uuid",
    "user_id": "uuid",
    "email": "updated@mycompany.com",
    "name": "Updated Name",
    "is_default": false,
    "created_at": "2026-01-30T10:00:00Z",
    "updated_at": "2026-01-30T11:00:00Z"
  }
}
```

---

### Delete Sender

Delete a sender.

**Endpoint:** `DELETE /senders/:senderId`  
**Access:** Private (requires token)

**Response (200):**

```json
{
  "message": "Sender deleted successfully"
}
```

---

## 📬 Email Endpoints

### Schedule Email

Create and schedule a new email.

**Endpoint:** `POST /emails`  
**Access:** Private (requires token)

**Request Body:**

```json
{
  "sender_id": "uuid",
  "recipient_email": "recipient@example.com",
  "subject": "Hello from Email Scheduler",
  "body": "This is the email body content.",
  "scheduled_time": "2026-01-30T15:00:00Z",
  "idempotency_key": "unique-key-123" // optional
}
```

**Response (201):**

```json
{
  "message": "Email scheduled successfully",
  "email": {
    "id": "uuid",
    "user_id": "uuid",
    "sender_id": "uuid",
    "recipient_email": "recipient@example.com",
    "subject": "Hello from Email Scheduler",
    "body": "This is the email body content.",
    "scheduled_time": "2026-01-30T15:00:00Z",
    "status": "pending",
    "idempotency_key": "unique-key-123",
    "created_at": "2026-01-30T10:00:00Z",
    "updated_at": "2026-01-30T10:00:00Z"
  }
}
```

---

### Get All Emails

Get all emails for the authenticated user.

**Endpoint:** `GET /emails`  
**Access:** Private (requires token)

**Query Parameters:**

- `status` (optional): Filter by status (`pending`, `scheduled`, `sent`, `failed`, `cancelled`)
- `sender_id` (optional): Filter by sender UUID
- `limit` (optional): Number of results (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Example:** `GET /emails?status=pending&limit=50`

**Response (200):**

```json
{
  "emails": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "sender_id": "uuid",
      "recipient_email": "recipient@example.com",
      "subject": "Hello from Email Scheduler",
      "body": "This is the email body content.",
      "scheduled_time": "2026-01-30T15:00:00Z",
      "status": "pending",
      "idempotency_key": "unique-key-123",
      "error_message": null,
      "sent_at": null,
      "created_at": "2026-01-30T10:00:00Z",
      "updated_at": "2026-01-30T10:00:00Z",
      "senders": {
        "id": "uuid",
        "email": "marketing@mycompany.com",
        "name": "Marketing Team"
      }
    }
  ],
  "count": 1
}
```

---

### Get Email by ID

Get a specific email.

**Endpoint:** `GET /emails/:emailId`  
**Access:** Private (requires token)

**Response (200):**

```json
{
  "email": {
    "id": "uuid",
    "user_id": "uuid",
    "sender_id": "uuid",
    "recipient_email": "recipient@example.com",
    "subject": "Hello from Email Scheduler",
    "body": "This is the email body content.",
    "scheduled_time": "2026-01-30T15:00:00Z",
    "status": "pending",
    "idempotency_key": "unique-key-123",
    "error_message": null,
    "sent_at": null,
    "created_at": "2026-01-30T10:00:00Z",
    "updated_at": "2026-01-30T10:00:00Z",
    "senders": {
      "id": "uuid",
      "email": "marketing@mycompany.com",
      "name": "Marketing Team"
    }
  }
}
```

---

### Update Email

Update an email (only for pending/scheduled emails).

**Endpoint:** `PUT /emails/:emailId`  
**Access:** Private (requires token)

**Request Body:**

```json
{
  "recipient_email": "newrecipient@example.com", // optional
  "subject": "Updated Subject", // optional
  "body": "Updated body content.", // optional
  "scheduled_time": "2026-01-31T15:00:00Z", // optional
  "status": "scheduled" // optional
}
```

**Response (200):**

```json
{
  "message": "Email updated successfully",
  "email": {
    "id": "uuid",
    "recipient_email": "newrecipient@example.com",
    "subject": "Updated Subject",
    "body": "Updated body content.",
    "scheduled_time": "2026-01-31T15:00:00Z",
    "status": "scheduled",
    "updated_at": "2026-01-30T11:00:00Z"
  }
}
```

---

### Cancel/Delete Email

Cancel (soft delete) or permanently delete an email.

**Endpoint:** `DELETE /emails/:emailId`  
**Access:** Private (requires token)

**Query Parameters:**

- `hard_delete` (optional): Set to `true` to permanently delete

**Examples:**

- `DELETE /emails/uuid` - Marks as cancelled
- `DELETE /emails/uuid?hard_delete=true` - Permanently deletes

**Response (200) - Soft Delete:**

```json
{
  "message": "Email cancelled successfully",
  "email": {
    "id": "uuid",
    "status": "cancelled",
    "updated_at": "2026-01-30T11:00:00Z"
  }
}
```

**Response (200) - Hard Delete:**

```json
{
  "message": "Email deleted successfully"
}
```

---

## 📋 Email Log Endpoints

### Create Email Log

Create a log entry for an email.

**Endpoint:** `POST /email-logs`  
**Access:** Private (requires token)

**Request Body:**

```json
{
  "email_id": "uuid",
  "status": "sent", // optional
  "message": "Email delivered successfully" // optional
}
```

**Response (201):**

```json
{
  "message": "Email log created successfully",
  "email_log": {
    "id": "uuid",
    "email_id": "uuid",
    "status": "sent",
    "message": "Email delivered successfully",
    "attempted_at": "2026-01-30T10:00:00Z",
    "created_at": "2026-01-30T10:00:00Z"
  }
}
```

---

### Get All Email Logs

Get all email logs for the authenticated user.

**Endpoint:** `GET /email-logs`  
**Access:** Private (requires token)

**Query Parameters:**

- `status` (optional): Filter by status
- `limit` (optional): Number of results (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response (200):**

```json
{
  "logs": [
    {
      "id": "uuid",
      "email_id": "uuid",
      "status": "sent",
      "message": "Email delivered successfully",
      "attempted_at": "2026-01-30T10:00:00Z",
      "created_at": "2026-01-30T10:00:00Z",
      "emails": {
        "id": "uuid",
        "subject": "Hello from Email Scheduler",
        "recipient_email": "recipient@example.com"
      }
    }
  ],
  "count": 1
}
```

---

### Get Email Logs by Email ID

Get all logs for a specific email.

**Endpoint:** `GET /email-logs/:emailId`  
**Access:** Private (requires token)

**Response (200):**

```json
{
  "logs": [
    {
      "id": "uuid",
      "email_id": "uuid",
      "status": "sent",
      "message": "Email delivered successfully",
      "attempted_at": "2026-01-30T10:00:00Z",
      "created_at": "2026-01-30T10:00:00Z"
    }
  ],
  "count": 1
}
```

---

### Delete Email Log

Delete a specific log entry.

**Endpoint:** `DELETE /email-logs/:logId`  
**Access:** Private (requires token)

**Response (200):**

```json
{
  "message": "Email log deleted successfully"
}
```

---

## 📊 Statistics Endpoint

### Get Dashboard Stats

Get email statistics for the authenticated user.

**Endpoint:** `GET /stats`  
**Access:** Private (requires token)

**Response (200):**

```json
{
  "stats": {
    "totalEmails": 25,
    "emailsByStatus": {
      "pending": 5,
      "scheduled": 8,
      "sent": 10,
      "failed": 1,
      "cancelled": 1
    },
    "totalSenders": 3,
    "recentActivity": {
      "emailsCreated": 12,
      "period": "7 days"
    }
  }
}
```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request

```json
{
  "error": "Validation error",
  "details": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["email"],
      "message": "Required"
    }
  ]
}
```

### 401 Unauthorized

```json
{
  "error": "No token provided"
}
```

or

```json
{
  "error": "Invalid or expired token"
}
```

### 403 Forbidden

```json
{
  "error": "Access denied"
}
```

### 404 Not Found

```json
{
  "error": "Resource not found"
}
```

### 409 Conflict

```json
{
  "error": "Email with this idempotency key already exists"
}
```

### 500 Internal Server Error

```json
{
  "error": "Failed to perform action",
  "details": "Error message from database"
}
```

---

## Quick Start Examples

### Using cURL

**1. Register a new user:**

```bash
curl -X POST http://localhost:3000/api/supabase/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123", "full_name": "Test User"}'
```

**2. Login and get token:**

```bash
curl -X POST http://localhost:3000/api/supabase/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

**3. Create a sender (with token):**

```bash
curl -X POST http://localhost:3000/api/supabase/senders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"email": "sender@example.com", "name": "My Sender", "is_default": true}'
```

**4. Schedule an email:**

```bash
curl -X POST http://localhost:3000/api/supabase/emails \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "sender_id": "SENDER_UUID",
    "recipient_email": "recipient@example.com",
    "subject": "Test Email",
    "body": "Hello, this is a test!",
    "scheduled_time": "2026-01-30T15:00:00Z"
  }'
```

**5. Get all emails:**

```bash
curl -X GET "http://localhost:3000/api/supabase/emails?status=pending" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Running the Seed Script

To populate your database with sample data:

```bash
npm run seed:supabase
```

This will create:

- 2 test users
- 3 senders
- 5 sample emails (various statuses)
- 3 email logs

Test credentials after seeding:

- `john@example.com` / `password123`
- `jane@example.com` / `password456`
