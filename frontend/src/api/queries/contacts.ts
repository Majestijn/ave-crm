import { useQuery } from "@tanstack/react-query";
import type { Contact } from "../../types/contacts";
import API from "../client";
import { queryKeys } from "./keys";

/**
 * Get all contacts
 */
export const useContacts = () => {
  return useQuery({
    queryKey: queryKeys.contacts.all,
    queryFn: async () => {
      const responseData = await API.get<Contact[] | { data: Contact[] }>("/contacts");

      if (Array.isArray(responseData)) {
        return responseData;
      } else if (responseData && "data" in responseData && Array.isArray(responseData.data)) {
        return responseData.data;
      }

      return [] as Contact[];
    },
  });
};

/**
 * Get all candidates (contacts with candidate network roles)
 */
export const useCandidates = () => {
  return useQuery({
    queryKey: queryKeys.contacts.candidates,
    queryFn: async () => {
      const responseData = await API.get<Contact[] | { data: Contact[] }>("/contacts/candidates");

      if (Array.isArray(responseData)) {
        return responseData;
      } else if (responseData && "data" in responseData && Array.isArray(responseData.data)) {
        return responseData.data;
      }

      return [] as Contact[];
    },
  });
};
