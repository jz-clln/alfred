// Append these to your existing lib/types.ts.
export type LeadStage = "new" | "contacted" | "replied" | "meeting" | "won" | "lost";
export type EmailStatus = "unchecked" | "valid" | "invalid" | "risky";

export interface Lead {
  id: string;
  owner_id: string;
  application_id: string | null;
  name: string;
  email: string | null;
  company: string | null;
  source: string | null;
  stage: LeadStage;
  email_status: EmailStatus;
  notes: string | null;
  last_contacted_at: string | null;
  last_replied_at: string | null;
  client_id: string | null;
  created_at: string;
}
