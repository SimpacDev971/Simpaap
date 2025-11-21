/**
 * Resend email provider implementation
 * To use Resend, set EMAIL_PROVIDER=resend in your environment variables
 * 
 * Install Resend: npm install resend
 * Get your API key from: https://resend.com/api-keys
 */

// Uncomment and install resend when ready to use:
// import { Resend } from 'resend';

export type SendResendEmailInput = {
  to: { email: string; name?: string } | Array<{ email: string; name?: string }>;
  subject: string;
  text?: string;
  html?: string;
  cc?: { email: string; name?: string } | Array<{ email: string; name?: string }>;
  bcc?: { email: string; name?: string } | Array<{ email: string; name?: string }>;
  replyTo?: { email: string; name?: string };
  customId?: string;
};

export class ResendNotConfiguredError extends Error {
  constructor() {
    super('Resend environment variables are not fully configured');
  }
}

export async function sendResendEmail(input: SendResendEmailInput) {
  // TODO: Implement Resend when needed
  // Example implementation:
  /*
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const RESEND_SENDER_EMAIL = process.env.RESEND_SENDER_EMAIL || process.env.MAILJET_SENDER_EMAIL;
  const RESEND_SENDER_NAME = process.env.RESEND_SENDER_NAME || process.env.MAILJET_SENDER_NAME || 'Simpaap';

  if (!RESEND_API_KEY || !RESEND_SENDER_EMAIL) {
    throw new ResendNotConfiguredError();
  }

  const resend = new Resend(RESEND_API_KEY);

  const to = Array.isArray(input.to) 
    ? input.to.map(r => r.email).join(',')
    : input.to.email;

  const result = await resend.emails.send({
    from: `${RESEND_SENDER_NAME} <${RESEND_SENDER_EMAIL}>`,
    to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    cc: input.cc ? (Array.isArray(input.cc) ? input.cc.map(r => r.email).join(',') : input.cc.email) : undefined,
    bcc: input.bcc ? (Array.isArray(input.bcc) ? input.bcc.map(r => r.email).join(',') : input.bcc.email) : undefined,
    reply_to: input.replyTo?.email,
  });

  return result;
  */

  throw new Error('Resend provider not yet implemented. See lib/resend.ts for implementation guide.');
}
