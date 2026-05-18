import { useQuery } from "@tanstack/react-query";
import API from "../client";

export type DashboardInterimAssignment = {
  uid: string;
  title: string;
  status: string;
  account: { uid: string; name: string } | null;
  start_date: string | null;
  end_date: string | null;
  duration_weeks: number | null;
  days_remaining: number | null;
  is_ending_soon: boolean;
  is_overdue: boolean;
};

export type DashboardOngoingAssignment = {
  uid: string;
  title: string;
  status: string;
  account: { uid: string; name: string } | null;
  recruiter: { uid: string; name: string } | null;
  active_candidates_count: number;
  last_contact: {
    date: string;
    type: string | null;
    description: string | null;
    contact_name: string | null;
  } | null;
};

export type DashboardActiveCandidate = {
  contact: {
    uid: string;
    name: string;
    company_role?: string | null;
    current_company?: string | null;
  };
  assignment: { uid: string; title: string };
  account: { uid: string; name: string };
  status: string;
  status_updated_at: string;
};

export type DashboardTodayEvent = {
  uid: string;
  title: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  location?: string | null;
  event_type?: string | null;
  color?: string | null;
  account_name?: string | null;
  contact_name?: string | null;
};

export type DashboardData = {
  interim_assignments: DashboardInterimAssignment[];
  ongoing_assignments: DashboardOngoingAssignment[];
  active_candidates: DashboardActiveCandidate[];
  today_events: DashboardTodayEvent[];
};

export const useDashboard = () => {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => API.get<DashboardData>("/dashboard"),
    staleTime: 60_000,
  });
};
