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
      const response = await API.get<Paginated<User> | User[]>("/users");
      console.log("Users response:", response);
      
      // Handle paginated response
      let userArray: User[];
      if (Array.isArray(response)) {
        userArray = response;
      } else if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
        userArray = response.data;
      } else {
        throw new Error("Unexpected data format: response is not an array or paginated object");
      }
      
      setUsers(userArray);
      console.log("Users set to:", userArray);
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
