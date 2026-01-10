# TanStack Query Migratie - Vergelijking Oude vs Nieuwe Code

Dit document beschrijft de migratie van custom React hooks naar TanStack Query (v5) en de voordelen hiervan.

---

## 📊 Code Reductie Overzicht

| Component | Oude Code | Nieuwe Code | Reductie |
|-----------|-----------|-------------|----------|
| useAccounts | 47 regels | 32 regels | **32%** |
| useAssignments | 127 regels | 74 regels | **42%** |
| useCandidates | 59 regels | 28 regels | **53%** |
| **Totaal Hooks** | **233 regels** | **134 regels** | **~42%** |

---

## 🔄 Vergelijking: Oude vs Nieuwe Code

### useAccounts Hook

#### ❌ Oude Code (47 regels)

```typescript
// hooks/useAccounts.ts
import { useCallback, useState } from "react";
import type { Account } from "../types/accounts";
import API from "../../axios-client";

export const useAccounts = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const responseData = await API.get<Account[]>("/accounts");

      let accountArray: Account[];
      if (Array.isArray(responseData)) {
        accountArray = responseData;
      } else if (responseData && typeof responseData === 'object' && 'data' in responseData && Array.isArray(responseData.data)) {
        accountArray = responseData.data;
      } else {
        console.error("Unexpected response structure:", {
          responseData,
          type: typeof responseData,
          isArray: Array.isArray(responseData),
          keys: responseData && typeof responseData === 'object' ? Object.keys(responseData) : null,
        });
        throw new Error(`Unexpected data format: expected array, got ${typeof responseData}`);
      }

      setAccounts(accountArray);
    } catch (e: any) {
      const errorMessage = e?.response?.data?.message || e?.message || "Onbekende fout";
      setError(errorMessage);
      setAccounts([]);
      console.error("Error fetching accounts:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  return { accounts, loading, error, refresh };
};
```

#### ✅ Nieuwe Code (32 regels)

```typescript
// api/queries/accounts.ts
import { useQuery } from "@tanstack/react-query";
import type { Account } from "../../types/accounts";
import API from "../client";
import { queryKeys } from "./keys";

export const useAccounts = () => {
  return useQuery({
    queryKey: queryKeys.accounts.all,
    queryFn: async () => {
      const responseData = await API.get<Account[]>("/accounts");

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

      throw new Error(`Unexpected data format: expected array, got ${typeof responseData}`);
    },
  });
};
```

---

### useCandidates Hook

#### ❌ Oude Code (59 regels)

```typescript
// hooks/useCandidates.ts
import { useCallback, useState, useEffect } from "react";
import type { Contact } from "../types/contacts";
import API from "../../axios-client";

export const useCandidates = () => {
  const [candidates, setCandidates] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const responseData = await API.get<Contact[]>("/contacts/candidates");

      let candidateArray: Contact[];
      if (Array.isArray(responseData)) {
        candidateArray = responseData;
      } else if (/* ... */ ) {
        candidateArray = responseData.data;
      } else {
        throw new Error(`Unexpected data format`);
      }

      setCandidates(candidateArray);
    } catch (e: any) {
      const errorMessage = e?.response?.data?.message || e?.message || "Onbekende fout";
      setError(errorMessage);
      setCandidates([]);
      console.error("Error fetching candidates:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh on mount - HANDMATIG
  useEffect(() => {
    refresh();
  }, [refresh]);

  return { candidates, loading, error, refresh };
};
```

#### ✅ Nieuwe Code (28 regels)

```typescript
// api/queries/contacts.ts
import { useQuery } from "@tanstack/react-query";
import type { Contact } from "../../types/contacts";
import API from "../client";
import { queryKeys } from "./keys";

export const useCandidates = () => {
  return useQuery({
    queryKey: queryKeys.contacts.candidates,
    queryFn: async () => {
      const responseData = await API.get<Contact[]>("/contacts/candidates");

      if (Array.isArray(responseData)) {
        return responseData;
      } else if (responseData?.data && Array.isArray(responseData.data)) {
        return responseData.data;
      }

      throw new Error(`Unexpected data format: expected array`);
    },
  });
};
```

---

## 🆕 Nieuwe Structuur: Query Key Factory

```typescript
// api/queries/keys.ts
export const queryKeys = {
  accounts: {
    all: ["accounts"] as const,
    detail: (uid: string) => ["accounts", uid] as const,
  },
  assignments: {
    all: ["assignments"] as const,
    detail: (uid: string) => ["assignments", uid] as const,
    byAccount: (accountUid: string) => ["assignments", "account", accountUid] as const,
    candidates: (assignmentUid: string) => ["assignments", assignmentUid, "candidates"] as const,
  },
  contacts: {
    all: ["contacts"] as const,
    candidates: ["contacts", "candidates"] as const,
    detail: (uid: string) => ["contacts", uid] as const,
  },
} as const;
```

**Voordelen:**
- ✅ Consistente cache invalidatie
- ✅ Hiërarchische structuur
- ✅ Type-safe query keys
- ✅ Makkelijk te onderhouden

---

## 🔄 Mutations: Automatische Cache Invalidatie

### ❌ Oude manier (handmatige refresh)

```typescript
// In component
const handleCreateAssignment = async () => {
  try {
    await API.post("/assignments", data);
    // HANDMATIG: refresh moet worden aangeroepen
    refresh();
    // Probleem: Andere componenten die dezelfde data gebruiken worden NIET geüpdatet
  } catch (e) {
    setError(e.message);
  }
};
```

### ✅ Nieuwe manier (TanStack Query)

```typescript
// api/mutations/assignments.ts
export const useCreateAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAssignmentData) => {
      return await API.post<AssignmentFromAPI>("/assignments", data);
    },
    onSuccess: () => {
      // AUTOMATISCH: Alle componenten die deze query gebruiken worden geüpdatet
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
    },
  });
};

// In component - veel eenvoudiger
const createMutation = useCreateAssignment();
const handleCreate = () => {
  createMutation.mutate(data);
  // Geen handmatige refresh nodig!
};
```

---

## ✅ Voordelen van TanStack Query

### 1. **Automatische Caching**
```
┌─────────────────────────────────────────────────────────┐
│ Oude situatie:                                          │
│ Pagina A → API call → Pagina B → OPNIEUW API call      │
│                                                         │
│ Nieuwe situatie:                                        │
│ Pagina A → API call → Cache → Pagina B → UIT CACHE!    │
└─────────────────────────────────────────────────────────┘
```

### 2. **Automatische Refetch**
- Bij window focus (terug naar tab)
- Bij network reconnect
- Na mutations (via invalidation)
- Configureerbare stale time

### 3. **Deduplicatie**
```typescript
// Als 3 componenten tegelijk useAccounts() aanroepen:
// Oude code: 3 API calls
// TanStack Query: 1 API call, 3x dezelfde data
```

### 4. **Loading & Error States Ingebouwd**
```typescript
// Oude code - handmatig
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const [data, setData] = useState([]);

// Nieuwe code - automatisch
const { data, isLoading, isError, error } = useQuery(...);
```

### 5. **Optimistic Updates Mogelijk**
```typescript
useMutation({
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['todos'] });
    
    // Snapshot previous value
    const previousTodos = queryClient.getQueryData(['todos']);
    
    // Optimistically update
    queryClient.setQueryData(['todos'], (old) => [...old, newData]);
    
    return { previousTodos };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(['todos'], context.previousTodos);
  },
});
```

### 6. **DevTools**
- Real-time query status
- Cache inspection
- Manual refetch/invalidation
- Offline simulation

---

## 📁 Nieuwe Bestandsstructuur

```
frontend/src/api/
├── client.ts              # Axios instance
├── QueryProvider.tsx      # QueryClient provider
├── queries/
│   ├── keys.ts           # Query key factory
│   ├── accounts.ts       # Account queries
│   ├── assignments.ts    # Assignment queries
│   └── contacts.ts       # Contact queries
└── mutations/
    ├── assignments.ts    # Assignment mutations
    └── assignmentCandidates.ts  # Candidate mutations
```

---

## 🚀 Gebruik in Components

### Oude manier:

```typescript
function AssignmentsPage() {
  const { assignments, loading, error, refresh } = useAssignments();
  
  useEffect(() => {
    refresh(); // Handmatig aanroepen
  }, [refresh]);
  
  if (loading) return <Loading />;
  if (error) return <Error message={error} />;
  
  return <List data={assignments} />;
}
```

### Nieuwe manier:

```typescript
function AssignmentsPage() {
  const { data: assignments = [], isLoading, isError, error } = useAssignments();
  
  // Geen useEffect nodig - automatisch fetched!
  
  if (isLoading) return <Loading />;
  if (isError) return <Error message={error.message} />;
  
  return <List data={assignments} />;
}
```

---

## 📈 Conclusie

| Aspect | Oude Code | TanStack Query |
|--------|-----------|----------------|
| Caching | ❌ Geen | ✅ Automatisch |
| Deduplicatie | ❌ Nee | ✅ Ja |
| Refetch | ❌ Handmatig | ✅ Automatisch |
| Error handling | ❌ Per hook | ✅ Gecentraliseerd |
| Loading states | ❌ Handmatig | ✅ Ingebouwd |
| DevTools | ❌ Geen | ✅ React Query Devtools |
| Code regels | ~233 | ~134 (**-42%**) |
| Boilerplate | ❌ Veel | ✅ Minimaal |

**TanStack Query bespaart ~42% code en voegt enterprise-grade features toe die voorheen niet aanwezig waren.**


