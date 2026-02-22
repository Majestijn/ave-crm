import { useQuery } from "@tanstack/react-query";
import API from "../client";
import { queryKeys } from "./keys";
import type { User } from "../../types/users";

/**
 * Fetch all users (including current user) for dropdowns e.g. recruiter assignment.
 */
export const useUsersForDropdown = () => {
  return useQuery({
    queryKey: [...queryKeys.users.all, "dropdown"],
    queryFn: async (): Promise<User[]> => {
      const response = await API.get<User[] | { data: User[] }>(
        "/users?all=1&per_page=100"
      );
      if (Array.isArray(response)) return response;
      if (response && "data" in response && Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    },
  });
};
