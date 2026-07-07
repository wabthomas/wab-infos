export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  unsubscribeUrl?: string;
  replyTo?: string;
}

export interface BatchSendResult {
  sent: number;
  failed: number;
}
