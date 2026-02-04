import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../utils/logger';

export interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailOptions {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
}


const defaultMailConfig: MailConfig = {
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.ETHEREAL_USER || '',
    pass: process.env.ETHEREAL_PASS || '',
  },
};


export const createMailTransporter = (config?: MailConfig): Transporter => {
  const mailConfig = config || defaultMailConfig;
  
  const transporter = nodemailer.createTransport(mailConfig);
  
  logger.info(`📧 Mail transporter created for ${mailConfig.host}`);
  
  return transporter;
};


export const defaultTransporter = createMailTransporter();


export const verifyMailConnection = async (transporter: Transporter): Promise<boolean> => {
  try {
    await transporter.verify();
    logger.info('✅ SMTP connection verified successfully');
    return true;
  } catch (error) {
    logger.error('❌ SMTP connection verification failed:', error);
    return false;
  }
};

export const sendEmail = async (
  options: EmailOptions,
  transporter: Transporter = defaultTransporter
): Promise<any> => {
  try {
    const info = await transporter.sendMail(options);
    logger.info(`✅ Email sent successfully: ${info.messageId}`);
    
    
    if (process.env.SMTP_HOST === 'smtp.ethereal.email') {
      logger.info(`📧 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    
    return info;
  } catch (error) {
    logger.error('❌ Failed to send email:', error);
    throw error;
  }
};
