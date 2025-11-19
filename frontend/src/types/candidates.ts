export type Candidate = {
  uid: string;
  first_name: string;
  last_name: string;
  gender?: string;
  location?: string;
  current_role?: string;
  current_company?: string;
  current_salary_cents?: number;
  education?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  cv_url?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
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

