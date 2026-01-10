import { useMutation, useQueryClient } from "@tanstack/react-query";
import API from "../client";
import { queryKeys } from "../queries/keys";

export type AddContactToAccountData = {
  contact_uid: string;
};

/**
 * Add a contact to an account
 */
export const useAddContactToAccount = (accountUid: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AddContactToAccountData) => {
      return await API.post(`/accounts/${accountUid}/contacts`, data);
    },
    onSuccess: () => {
      if (accountUid) {
        // Invalidate the account detail to refetch with new contacts
        queryClient.invalidateQueries({
          queryKey: queryKeys.accounts.detail(accountUid),
        });
      }
    },
  });
};

