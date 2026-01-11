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
    last_name: string;
    company_role?: string;
    current_company?: string;
    location?: string;
  };
  status: CandidateAssignmentStatus;
  status_label: string;
};

/**
 * Get all assignments
 */
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

/**
 * Get assignments by account UID
 */
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

/**
 * Get candidates for an assignment
 */
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
