import type { EmailRecipient } from '../types';

export const parseEmails = (text: string): EmailRecipient[] => {
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
  const matches = text.match(emailRegex);
  
  if (!matches) return [];
  
  // Remove duplicates and create EmailRecipient objects
  const uniqueEmails = Array.from(new Set(matches.map(email => email.toLowerCase())));
  
  return uniqueEmails.map(email => ({
    email,
    name: email.split('@')[0], // Use email prefix as name
  }));
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+$/;
  return emailRegex.test(email);
};

export const parseCSV = async (file: File): Promise<EmailRecipient[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const recipients: EmailRecipient[] = [];
        
        // Split by lines
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        
        // Try to detect if first line is a header
        const firstLine = lines[0]?.toLowerCase() || '';
        const hasHeader = firstLine.includes('email') || firstLine.includes('name') || firstLine.includes('address');
        const startIndex = hasHeader ? 1 : 0;
        
        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // Split by comma, semicolon, or tab
          const parts = line.split(/[,;\t]/).map(p => p.trim());
          
          // Try to find email in the parts
          let email = '';
          let name = '';
          
          for (const part of parts) {
            if (validateEmail(part)) {
              email = part.toLowerCase();
              // If there are other parts, use the first non-email as name
              const otherParts = parts.filter(p => p !== part && p.length > 0);
              if (otherParts.length > 0) {
                name = otherParts[0];
              }
              break;
            }
          }
          
          // If no valid email found in structured format, try extracting from whole line
          if (!email) {
            const extracted = parseEmails(line);
            if (extracted.length > 0) {
              recipients.push(...extracted);
            }
          } else {
            recipients.push({
              email,
              name: name || email.split('@')[0]
            });
          }
        }
        
        // Remove duplicates
        const uniqueRecipients = recipients.filter((recipient, index, self) =>
          index === self.findIndex(r => r.email.toLowerCase() === recipient.email.toLowerCase())
        );
        
        if (uniqueRecipients.length === 0) {
          reject(new Error('No valid email addresses found in file'));
        } else {
          resolve(uniqueRecipients);
        }
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};
