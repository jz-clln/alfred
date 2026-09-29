export type ClientStatus = "active" | "paused" | "past";
export type ProjectStatus = "active" | "on_hold" | "completed";
export type BalanceEntryType = "invoice" | "payment";

export interface Client {
  id: string;
  owner_id: string;
  application_id: string | null;
  currency: "PHP" | "USD";
  name: string;
  email: string | null;
  phone: string | null;
  status: ClientStatus;
  notes: string | null;
  created_at: string;
  balance?: number; // joined from the client_balances view
}

export interface Project {
  id: string;
  owner_id: string;
  client_id: string;
  name: string;
  status: ProjectStatus;
  start_date: string | null;
  due_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface BalanceEntry {
  id: string;
  owner_id: string;
  client_id: string;
  type: BalanceEntryType;
  amount: number;
  currency: "PHP" | "USD";
  memo: string | null;
  entry_date: string;
  created_at: string;
}

export interface Application {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
}
