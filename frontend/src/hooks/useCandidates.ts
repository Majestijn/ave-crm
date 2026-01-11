import { useCallback, useState, useEffect } from "react";
import type { Contact } from "../types/contacts";
import API from "../../axios-client";

export const useCandidates = () => {
  const [candidates, setCandidates] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const responseData = await API.get<Contact[] | { data: Contact[] }>("/contacts/candidates");

      let candidateArray: Contact[];
      if (Array.isArray(responseData)) {
        candidateArray = responseData;
      } else if (responseData && "data" in responseData && Array.isArray(responseData.data)) {
        candidateArray = responseData.data;
      } else {
        candidateArray = [];
      }

      setCandidates(candidateArray);
    } catch (e: any) {
      const errorMessage =
        e?.response?.data?.message || e?.message || "Onbekende fout";
      setError(errorMessage);
      setCandidates([]);
      console.error("Error fetching candidates:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  return { candidates, loading, error, refresh };
};

