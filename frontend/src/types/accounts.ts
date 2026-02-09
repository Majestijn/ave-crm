export type AccountContact = {
  id: number;
  contact_id: number;
  contact?: {
    uid: string;
    first_name: string;
    last_name: string;
  name: string;
    email?: string;
  phone?: string;
    company_role?: string;
    network_roles?: string[];
  };
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
  industry?: string;
  fte_count?: number;
  revenue_cents?: number;
  notes?: string;
  assignments_count?: number;
  active_assignments_count?: number;
  has_active_assignments?: boolean;
  contacts?: AccountContact[];
  assignments?: Assignment[];
  created_at?: string;
  updated_at?: string;
};
