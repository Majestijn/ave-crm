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
      const responseData = await API.get<Contact[]>("/contacts");

      if (Array.isArray(responseData)) {
        return responseData;
      } else if (
        responseData &&
        typeof responseData === "object" &&
        "data" in responseData &&
        Array.isArray(responseData.data)
      ) {
        return responseData.data;
      }

      console.error("Unexpected response structure:", responseData);
      throw new Error(
        `Unexpected data format: expected array, got ${typeof responseData}`
      );
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
      const responseData = await API.get<Contact[]>("/contacts/candidates");

      if (Array.isArray(responseData)) {
        return responseData;
      } else if (
        responseData &&
        typeof responseData === "object" &&
        "data" in responseData &&
        Array.isArray(responseData.data)
      ) {
        return responseData.data;
      }

      console.error("Unexpected response structure:", responseData);
      throw new Error(
        `Unexpected data format: expected array, got ${typeof responseData}`
      );
    },
  });
};
