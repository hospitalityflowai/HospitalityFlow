export interface EarlyAccessApplication {
  id: string;
  first_name: string;
  email: string;
  property_name: string;
  property_type: string;
  room_count: number | null;
  role: string;
  source: string;
  submitted_at: string;
  applicant_email_sent_at: string | null;
  owner_email_sent_at: string | null;
}

export interface EmailSendResult {
  applicantEmailSent: boolean;
  ownerEmailSent: boolean;
  alreadySent: boolean;
  errors: string[];
}
