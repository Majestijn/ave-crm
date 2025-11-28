export type AccountContact = {
  id: number;
  account_id: number;
  name: string;
  phone?: string;
  email?: string;
  role?: string;
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
  logo_url?: string;
  location?: string;
  website?: string;
  revenue_cents?: number;
  notes?: string;
  assignments_count?: number;
  contacts?: AccountContact[];
  assignments?: Assignment[];
  created_at?: string;
  updated_at?: string;
};

