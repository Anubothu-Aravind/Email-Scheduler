/**
 * TypeScript Types and Interfaces for Supabase API
 * This file contains all type definitions used throughout the application
 */

// ============================================================================
// AUTH TYPES
// ============================================================================

export interface User {
  id: string;
  email: string;
  name?: string | null;
  password: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name?: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
}

export interface AuthResponse {
  message: string;
  user: {
    id: string;
    email: string;
    name?: string | null;
    createdAt: string;
  };
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  user: {
    id: string;
    email: string;
    name?: string | null;
  };
  token: string;
}

export interface ProfileResponse {
  user: {
    id: string;
    email: string;
    name?: string | null;
    createdAt: string;
  };
}

// ============================================================================
// SENDER TYPES
// ============================================================================

export interface Sender {
  id: string;
  userId: string;
  name: string;
  email: string;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPass?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSenderRequest {
  name: string;
  email: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
}

export interface UpdateSenderRequest {
  name?: string;
  email?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
}

export interface CreateSenderResponse {
  message: string;
  sender: Sender;
}

export interface UpdateSenderResponse {
  message: string;
  sender: Sender;
}

export interface GetSendersResponse {
  senders: Sender[];
  count: number;
}

export interface DeleteSenderResponse {
  message: string;
}

// ============================================================================
// EMAIL TYPES
// ============================================================================

export type EmailStatus = 'SCHEDULED' | 'RETRYING' | 'SENT' | 'FAILED';

export interface Email {
  id: string;
  senderId: string;
  recipientEmail: string;
  recipientName?: string | null;
  subject: string;
  body: string;
  htmlBody?: string | null;
  scheduledAt: string;
  sentAt?: string | null;
  status: EmailStatus;
  attemptCount: number;
  errorMessage?: string | null;
  idempotencyKey?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleEmailRequest {
  senderId: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  body: string;
  htmlBody?: string;
  scheduledAt: string;
  idempotencyKey?: string;
}

export interface ScheduleEmailResponse {
  message: string;
  email: Email;
}

export interface GetEmailsQuery {
  senderId?: string;
  status?: EmailStatus;
  limit?: number;
  offset?: number;
}

export interface GetEmailsResponse {
  emails: Email[];
  count: number;
}

export interface EmailWithLogs {
  email: Email;
  logs: EmailLog[];
}

export interface GetEmailResponse {
  email: Email;
  logs: EmailLog[];
}

export interface CancelEmailResponse {
  message: string;
}

// ============================================================================
// EMAIL LOG TYPES
// ============================================================================

export interface EmailLog {
  id: string;
  emailId: string;
  status: string;
  message: string;
  metadata?: Record<string, any> | null;
  createdAt: string;
}

export interface CreateEmailLogRequest {
  emailId: string;
  status: string;
  message: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface ValidationError {
  code: string;
  expected: string;
  received: string;
  path: (string | number)[];
  message: string;
}

export interface ErrorResponse {
  error: string;
  details?: ValidationError[];
}

// ============================================================================
// PAGINATION TYPES
// ============================================================================

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  total?: number;
  page?: number;
}

// ============================================================================
// REQUEST/RESPONSE ENVELOPES
// ============================================================================

export interface ApiResponse<T> {
  message?: string;
  data?: T;
  error?: string;
  statusCode: number;
}

export interface SuccessResponse<T> {
  message: string;
  data: T;
}

export interface ErrorResponseEnvelope {
  error: string;
  details?: any;
  statusCode: number;
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface EmailFilters {
  status?: EmailStatus;
  senderId?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

export interface UserFilters {
  email?: string;
  id?: string;
}

export interface SenderFilters {
  userId: string;
  id?: string;
}

// ============================================================================
// SERVICE LAYER TYPES
// ============================================================================

export interface IUserService {
  createUser(data: CreateUserRequest & { password: string }): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  updateUser(id: string, data: UpdateUserRequest): Promise<User>;
  deleteUser(id: string): Promise<void>;
  userExists(email: string): Promise<boolean>;
}

export interface ISenderService {
  createSender(data: CreateSenderRequest & { userId: string }): Promise<Sender>;
  getSenderById(id: string, userId?: string): Promise<Sender | null>;
  getSendersByUserId(userId: string): Promise<Sender[]>;
  updateSender(id: string, userId: string, data: UpdateSenderRequest): Promise<Sender>;
  deleteSender(id: string, userId: string): Promise<void>;
}

export interface IEmailService {
  createEmail(data: ScheduleEmailRequest): Promise<Email>;
  getEmailById(id: string): Promise<Email | null>;
  getEmailsBySenderId(
    senderId: string,
    filters?: PaginationParams & { status?: EmailStatus }
  ): Promise<Email[]>;
  getEmailsByUserId(
    userId: string,
    filters?: PaginationParams & { status?: EmailStatus }
  ): Promise<Email[]>;
  updateEmail(id: string, data: Partial<Email>): Promise<Email>;
  deleteEmail(id: string): Promise<void>;
  getPendingEmails(limit?: number): Promise<Email[]>;
  getEmailByIdempotencyKey(key: string): Promise<Email | null>;
}

export interface IEmailLogService {
  createEmailLog(data: CreateEmailLogRequest): Promise<EmailLog>;
  getEmailLogs(emailId: string): Promise<EmailLog[]>;
  deleteEmailLogs(emailId: string): Promise<void>;
}

// ============================================================================
// MIDDLEWARE CONTEXT TYPES
// ============================================================================

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

export interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

// ============================================================================
// DATABASE ROW TYPES (Raw from Supabase)
// ============================================================================

export interface UserRow {
  id: string;
  email: string;
  password: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface SenderRow {
  id: string;
  user_id: string;
  name: string;
  email: string;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  smtp_pass: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailRow {
  id: string;
  sender_id: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  body: string;
  html_body: string | null;
  scheduled_at: string;
  sent_at: string | null;
  status: EmailStatus;
  attempt_count: number;
  error_message: string | null;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailLogRow {
  id: string;
  email_id: string;
  status: string;
  message: string;
  metadata: Record<string, any> | null;
  created_at: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncFunction<T, R> = (arg: T) => Promise<R>;

export interface QueryResult<T> {
  data: T | null;
  error: Error | null;
}

// ============================================================================
// CONFIG TYPES
// ============================================================================

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  jwtSecret: string;
  corsOrigin: string;
  supabase: SupabaseConfig;
}
