import { useQuery } from "@tanstack/react-query";
import type { Account } from "../../types/accounts";
import API from "../client";
import { queryKeys } from "./keys";

/**
 * Get all accounts
 */
export const useAccounts = () => {
  return useQuery<Account[]>({
    queryKey: queryKeys.accounts.all,
    queryFn: async (): Promise<Account[]> => {
      const responseData = await API.get("/accounts");

      // Handle paginated response or direct array
      if (Array.isArray(responseData)) {
        return responseData;
      } else if (
        responseData &&
        typeof responseData === "object" &&
        "data" in responseData &&
        Array.isArray((responseData as any).data)
      ) {
        return (responseData as any).data;
      }

      console.error("Unexpected response structure:", responseData);
      throw new Error(
        `Unexpected data format: expected array, got ${typeof responseData}`
      );
    },
  });
};

/**
 * Get account by UID
 */
export const useAccount = (uid: string | undefined) => {
  return useQuery<Account>({
    queryKey: queryKeys.accounts.detail(uid!),
    queryFn: async (): Promise<Account> => {
      const responseData = await API.get(`/accounts/${uid}`);
      return responseData as Account;
    },
    enabled: !!uid,
  });
};
