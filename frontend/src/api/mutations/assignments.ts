import { useMutation, useQueryClient } from "@tanstack/react-query";
import API from "../client";
import { queryKeys } from "../queries/keys";
import type { AssignmentFromAPI } from "../queries/assignments";

export type CreateAssignmentData = {
  account_uid: string;
  title: string;
  description?: string | null;
  status?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  vacation_days?: number | null;
  location?: string | null;
  employment_type?: string | null;
  benefits?: string[] | null;
  notes_image?: File | null; // File object for image upload
};

/**
 * Create a new assignment with optional notes image
 */
export const useCreateAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAssignmentData) => {
      // Use FormData if there's an image to upload
      if (data.notes_image) {
        const formData = new FormData();
        formData.append("account_uid", data.account_uid);
        formData.append("title", data.title);
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
        if (data.location) formData.append("location", data.location);
        if (data.employment_type) formData.append("employment_type", data.employment_type);
        if (data.benefits && data.benefits.length > 0) {
          data.benefits.forEach((benefit, index) => {
            formData.append(`benefits[${index}]`, benefit);
          });
        }
        formData.append("notes_image", data.notes_image);

        // Don't set Content-Type header - let Axios handle it automatically
        // so the correct boundary is included for multipart/form-data
        return await API.post<AssignmentFromAPI>("/assignments", formData);
      }

      // Regular JSON request without image
      const { notes_image, ...jsonData } = data;
      return await API.post<AssignmentFromAPI>("/assignments", jsonData);
    },
    onSuccess: () => {
      // Invalidate assignments list to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
    },
  });
};

export type UpdateAssignmentData = {
  account_uid?: string;
  title?: string;
  description?: string | null;
  status?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  has_bonus?: boolean;
  has_car?: boolean;
  vacation_days?: number | null;
  location?: string | null;
  employment_type?: string | null;
  notes_image?: File | null; // File object for image upload
};

/**
 * Update an assignment
 */
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
      // Invalidate specific assignment and list
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.detail(variables.uid),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
    },
  });
};

/**
 * Delete an assignment
 */
export const useDeleteAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uid: string) => {
      return await API.delete(`/assignments/${uid}`);
    },
    onSuccess: () => {
      // Invalidate assignments list
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
    },
  });
};
