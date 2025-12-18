import { useCallback, useState } from "react";
import type { Contact } from "../types/contacts";
import API from "../../axios-client";

export const useContacts = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const responseData = await API.get<Contact[]>("/contacts");

      let contactArray: Contact[];
      if (Array.isArray(responseData)) {
        contactArray = responseData;
      } else if (
        responseData &&
        typeof responseData === "object" &&
        "data" in responseData &&
        Array.isArray(responseData.data)
      ) {
        contactArray = responseData.data;
      } else {
        console.error("Unexpected response structure:", {
          responseData,
          type: typeof responseData,
          isArray: Array.isArray(responseData),
          keys:
            responseData && typeof responseData === "object"
              ? Object.keys(responseData)
              : null,
        });
        throw new Error(
          `Unexpected data format: expected array, got ${typeof responseData}`
        );
      }

      setContacts(contactArray);
    } catch (e: any) {
      const errorMessage =
        e?.response?.data?.message || e?.message || "Onbekende fout";
      setError(errorMessage);
      setContacts([]); // Reset to empty array on error
      console.error("Error fetching contacts:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  return { contacts, loading, error, refresh };
};
