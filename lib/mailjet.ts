import mailjet from 'node-mailjet';

type MailRecipient = {
  email: string;
  name?: string;
};

export type SendMailjetEmailInput = {
  to: MailRecipient | MailRecipient[];
  subject: string;
  text?: string;
  html?: string;
  cc?: MailRecipient | MailRecipient[];
  bcc?: MailRecipient | MailRecipient[];
  replyTo?: MailRecipient;
  customId?: string;
  variables?: Record<string, unknown>;
};

const MAILJET_API_KEY = process.env.MAILJET_API_KEY;
const MAILJET_API_SECRET = process.env.MAILJET_API_SECRET;
const MAILJET_SENDER_EMAIL = process.env.MAILJET_SENDER_EMAIL;
const MAILJET_SENDER_NAME = process.env.MAILJET_SENDER_NAME ?? 'Simpaap';

function normalizeRecipients(
  recipients?: MailRecipient | MailRecipient[],
): Array<{ Email: string; Name?: string }> | undefined {
  if (!recipients) return undefined;
  const list = Array.isArray(recipients) ? recipients : [recipients];
  return list
    .filter((recipient) => recipient.email)
    .map((recipient) => ({
      Email: recipient.email,
      Name: recipient.name,
    }));
}

export class MailjetNotConfiguredError extends Error {
  constructor() {
    super('Mailjet environment variables are not fully configured');
  }
}

export async function sendMailjetEmail(input: SendMailjetEmailInput) {
  if (!MAILJET_API_KEY || !MAILJET_API_SECRET || !MAILJET_SENDER_EMAIL) {
    throw new MailjetNotConfiguredError();
  }

  const to = normalizeRecipients(input.to);
  if (!to || to.length === 0) {
    throw new Error('At least one recipient is required to send an email.');
  }

  if (!input.text && !input.html) {
    throw new Error('Either a text or html version must be provided.');
  }

  const cc = normalizeRecipients(input.cc);
  const bcc = normalizeRecipients(input.bcc);

  const client = mailjet.apiConnect(MAILJET_API_KEY, MAILJET_API_SECRET);

  const message: Record<string, unknown> = {
    From: {
      Email: MAILJET_SENDER_EMAIL,
      Name: MAILJET_SENDER_NAME,
    },
    To: to,
    Subject: input.subject,
    TextPart: input.text,
    HTMLPart: input.html ?? input.text,
  };

  if (cc?.length) {
    message.Cc = cc;
  }
  if (bcc?.length) {
    message.Bcc = bcc;
  }
  if (input.replyTo) {
    message.ReplyTo = {
      Email: input.replyTo.email,
      Name: input.replyTo.name,
    };
  }
  if (input.customId) {
    message.CustomID = input.customId;
  }
  if (input.variables) {
    message.Variables = input.variables;
  }

  try {
    const result = await client.post('send', { version: 'v3.1' }).request({
      Messages: [message],
    } as any);

    return (result.body as any).Messages?.[0];
  } catch (error: any) {
    throw new Error(`Mailjet request failed: ${error.message || String(error)}`);
  }
}
