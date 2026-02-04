export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface ScheduleConfig {
  startTime: string; // ISO 8601 format
  delayBetweenEmails: number; // in seconds
  hourlyLimit: number;
}

export interface EmailData {
  subject: string;
  body: string;
  recipients: EmailRecipient[];
  scheduleConfig: ScheduleConfig;
}

export interface ScheduledEmail {
  id: string;
  recipientEmail: string;
  recipientName?: string | null;
  subject: string;
  body: string;
  htmlBody?: string | null;
  scheduledAt: string;
  status: 'SCHEDULED' | 'RETRYING' | 'FAILED';
  createdAt: string;
  updatedAt: string;
}

export interface SentEmail {
  id: string;
  recipientEmail: string;
  recipientName?: string | null;
  subject: string;
  body: string;
  htmlBody?: string | null;
  sentAt: string | null;
  status: 'SENT' | 'FAILED';
  errorMessage?: string | null;
  createdAt: string;
}

export interface EmailStats {
  totalScheduled: number;
  totalSent: number;
  totalFailed: number;
  pendingToday: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
