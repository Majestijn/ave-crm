import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Menu,
  MenuItem,
  Checkbox,
  Alert,
} from "@mui/material";
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Sort as SortIcon,
  Add as AddIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import {
  useAssignments,
  type CandidateAssignment,
} from "../../api/queries/assignments";
import { useAccounts } from "../../api/queries/accounts";
import { useUsersForDropdown } from "../../api/queries/users";
import { useUpdateAssignment } from "../../api/mutations/assignments";
import {
  useUpdateAssignmentCandidateStatus,
  useRemoveAssignmentCandidate,
} from "../../api/mutations/assignmentCandidates";
import { useDisclosure } from "../../hooks/useDisclosure";
import { ColumnOrderDialog } from "../../components/ColumnOrderDialog";

import type { AssignmentWithDetails } from "../../components/features/assignments/types";
import {
  statusOptions,
  benefitsOptions,
  CANDIDATES_COLUMN_META,
  CANDIDATES_COLUMN_ORDER_KEY,
} from "../../components/features/assignments/types";
import CreateAssignmentDialog from "../../components/features/assignments/CreateAssignmentDialog";
import EditAssignmentDialog from "../../components/features/assignments/EditAssignmentDialog";
import AddCandidateDialog from "../../components/features/assignments/AddCandidateDialog";
import AssignmentCard from "../../components/features/assignments/AssignmentCard";

type SortBy =
  | "title_asc"
  | "title_desc"
  | "account_asc"
  | "account_desc"
  | "status"
  | "salary_desc"
  | "salary_asc"
  | "candidates_desc"
  | "candidates_asc";

const sortLabels: Record<SortBy, string> = {
  title_asc: "Titel A–Z",
  title_desc: "Titel Z–A",
  account_asc: "Klant A–Z",
  account_desc: "Klant Z–A",
  status: "Status",
  salary_desc: "Salaris hoog → laag",
  salary_asc: "Salaris laag → hoog",
  candidates_desc: "Meeste kandidaten eerst",
  candidates_asc: "Minste kandidaten eerst",
};

export default function AssignmentsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    data: apiAssignments = [],
    isLoading: assignmentsLoading,
    error: assignmentsError,
  } = useAssignments();
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const { data: users = [] } = useUsersForDropdown();

  const updateAssignmentMutation = useUpdateAssignment();
  const updateCandidateStatusMutation = useUpdateAssignmentCandidateStatus();
  const removeCandidateMutation = useRemoveAssignmentCandidate();

  // Search, sort, filter
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("title_asc");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [employmentTypeFilters, setEmploymentTypeFilters] = useState<string[]>(
    [],
  );
  const [sortAnchor, setSortAnchor] = useState<null | HTMLElement>(null);
  const [filterAnchor, setFilterAnchor] = useState<null | HTMLElement>(null);

  // Expansion state
  const [expandedAssignments, setExpandedAssignments] = useState<Set<number>>(
    new Set(),
  );
  const [expandedNotesImages, setExpandedNotesImages] = useState<Set<number>>(
    new Set(),
  );

  // Status menus (assignment-level)
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<
    Record<number, HTMLElement | null>
  >({});
  const [assignmentStatuses, setAssignmentStatuses] = useState<
    Record<number, string>
  >({});

  // Candidate status menus
  const [candidateStatusMenuAnchor, setCandidateStatusMenuAnchor] = useState<
    Record<string, HTMLElement | null>
  >({});

  // Candidate assignments per assignment (populated by loaders)
  const [localCandidateAssignments, setLocalCandidateAssignments] = useState<
    Record<number, CandidateAssignment[]>
  >({});

  // Column order
  const candidateColumnOrderDialog = useDisclosure();
  const [candidatesColumnOrder, setCandidatesColumnOrder] = useState<string[]>(
    () => {
      try {
        const stored = localStorage.getItem(CANDIDATES_COLUMN_ORDER_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as string[];
          const valid = CANDIDATES_COLUMN_META.map((c) => c.field);
          if (
            parsed.length === valid.length &&
            parsed.every((f) => valid.includes(f))
          ) {
            return parsed;
          }
        }
      } catch {
        /* ignore */
      }
      return CANDIDATES_COLUMN_META.map((c) => c.field);
    },
  );
  const persistCandidatesColumnOrder = useCallback((order: string[]) => {
    setCandidatesColumnOrder(order);
    localStorage.setItem(CANDIDATES_COLUMN_ORDER_KEY, JSON.stringify(order));
  }, []);

  // Dialogs
  const createAssignmentDialog = useDisclosure();
  const editAssignmentDialog = useDisclosure();
  const [editingAssignment, setEditingAssignment] =
    useState<AssignmentWithDetails | null>(null);

  const [addCandidateDialogOpen, setAddCandidateDialogOpen] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<
    number | null
  >(null);

  // Expand from account detail navigation
  const assignmentUidFromState = (location.state as { assignmentUid?: string })
    ?.assignmentUid;

  // --- Stable callbacks ---

  const handleCandidatesLoaded = useCallback(
    (assignmentId: number, candidates: CandidateAssignment[]) => {
      setLocalCandidateAssignments((prev) => ({
        ...prev,
        [assignmentId]: candidates,
      }));
    },
    [],
  );

  // Transform API data
  const assignments: AssignmentWithDetails[] = React.useMemo(() => {
    return apiAssignments.map((a) => ({
      id: a.id,
      uid: a.uid,
      account_id: a.account_id,
      title: a.title,
      description: a.description,
      status: a.status,
      account: a.account,
      recruiter: a.recruiter,
      secondary_recruiters: a.secondary_recruiters || [],
      salary_min: a.salary_min,
      salary_max: a.salary_max,
      vacation_days: a.vacation_days,
      location: a.location,
      employment_type: a.employment_type,
      start_date: a.start_date,
      benefits: a.benefits,
      notes_image_url: a.notes_image_url,
      candidates: [],
    }));
  }, [apiAssignments]);

  // Auto-expand from navigation state
  useEffect(() => {
    if (!assignmentUidFromState || apiAssignments.length === 0) return;
    const match = apiAssignments.find((a) => a.uid === assignmentUidFromState);
    if (match) {
      setExpandedAssignments((prev) => new Set(prev).add(match.id));
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [assignmentUidFromState, apiAssignments, navigate, location.pathname]);

  const getCurrentStatus = (a: AssignmentWithDetails) =>
    assignmentStatuses[a.id] || a.status || "active";

  // --- Toggle handlers ---

  const toggleExpanded = useCallback((id: number) => {
    setExpandedAssignments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleNotesImageExpanded = useCallback((id: number) => {
    setExpandedNotesImages((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleStatusFilter = (status: string) => {
    setStatusFilters((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    );
  };

  const toggleEmploymentType = (type: string) => {
    setEmploymentTypeFilters((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  // --- Assignment status ---

  const handleStatusMenuOpen = useCallback(
    (id: number, e: React.MouseEvent<HTMLElement>) => {
      setStatusMenuAnchor((prev) => ({ ...prev, [id]: e.currentTarget }));
    },
    [],
  );

  const handleStatusMenuClose = useCallback((id: number) => {
    setStatusMenuAnchor((prev) => ({ ...prev, [id]: null }));
  }, []);

  const handleStatusChange = useCallback(
    async (assignmentId: number, newStatus: string) => {
      const assignment = assignments.find((a) => a.id === assignmentId);
      if (!assignment?.uid) return;

      setAssignmentStatuses((prev) => ({
        ...prev,
        [assignmentId]: newStatus,
      }));
      handleStatusMenuClose(assignmentId);

      try {
        await updateAssignmentMutation.mutateAsync({
          uid: assignment.uid,
          data: { status: newStatus },
        });
      } catch (e: any) {
        console.error("Error updating assignment status:", e);
        setAssignmentStatuses((prev) => {
          const updated = { ...prev };
          delete updated[assignmentId];
          return updated;
        });
        alert(e?.response?.data?.message || "Fout bij bijwerken van status");
      }
    },
    [assignments, handleStatusMenuClose, updateAssignmentMutation],
  );

  // --- Candidate status ---

  const handleCandidateStatusMenuOpen = useCallback(
    (
      assignmentId: number,
      candidateId: number,
      event: React.MouseEvent<HTMLElement>,
    ) => {
      event.stopPropagation();
      const key = `${assignmentId}-${candidateId}`;
      setCandidateStatusMenuAnchor((prev) => ({
        ...prev,
        [key]: event.currentTarget,
      }));
    },
    [],
  );

  const handleCandidateStatusMenuClose = useCallback(
    (assignmentId: number, candidateId: number) => {
      const key = `${assignmentId}-${candidateId}`;
      setCandidateStatusMenuAnchor((prev) => ({ ...prev, [key]: null }));
    },
    [],
  );

  const handleCandidateStatusChange = useCallback(
    async (
      assignmentId: number,
      candidateId: number,
      newStatus: CandidateAssignment["status"],
    ) => {
      const assignment = assignments.find((a) => a.id === assignmentId);
      if (!assignment?.uid) return;

      const candidateToUpdate = localCandidateAssignments[assignmentId]?.find(
        (c) => c.id === candidateId,
      );
      if (!candidateToUpdate) return;

      handleCandidateStatusMenuClose(assignmentId, candidateId);

      try {
        await updateCandidateStatusMutation.mutateAsync({
          assignmentUid: assignment.uid,
          contactUid: candidateToUpdate.contact.uid,
          status: newStatus,
        });
      } catch (e: any) {
        console.error("Error updating candidate status:", e);
        alert(e?.response?.data?.message || "Fout bij bijwerken van status");
      }
    },
    [
      assignments,
      localCandidateAssignments,
      handleCandidateStatusMenuClose,
      updateCandidateStatusMutation,
    ],
  );

  const handleRemoveCandidate = useCallback(
    async (assignmentId: number, candidateId: number) => {
      const assignment = assignments.find((a) => a.id === assignmentId);
      if (!assignment?.uid) return;

      const candidateToRemove = localCandidateAssignments[assignmentId]?.find(
        (c) => c.id === candidateId,
      );
      if (!candidateToRemove) return;

      try {
        await removeCandidateMutation.mutateAsync({
          assignmentUid: assignment.uid,
          contactUid: candidateToRemove.contact.uid,
        });
      } catch (e: any) {
        console.error("Error removing candidate from assignment:", e);
        alert(
          e?.response?.data?.message || "Fout bij verwijderen van kandidaat",
        );
      }
    },
    [assignments, localCandidateAssignments, removeCandidateMutation],
  );

  // --- Edit dialog ---

  const handleOpenEditDialog = useCallback(
    (assignment: AssignmentWithDetails) => {
      setEditingAssignment(assignment);
      editAssignmentDialog.open();
    },
    [editAssignmentDialog],
  );

  const handleCloseEditDialog = useCallback(() => {
    editAssignmentDialog.close();
    setEditingAssignment(null);
  }, [editAssignmentDialog]);

  // --- Add candidate dialog ---

  const handleOpenAddCandidateDialog = useCallback((assignmentId: number) => {
    setSelectedAssignmentId(assignmentId);
    setAddCandidateDialogOpen(true);
  }, []);

  const handleCloseAddCandidateDialog = useCallback(() => {
    setAddCandidateDialogOpen(false);
    setSelectedAssignmentId(null);
  }, []);

  const selectedAssignment = selectedAssignmentId
    ? assignments.find((a) => a.id === selectedAssignmentId)
    : null;

  const linkedCandidateUids = React.useMemo(() => {
    if (!selectedAssignmentId) return new Set<string>();
    const existing = localCandidateAssignments[selectedAssignmentId] || [];
    return new Set(existing.map((c) => c.contact.uid));
  }, [selectedAssignmentId, localCandidateAssignments]);

  // --- Navigation ---

  const handleNavigateToContact = useCallback(
    (uid: string) => {
      navigate(`/network?kandidaten=1`, { state: { contactUid: uid } });
    },
    [navigate],
  );

  const handleNavigateToAccount = useCallback(
    (uid: string) => {
      navigate(`/accounts/${uid}`);
    },
    [navigate],
  );

  // --- Filtered & sorted list ---

  const filteredAssignments = React.useMemo(() => {
    const result = assignments.filter((assignment) => {
      const matchesSearch =
        !searchQuery.trim() ||
        assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assignment.account?.name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());
      const currentStatus = getCurrentStatus(assignment);
      const matchesStatus =
        statusFilters.length === 0 || statusFilters.includes(currentStatus);
      const matchesEmploymentType =
        employmentTypeFilters.length === 0 ||
        (assignment.employment_type &&
          employmentTypeFilters.includes(assignment.employment_type));
      return matchesSearch && matchesStatus && matchesEmploymentType;
    });

    const statusOrder = [
      "active",
      "proposed",
      "hired",
      "shadow_management",
      "completed",
      "cancelled",
    ];

    return [...result].sort((a, b) => {
      const aStatus = getCurrentStatus(a);
      const bStatus = getCurrentStatus(b);
      const aStatusIdx = statusOrder.indexOf(aStatus);
      const bStatusIdx = statusOrder.indexOf(bStatus);

      switch (sortBy) {
        case "title_asc":
          return (a.title || "").localeCompare(b.title || "");
        case "title_desc":
          return (b.title || "").localeCompare(a.title || "");
        case "account_asc":
          return (a.account?.name || "").localeCompare(b.account?.name || "");
        case "account_desc":
          return (b.account?.name || "").localeCompare(a.account?.name || "");
        case "status":
          return (
            aStatusIdx - bStatusIdx ||
            (a.title || "").localeCompare(b.title || "")
          );
        case "salary_desc":
          return (
            (b.salary_max ?? b.salary_min ?? 0) -
            (a.salary_max ?? a.salary_min ?? 0)
          );
        case "salary_asc":
          return (
            (a.salary_min ?? a.salary_max ?? 0) -
            (b.salary_min ?? b.salary_max ?? 0)
          );
        case "candidates_desc": {
          const aCands = localCandidateAssignments[a.id]?.length ?? 0;
          const bCands = localCandidateAssignments[b.id]?.length ?? 0;
          return bCands - aCands;
        }
        case "candidates_asc": {
          const aCands = localCandidateAssignments[a.id]?.length ?? 0;
          const bCands = localCandidateAssignments[b.id]?.length ?? 0;
          return aCands - bCands;
        }
        default:
          return 0;
      }
    });
  }, [
    assignments,
    searchQuery,
    statusFilters,
    employmentTypeFilters,
    sortBy,
    assignmentStatuses,
    localCandidateAssignments,
  ]);

  // --- Render ---

  return (
    <Box>
      <Stack spacing={3}>
        {/* Header: Search, Sort, Filter, Add */}
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            placeholder="Zoeken op titel of klant..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flexGrow: 1, maxWidth: 400 }}
          />
          <Button
            variant="outlined"
            startIcon={<SortIcon />}
            onClick={(e) => setSortAnchor(e.currentTarget)}
            color={sortBy !== "title_asc" ? "primary" : "inherit"}
            sx={{ minWidth: 120 }}
          >
            Sorteren
          </Button>
          <Menu
            anchorEl={sortAnchor}
            open={Boolean(sortAnchor)}
            onClose={() => setSortAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          >
            {(Object.entries(sortLabels) as [SortBy, string][]).map(
              ([value, label]) => (
                <MenuItem
                  key={value}
                  onClick={() => {
                    setSortBy(value);
                    setSortAnchor(null);
                  }}
                >
                  {label}
                </MenuItem>
              ),
            )}
          </Menu>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={(e) => setFilterAnchor(e.currentTarget)}
            color={
              statusFilters.length > 0 || employmentTypeFilters.length > 0
                ? "primary"
                : "inherit"
            }
            sx={{ minWidth: 120 }}
          >
            Filteren
          </Button>
          <Menu
            anchorEl={filterAnchor}
            open={Boolean(filterAnchor)}
            onClose={() => setFilterAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          >
            {statusOptions.map((opt) => (
              <MenuItem
                key={opt.value}
                onClick={() => toggleStatusFilter(opt.value)}
              >
                <Checkbox
                  checked={statusFilters.includes(opt.value)}
                  size="small"
                  sx={{ mr: 1 }}
                  disableRipple
                />
                {opt.label}
              </MenuItem>
            ))}
            <Box sx={{ borderTop: 1, borderColor: "divider", my: 0.5 }} />
            {["Fulltime", "Parttime", "Freelance", "ZZP"].map((type) => (
              <MenuItem key={type} onClick={() => toggleEmploymentType(type)}>
                <Checkbox
                  checked={employmentTypeFilters.includes(type)}
                  size="small"
                  sx={{ mr: 1 }}
                  disableRipple
                />
                {type}
              </MenuItem>
            ))}
          </Menu>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={createAssignmentDialog.open}
            disabled={accounts.length === 0}
          >
            Opdracht toevoegen
          </Button>
        </Stack>

        {/* Active filters & sort chips */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
            alignItems: "center",
          }}
        >
          <Chip
            size="small"
            label={`Sorteren: ${sortLabels[sortBy]}`}
            onDelete={
              sortBy !== "title_asc" ? () => setSortBy("title_asc") : undefined
            }
            deleteIcon={sortBy !== "title_asc" ? <CloseIcon /> : undefined}
            variant="outlined"
          />
          {statusFilters.map((s) => {
            const label = statusOptions.find((o) => o.value === s)?.label ?? s;
            return (
              <Chip
                key={s}
                size="small"
                label={`Status: ${label}`}
                onDelete={() => toggleStatusFilter(s)}
                deleteIcon={<CloseIcon />}
              />
            );
          })}
          {employmentTypeFilters.map((t) => (
            <Chip
              key={t}
              size="small"
              label={`Type: ${t}`}
              onDelete={() => toggleEmploymentType(t)}
              deleteIcon={<CloseIcon />}
            />
          ))}
          {searchQuery && (
            <Chip
              size="small"
              label={`Zoeken: "${searchQuery.length > 20 ? searchQuery.slice(0, 20) + "…" : searchQuery}"`}
              onDelete={() => setSearchQuery("")}
              deleteIcon={<CloseIcon />}
            />
          )}
          {(statusFilters.length > 0 ||
            employmentTypeFilters.length > 0 ||
            searchQuery) && (
            <Button
              size="small"
              onClick={() => {
                setSortBy("title_asc");
                setStatusFilters([]);
                setEmploymentTypeFilters([]);
                setSearchQuery("");
              }}
            >
              Alles wissen
            </Button>
          )}
        </Box>

        {/* States */}
        {!accountsLoading && accounts.length === 0 && (
          <Alert severity="warning">
            Je hebt nog geen klanten. Voeg eerst een klant toe voordat je een
            opdracht kunt aanmaken.
          </Alert>
        )}

        {assignmentsLoading && (
          <Typography variant="body2" color="text.secondary">
            Laden...
          </Typography>
        )}

        {assignmentsError && (
          <Alert severity="error">
            {assignmentsError.message || String(assignmentsError)}
          </Alert>
        )}

        {/* Assignment cards */}
        {filteredAssignments.map((assignment) => {
          const currentStatus =
            assignmentStatuses[assignment.id] || assignment.status || "active";
          const statusLabel =
            statusOptions.find((opt) => opt.value === currentStatus)?.label ||
            currentStatus;

          return (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              currentStatus={currentStatus}
              statusLabel={statusLabel}
              isExpanded={expandedAssignments.has(assignment.id)}
              assignmentCandidates={
                localCandidateAssignments[assignment.id] || []
              }
              expandedNotesImages={expandedNotesImages}
              candidatesColumnOrder={candidatesColumnOrder}
              candidateStatusMenuAnchor={candidateStatusMenuAnchor}
              statusMenuAnchorEl={statusMenuAnchor[assignment.id] ?? null}
              onToggleExpanded={toggleExpanded}
              onToggleNotesImageExpanded={toggleNotesImageExpanded}
              onOpenEditDialog={handleOpenEditDialog}
              onStatusMenuOpen={handleStatusMenuOpen}
              onStatusMenuClose={handleStatusMenuClose}
              onStatusChange={handleStatusChange}
              onOpenColumnOrderDialog={candidateColumnOrderDialog.open}
              onOpenAddCandidateDialog={handleOpenAddCandidateDialog}
              onColumnOrderChange={persistCandidatesColumnOrder}
              onCandidateStatusMenuOpen={handleCandidateStatusMenuOpen}
              onCandidateStatusMenuClose={handleCandidateStatusMenuClose}
              onCandidateStatusChange={handleCandidateStatusChange}
              onRemoveCandidate={handleRemoveCandidate}
              onNavigateToContact={handleNavigateToContact}
              onNavigateToAccount={handleNavigateToAccount}
              onCandidatesLoaded={handleCandidatesLoaded}
            />
          );
        })}

        {filteredAssignments.length === 0 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary" align="center">
              Geen opdrachten gevonden.
            </Typography>
          </Paper>
        )}
      </Stack>

      {/* Dialogs */}
      <AddCandidateDialog
        open={addCandidateDialogOpen}
        onClose={handleCloseAddCandidateDialog}
        assignmentUid={selectedAssignment?.uid}
        linkedCandidateUids={linkedCandidateUids}
      />

      <CreateAssignmentDialog
        open={createAssignmentDialog.isOpen}
        onClose={createAssignmentDialog.close}
        accounts={accounts}
        users={users}
        benefitsOptions={benefitsOptions}
      />

      <EditAssignmentDialog
        open={editAssignmentDialog.isOpen}
        onClose={handleCloseEditDialog}
        assignment={editingAssignment}
        users={users}
      />

      <ColumnOrderDialog
        open={candidateColumnOrderDialog.isOpen}
        onClose={candidateColumnOrderDialog.close}
        columnOrder={candidatesColumnOrder}
        onColumnOrderChange={persistCandidatesColumnOrder}
        columnMeta={CANDIDATES_COLUMN_META}
      />
    </Box>
  );
}
