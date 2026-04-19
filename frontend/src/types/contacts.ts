export type ContactWorkExperience = {
  id?: number;
  job_title: string;
  company_name: string;
  start_date: string; // YYYY-MM-DD
  end_date?: string | null; // YYYY-MM-DD, null = huidige functie
  location?: string | null;
  description?: string | null;
};

export type Contact = {
  uid: string;
  first_name: string;
  prefix?: string; // Tussenvoegsels (van, de, van der, etc.)
  last_name: string;
  date_of_birth?: string; // ISO date string (YYYY-MM-DD)
  name?: string; // Computed full name from backend
  gender?: string;
  email?: string;
  phone?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  distance?: number; // Distance in km (only present when filtering by radius)
  current_company?: string;
  company_role?: string;
  /** Zelfde dropdown_types als bij klanten (account_category, …) */
  category?: string | null;
  secondary_category?: string | null;
  tertiary_category?: string[] | null;
  merken?: string[] | null;
  labels?: string[] | null;
  network_roles?: string[];
  /** Bruto jaarsalaris (centen, EUR) — huidige situatie netwerkcontact */
  annual_salary_cents?: number | null;
  /** Uurtarief in centen (EUR), bv. 4550 = €45,50 */
  hourly_rate_cents?: number | null;
  vacation_days?: number | null;
  bonus_percentage?: number | null;
  /** Waarden uit dropdown_options type `benefit` (zelfde als opdrachten) */
  benefits?: string[] | null;
  education?: string;
  availability_date?: string; // ISO date (YYYY-MM-DD) – beschikbaarheidsdatum
  linkedin_url?: string;
  cv_url?: string;
  notes?: string;
  work_experiences?: ContactWorkExperience[];
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
