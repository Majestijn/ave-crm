import type { Contact } from "./contacts";

export type AccountContact = {
  id: number;
  contact_id: number;
  // Backend eager-loads the full Contact (incl. work_experiences) via
  // `contacts.contact.workExperiences`, so the detail modal can render everything.
  contact?: Contact;
  created_at?: string;
  updated_at?: string;
};

export type Assignment = {
  id: number;
  account_id: number;
  title: string;
  description?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

export type Account = {
  uid: string;
  name: string;
  parent_company?: string | null;
  parent_logo_url?: string | null;
  logo_url?: string;
  location?: string;
  website?: string;
  phone?: string;
  industry?: string;
  category?: string;
  secondary_category?: string;
  tertiary_category?: string[];
  merken?: string[];
  labels?: string[];
  fte_count?: number;
  revenue_cents?: number;
  notes?: string;
  sales_target?: string[];
  client_status?: string;
  assignments_count?: number;
  active_assignments_count?: number;
  has_active_assignments?: boolean;
  contacts?: AccountContact[];
  assignments?: Assignment[];
  created_at?: string;
  updated_at?: string;
};
