import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  Link,
  Menu,
  Collapse,
} from "@mui/material";
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  SwapVert as SwapVertIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Add as AddIcon,
  DeleteOutline as DeleteOutlineIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import type { Assignment } from "../../types/accounts";
import type { Contact } from "../../types/contacts";
import { useCandidates } from "../../hooks/useCandidates";
import { useAssignments, type AssignmentFromAPI } from "../../hooks/useAssignments";
import { useAccounts } from "../../hooks/useAccounts";
import API from "../../../axios-client";
import { useDisclosure } from "../../hooks/useDisclosure";
import { Alert } from "@mui/material";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  FormControlLabel,
} from "@mui/material";

// Extended Assignment type for the UI (will be updated when backend is ready)
type AssignmentWithDetails = Assignment & {
  uid?: string;
  account?: {
    uid: string;
    name: string;
  };
  location?: string;
  employment_type?: string; // "Fulltime", "Parttime", etc.
  salary_min?: number; // Minimum salary in EUR
  salary_max?: number; // Maximum salary in EUR
  has_car?: boolean;
  has_bonus?: boolean;
  vacation_days?: number;
  candidates?: CandidateAssignment[];
};

type CandidateAssignment = {
  id: number;
  contact: Contact;
  status: "called" | "proposed" | "first_interview" | "second_interview" | "rejected" | "hired";
  status_label: string;
};

// Mock data - will be replaced with API calls
const mockAssignments: AssignmentWithDetails[] = [
  {
    id: 1,
    uid: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
    account_id: 1,
    title: "Accountmanager",
    description: "Zoeken naar een ervaren Accountmanager",
    status: "active",
    account: {
      uid: "01ARZ3NDEKTSV4RRFFQ69G5FAW",
      name: "Dayes",
    },
    location: "Zevenaar",
    employment_type: "Fulltime",
    salary_min: 4000,
    salary_max: 5000,
    has_car: true,
    has_bonus: true,
    candidates: [
      {
        id: 1,
        contact: {
          uid: "01ARZ3NDEKTSV4RRFFQ69G5FAX",
          first_name: "Sophie",
          last_name: "de Vries",
          company_role: "Accountmanager",
          current_company: "Unilever",
        },
        status: "first_interview",
        status_label: "1e gesprek",
      },
      {
        id: 2,
        contact: {
          uid: "01ARZ3NDEKTSV4RRFFQ69G5FAY",
          first_name: "Mark",
          last_name: "Jansen",
          company_role: "Key Accountmanager",
          current_company: "Heineken",
        },
        status: "called",
        status_label: "Gebeld",
      },
      {
        id: 3,
        contact: {
          uid: "01ARZ3NDEKTSV4RRFFQ69G5FAZ",
          first_name: "Laura",
          last_name: "Bakker",
          company_role: "Accountmanager",
          current_company: "FrieslandCampina",
        },
        status: "called",
        status_label: "Gebeld",
      },
      {
        id: 4,
        contact: {
          uid: "01ARZ3NDEKTSV4RRFFQ69G5FB0",
          first_name: "Tom",
          last_name: "Willems",
          company_role: "Accountmanager",
          current_company: "Procter & Gamble",
        },
        status: "proposed",
        status_label: "Voorgesteld",
      },
      {
        id: 5,
        contact: {
          uid: "01ARZ3NDEKTSV4RRFFQ69G5FB1",
          first_name: "Eva",
          last_name: "Smit",
          company_role: "Accountmanager",
          current_company: "Nestlé",
        },
        status: "rejected",
        status_label: "Afgewezen",
      },
      {
        id: 6,
        contact: {
          uid: "01ARZ3NDEKTSV4RRFFQ69G5FB2",
          first_name: "Daan",
          last_name: "van Leeuwen",
          company_role: "Key Accountmanager",
          current_company: "Coca-Cola",
        },
        status: "called",
        status_label: "Gebeld",
      },
      {
        id: 7,
        contact: {
          uid: "01ARZ3NDEKTSV4RRFFQ69G5FB3",
          first_name: "Lotte",
          last_name: "Meijer",
          company_role: "Accountmanager",
          current_company: "PepsiCo",
        },
        status: "second_interview",
        status_label: "2e gesprek",
      },
    ],
  },
  {
    id: 2,
    uid: "01ARZ3NDEKTSV4RRFFQ69G5FB4",
    account_id: 2,
    title: "Software Developer",
    description: "Zoeken naar een senior Software Developer",
    status: "active",
    account: {
      uid: "01ARZ3NDEKTSV4RRFFQ69G5FB5",
      name: "TechCorp",
    },
    location: "Amsterdam",
    employment_type: "Fulltime",
    salary_min: 5000,
    salary_max: 6000,
    has_car: false,
    has_bonus: true,
    candidates: [
      {
        id: 8,
        contact: {
          uid: "01ARZ3NDEKTSV4RRFFQ69G5FB6",
          first_name: "Jan",
          last_name: "de Vries",
          company_role: "Senior Developer",
          current_company: "Google",
        },
        status: "second_interview",
        status_label: "2e gesprek",
      },
      {
        id: 9,
        contact: {
          uid: "01ARZ3NDEKTSV4RRFFQ69G5FB7",
          first_name: "Lisa",
          last_name: "van der Berg",
          company_role: "Full Stack Developer",
          current_company: "Microsoft",
        },
        status: "proposed",
        status_label: "Voorgesteld",
      },
    ],
  },
  {
    id: 3,
    uid: "01ARZ3NDEKTSV4RRFFQ69G5FB8",
    account_id: 3,
    title: "Marketing Manager",
    description: "Zoeken naar een ervaren Marketing Manager",
    status: "active",
    account: {
      uid: "01ARZ3NDEKTSV4RRFFQ69G5FB9",
      name: "Innovate BV",
    },
    location: "Rotterdam",
    employment_type: "Parttime",
    salary_min: 3500,
    salary_max: 4500,
    has_car: true,
    has_bonus: false,
    candidates: [
      {
        id: 10,
        contact: {
          uid: "01ARZ3NDEKTSV4RRFFQ69G5FBA",
          first_name: "Emma",
          last_name: "Jansen",
          company_role: "Marketing Manager",
          current_company: "Philips",
        },
        status: "called",
        status_label: "Gebeld",
      },
      {
        id: 11,
        contact: {
          uid: "01ARZ3NDEKTSV4RRFFQ69G5FBB",
          first_name: "Noah",
          last_name: "Bakker",
          company_role: "Digital Marketing Manager",
          current_company: "ASML",
        },
        status: "first_interview",
        status_label: "1e gesprek",
      },
    ],
  },
  {
    id: 4,
    uid: "01ARZ3NDEKTSV4RRFFQ69G5FBC",
    account_id: 4,
    title: "HR Business Partner",
    description: "Zoeken naar een HR Business Partner",
    status: "active",
    account: {
      uid: "01ARZ3NDEKTSV4RRFFQ69G5FBD",
      name: "Global Inc",
    },
    location: "Utrecht",
    employment_type: "Fulltime",
    salary_min: 4500,
    salary_max: 5500,
    has_car: false,
    has_bonus: true,
    candidates: [
      {
        id: 12,
        contact: {
          uid: "01ARZ3NDEKTSV4RRFFQ69G5FBE",
          first_name: "Anna",
          last_name: "Mulder",
          company_role: "HR Business Partner",
          current_company: "Shell",
        },
        status: "hired",
        status_label: "Aangenomen",
      },
      {
        id: 13,
        contact: {
          uid: "01ARZ3NDEKTSV4RRFFQ69G5FBF",
          first_name: "Lucas",
          last_name: "Smit",
          company_role: "HR Manager",
          current_company: "ING",
        },
        status: "rejected",
        status_label: "Afgewezen",
      },
    ],
  },
];

const statusOptions = [
  { value: "active", label: "Actief" },
  { value: "proposed", label: "Voorgesteld" },
  { value: "hired", label: "Aangenomen" },
  { value: "completed", label: "Voltooid" },
  { value: "cancelled", label: "Geannuleerd" },
];

const candidateStatusOptions: { value: CandidateAssignment["status"]; label: string }[] = [
  { value: "called", label: "Gebeld" },
  { value: "proposed", label: "Voorgesteld" },
  { value: "first_interview", label: "1e gesprek" },
  { value: "second_interview", label: "2e gesprek" },
  { value: "hired", label: "Aangenomen" },
  { value: "rejected", label: "Afgewezen" },
];

const getStatusColor = (status: string): "default" | "primary" | "success" | "error" | "warning" => {
  switch (status) {
    case "hired":
    case "completed":
      return "success";
    case "cancelled":
    case "rejected":
      return "error";
    case "proposed":
      return "primary";
    default:
      return "default";
  }
};

const getCandidateStatusColor = (status: CandidateAssignment["status"]): string => {
  switch (status) {
    case "hired":
      return "#2e7d32"; // Green
    case "rejected":
      return "#d32f2f"; // Red
    case "first_interview":
    case "second_interview":
      return "#1976d2"; // Blue
    case "proposed":
      return "#ed6c02"; // Orange
    case "called":
    default:
      return "#2e7d32"; // Green (for "Gebeld")
  }
};

export default function AssignmentsPage() {
  const navigate = useNavigate();
  const { candidates, loading: candidatesLoading } = useCandidates();
  const { assignments: apiAssignments, loading: assignmentsLoading, error: assignmentsError, refresh: refreshAssignments } = useAssignments();
  const { accounts, loading: accountsLoading, refresh: refreshAccounts } = useAccounts();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedAssignments, setExpandedAssignments] = useState<Set<number>>(new Set());
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<{ [key: number]: HTMLElement | null }>({});
  const [assignmentStatuses, setAssignmentStatuses] = useState<{ [key: number]: string }>({});
  const [addCandidateDialogOpen, setAddCandidateDialogOpen] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [companyRoleFilter, setCompanyRoleFilter] = useState<string>("");
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [candidateStatusMenuAnchor, setCandidateStatusMenuAnchor] = useState<{
    [key: string]: HTMLElement | null;
  }>({});

  // Create assignment dialog state
  const createAssignmentDialog = useDisclosure();
  const [newAssignmentTitle, setNewAssignmentTitle] = useState("");
  const [newAssignmentDescription, setNewAssignmentDescription] = useState("");
  const [newAssignmentAccountUid, setNewAssignmentAccountUid] = useState("");
  const [newAssignmentSalaryMin, setNewAssignmentSalaryMin] = useState<number | "">("");
  const [newAssignmentSalaryMax, setNewAssignmentSalaryMax] = useState<number | "">("");
  const [newAssignmentHasBonus, setNewAssignmentHasBonus] = useState(false);
  const [newAssignmentHasCar, setNewAssignmentHasCar] = useState(false);
  const [newAssignmentVacationDays, setNewAssignmentVacationDays] = useState<number | "">("");
  const [newAssignmentLocation, setNewAssignmentLocation] = useState("");
  const [newAssignmentEmploymentType, setNewAssignmentEmploymentType] = useState("");
  const [createAssignmentError, setCreateAssignmentError] = useState<string | null>(null);
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);

  // State for candidate assignments per assignment
  const [localCandidateAssignments, setLocalCandidateAssignments] = useState<{
    [assignmentId: number]: CandidateAssignment[];
  }>({});
  const [loadingCandidates, setLoadingCandidates] = useState<{ [assignmentId: number]: boolean }>({});

  // Load accounts on mount
  React.useEffect(() => {
    refreshAccounts();
  }, [refreshAccounts]);

  // Load candidates for all assignments when assignments are loaded
  React.useEffect(() => {
    const loadCandidatesForAssignments = async () => {
      for (const assignment of apiAssignments) {
        if (!assignment.uid) continue;
        
        setLoadingCandidates(prev => ({ ...prev, [assignment.id]: true }));
        try {
          const response = await API.get<CandidateAssignment[]>(
            `/assignments/${assignment.uid}/candidates`
          );
          setLocalCandidateAssignments(prev => ({
            ...prev,
            [assignment.id]: response || [],
          }));
        } catch (e: any) {
          console.error(`Error loading candidates for assignment ${assignment.id}:`, e);
          // Set empty array on error
          setLocalCandidateAssignments(prev => ({
            ...prev,
            [assignment.id]: [],
          }));
        } finally {
          setLoadingCandidates(prev => ({ ...prev, [assignment.id]: false }));
        }
      }
    };

    if (apiAssignments.length > 0) {
      loadCandidatesForAssignments();
    }
  }, [apiAssignments]);

  // Transform API assignments to the extended type with local candidate data
  const assignments: AssignmentWithDetails[] = React.useMemo(() => {
    return apiAssignments.map((a) => ({
      id: a.id,
      uid: a.uid,
      account_id: a.account_id,
      title: a.title,
      description: a.description,
      status: a.status,
      account: a.account,
      salary_min: a.salary_min,
      salary_max: a.salary_max,
      has_bonus: a.has_bonus,
      has_car: a.has_car,
      vacation_days: a.vacation_days,
      location: a.location,
      employment_type: a.employment_type,
      candidates: localCandidateAssignments[a.id] || [],
    }));
  }, [apiAssignments, localCandidateAssignments]);

  const handleCreateAssignment = async () => {
    if (!newAssignmentAccountUid) {
      setCreateAssignmentError("Selecteer een klant");
      return;
    }
    if (!newAssignmentTitle.trim()) {
      setCreateAssignmentError("Vul een titel in");
      return;
    }

    setIsCreatingAssignment(true);
    setCreateAssignmentError(null);

    try {
      await API.post("/assignments", {
        account_uid: newAssignmentAccountUid,
        title: newAssignmentTitle.trim(),
        description: newAssignmentDescription.trim() || null,
        salary_min: newAssignmentSalaryMin || null,
        salary_max: newAssignmentSalaryMax || null,
        has_bonus: newAssignmentHasBonus,
        has_car: newAssignmentHasCar,
        vacation_days: newAssignmentVacationDays || null,
        location: newAssignmentLocation.trim() || null,
        employment_type: newAssignmentEmploymentType || null,
      });

      // Reset form and close dialog
      setNewAssignmentTitle("");
      setNewAssignmentDescription("");
      setNewAssignmentAccountUid("");
      setNewAssignmentSalaryMin("");
      setNewAssignmentSalaryMax("");
      setNewAssignmentHasBonus(false);
      setNewAssignmentHasCar(false);
      setNewAssignmentVacationDays("");
      setNewAssignmentLocation("");
      setNewAssignmentEmploymentType("");
      createAssignmentDialog.close();

      // Refresh assignments list
      await refreshAssignments();
    } catch (err: any) {
      console.error("Error creating assignment:", err);
      setCreateAssignmentError(
        err?.response?.data?.message || "Er is iets misgegaan bij het aanmaken"
      );
    } finally {
      setIsCreatingAssignment(false);
    }
  };

  const toggleExpanded = (assignmentId: number) => {
    setExpandedAssignments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(assignmentId)) {
        newSet.delete(assignmentId);
      } else {
        newSet.add(assignmentId);
      }
      return newSet;
    });
  };

  const handleStatusMenuOpen = (assignmentId: number, event: React.MouseEvent<HTMLElement>) => {
    setStatusMenuAnchor((prev) => ({ ...prev, [assignmentId]: event.currentTarget }));
  };

  const handleStatusMenuClose = (assignmentId: number) => {
    setStatusMenuAnchor((prev) => ({ ...prev, [assignmentId]: null }));
  };

  const handleStatusChange = (assignmentId: number, newStatus: string) => {
    setAssignmentStatuses((prev) => ({ ...prev, [assignmentId]: newStatus }));
    handleStatusMenuClose(assignmentId);
  };

  const handleCandidateStatusMenuOpen = (
    assignmentId: number,
    candidateId: number,
    event: React.MouseEvent<HTMLElement>
  ) => {
    event.stopPropagation();
    const key = `${assignmentId}-${candidateId}`;
    setCandidateStatusMenuAnchor((prev) => ({ ...prev, [key]: event.currentTarget }));
  };

  const handleCandidateStatusMenuClose = (assignmentId: number, candidateId: number) => {
    const key = `${assignmentId}-${candidateId}`;
    setCandidateStatusMenuAnchor((prev) => ({ ...prev, [key]: null }));
  };

  const handleCandidateStatusChange = async (
    assignmentId: number,
    candidateId: number,
    newStatus: CandidateAssignment["status"]
  ) => {
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment || !assignment.uid) return;

    const candidateToUpdate = localCandidateAssignments[assignmentId]?.find((c) => c.id === candidateId);
    if (!candidateToUpdate) return;

    const statusLabel = candidateStatusOptions.find((opt) => opt.value === newStatus)?.label || newStatus;

    // Optimistic update
    setLocalCandidateAssignments((prev) => ({
      ...prev,
      [assignmentId]: (prev[assignmentId] || []).map((c) =>
        c.id === candidateId
          ? { ...c, status: newStatus, status_label: statusLabel }
          : c
      ),
    }));

    handleCandidateStatusMenuClose(assignmentId, candidateId);

    try {
      // Make API call to update status
      await API.put(`/assignments/${assignment.uid}/candidates/${candidateToUpdate.contact.uid}`, {
        status: newStatus,
      });
    } catch (e: any) {
      console.error("Error updating candidate status:", e);
      // Revert optimistic update on error
      setLocalCandidateAssignments((prev) => ({
        ...prev,
        [assignmentId]: (prev[assignmentId] || []).map((c) =>
          c.id === candidateId
            ? { ...c, status: candidateToUpdate.status, status_label: candidateToUpdate.status_label }
            : c
        ),
      }));
      alert(e?.response?.data?.message || "Fout bij bijwerken van status");
    }
  };

  const handleOpenAddCandidateDialog = (assignmentId: number) => {
    setSelectedAssignmentId(assignmentId);
    setSelectedCandidateIds(new Set());
    setCompanyRoleFilter("");
    setLocationFilter("");
    setAddCandidateDialogOpen(true);
  };

  const handleCloseAddCandidateDialog = () => {
    setAddCandidateDialogOpen(false);
    setSelectedAssignmentId(null);
    setSelectedCandidateIds(new Set());
    setCompanyRoleFilter("");
    setLocationFilter("");
  };

  const handleToggleCandidateSelection = (candidateUid: string) => {
    setSelectedCandidateIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(candidateUid)) {
        newSet.delete(candidateUid);
      } else {
        newSet.add(candidateUid);
      }
      return newSet;
    });
  };

  const handleAddCandidatesToAssignment = async () => {
    if (!selectedAssignmentId) return;

    const assignment = assignments.find((a) => a.id === selectedAssignmentId);
    if (!assignment || !assignment.uid) return;

    // Get selected candidates
    const selectedCandidates = candidates.filter((c) => selectedCandidateIds.has(c.uid));

    // Check which candidates are already in the assignment
    const existingCandidates = localCandidateAssignments[selectedAssignmentId] || [];
    const existingCandidateUids = new Set(existingCandidates.map((c) => c.contact.uid));

    // Filter out already added candidates
    const newCandidates = selectedCandidates.filter((c) => !existingCandidateUids.has(c.uid));

    if (newCandidates.length === 0) {
      handleCloseAddCandidateDialog();
      return;
    }

    // Get UIDs of new candidates to add
    const contactUids = newCandidates.map((c) => c.uid);

    try {
      setLoadingCandidates(prev => ({ ...prev, [selectedAssignmentId]: true }));
      
      // Make API call to add candidates
      const response = await API.post<CandidateAssignment[]>(
        `/assignments/${assignment.uid}/candidates`,
        { contact_uids: contactUids }
      );

      // Update local state with response from API
      setLocalCandidateAssignments((prev) => ({
        ...prev,
        [selectedAssignmentId]: response || [],
      }));

      handleCloseAddCandidateDialog();
    } catch (e: any) {
      console.error("Error adding candidates to assignment:", e);
      // Show error to user (you might want to add a toast/alert here)
      alert(e?.response?.data?.message || "Fout bij toevoegen van kandidaten");
    } finally {
      setLoadingCandidates(prev => ({ ...prev, [selectedAssignmentId]: false }));
    }
  };

  const handleRemoveCandidateFromAssignment = async (assignmentId: number, candidateId: number) => {
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment || !assignment.uid) return;

    const candidateToRemove = localCandidateAssignments[assignmentId]?.find((c) => c.id === candidateId);
    if (!candidateToRemove) return;

    try {
      setLoadingCandidates(prev => ({ ...prev, [assignmentId]: true }));
      
      // Make API call to remove candidate
      await API.delete(`/assignments/${assignment.uid}/candidates/${candidateToRemove.contact.uid}`);

      // Update local state
      setLocalCandidateAssignments((prev) => ({
        ...prev,
        [assignmentId]: (prev[assignmentId] || []).filter((c) => c.id !== candidateId),
      }));
    } catch (e: any) {
      console.error("Error removing candidate from assignment:", e);
      alert(e?.response?.data?.message || "Fout bij verwijderen van kandidaat");
    } finally {
      setLoadingCandidates(prev => ({ ...prev, [assignmentId]: false }));
    }
  };

  // Get available candidates for the selected assignment (candidates not already added)
  const getAvailableCandidates = () => {
    if (!selectedAssignmentId) return [];

    const assignment = assignments.find((a) => a.id === selectedAssignmentId);
    if (!assignment) return candidates;

    const existingCandidateUids = new Set(
      (assignment.candidates || []).map((c) => c.contact.uid)
    );

    return candidates.filter((c) => {
      // Filter out already added candidates
      if (existingCandidateUids.has(c.uid)) return false;

      // Filter by company_role (case-insensitive partial match)
      if (companyRoleFilter && c.company_role) {
        if (!c.company_role.toLowerCase().includes(companyRoleFilter.toLowerCase())) {
          return false;
        }
      } else if (companyRoleFilter && !c.company_role) {
        return false; // If filter is set but candidate has no role, exclude
      }

      // Filter by location (case-insensitive partial match)
      if (locationFilter && c.location) {
        if (!c.location.toLowerCase().includes(locationFilter.toLowerCase())) {
          return false;
        }
      } else if (locationFilter && !c.location) {
        return false; // If filter is set but candidate has no location, exclude
      }

      return true;
    });
  };

  const filteredAssignments = assignments.filter((assignment) => {
    const matchesSearch =
      assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.account?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || assignmentStatuses[assignment.id] === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Box>
      <Stack spacing={3}>
        {/* Header with Search, Sort, Filter, and Add Button */}
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            placeholder="Zoeken..."
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
            startIcon={<SwapVertIcon />}
            sx={{ minWidth: 120 }}
          >
            Sorteren
          </Button>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            sx={{ minWidth: 120 }}
          >
            Filteren
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={createAssignmentDialog.open}
            disabled={accounts.length === 0}
          >
            Opdracht toevoegen
          </Button>
        </Stack>

        {/* Warning if no accounts */}
        {!accountsLoading && accounts.length === 0 && (
          <Alert severity="warning">
            Je hebt nog geen klanten. Voeg eerst een klant toe voordat je een opdracht kunt aanmaken.
          </Alert>
        )}

        {/* Loading state */}
        {assignmentsLoading && (
          <Typography variant="body2" color="text.secondary">
            Laden...
          </Typography>
        )}

        {/* Error state */}
        {assignmentsError && (
          <Alert severity="error">{assignmentsError}</Alert>
        )}

        {/* Assignments List */}
        {filteredAssignments.map((assignment) => {
          const currentStatus = assignmentStatuses[assignment.id] || assignment.status || "active";
          const statusLabel = statusOptions.find((opt) => opt.value === currentStatus)?.label || currentStatus;
          const isExpanded = expandedAssignments.has(assignment.id);

          return (
            <Paper
              key={assignment.id}
              sx={{
                p: 2,
                transition: "all 0.2s ease",
                "&:hover": {
                  boxShadow: 3,
                },
              }}
            >
              {/* Collapsed View - Always Visible */}
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {assignment.title}
                  </Typography>
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => assignment.account?.uid && navigate(`/accounts/${assignment.account.uid}`)}
                    sx={{
                      textDecoration: "underline",
                      color: "primary.main",
                      cursor: "pointer",
                      "&:hover": { color: "primary.dark" },
                    }}
                  >
                    {assignment.account?.name}
                  </Link>
                </Box>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Button
                    variant="contained"
                    color={getStatusColor(currentStatus)}
                    endIcon={<SwapVertIcon />}
                    onClick={(e) => handleStatusMenuOpen(assignment.id, e)}
                    sx={{
                      bgcolor:
                        currentStatus === "proposed"
                          ? "#d32f2f"
                          : currentStatus === "hired"
                          ? "#2e7d32"
                          : undefined,
                      "&:hover": {
                        bgcolor:
                          currentStatus === "proposed"
                            ? "#b71c1c"
                            : currentStatus === "hired"
                            ? "#1b5e20"
                            : undefined,
                      },
                    }}
                  >
                    {statusLabel}
                  </Button>
                  <Menu
                    anchorEl={statusMenuAnchor[assignment.id]}
                    open={Boolean(statusMenuAnchor[assignment.id])}
                    onClose={() => handleStatusMenuClose(assignment.id)}
                  >
                    {statusOptions.map((option) => (
                      <MenuItem
                        key={option.value}
                        onClick={() => handleStatusChange(assignment.id, option.value)}
                        selected={currentStatus === option.value}
                      >
                        {option.label}
                      </MenuItem>
                    ))}
                  </Menu>
                  <Box
                    onClick={() => toggleExpanded(assignment.id)}
                    sx={{
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      p: 0.5,
                      borderRadius: 1,
                      "&:hover": {
                        bgcolor: "action.hover",
                      },
                    }}
                  >
                    {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </Box>
                </Stack>
              </Stack>

              {/* Expanded View - Animated Collapse */}
              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: "divider" }}>
                  <Stack spacing={3}>
                    {assignment.location && (
                      <Typography variant="body2" color="text.secondary">
                        Locatie: {assignment.location}
                      </Typography>
                    )}

                    {/* Voorwaarden (Conditions) Section */}
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                        Voorwaarden
                      </Typography>
                      <Stack direction="row" spacing={4} flexWrap="wrap">
                        {assignment.employment_type && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Dienstverband
                            </Typography>
                            <Typography variant="body2">{assignment.employment_type}</Typography>
                          </Box>
                        )}
                        {(assignment.salary_min || assignment.salary_max) && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Salarisindicatie
                            </Typography>
                            <Typography variant="body2">
                              {assignment.salary_min && assignment.salary_max
                                ? `€${assignment.salary_min.toLocaleString()} - €${assignment.salary_max.toLocaleString()}`
                                : assignment.salary_min
                                ? `vanaf €${assignment.salary_min.toLocaleString()}`
                                : `tot €${assignment.salary_max?.toLocaleString()}`}
                            </Typography>
                          </Box>
                        )}
                        {assignment.has_car && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Auto
                            </Typography>
                            <Typography variant="body2">Ja</Typography>
                          </Box>
                        )}
                        {assignment.has_bonus && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Bonusregeling
                            </Typography>
                            <Typography variant="body2">Ja</Typography>
                          </Box>
                        )}
                        {assignment.vacation_days && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Vakantiedagen
                            </Typography>
                            <Typography variant="body2">{assignment.vacation_days} dagen</Typography>
                          </Box>
                        )}
                      </Stack>
                    </Box>

                    {/* Candidates Table */}
                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Kandidaten
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAddCandidateDialog(assignment.id);
                          }}
                        >
                          Kandidaat toevoegen
                        </Button>
                      </Stack>
                      {assignment.candidates && assignment.candidates.length > 0 ? (
                        <>
                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Naam</TableCell>
                                  <TableCell>Functie</TableCell>
                                  <TableCell>Bedrijf</TableCell>
                                  <TableCell>Status</TableCell>
                                  <TableCell align="right">Acties</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {assignment.candidates.map((candidate) => (
                                  <TableRow key={candidate.id} hover>
                                    <TableCell>
                                      <Link
                                        component="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigate(`/candidates`, { state: { contactUid: candidate.contact.uid } });
                                        }}
                                        sx={{
                                          textDecoration: "underline",
                                          color: "inherit",
                                          cursor: "pointer",
                                          "&:hover": { color: "primary.main" },
                                        }}
                                      >
                                        {`${candidate.contact.first_name} ${candidate.contact.last_name}`}
                                      </Link>
                                    </TableCell>
                                    <TableCell>{candidate.contact.company_role || "-"}</TableCell>
                                    <TableCell>{candidate.contact.current_company || "-"}</TableCell>
                                    <TableCell>
                                      <Box
                                        onClick={(e) =>
                                          handleCandidateStatusMenuOpen(assignment.id, candidate.id, e)
                                        }
                                        sx={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 1,
                                          cursor: "pointer",
                                          px: 1,
                                          py: 0.5,
                                          borderRadius: 1,
                                          "&:hover": {
                                            bgcolor: "action.hover",
                                          },
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: "50%",
                                            bgcolor: getCandidateStatusColor(candidate.status),
                                          }}
                                        />
                                        <Typography variant="body2">{candidate.status_label}</Typography>
                                        <SwapVertIcon fontSize="small" sx={{ opacity: 0.5 }} />
                                      </Box>
                                      <Menu
                                        anchorEl={
                                          candidateStatusMenuAnchor[`${assignment.id}-${candidate.id}`]
                                        }
                                        open={Boolean(
                                          candidateStatusMenuAnchor[`${assignment.id}-${candidate.id}`]
                                        )}
                                        onClose={() =>
                                          handleCandidateStatusMenuClose(assignment.id, candidate.id)
                                        }
                                      >
                                        {candidateStatusOptions.map((option) => (
                                          <MenuItem
                                            key={option.value}
                                            onClick={() =>
                                              handleCandidateStatusChange(
                                                assignment.id,
                                                candidate.id,
                                                option.value
                                              )
                                            }
                                            selected={candidate.status === option.value}
                                          >
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                              <Box
                                                sx={{
                                                  width: 8,
                                                  height: 8,
                                                  borderRadius: "50%",
                                                  bgcolor: getCandidateStatusColor(option.value),
                                                }}
                                              />
                                              <Typography variant="body2">{option.label}</Typography>
                                            </Stack>
                                          </MenuItem>
                                        ))}
                                      </Menu>
                                    </TableCell>
                                    <TableCell align="right">
                                      <Tooltip title="Verwijderen uit opdracht">
                                        <IconButton
                                          size="small"
                                          color="error"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveCandidateFromAssignment(assignment.id, candidate.id);
                                          }}
                                        >
                                          <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
                            <Pagination count={3} page={1} color="primary" size="small" />
                            <FormControl size="small" sx={{ minWidth: 120 }}>
                              <InputLabel>Results per page</InputLabel>
                              <Select value={12} label="Results per page">
                                <MenuItem value={12}>12</MenuItem>
                                <MenuItem value={24}>24</MenuItem>
                                <MenuItem value={50}>50</MenuItem>
                              </Select>
                            </FormControl>
                          </Stack>
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                          Geen kandidaten toegevoegd. Klik op "Kandidaat toevoegen" om te beginnen.
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </Box>
              </Collapse>
            </Paper>
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

      {/* Add Candidate Dialog */}
      <Dialog
        open={addCandidateDialogOpen}
        onClose={handleCloseAddCandidateDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Kandidaat toevoegen aan opdracht</DialogTitle>
        <DialogContent>
          {candidatesLoading ? (
            <Typography variant="body2" sx={{ py: 2 }}>
              Laden...
            </Typography>
          ) : (
            <>
              {/* Filter Section */}
              <Stack spacing={2} sx={{ mb: 2, mt: 1 }}>
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Functie filteren"
                    placeholder="Bijv. Developer, Manager..."
                    value={companyRoleFilter}
                    onChange={(e) => setCompanyRoleFilter(e.target.value)}
                    size="small"
                    sx={{ flex: 1 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    label="Locatie filteren"
                    placeholder="Bijv. Amsterdam, Rotterdam..."
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    size="small"
                    sx={{ flex: 1 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Stack>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    // Random company roles
                    const roles = [
                      "Developer",
                      "Manager",
                      "Designer",
                      "Engineer",
                      "Consultant",
                      "Analyst",
                      "Specialist",
                      "Coordinator",
                    ];
                    // Random locations
                    const locations = [
                      "Amsterdam",
                      "Rotterdam",
                      "Utrecht",
                      "Den Haag",
                      "Eindhoven",
                      "Groningen",
                      "Maastricht",
                      "Nijmegen",
                    ];
                    
                    // Randomly select or clear filters
                    const randomRole = Math.random() > 0.5 ? roles[Math.floor(Math.random() * roles.length)] : "";
                    const randomLocation = Math.random() > 0.5 ? locations[Math.floor(Math.random() * locations.length)] : "";
                    
                    setCompanyRoleFilter(randomRole);
                    setLocationFilter(randomLocation);
                  }}
                  sx={{
                    alignSelf: "flex-start",
                    borderColor: "warning.main",
                    color: "warning.main",
                    "&:hover": {
                      borderColor: "warning.dark",
                      backgroundColor: "warning.light",
                    },
                  }}
                >
                  🐛 Debug: Vul filters in
                </Button>
              </Stack>

              {/* Select All / Deselect All */}
              {getAvailableCandidates().length > 0 && (
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      const allFilteredUids = getAvailableCandidates().map((c) => c.uid);
                      setSelectedCandidateIds(new Set(allFilteredUids));
                    }}
                    disabled={selectedCandidateIds.size === getAvailableCandidates().length}
                  >
                    Selecteer alle ({getAvailableCandidates().length})
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setSelectedCandidateIds(new Set())}
                    disabled={selectedCandidateIds.size === 0}
                  >
                    Deselecteer alle
                  </Button>
                </Stack>
              )}

              {/* Candidates List */}
              {getAvailableCandidates().length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                  {companyRoleFilter || locationFilter
                    ? "Geen kandidaten gevonden met de geselecteerde filters."
                    : "Alle beschikbare kandidaten zijn al toegevoegd aan deze opdracht."}
                </Typography>
              ) : (
                <List sx={{ maxHeight: 400, overflow: "auto" }}>
                  {getAvailableCandidates().map((candidate) => (
                <ListItem key={candidate.uid} disablePadding>
                  <ListItemButton
                    onClick={() => handleToggleCandidateSelection(candidate.uid)}
                    dense
                  >
                    <ListItemIcon>
                      <Checkbox
                        edge="start"
                        checked={selectedCandidateIds.has(candidate.uid)}
                        tabIndex={-1}
                        disableRipple
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${candidate.first_name} ${candidate.last_name}`}
                      secondary={
                        <Stack direction="row" spacing={2} flexWrap="wrap">
                          {candidate.company_role && (
                            <Typography variant="caption" component="span">
                              {candidate.company_role}
                            </Typography>
                          )}
                          {candidate.current_company && (
                            <Typography variant="caption" component="span" color="text.secondary">
                              {candidate.current_company}
                            </Typography>
                          )}
                          {candidate.location && (
                            <Typography variant="caption" component="span" color="text.secondary">
                              {candidate.location}
                            </Typography>
                          )}
                        </Stack>
                      }
                    />
                  </ListItemButton>
                </ListItem>
                  ))}
                </List>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddCandidateDialog} disabled={loadingCandidates[selectedAssignmentId || 0]}>
            Annuleren
          </Button>
          <Button
            onClick={handleAddCandidatesToAssignment}
            variant="contained"
            disabled={selectedCandidateIds.size === 0 || loadingCandidates[selectedAssignmentId || 0]}
          >
            {loadingCandidates[selectedAssignmentId || 0] ? "Bezig..." : `Toevoegen (${selectedCandidateIds.size})`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Assignment Dialog */}
      <Dialog
        open={createAssignmentDialog.isOpen}
        onClose={() => {
          createAssignmentDialog.close();
          setCreateAssignmentError(null);
          setNewAssignmentTitle("");
          setNewAssignmentDescription("");
          setNewAssignmentAccountUid("");
          setNewAssignmentSalaryMin("");
          setNewAssignmentSalaryMax("");
          setNewAssignmentHasBonus(false);
          setNewAssignmentHasCar(false);
          setNewAssignmentVacationDays("");
          setNewAssignmentLocation("");
          setNewAssignmentEmploymentType("");
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Nieuwe opdracht aanmaken</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <FormControl fullWidth required error={!newAssignmentAccountUid && !!createAssignmentError}>
              <InputLabel>Klant</InputLabel>
              <Select
                value={newAssignmentAccountUid}
                onChange={(e) => setNewAssignmentAccountUid(e.target.value)}
                label="Klant"
              >
                {accounts.map((account) => (
                  <MenuItem key={account.uid} value={account.uid}>
                    {account.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Titel"
              required
              fullWidth
              value={newAssignmentTitle}
              onChange={(e) => setNewAssignmentTitle(e.target.value)}
              error={!newAssignmentTitle.trim() && !!createAssignmentError}
            />

            <TextField
              label="Omschrijving"
              fullWidth
              multiline
              rows={3}
              value={newAssignmentDescription}
              onChange={(e) => setNewAssignmentDescription(e.target.value)}
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="Locatie"
                fullWidth
                value={newAssignmentLocation}
                onChange={(e) => setNewAssignmentLocation(e.target.value)}
              />
              <FormControl fullWidth>
                <InputLabel>Dienstverband</InputLabel>
                <Select
                  value={newAssignmentEmploymentType}
                  onChange={(e) => setNewAssignmentEmploymentType(e.target.value)}
                  label="Dienstverband"
                >
                  <MenuItem value="">Geen</MenuItem>
                  <MenuItem value="Fulltime">Fulltime</MenuItem>
                  <MenuItem value="Parttime">Parttime</MenuItem>
                  <MenuItem value="Freelance">Freelance</MenuItem>
                  <MenuItem value="Interim">Interim</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="Salaris min (EUR/maand)"
                type="number"
                fullWidth
                value={newAssignmentSalaryMin}
                onChange={(e) => setNewAssignmentSalaryMin(e.target.value ? parseInt(e.target.value) : "")}
                InputProps={{ inputProps: { min: 0 } }}
              />
              <TextField
                label="Salaris max (EUR/maand)"
                type="number"
                fullWidth
                value={newAssignmentSalaryMax}
                onChange={(e) => setNewAssignmentSalaryMax(e.target.value ? parseInt(e.target.value) : "")}
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newAssignmentHasBonus}
                    onChange={(e) => setNewAssignmentHasBonus(e.target.checked)}
                  />
                }
                label="Bonus"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newAssignmentHasCar}
                    onChange={(e) => setNewAssignmentHasCar(e.target.checked)}
                  />
                }
                label="Auto"
              />
              <TextField
                label="Vakantiedagen"
                type="number"
                value={newAssignmentVacationDays}
                onChange={(e) => setNewAssignmentVacationDays(e.target.value ? parseInt(e.target.value) : "")}
                InputProps={{ inputProps: { min: 0, max: 100 } }}
                sx={{ width: 140 }}
              />
            </Stack>

            {createAssignmentError && (
              <Alert severity="error" onClose={() => setCreateAssignmentError(null)}>
                {createAssignmentError}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              createAssignmentDialog.close();
              setCreateAssignmentError(null);
              setNewAssignmentTitle("");
              setNewAssignmentDescription("");
              setNewAssignmentAccountUid("");
              setNewAssignmentSalaryMin("");
              setNewAssignmentSalaryMax("");
              setNewAssignmentHasBonus(false);
              setNewAssignmentHasCar(false);
              setNewAssignmentVacationDays("");
              setNewAssignmentLocation("");
              setNewAssignmentEmploymentType("");
            }}
            disabled={isCreatingAssignment}
          >
            Annuleren
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateAssignment}
            disabled={isCreatingAssignment}
          >
            {isCreatingAssignment ? "Bezig..." : "Aanmaken"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
