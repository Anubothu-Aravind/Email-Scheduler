import { apiClient } from './api.service';
import type {
  EmailData,
  ScheduledEmail,
  SentEmail,
  EmailStats,
  ApiResponse,
  PaginatedResponse,
} from '../types';

export const emailService = {
  // Schedule new email
  async scheduleEmail(data: EmailData): Promise<ApiResponse<{ jobId: string }>> {
    return apiClient.post('/emails/schedule', data);
  },

  // Get scheduled emails (using status filter)
  async getScheduledEmails(
    page = 1,
    pageSize = 50
  ): Promise<ApiResponse<PaginatedResponse<ScheduledEmail>>> {
    return apiClient.get('/emails', { status: 'SCHEDULED,RETRYING', page, limit: pageSize });
  },

  // Get sent emails (using status filter)
  async getSentEmails(
    page = 1,
    pageSize = 50
  ): Promise<ApiResponse<PaginatedResponse<SentEmail>>> {
    return apiClient.get('/emails', { status: 'SENT,FAILED', page, limit: pageSize });
  },

  // Get email statistics
  async getEmailStats(): Promise<ApiResponse<EmailStats>> {
    return apiClient.get('/emails/stats');
  },

  // Cancel scheduled email
  async cancelScheduledEmail(emailId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/emails/${emailId}`);
  },

  // Retry failed email
  async retryFailedEmail(emailId: string): Promise<ApiResponse<void>> {
    return apiClient.post(`/emails/${emailId}/retry`);
  },
};
