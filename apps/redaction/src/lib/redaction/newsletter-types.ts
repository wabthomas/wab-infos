export interface NewsletterSettingsView {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  senderEmail: string;
  senderName: string;
  replyTo: string;
  smtpPassSet: boolean;
  source: 'cms' | 'env' | 'none';
}

export interface NewsletterSubscriberRow {
  documentId: string;
  email: string;
  status: 'active' | 'unsubscribed';
  source: string;
  subscribedAt: string | null;
}
