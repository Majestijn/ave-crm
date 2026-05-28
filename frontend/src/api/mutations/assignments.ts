import { useMutation, useQueryClient } from "@tanstack/react-query";
import API from "../client";
import { queryKeys } from "../queries/keys";
import type { AssignmentFromAPI } from "../queries/assignments";

export type CreateAssignmentData = {
  account_uid: string;
  recruiter_uid?: string | null;
  secondary_recruiter_uids?: string[];
  title: string;
  description?: string | null;
  status?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  vacation_days?: number | null;
  bonus_percentage?: number | null;
  total_fee?: number | null;
  advance_fee?: number | null;
  location?: string | null;
  employment_type?: string | null;
  hours_per_week_min?: number | null;
  hours_per_week_max?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  benefits?: string[] | null;
  notes_image?: File | null;
  role_profile?: File | null;
};

export const useCreateAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAssignmentData) => {
      const useMultipart = !!(data.notes_image || data.role_profile);
      if (useMultipart) {
        const formData = new FormData();
        formData.append("account_uid", data.account_uid);
        formData.append("title", data.title);
        if (data.recruiter_uid) formData.append("recruiter_uid", data.recruiter_uid);
        if (data.description) formData.append("description", data.description);
        if (data.salary_min !== null && data.salary_min !== undefined) {
          formData.append("salary_min", String(data.salary_min));
        }
        if (data.salary_max !== null && data.salary_max !== undefined) {
          formData.append("salary_max", String(data.salary_max));
        }
        if (data.vacation_days !== null && data.vacation_days !== undefined) {
          formData.append("vacation_days", String(data.vacation_days));
        }
        if (data.bonus_percentage !== null && data.bonus_percentage !== undefined) {
          formData.append("bonus_percentage", String(data.bonus_percentage));
        }
        if (data.total_fee !== null && data.total_fee !== undefined) {
          formData.append("total_fee", String(data.total_fee));
        }
        if (data.advance_fee !== null && data.advance_fee !== undefined) {
          formData.append("advance_fee", String(data.advance_fee));
        }
        if (data.location) formData.append("location", data.location);
        if (data.employment_type) formData.append("employment_type", data.employment_type);
        if (data.hours_per_week_min !== null && data.hours_per_week_min !== undefined) {
          formData.append("hours_per_week_min", String(data.hours_per_week_min));
        }
        if (data.hours_per_week_max !== null && data.hours_per_week_max !== undefined) {
          formData.append("hours_per_week_max", String(data.hours_per_week_max));
        }
        if (data.start_date) formData.append("start_date", data.start_date);
        if (data.end_date) formData.append("end_date", data.end_date);
        if (data.secondary_recruiter_uids && data.secondary_recruiter_uids.length > 0) {
          data.secondary_recruiter_uids.forEach((uid, index) => {
            formData.append(`secondary_recruiter_uids[${index}]`, uid);
          });
        }
        if (data.benefits && data.benefits.length > 0) {
          data.benefits.forEach((benefit, index) => {
            formData.append(`benefits[${index}]`, benefit);
          });
        }
        if (data.notes_image) formData.append("notes_image", data.notes_image);
        if (data.role_profile) formData.append("role_profile", data.role_profile);

        return await API.post<AssignmentFromAPI>("/assignments", formData);
      }

      const jsonPayload = { ...data };
      delete jsonPayload.notes_image;
      delete jsonPayload.role_profile;
      return await API.post<AssignmentFromAPI>("/assignments", {
        ...jsonPayload,
        recruiter_uid: data.recruiter_uid ?? undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
};

export type UpdateAssignmentData = {
  account_uid?: string;
  recruiter_uid?: string | null;
  secondary_recruiter_uids?: string[];
  title?: string;
  description?: string | null;
  status?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  vacation_days?: number | null;
  bonus_percentage?: number | null;
  total_fee?: number | null;
  advance_fee?: number | null;
  location?: string | null;
  employment_type?: string | null;
  hours_per_week_min?: number | null;
  hours_per_week_max?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  benefits?: string[] | null;
  notes_image?: File | null;
};

export const useUploadAssignmentRoleProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uid, file }: { uid: string; file: File }) => {
      const formData = new FormData();
      formData.append("role_profile", file);
      return await API.post<AssignmentFromAPI>(
        `/assignments/${uid}/role-profile`,
        formData
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.detail(variables.uid),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
    },
  });
};

export const useDeleteAssignmentRoleProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uid: string) => {
      return await API.delete(`/assignments/${uid}/role-profile`);
    },
    onSuccess: (_, uid) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.detail(uid),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
    },
  });
};

export const useUpdateAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      uid,
      data,
    }: {
      uid: string;
      data: UpdateAssignmentData;
    }) => {
      return await API.put<AssignmentFromAPI>(`/assignments/${uid}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.detail(variables.uid),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
};

export const useDeleteAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uid: string) => {
      return await API.delete(`/assignments/${uid}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
    },
  });
};
