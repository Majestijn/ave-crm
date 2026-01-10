import { useQuery } from "@tanstack/react-query";
import API from "../client";
import { queryKeys } from "./keys";

export type ActivityType =
  | "call"
  | "proposal"
  | "interview"
  | "hired"
  | "rejected";

export type Activity = {
  id: number;
  type: ActivityType;
  description: string;
  date: string;
  contact?: {
    uid: string;
    name?: string;
    first_name?: string;
    prefix?: string;
    last_name?: string;
  };
  created_by?: string;
};

/**
 * Get activities for an assignment
 */
export const useAssignmentActivities = (assignmentUid: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.assignments.activities(assignmentUid!),
    queryFn: async () => {
      const responseData = await API.get<Activity[]>(
        `/assignments/${assignmentUid}/activities`
      );

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

      return [];
    },
    enabled: !!assignmentUid,
  });
};

