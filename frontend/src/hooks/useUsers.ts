// useUsers.ts
import { useCallback, useState } from "react";
import type { Paginated, User } from "../types/users";
import API from "../../axios-client";

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userData = await API.get<User[]>("/users");
      console.log("Users response:", userData);
      if (!Array.isArray(userData)) {
        throw new Error("Unexpected data format: response is not an array");
      }
      setUsers(userData); // Set users to the array
      console.log("Users set to:", userData); // Confirm the set value
    } catch (e: any) {
      setError(e?.message ?? "Onbekende fout");
      setUsers([]); // Reset to empty array on error
      console.log("Error fetching users:", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { users, loading, error, refresh };
};
