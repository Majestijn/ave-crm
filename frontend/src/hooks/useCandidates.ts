// useCandidates.ts
import { useCallback, useState } from "react";
import type { Paginated, Candidate } from "../types/candidates";
import API from "../../axios-client";

export const useCandidates = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // The axios interceptor already extracts response.data, so response IS the data
      const responseData = await API.get<Candidate[]>("/candidates");
      
      // Handle paginated response or direct array
      let candidateArray: Candidate[];
      if (Array.isArray(responseData)) {
        candidateArray = responseData;
      } else if (responseData && typeof responseData === 'object' && 'data' in responseData && Array.isArray(responseData.data)) {
        // Handle Laravel paginated response
        candidateArray = responseData.data;
      } else {
        console.error("Unexpected response structure:", {
          responseData,
          type: typeof responseData,
          isArray: Array.isArray(responseData),
          keys: responseData && typeof responseData === 'object' ? Object.keys(responseData) : null,
        });
        throw new Error(`Unexpected data format: expected array, got ${typeof responseData}`);
      }
      
      setCandidates(candidateArray);
    } catch (e: any) {
      const errorMessage = e?.response?.data?.message || e?.message || "Onbekende fout";
      setError(errorMessage);
      setCandidates([]); // Reset to empty array on error
      console.error("Error fetching candidates:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  return { candidates, loading, error, refresh };
};

