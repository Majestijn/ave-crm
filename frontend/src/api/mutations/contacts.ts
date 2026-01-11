import { useMutation, useQueryClient } from "@tanstack/react-query";
import API from "../client";
import { queryKeys } from "../queries/keys";
import type { Contact } from "../../types/contacts";

export type CreateContactData = {
  first_name: string;
  prefix?: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  location?: string;
  company_role?: string;
  network_roles?: string[];
  current_company?: string;
  current_salary_cents?: number;
  education?: "MBO" | "HBO" | "UNI";
  email?: string;
  phone?: string;
  linkedin_url?: string;
  notes?: string;
  cv_file?: File | null; // CV file for upload
};

export type UpdateContactData = Partial<Omit<CreateContactData, "cv_file">>;

/**
 * Create a new contact with optional CV upload
 */
export const useCreateContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateContactData) => {
      return await API.post<Contact>("/contacts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
    },
  });
};

/**
 * Upload CV document for a contact
 */
export const useUploadContactDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contactUid,
      file,
      type = "cv",
    }: {
      contactUid: string;
      file: File;
      type?: "cv" | "certificate" | "other";
    }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      // Don't set Content-Type header - let Axios handle it automatically
      // so the correct boundary is included for multipart/form-data
      return await API.post(`/contacts/${contactUid}/documents`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
    },
  });
};

/**
 * Update an existing contact
 */
export const useUpdateContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      uid,
      data,
    }: {
      uid: string;
      data: UpdateContactData;
    }) => {
      return await API.patch<Contact>(`/contacts/${uid}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.candidates });
    },
  });
};

/**
 * Delete a contact
 */
export const useDeleteContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uid: string) => {
      return await API.delete(`/contacts/${uid}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
    },
  });
};
