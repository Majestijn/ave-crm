import { useMutation, useQueryClient } from "@tanstack/react-query";
import API from "../client";
import { queryKeys } from "../queries/keys";
import type { Account } from "../../types/accounts";

export type AddContactToAccountData = {
  contact_uid: string;
};

export type UpdateAccountData = {
  name?: string;
  logo_url?: string | null;
  location?: string | null;
  website?: string | null;
  industry?: string | null;
  category?: string | null;
  fte_count?: number | null;
  revenue_cents?: number | null;
  notes?: string | null;
};

export const useAddContactToAccount = (accountUid: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AddContactToAccountData) => {
      return await API.post(`/accounts/${accountUid}/contacts`, data);
    },
    onSuccess: () => {
      if (accountUid) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.accounts.detail(accountUid),
        });
      }
    },
  });
};

export const useUpdateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      uid,
      data,
    }: {
      uid: string;
      data: UpdateAccountData;
    }) => {
      return await API.put<Account>(`/accounts/${uid}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.detail(variables.uid),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.all,
      });
    },
  });
};
