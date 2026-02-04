import { useEffect, useState } from 'react';
import { Table, Badge, EmptyState, LoadingSkeleton } from '../components';
import type { SentEmail } from '../types';
import { emailService } from '../services/email.service';
import { formatDate } from '../utils/dateFormatter';

export const SentEmails = () => {
  const [emails, setEmails] = useState<SentEmail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSentEmails();
  }, []);

  const fetchSentEmails = async () => {
    setIsLoading(true);
    const response = await emailService.getSentEmails();

    if (response.success && response.data) {
      setEmails(response.data.data);
    } else {
      setError(response.error || 'Failed to fetch sent emails');
    }

    setIsLoading(false);
  };

  const getStatusBadge = (status: SentEmail['status']) => {
    const statusConfig: Record<string, { variant: 'success' | 'danger'; label: string }> = {
      SENT: { variant: 'success', label: 'Sent' },
      FAILED: { variant: 'danger', label: 'Failed' },
    };

    const config = statusConfig[status] || { variant: 'danger', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const columns = [
    {
      key: 'recipientEmail',
      header: 'Recipient',
      render: (email: SentEmail) => (
        <div>
          <div className="font-medium">{email.recipientEmail}</div>
          {email.recipientName && (
            <div className="text-xs text-gray-500">{email.recipientName}</div>
          )}
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (email: SentEmail) => (
        <div className="max-w-md truncate" title={email.subject}>
          {email.subject}
        </div>
      ),
    },
    {
      key: 'sentAt',
      header: 'Sent Time',
      render: (email: SentEmail) => email.sentAt ? formatDate(email.sentAt) : 'N/A',
    },
    {
      key: 'status',
      header: 'Status',
      render: (email: SentEmail) => (
        <div>
          {getStatusBadge(email.status)}
          {email.errorMessage && (
            <div className="text-xs text-red-600 mt-1" title={email.errorMessage}>
              {email.errorMessage.substring(0, 50)}...
            </div>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingSkeleton rows={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        }
        title="No sent emails yet"
        description="Your sent emails will appear here once they have been delivered."
      />
    );
  }

  return (
    <div className="p-6">
      <Table
        columns={columns}
        data={emails}
        keyExtractor={(email) => email.id}
      />
    </div>
  );
};
