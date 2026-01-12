import { useQuery } from "@tanstack/react-query";
import type { Contact } from "../../types/contacts";
import API from "../client";
import { queryKeys } from "./keys";

export type LocationFilter = {
  lat: number;
  lng: number;
  radius: number; // in kilometers
};

/**
 * Get all contacts, optionally filtered by radius from a location
 */
export const useContacts = (locationFilter?: LocationFilter) => {
  return useQuery({
    queryKey: locationFilter 
      ? [...queryKeys.contacts.all, 'radius', locationFilter.lat, locationFilter.lng, locationFilter.radius]
      : queryKeys.contacts.all,
    queryFn: async () => {
      let url = "/contacts";
      if (locationFilter) {
        const params = new URLSearchParams({
          lat: locationFilter.lat.toString(),
          lng: locationFilter.lng.toString(),
          radius: locationFilter.radius.toString(),
        });
        url = `/contacts?${params.toString()}`;
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

/**
 * Get all candidates (contacts with candidate network roles), optionally filtered by radius
 */
export const useCandidates = (locationFilter?: LocationFilter) => {
  return useQuery({
    queryKey: locationFilter
      ? [...queryKeys.contacts.candidates, 'radius', locationFilter.lat, locationFilter.lng, locationFilter.radius]
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

/**
 * Geocode a location string to coordinates
 */
export const useGeocode = (location: string | null) => {
  return useQuery({
    queryKey: ['geocode', location],
    queryFn: async () => {
      if (!location) return null;
      const response = await API.post<{ latitude: number; longitude: number }>("/geocode", { location });
      return response;
    },
    enabled: !!location,
    staleTime: 1000 * 60 * 60 * 24, // Cache for 24 hours
  });
};
