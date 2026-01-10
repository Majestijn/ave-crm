import { useMutation, useQueryClient } from "@tanstack/react-query";
import API from "../client";
import { queryKeys } from "../queries/keys";

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
 * Add candidates to an assignment
 */
export const useAddAssignmentCandidates = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assignmentUid,
      contactUids,
    }: {
      assignmentUid: string;
      contactUids: string[];
    }) => {
      return await API.post<CandidateAssignment[]>(
        `/assignments/${assignmentUid}/candidates`,
        { contact_uids: contactUids }
      );
    },
    onSuccess: (_, variables) => {
      // Invalidate candidates for this assignment
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.candidates(variables.assignmentUid),
      });
    },
  });
};

/**
 * Update candidate status for an assignment
 */
export const useUpdateAssignmentCandidateStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assignmentUid,
      contactUid,
      status,
    }: {
      assignmentUid: string;
      contactUid: string;
      status: CandidateAssignmentStatus;
    }) => {
      return await API.put(
        `/assignments/${assignmentUid}/candidates/${contactUid}`,
        { status }
      );
    },
    onSuccess: (_, variables) => {
      // Invalidate candidates for this assignment
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.candidates(variables.assignmentUid),
      });
    },
  });
};

/**
 * Remove candidate from an assignment
 */
export const useRemoveAssignmentCandidate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assignmentUid,
      contactUid,
    }: {
      assignmentUid: string;
      contactUid: string;
    }) => {
      return await API.delete(
        `/assignments/${assignmentUid}/candidates/${contactUid}`
      );
    },
    onSuccess: (_, variables) => {
      // Invalidate candidates for this assignment
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.candidates(variables.assignmentUid),
      });
    },
  });
};
