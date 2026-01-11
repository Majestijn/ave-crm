// useClients.ts
import { useCallback, useState } from "react";
import type { Account } from "../types/accounts";
import API from "../../axios-client";

export const useAccounts = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const responseData = await API.get<Account[] | { data: Account[] }>("/accounts");

      let accountArray: Account[];
      if (Array.isArray(responseData)) {
        accountArray = responseData;
      } else if (responseData && "data" in responseData && Array.isArray(responseData.data)) {
        accountArray = responseData.data;
      } else {
        accountArray = [];
      }

      setAccounts(accountArray);
    } catch (e: any) {
      const errorMessage = e?.response?.data?.message || e?.message || "Onbekende fout";
      setError(errorMessage);
      setAccounts([]); // Reset to empty array on error
      console.error("Error fetching accounts:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  return { accounts, loading, error, refresh };
};

