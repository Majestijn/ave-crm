import { useMutation, useQueryClient } from "@tanstack/react-query";
import API from "../client";
import { queryKeys } from "../queries/keys";
import type { Activity, ActivityType } from "../queries/activities";

export type CreateActivityData = {
  type: ActivityType;
  description: string;
  date: string;
  contact_uid?: string;
};

/**
 * Create a new activity for an assignment
 */
export const useCreateActivity = (assignmentUid: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateActivityData) => {
      return await API.post<Activity>(
        `/assignments/${assignmentUid}/activities`,
        data
      );
    },
    onSuccess: () => {
      if (assignmentUid) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.assignments.activities(assignmentUid),
        });
      }
    },
  });
};

