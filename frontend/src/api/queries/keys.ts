
export const queryKeys = {
  accounts: {
    all: ["accounts"] as const,
    detail: (uid: string) => ["accounts", uid] as const,
  },
  assignments: {
    all: ["assignments"] as const,
    detail: (uid: string) => ["assignments", uid] as const,
    byAccount: (accountUid: string) =>
      ["assignments", "account", accountUid] as const,
    candidates: (assignmentUid: string) =>
      ["assignments", assignmentUid, "candidates"] as const,
    activities: (assignmentUid: string) =>
      ["assignments", assignmentUid, "activities"] as const,
  },
  contacts: {
    all: ["contacts"] as const,
    candidates: ["contacts", "candidates"] as const,
    detail: (uid: string) => ["contacts", uid] as const,
  },
  users: {
    all: ["users"] as const,
    detail: (id: number) => ["users", id] as const,
  },
} as const;
