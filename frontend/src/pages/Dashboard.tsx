import { useState, useEffect } from 'react';
import { ComposeEmail } from './ComposeEmail';
import { useAuth } from '../auth';
import { emailService } from '../services/email.service';
import type { ScheduledEmail, SentEmail, EmailStats } from '../types';

type Tab = 'scheduled' | 'sent';
type ViewMode = 'list' | 'compose' | 'detail';

// Format time for display like "Tue 8:15:12 AM"
const formatScheduleTime = (dateString: string) => {
  const date = new Date(dateString);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const day = days[date.getDay()];
  const time = date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: true 
  });
  return `${day} ${time}`;
};

// Format date for detail view like "Nov 3, 10:23 AM"
const formatDetailDate = (dateString: string) => {
  const date = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const time = date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  return `${month} ${day}, ${time}`;
};

export const Dashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('scheduled');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedEmail, setSelectedEmail] = useState<ScheduledEmail | SentEmail | null>(null);
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [scheduledRes, sentRes, statsRes] = await Promise.all([
        emailService.getScheduledEmails(),
        emailService.getSentEmails(),
        emailService.getEmailStats()
      ]);

      if (scheduledRes.success && scheduledRes.data) {
        setScheduledEmails(scheduledRes.data.data);
      }
      if (sentRes.success && sentRes.data) {
        setSentEmails(sentRes.data.data);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
    setIsLoading(false);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const handleEmailClick = (email: ScheduledEmail | SentEmail) => {
    setSelectedEmail(email);
    setViewMode('detail');
  };

  const filteredScheduledEmails = scheduledEmails.filter(email => 
    email.recipientEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (email.recipientName?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredSentEmails = sentEmails.filter(email => 
    email.recipientEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (email.recipientName?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Compose View
  if (viewMode === 'compose') {
    return (
      <ComposeEmail onClose={() => {
        setViewMode('list');
        fetchData();
      }} />
    );
  }

  // Email Detail View
  if (viewMode === 'detail' && selectedEmail) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 px-6 py-4 flex items-center gap-4">
          <button 
            onClick={() => setViewMode('list')} 
            className="text-white hover:text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-white text-lg font-medium truncate">
            {selectedEmail.recipientName || selectedEmail.recipientEmail}, {selectedEmail.subject}
          </h1>
        </div>

        {/* Email Content */}
        <div className="flex-1 bg-white overflow-auto">
          <div className="max-w-4xl mx-auto py-8 px-6">
            {/* Sender Info */}
            <div className="flex items-start gap-4 mb-6 pb-6 border-b border-gray-100">
              <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center text-white font-medium">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{user?.name || 'User'}</span>
                  <span className="text-gray-400 text-sm">&lt;{user?.email}&gt;</span>
                </div>
                <div className="text-sm text-gray-500">
                  to {selectedEmail.recipientName || selectedEmail.recipientEmail}
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {formatDetailDate('scheduledAt' in selectedEmail ? selectedEmail.scheduledAt : selectedEmail.sentAt || '')}
              </div>
            </div>

            {/* Subject */}
            <h2 className="text-xl font-medium text-gray-900 mb-6">{selectedEmail.subject}</h2>

            {/* Body */}
            <div className="prose prose-gray max-w-none">
              <div className="whitespace-pre-wrap text-gray-700">{selectedEmail.body}</div>
            </div>

            {/* Status Badge */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              {'status' in selectedEmail && (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  selectedEmail.status === 'SENT'
                    ? 'bg-green-100 text-green-700'
                    : selectedEmail.status === 'FAILED'
                    ? 'bg-red-100 text-red-700'
                    : selectedEmail.status === 'RETRYING'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {selectedEmail.status}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Homepage link */}
        <div className="bg-gray-800 px-6 py-3 text-center">
          <span className="text-gray-400 text-sm">Homepage</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <aside className="w-50 border-r border-gray-200 flex flex-col min-h-screen">
        {/* Logo */}
        <div className="p-4">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">ONB</h1>
        </div>

        {/* User Profile */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2">
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user?.name || 'User'}
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-medium">
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <button onClick={logout} className="text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Compose Button */}
        <div className="px-4 py-3">
          <button
            onClick={() => setViewMode('compose')}
            className="w-full py-2.5 px-4 border-2 border-green-500 text-green-600 font-medium rounded-lg hover:bg-green-50 transition-colors"
          >
            Compose
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4">
          <p className="px-3 text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Core</p>
          
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'scheduled'
                ? 'bg-green-50 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Scheduled
            </div>
            <span className={`text-xs px-1.5 py-0.5 rounded ${activeTab === 'scheduled' ? 'bg-green-100 text-green-700' : 'text-gray-400'}`}>
              {stats?.totalScheduled || scheduledEmails.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('sent')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors mt-1 ${
              activeTab === 'sent'
                ? 'bg-green-50 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Sent
            </div>
            <span className={`text-xs px-1.5 py-0.5 rounded ${activeTab === 'sent' ? 'bg-green-100 text-green-700' : 'text-gray-400'}`}>
              {stats?.totalSent || sentEmails.length}
            </span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Search Header */}
        <div className="border-b border-gray-200 px-6 py-3">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50"
              />
            </div>
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
            <button onClick={handleRefresh} className="p-2 text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
          ) : activeTab === 'scheduled' ? (
            filteredScheduledEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <svg className="w-12 h-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="font-medium">No scheduled emails</p>
                <p className="text-sm">Click Compose to create a new email</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredScheduledEmails.map((email) => (
                  <div 
                    key={email.id} 
                    onClick={() => handleEmailClick(email)}
                    className="flex items-center px-6 py-3 hover:bg-gray-50 cursor-pointer group"
                  >
                    <div className="w-45 text-sm text-gray-600">
                      To: {email.recipientName || email.recipientEmail?.split('@')[0] || 'Unknown'}
                    </div>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-600 whitespace-nowrap">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatScheduleTime(email.scheduledAt)}
                      </span>
                      <span className="font-medium text-gray-900 truncate">{email.subject || 'No subject'}</span>
                      <span className="text-gray-400">-</span>
                      <span className="text-gray-500 truncate text-sm">{email.body?.substring(0, 50) || 'No content'}...</span>
                    </div>
                    <button className="p-1 text-gray-300 hover:text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : (
            filteredSentEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <svg className="w-12 h-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="font-medium">No sent emails</p>
                <p className="text-sm">Sent emails will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredSentEmails.map((email) => (
                  <div 
                    key={email.id} 
                    onClick={() => handleEmailClick(email)}
                    className="flex items-center px-6 py-3 hover:bg-gray-50 cursor-pointer group"
                  >
                    <div className="w-45 text-sm text-gray-600">
                      To: {email.recipientName || email.recipientEmail?.split('@')[0] || 'Unknown'}
                    </div>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 whitespace-nowrap">
                        Sent
                      </span>
                      <span className="font-medium text-gray-900 truncate">{email.subject || 'No subject'}</span>
                      <span className="text-gray-400">-</span>
                      <span className="text-gray-500 truncate text-sm">{email.body?.substring(0, 50) || 'No content'}...</span>
                    </div>
                    <button className="p-1 text-gray-300 hover:text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
};
