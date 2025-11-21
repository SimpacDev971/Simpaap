/**
 * Email service abstraction layer
 * Switch between providers by setting EMAIL_PROVIDER env var to 'mailjet' or 'resend'
 * Defaults to 'mailjet' if not set
 * 
 * To switch to Resend:
 * 1. Install: npm install resend
 * 2. Set EMAIL_PROVIDER=resend in your .env
 * 3. Set RESEND_API_KEY and RESEND_SENDER_EMAIL in your .env
 * 4. Uncomment and implement the Resend code in lib/resend.ts
 */

import { MailjetNotConfiguredError, sendMailjetEmail, type SendMailjetEmailInput } from './mailjet';
// Uncomment when Resend is implemented:
// import { sendResendEmail, ResendNotConfiguredError } from './resend';

export type SendEmailInput = {
  to: { email: string; name?: string } | Array<{ email: string; name?: string }>;
  subject: string;
  text?: string;
  html?: string;
  cc?: { email: string; name?: string } | Array<{ email: string; name?: string }>;
  bcc?: { email: string; name?: string } | Array<{ email: string; name?: string }>;
  replyTo?: { email: string; name?: string };
  customId?: string;
};

const EMAIL_PROVIDER = (process.env.EMAIL_PROVIDER || 'mailjet').toLowerCase();

/**
 * Send email using the configured provider (Mailjet or Resend)
 */
export async function sendEmail(input: SendEmailInput) {
  if (EMAIL_PROVIDER === 'resend') {
    // Uncomment when Resend is implemented:
    // return sendResendEmail(input);
    throw new Error(
      'Resend provider not yet implemented. ' +
      'Set EMAIL_PROVIDER=mailjet or implement Resend in lib/resend.ts'
    );
  }

  // Default to Mailjet
  const mailjetInput: SendMailjetEmailInput = {
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    cc: input.cc,
    bcc: input.bcc,
    replyTo: input.replyTo,
    customId: input.customId,
  };

  return sendMailjetEmail(mailjetInput);
}

export { MailjetNotConfiguredError };
// Uncomment when Resend is implemented:
// export { ResendNotConfiguredError };
