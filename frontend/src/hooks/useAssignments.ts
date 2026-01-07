import { useCallback, useState, useEffect } from "react";
import API from "../../axios-client";

export type AssignmentFromAPI = {
  id: number;
  uid: string;
  account_id: number;
  account?: {
    uid: string;
    name: string;
  };
  title: string;
  description?: string;
  status: string;
  salary_min?: number;
  salary_max?: number;
  has_bonus?: boolean;
  has_car?: boolean;
  vacation_days?: number;
  location?: string;
  employment_type?: string;
  created_at: string;
  updated_at: string;
};

export const useAssignments = () => {
  const [assignments, setAssignments] = useState<AssignmentFromAPI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const responseData = await API.get<AssignmentFromAPI[]>("/assignments");

      let assignmentArray: AssignmentFromAPI[];
      if (Array.isArray(responseData)) {
        assignmentArray = responseData;
      } else if (
        responseData &&
        typeof responseData === "object" &&
        "data" in responseData &&
        Array.isArray(responseData.data)
      ) {
        assignmentArray = responseData.data;
      } else {
        console.error("Unexpected response structure:", responseData);
        throw new Error(
          `Unexpected data format: expected array, got ${typeof responseData}`
        );
      }

      setAssignments(assignmentArray);
    } catch (e: any) {
      const errorMessage =
        e?.response?.data?.message || e?.message || "Onbekende fout";
      setError(errorMessage);
      setAssignments([]);
      console.error("Error fetching assignments:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  return { assignments, loading, error, refresh };
};

export const useAccountAssignments = (accountUid: string | undefined) => {
  const [assignments, setAssignments] = useState<AssignmentFromAPI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!accountUid) return;
    
    setLoading(true);
    setError(null);
    try {
      const responseData = await API.get<AssignmentFromAPI[]>(
        `/accounts/${accountUid}/assignments`
      );

      let assignmentArray: AssignmentFromAPI[];
      if (Array.isArray(responseData)) {
        assignmentArray = responseData;
      } else if (
        responseData &&
        typeof responseData === "object" &&
        "data" in responseData &&
        Array.isArray(responseData.data)
      ) {
        assignmentArray = responseData.data;
      } else {
        console.error("Unexpected response structure:", responseData);
        throw new Error(
          `Unexpected data format: expected array, got ${typeof responseData}`
        );
      }

      setAssignments(assignmentArray);
    } catch (e: any) {
      const errorMessage =
        e?.response?.data?.message || e?.message || "Onbekende fout";
      setError(errorMessage);
      setAssignments([]);
      console.error("Error fetching account assignments:", e);
    } finally {
      setLoading(false);
    }
  }, [accountUid]);

  // Auto-refresh when accountUid changes
  useEffect(() => {
    if (accountUid) {
      refresh();
    }
  }, [accountUid, refresh]);

  return { assignments, loading, error, refresh };
};

