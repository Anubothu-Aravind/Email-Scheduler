import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import type { EmailRecipient } from '../types';
import { parseCSV, parseEmails } from '../utils/parseEmails';
import { useAuth } from '../auth';
import { apiClient } from '../services/api.service';

interface Sender {
  id: string;
  name: string;
  email: string;
}

interface ComposeEmailProps {
  onClose: () => void;
}

export const ComposeEmail = ({ onClose }: ComposeEmailProps) => {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [recipientInput, setRecipientInput] = useState('');
  const [startTime, setStartTime] = useState('');
  const [delayBetweenEmails, setDelayBetweenEmails] = useState(0);
  const [hourlyLimit, setHourlyLimit] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [senders, setSenders] = useState<Sender[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState('');
  const [showSendLater, setShowSendLater] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSenders();
  }, []);

  const fetchSenders = async () => {
    try {
      // apiClient returns ApiResponse<T> where `data` is the typed payload.
      // The backend returns { success: true, data: { senders: Sender[] } }
      // so T should be the inner shape `{ senders: Sender[] }`.
      const response = await apiClient.get<{ senders: Sender[] }>('/emails/senders');
      
      console.log('Senders API response:', response);
      
      if (response.success && response.data) {
        const sendersList = response.data.senders || [];
        if (Array.isArray(sendersList) && sendersList.length > 0) {
          setSenders(sendersList);
          setSelectedSenderId(sendersList[0].id);
        } else {
          setError('No senders configured. Please create a sender account first.');
        }
      } else {
        setError(response.error || 'Failed to fetch senders. Please check if you are logged in.');
      }
    } catch (err: any) {
      console.error('Failed to fetch senders:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to fetch senders';
      setError(`Error loading senders: ${errorMsg}. Please make sure you are logged in and have created a sender.`);
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const emails = await parseCSV(file);
      // Filter out duplicates
      const newEmails = emails.filter(
        newEmail => !recipients.find(r => r.email.toLowerCase() === newEmail.email.toLowerCase())
      );
      
      if (newEmails.length > 0) {
        setRecipients([...recipients, ...newEmails]);
        setError('');
      } else {
        setError('All emails from the file are already added.');
      }
    } catch (err) {
      setError('Failed to parse file. Please upload a valid CSV or TXT file.');
    }
    
    // Reset file input to allow uploading the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddRecipient = (email: string) => {
    const trimmedEmail = email.trim();
    if (trimmedEmail && !recipients.find(r => r.email === trimmedEmail)) {
      const parsed = parseEmails(trimmedEmail);
      if (parsed.length > 0) {
        setRecipients([...recipients, ...parsed]);
        setRecipientInput('');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddRecipient(recipientInput);
    }
  };

  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r.email !== email));
  };

  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleHeadingChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'normal') {
      applyFormat('formatBlock', 'p');
    } else if (value === 'h1') {
      applyFormat('formatBlock', 'h1');
    } else if (value === 'h2') {
      applyFormat('formatBlock', 'h2');
    }
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      applyFormat('createLink', url);
    }
  };

  const handleQuickSchedule = (hours: number) => {
    const now = new Date();
    now.setHours(now.getHours() + hours);
    // Round to nearest hour
    now.setMinutes(0);
    now.setSeconds(0);
    const formatted = now.toISOString().slice(0, 16);
    setStartTime(formatted);
    setShowSendLater(false);
  };

  const handleSubmit = async () => {
    // Validation
    if (!subject.trim()) {
      setError('Subject is required');
      return;
    }
    
    // Get HTML content from contentEditable div
    const htmlBody = editorRef.current?.innerHTML || '';
    if (!htmlBody.trim() || htmlBody === '<br>') {
      setError('Email body is required');
      return;
    }
    
    if (recipients.length === 0) {
      setError('Please add at least one recipient');
      return;
    }
    if (!startTime) {
      setError('Please select a schedule time');
      return;
    }
    if (!selectedSenderId) {
      setError('No sender available');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Schedule each recipient individually
      let successCount = 0;
      for (const recipient of recipients) {
        const response = await apiClient.post('/emails/schedule', {
          senderId: selectedSenderId,
          recipientEmail: recipient.email,
          recipientName: recipient.name || '',
          subject,
          body: htmlBody.replace(/<[^>]*>/g, ''), // Plain text version
          htmlBody: htmlBody, // HTML version
          scheduledAt: new Date(startTime).toISOString(),
        });
        
        if (response.success) {
          successCount++;
        } else {
          console.error(`Failed to schedule email for ${recipient.email}:`, response.error);
        }
      }

      if (successCount === recipients.length) {
        alert(`✅ ${recipients.length} email(s) scheduled successfully!`);
        onClose();
      } else if (successCount > 0) {
        alert(`⚠️ ${successCount} out of ${recipients.length} email(s) scheduled. Check console for errors.`);
        setError(`Only ${successCount} out of ${recipients.length} emails were scheduled successfully.`);
      } else {
        setError('Failed to schedule any emails. Please check your configuration and try again.');
      }
    } catch (err: any) {
      console.error('Schedule email error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to schedule email. Please try again.');
    }

    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Header */}
      <div className=" px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-grey hover:text-gray-900">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-grey text-lg font-medium">Compose New Email</h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="text-gray-400 hover:text-white p-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <button className="text-gray-400 hover:text-white p-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowSendLater(!showSendLater)}
              className="px-4 py-2 border border-green-500 text-green-500 rounded-lg hover:bg-green-500/10 font-medium text-sm flex items-center gap-2"
            >
              Send Later
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Send Later Dropdown */}
            {showSendLater && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                <div className="p-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-700 mb-2">Pick date & time</p>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="p-2">
                  <button 
                    onClick={() => handleQuickSchedule(24)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
                  >
                    Tomorrow, 11:00 AM
                  </button>
                  <button 
                    onClick={() => handleQuickSchedule(26)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
                  >
                    Tomorrow, 1:00 PM
                  </button>
                  <button 
                    onClick={() => handleQuickSchedule(28)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
                  >
                    Tomorrow, 3:00 PM
                  </button>
                </div>
                <div className="p-3 border-t border-gray-100 flex justify-end gap-2">
                  <button 
                    onClick={() => setShowSendLater(false)}
                    className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      setShowSendLater(false);
                      if (startTime) handleSubmit();
                    }}
                    disabled={!startTime || isLoading}
                    className="px-4 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Scheduling...
                      </>
                    ) : (
                      'Schedule'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white overflow-auto">
        <div className="max-w-4xl mx-auto py-8 px-6">
          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* From Field */}
          <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100">
            <label className="text-sm text-gray-500 w-16">From</label>
            <div className="flex-1">
              <select
                value={selectedSenderId}
                onChange={(e) => setSelectedSenderId(e.target.value)}
                className="px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {senders.map(sender => (
                  <option key={sender.id} value={sender.id}>
                    {sender.email}
                  </option>
                ))}
                {senders.length === 0 && (
                  <option value="">{user?.email || 'No sender available'}</option>
                )}
              </select>
            </div>
          </div>

          {/* To Field */}
          <div className="flex items-start gap-4 mb-4 pb-4 border-b border-gray-100">
            <label className="text-sm text-gray-500 w-16 pt-2">To</label>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 min-h-[40px]">
                {recipients.map((recipient, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm"
                  >
                    {recipient.email}
                    <button
                      onClick={() => removeRecipient(recipient.email)}
                      className="text-green-600 hover:text-green-800"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={recipientInput}
                  onChange={(e) => setRecipientInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={() => handleAddRecipient(recipientInput)}
                  placeholder={recipients.length === 0 ? "recipient@example.com" : ""}
                  className="flex-1 min-w-[200px] py-1.5 text-sm focus:outline-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-sm text-green-600 hover:text-green-700 font-medium whitespace-nowrap"
              >
                ↑ Upload List
              </button>
            </div>
          </div>

          {/* Subject Field */}
          <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100">
            <label className="text-sm text-gray-500 w-16">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="flex-1 py-1.5 text-sm focus:outline-none"
            />
          </div>

          {/* Delay and Hourly Limit */}
          <div className="flex items-center gap-8 mb-6 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Delay between 2 emails</label>
              <input
                type="number"
                value={delayBetweenEmails}
                onChange={(e) => setDelayBetweenEmails(Number(e.target.value))}
                min={0}
                className="w-16 px-2 py-1 border border-gray-200 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Hourly Limit</label>
              <input
                type="number"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
                min={0}
                className="w-16 px-2 py-1 border border-gray-200 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Rich Text Editor */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 flex-wrap">
              <button 
                onClick={() => applyFormat('undo')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                title="Undo"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
              <button 
                onClick={() => applyFormat('redo')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                title="Redo"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                </svg>
              </button>
              <div className="w-px h-5 bg-gray-300 mx-1" />
              <select 
                onChange={handleHeadingChange}
                className="text-sm text-gray-600 bg-transparent focus:outline-none px-2 py-1 hover:bg-gray-100 rounded cursor-pointer"
                defaultValue="normal"
              >
                <option value="normal">Normal</option>
                <option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option>
              </select>
              <div className="w-px h-5 bg-gray-300 mx-1" />
              <button 
                onClick={() => applyFormat('bold')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded font-bold text-sm"
                title="Bold"
              >
                B
              </button>
              <button 
                onClick={() => applyFormat('italic')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded italic text-sm"
                title="Italic"
              >
                I
              </button>
              <button 
                onClick={() => applyFormat('underline')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded underline text-sm"
                title="Underline"
              >
                U
              </button>
              <button 
                onClick={() => applyFormat('strikeThrough')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded line-through text-sm"
                title="Strikethrough"
              >
                S
              </button>
              <div className="w-px h-5 bg-gray-300 mx-1" />
              <button 
                onClick={() => applyFormat('justifyLeft')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                title="Align Left"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </button>
              <button 
                onClick={() => applyFormat('justifyCenter')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                title="Align Center"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="w-px h-5 bg-gray-300 mx-1" />
              <button 
                onClick={() => applyFormat('insertUnorderedList')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                title="Bullet List"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
              <button 
                onClick={() => applyFormat('insertOrderedList')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                title="Numbered List"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </button>
              <div className="w-px h-5 bg-gray-300 mx-1" />
              <button 
                onClick={() => applyFormat('insertHorizontalRule')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                title="Horizontal Line"
              >
                &lt;&gt;
              </button>
              <button 
                onClick={() => applyFormat('formatBlock', 'blockquote')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                title="Quote"
              >
                ❝
              </button>
              <button 
                onClick={insertLink}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                title="Insert Link"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </button>
            </div>

            {/* Content Editable Area */}
            <div
              ref={editorRef}
              contentEditable
              onInput={(e) => setBody(e.currentTarget.innerHTML)}
              className="w-full min-h-[300px] p-4 text-gray-700 focus:outline-none"
              data-placeholder="Type Your Reply..."
              style={{ 
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word'
              }}
              suppressContentEditableWarning
            />
          </div>
        </div>
      </div>
    </div>
  );
};
