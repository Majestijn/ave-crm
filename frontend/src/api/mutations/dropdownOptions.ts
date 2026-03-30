import { useMutation, useQueryClient } from "@tanstack/react-query";
import API from "../client";
import { queryKeys } from "../queries/keys";
import type { DropdownOption } from "../queries/dropdownOptions";

export function useCreateDropdownOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      type: string;
      value: string;
      label: string;
      color?: string | null;
    }) => {
      return API.post<DropdownOption>(
        "/dropdown-options",
        data,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.dropdownOptions.byType(variables.type),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dropdownOptions.all,
      });
    },
  });
}

export function useUpdateDropdownOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: number;
      label?: string;
      color?: string | null;
      sort_order?: number;
      is_active?: boolean;
    }) => {
      return API.put<DropdownOption>(
        `/dropdown-options/${id}`,
        data,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.dropdownOptions.all,
      });
    },
  });
}

export function useDeleteDropdownOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await API.delete(`/dropdown-options/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.dropdownOptions.all,
      });
    },
  });
}

export function useReorderDropdownOptions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { type: string; order: number[] }) => {
      await API.put("/dropdown-options/reorder", data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.dropdownOptions.byType(variables.type),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dropdownOptions.all,
      });
    },
  });
}
