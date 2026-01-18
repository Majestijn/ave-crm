import { useQuery } from "@tanstack/react-query";
import API from "../client";
import { queryKeys } from "./keys";

export type AssignmentFromAPI = {
  id: number;
  uid: string;
  account_id: number;
  account?: {
    uid: string;
    name: string;
  };
  title: string;
  description?: string;
  status: string;
  salary_min?: number;
  salary_max?: number;
  vacation_days?: number;
  location?: string;
  employment_type?: string;
  benefits?: string[];
  notes_image_url?: string | null;
  created_at: string;
  updated_at: string;
};

export type CandidateAssignmentStatus =
  | "called"
  | "proposed"
  | "first_interview"
  | "second_interview"
  | "hired"
  | "rejected";

export type CandidateAssignment = {
  id: number;
  contact: {
    uid: string;
    first_name: string;
    prefix?: string;
    last_name: string;
    email?: string;
    phone?: string;
    company_role?: string;
    current_company?: string;
    location?: string;
    date_of_birth?: string;
    network_roles?: string[];
    current_salary_cents?: number;
    education?: string;
    linkedin_url?: string;
  };
  status: CandidateAssignmentStatus;
  status_label: string;
};

export const useAssignments = () => {
  return useQuery({
    queryKey: queryKeys.assignments.all,
    queryFn: async () => {
      const responseData = await API.get<AssignmentFromAPI[] | { data: AssignmentFromAPI[] }>("/assignments");

      if (Array.isArray(responseData)) {
        return responseData;
      } else if (responseData && "data" in responseData && Array.isArray(responseData.data)) {
        return responseData.data;
      }

      return [] as AssignmentFromAPI[];
    },
  });
};

export const useAccountAssignments = (accountUid: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.assignments.byAccount(accountUid!),
    queryFn: async () => {
      const responseData = await API.get<AssignmentFromAPI[] | { data: AssignmentFromAPI[] }>(
        `/accounts/${accountUid}/assignments`
      );

      if (Array.isArray(responseData)) {
        return responseData;
      } else if (responseData && "data" in responseData && Array.isArray(responseData.data)) {
        return responseData.data;
      }

      return [] as AssignmentFromAPI[];
    },
    enabled: !!accountUid,
  });
};

export const useAssignmentCandidates = (assignmentUid: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.assignments.candidates(assignmentUid!),
    queryFn: async () => {
      const responseData = await API.get<CandidateAssignment[]>(
        `/assignments/${assignmentUid}/candidates`
      );
      return responseData || [];
    },
    enabled: !!assignmentUid,
  });
};
