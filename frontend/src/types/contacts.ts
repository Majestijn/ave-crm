export type Contact = {
  uid: string;
  first_name: string;
  prefix?: string; // Tussenvoegsels (van, de, van der, etc.)
  last_name: string;
  name?: string; // Computed full name from backend
  gender?: string;
  email?: string;
  phone?: string;
  location?: string;
  current_company?: string;
  company_role?: string;
  network_roles?: string[];
  current_salary_cents?: number;
  education?: string;
  linkedin_url?: string;
  cv_url?: string;
  notes?: string;
};

export type Paginated<T> = {
  data: T[];
  links: {
    first: string;
    last: string;
  };
  meta: {
    current_page: number;
    from: number;
    last_page: number;
  };
};
