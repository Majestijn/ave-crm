import { useQuery } from "@tanstack/react-query";
import API from "../client";
import { queryKeys } from "./keys";

export type DropdownOption = {
  id: number;
  type: string;
  value: string;
  label: string;
  color: string | null;
  sort_order: number;
  is_active: boolean;
};

export function useDropdownOptions(type: string) {
  return useQuery({
    queryKey: queryKeys.dropdownOptions.byType(type),
    queryFn: async () => {
      return API.get<DropdownOption[]>(
        `/dropdown-options/${type}`,
      );
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAllDropdownOptions() {
  return useQuery({
    queryKey: queryKeys.dropdownOptions.all,
    queryFn: async () => {
      return API.get<Record<string, DropdownOption[]>>(
        "/dropdown-options",
      );
    },
    staleTime: 5 * 60 * 1000,
  });
}
