import { useQuery } from "@tanstack/react-query";
import type { Contact } from "../../types/contacts";
import API from "../client";
import { queryKeys } from "./keys";

export type LocationFilter = {
  lat: number;
  lng: number;
  radius: number;
};

export type AgeFilter = {
  minAge?: number;
  maxAge?: number;
};

export type ContactFilters = {
  location?: LocationFilter;
  age?: AgeFilter;
};

export const useContacts = (locationFilter?: LocationFilter, ageFilter?: AgeFilter) => {
  return useQuery({
    queryKey: [
      ...queryKeys.contacts.all,
      locationFilter ? ["radius", locationFilter.lat, locationFilter.lng, locationFilter.radius] : null,
      ageFilter ? ["age", ageFilter.minAge, ageFilter.maxAge] : null,
    ].filter(Boolean),
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (locationFilter) {
        params.append("lat", locationFilter.lat.toString());
        params.append("lng", locationFilter.lng.toString());
        params.append("radius", locationFilter.radius.toString());
      }
      
      if (ageFilter) {
        if (ageFilter.minAge !== undefined) {
          params.append("min_age", ageFilter.minAge.toString());
        }
        if (ageFilter.maxAge !== undefined) {
          params.append("max_age", ageFilter.maxAge.toString());
        }
      }
      
      const url = params.toString() ? `/contacts?${params.toString()}` : "/contacts";
      const responseData = await API.get<Contact[] | { data: Contact[] }>(url);

      if (Array.isArray(responseData)) {
        return responseData;
      } else if (responseData && "data" in responseData && Array.isArray(responseData.data)) {
        return responseData.data;
      }

      return [] as Contact[];
    },
  });
};

export const useCandidates = (locationFilter?: LocationFilter) => {
  return useQuery({
    queryKey: locationFilter
      ? [...queryKeys.contacts.candidates, "radius", locationFilter.lat, locationFilter.lng, locationFilter.radius]
      : queryKeys.contacts.candidates,
    queryFn: async () => {
      let url = "/contacts/candidates";
      if (locationFilter) {
        const params = new URLSearchParams({
          lat: locationFilter.lat.toString(),
          lng: locationFilter.lng.toString(),
          radius: locationFilter.radius.toString(),
        });
        url = `/contacts/candidates?${params.toString()}`;
      }

      const responseData = await API.get<Contact[] | { data: Contact[] }>(url);

      if (Array.isArray(responseData)) {
        return responseData;
      } else if (responseData && "data" in responseData && Array.isArray(responseData.data)) {
        return responseData.data;
      }

      return [] as Contact[];
    },
  });
};

export const useGeocode = (location: string | null) => {
  return useQuery({
    queryKey: ["geocode", location],
    queryFn: async () => {
      if (!location) return null;
      const response = await API.post<{ latitude: number; longitude: number }>("/geocode", { location });
      return response;
    },
    enabled: !!location,
    staleTime: 1000 * 60 * 60 * 24,
  });
};

export type ContactDocument = {
  id: number;
  type: "cv" | "certificate" | "notes" | "other";
  original_filename: string;
  mime_type: string;
  file_size: number;
  formatted_file_size: string;
  download_url: string;
  created_at: string;
};

export const useContactDocuments = (contactUid: string | null) => {
  return useQuery({
    queryKey: contactUid ? queryKeys.contacts.documents(contactUid) : ["contacts", "documents", "none"],
    queryFn: async () => {
      if (!contactUid) return [];
      const responseData = await API.get<ContactDocument[] | { data: ContactDocument[] }>(
        `/contacts/${contactUid}/documents`
      );

      if (Array.isArray(responseData)) {
        return responseData;
      } else if (responseData && "data" in responseData && Array.isArray(responseData.data)) {
        return responseData.data;
      }

      return [] as ContactDocument[];
    },
    enabled: !!contactUid,
  });
};
