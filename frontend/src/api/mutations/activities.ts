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

export type UpdateActivityData = {
  type?: ActivityType;
  description?: string;
  date?: string;
  contact_uid?: string | null;
};

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

export const useCreateAccountActivity = (accountUid: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateActivityData) => {
      return await API.post<Activity>(
        `/accounts/${accountUid}/activities`,
        data
      );
    },
    onSuccess: () => {
      if (accountUid) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.accounts.activities(accountUid),
        });
      }
    },
  });
};

export const useUpdateAccountActivity = (accountUid: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      activityId,
      data,
    }: {
      activityId: number;
      data: UpdateActivityData;
    }) => {
      return await API.put<Activity>(`/activities/${activityId}`, data);
    },
    onSuccess: () => {
      if (accountUid) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.accounts.activities(accountUid),
        });
      }
    },
  });
};

export const useDeleteAccountActivity = (accountUid: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activityId: number) => {
      return await API.delete(`/activities/${activityId}`);
    },
    onSuccess: () => {
      if (accountUid) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.accounts.activities(accountUid),
        });
      }
    },
  });
};

export const useUpdateAssignmentActivity = (assignmentUid: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      activityId,
      data,
    }: {
      activityId: number;
      data: UpdateActivityData;
    }) => {
      return await API.put<Activity>(`/assignment-activities/${activityId}`, data);
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

export const useDeleteAssignmentActivity = (assignmentUid: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activityId: number) => {
      return await API.delete(`/assignment-activities/${activityId}`);
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
