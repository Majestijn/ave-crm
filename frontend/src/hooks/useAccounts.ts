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
      const responseData = await API.get<Account[]>("/accounts");

      let accountArray: Account[];
      if (Array.isArray(responseData)) {
        accountArray = responseData;
      } else if (responseData && typeof responseData === 'object' && 'data' in responseData && Array.isArray(responseData.data)) {
        accountArray = responseData.data;
      } else {
        console.error("Unexpected response structure:", {
          responseData,
          type: typeof responseData,
          isArray: Array.isArray(responseData),
          keys: responseData && typeof responseData === 'object' ? Object.keys(responseData) : null,
        });
        throw new Error(`Unexpected data format: expected array, got ${typeof responseData}`);
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

