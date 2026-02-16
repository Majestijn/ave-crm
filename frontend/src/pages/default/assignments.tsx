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
  Chip,
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
  Edit as EditIcon,
  LinkedIn as LinkedInIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import type { Assignment } from "../../types/accounts";
import type { Contact } from "../../types/contacts";
import { useCandidates } from "../../api/queries/contacts";
import {
  useAssignments,
  type AssignmentFromAPI,
  useAssignmentCandidates,
  type CandidateAssignment,
} from "../../api/queries/assignments";
import { useAccounts } from "../../api/queries/accounts";
import {
  useCreateAssignment,
  useUpdateAssignment,
} from "../../api/mutations/assignments";
import {
  useAddAssignmentCandidates,
  useUpdateAssignmentCandidateStatus,
  useRemoveAssignmentCandidate,
} from "../../api/mutations/assignmentCandidates";
import API from "../../api/client";
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
  vacation_days?: number;
  notes_image_url?: string | null;
  benefits?: string[];
  candidates?: CandidateAssignment[];
};

// Helper function to format number with thousand separators (Dutch format)
const formatNumberInput = (value: string): string => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  // Format with thousand separators
  return parseInt(digits, 10).toLocaleString("nl-NL");
};

// Helper function to parse formatted number back to integer
const parseFormattedNumber = (value: string): number | "" => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return parseInt(digits, 10);
};

// Available employment benefits options
const benefitsOptions = [
  "Reiskostenvergoeding",
  "Pensioen",
  "Dienstreizen vergoeding",
  "Mogelijkheid tot promotie",
  "Flexibele werkuren",
  "Personeelskorting",
  "Bedrijfsfeesten",
  "Productkorting werknemers",
  "Auto van de zaak",
  "Budget voor professionele ontwikkeling",
  "Zorgverzekering",
  "Collectieve zorgverzekering",
  "Bedrijfsopleiding",
  "Vrijdagmiddagborrel",
  "Kerstpakket",
  "Extra vakantiedagen",
  "Fietsplan",
  "Bedrijfsfitness",
  "Winstdeling",
  "Werk vanuit huis",
  "Telefoon van de zaak",
  "Telefoonplan",
  "Aanvullend pensioen",
  "Gezondheidsprogramma",
  "Lunchkorting",
  "Kosteloos parkeren",
  "Levensverzekering",
  "Aandelenopties",
  "Taaltraining aangeboden",
  "Kinderopvang",
  "Verhuisvergoeding",
  "Huisvestingsvergoeding",
];

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
    benefits: ["Auto van de zaak", "Bonus", "Pensioen"],
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
    benefits: ["Bonus", "Flexibele werkuren", "Werk vanuit huis"],
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
    benefits: ["Auto van de zaak", "Reiskostenvergoeding"],
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
    benefits: ["Bonus", "Pensioen", "Zorgverzekering"],
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
  { value: "shadow_management", label: "Shadow Management" },
  { value: "completed", label: "Voltooid" },
  { value: "cancelled", label: "Geannuleerd" },
];

const candidateStatusOptions: {
  value: CandidateAssignment["status"];
  label: string;
}[] = [
    { value: "called", label: "Gebeld" },
    { value: "proposed", label: "Voorgesteld" },
    { value: "first_interview", label: "1e gesprek" },
    { value: "second_interview", label: "2e gesprek" },
    { value: "hired", label: "Aangenomen" },
    { value: "rejected", label: "Afgewezen" },
  ];

const getStatusColor = (
  status: string
): "inherit" | "primary" | "success" | "error" | "warning" => {
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
      return "inherit";
  }
};

const getCandidateStatusColor = (
  status: CandidateAssignment["status"]
): string => {
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

// Component to load candidates - MUST be outside main component to prevent infinite loops
const AssignmentCandidatesLoader = React.memo(
  ({
    assignmentId,
    assignmentUid,
    onCandidatesLoaded,
  }: {
    assignmentId: number;
    assignmentUid: string | undefined;
    onCandidatesLoaded: (id: number, candidates: CandidateAssignment[]) => void;
  }) => {
    const { data: candidates = [] } = useAssignmentCandidates(assignmentUid);
    const prevCandidatesRef = React.useRef<string>("");

    React.useEffect(() => {
      if (!assignmentUid) return;

      // Only update if candidates actually changed (compare by JSON to prevent loops)
      const candidatesJson = JSON.stringify(candidates);
      if (candidatesJson !== prevCandidatesRef.current) {
        prevCandidatesRef.current = candidatesJson;
        onCandidatesLoaded(assignmentId, candidates as CandidateAssignment[]);
      }
    }, [assignmentId, candidates, assignmentUid, onCandidatesLoaded]);

    return null;
  }
);

export default function AssignmentsPage() {
  const navigate = useNavigate();
  const { data: candidates = [], isLoading: candidatesLoading } =
    useCandidates();
  const {
    data: apiAssignments = [],
    isLoading: assignmentsLoading,
    error: assignmentsError,
  } = useAssignments();
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();

  // Mutations
  const createAssignmentMutation = useCreateAssignment();
  const updateAssignmentMutation = useUpdateAssignment();
  const addCandidatesMutation = useAddAssignmentCandidates();
  const updateCandidateStatusMutation = useUpdateAssignmentCandidateStatus();
  const removeCandidateMutation = useRemoveAssignmentCandidate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedAssignments, setExpandedAssignments] = useState<Set<number>>(
    new Set()
  );
  const [expandedNotesImages, setExpandedNotesImages] = useState<Set<number>>(
    new Set()
  );
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<{
    [key: number]: HTMLElement | null;
  }>({});
  const [assignmentStatuses, setAssignmentStatuses] = useState<{
    [key: number]: string;
  }>({});
  const [addCandidateDialogOpen, setAddCandidateDialogOpen] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<
    number | null
  >(null);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(
    new Set()
  );
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
  const [newAssignmentSalaryMin, setNewAssignmentSalaryMin] = useState("");
  const [newAssignmentSalaryMax, setNewAssignmentSalaryMax] = useState("");
  const [newAssignmentVacationDays, setNewAssignmentVacationDays] = useState<
    number | ""
  >("");
  const [newAssignmentLocation, setNewAssignmentLocation] = useState("");
  const [newAssignmentEmploymentType, setNewAssignmentEmploymentType] =
    useState("");
  const [newAssignmentBenefits, setNewAssignmentBenefits] = useState<string[]>(
    []
  );
  const [newAssignmentNotesImage, setNewAssignmentNotesImage] =
    useState<File | null>(null);
  const [newAssignmentNotesImagePreview, setNewAssignmentNotesImagePreview] =
    useState<string | null>(null);
  const [createAssignmentError, setCreateAssignmentError] = useState<
    string | null
  >(null);

  // Edit assignment dialog state
  const editAssignmentDialog = useDisclosure();
  const [editingAssignment, setEditingAssignment] =
    useState<AssignmentWithDetails | null>(null);
  const [editAssignmentTitle, setEditAssignmentTitle] = useState("");
  const [editAssignmentDescription, setEditAssignmentDescription] = useState("");
  const [editAssignmentAccountUid, setEditAssignmentAccountUid] = useState("");
  const [editAssignmentSalaryMin, setEditAssignmentSalaryMin] = useState("");
  const [editAssignmentSalaryMax, setEditAssignmentSalaryMax] = useState("");
  const [editAssignmentVacationDays, setEditAssignmentVacationDays] = useState<
    number | ""
  >("");
  const [editAssignmentLocation, setEditAssignmentLocation] = useState("");
  const [editAssignmentEmploymentType, setEditAssignmentEmploymentType] =
    useState("");
  const [editAssignmentBenefits, setEditAssignmentBenefits] = useState<string[]>(
    []
  );
  const [editAssignmentError, setEditAssignmentError] = useState<string | null>(
    null
  );

  // State for candidate assignments per assignment (populated by AssignmentCandidatesLoader)
  const [localCandidateAssignments, setLocalCandidateAssignments] = useState<{
    [assignmentId: number]: CandidateAssignment[];
  }>({});

  // Stable callback for updating candidates - useCallback prevents infinite loops
  const handleCandidatesLoaded = React.useCallback(
    (assignmentId: number, candidates: CandidateAssignment[]) => {
      setLocalCandidateAssignments((prev) => ({
        ...prev,
        [assignmentId]: candidates,
      }));
    },
    []
  );

  // Handle notes image upload
  const handleNotesImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setCreateAssignmentError("Selecteer een afbeelding (JPG, PNG, etc.)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setCreateAssignmentError("Afbeelding mag maximaal 5MB zijn");
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setNewAssignmentNotesImagePreview(previewUrl);

    // Store File object directly (will be sent as FormData)
    setNewAssignmentNotesImage(file);
  };

  // Clear notes image
  const handleClearNotesImage = () => {
    setNewAssignmentNotesImage(null);
    if (newAssignmentNotesImagePreview) {
      URL.revokeObjectURL(newAssignmentNotesImagePreview);
    }
    setNewAssignmentNotesImagePreview(null);
  };

  // Transform API assignments to the extended type
  // Note: Candidates will be loaded per assignment using useAssignmentCandidates hook in the component
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
      vacation_days: a.vacation_days,
      location: a.location,
      employment_type: a.employment_type,
      benefits: a.benefits,
      notes_image_url: a.notes_image_url,
      candidates: [], // Will be populated by AssignmentCandidatesLoader component
    }));
  }, [apiAssignments]);

  const handleCreateAssignment = async () => {
    if (!newAssignmentAccountUid) {
      setCreateAssignmentError("Selecteer een klant");
      return;
    }
    if (!newAssignmentTitle.trim()) {
      setCreateAssignmentError("Vul een titel in");
      return;
    }

    setCreateAssignmentError(null);

    try {
      await createAssignmentMutation.mutateAsync({
        account_uid: newAssignmentAccountUid,
        title: newAssignmentTitle.trim(),
        description: newAssignmentDescription.trim() || null,
        salary_min: parseFormattedNumber(newAssignmentSalaryMin) || null,
        salary_max: parseFormattedNumber(newAssignmentSalaryMax) || null,
        vacation_days: newAssignmentVacationDays || null,
        location: newAssignmentLocation.trim() || null,
        employment_type: newAssignmentEmploymentType || null,
        benefits:
          newAssignmentBenefits.length > 0 ? newAssignmentBenefits : null,
        notes_image: newAssignmentNotesImage,
      });

      // Reset form and close dialog
      setNewAssignmentTitle("");
      setNewAssignmentDescription("");
      setNewAssignmentAccountUid("");
      setNewAssignmentSalaryMin("");
      setNewAssignmentSalaryMax("");
      setNewAssignmentVacationDays("");
      setNewAssignmentLocation("");
      setNewAssignmentEmploymentType("");
      setNewAssignmentBenefits([]);
      handleClearNotesImage();
      createAssignmentDialog.close();
      // Cache is automatically invalidated by the mutation
    } catch (err: any) {
      console.error("Error creating assignment:", err);
      setCreateAssignmentError(
        err?.response?.data?.message || "Er is iets misgegaan bij het aanmaken"
      );
    }
  };

  const handleOpenEditDialog = (assignment: AssignmentWithDetails) => {
    setEditingAssignment(assignment);
    setEditAssignmentTitle(assignment.title || "");
    setEditAssignmentDescription(assignment.description || "");
    setEditAssignmentAccountUid(assignment.account?.uid || "");
    setEditAssignmentSalaryMin(assignment.salary_min ? assignment.salary_min.toLocaleString("nl-NL") : "");
    setEditAssignmentSalaryMax(assignment.salary_max ? assignment.salary_max.toLocaleString("nl-NL") : "");
    setEditAssignmentVacationDays(assignment.vacation_days || "");
    setEditAssignmentLocation(assignment.location || "");
    setEditAssignmentEmploymentType(assignment.employment_type || "");
    setEditAssignmentBenefits(assignment.benefits || []);
    setEditAssignmentError(null);
    editAssignmentDialog.open();
  };

  const handleCloseEditDialog = () => {
    editAssignmentDialog.close();
    setEditingAssignment(null);
    setEditAssignmentError(null);
  };

  const handleUpdateAssignment = async () => {
    if (!editingAssignment?.uid) return;

    if (!editAssignmentTitle.trim()) {
      setEditAssignmentError("Vul een titel in");
      return;
    }

    setEditAssignmentError(null);

    try {
      await updateAssignmentMutation.mutateAsync({
        uid: editingAssignment.uid,
        data: {
          title: editAssignmentTitle.trim(),
          description: editAssignmentDescription.trim() || null,
          salary_min: parseFormattedNumber(editAssignmentSalaryMin) || null,
          salary_max: parseFormattedNumber(editAssignmentSalaryMax) || null,
          vacation_days: editAssignmentVacationDays || null,
          location: editAssignmentLocation.trim() || null,
          employment_type: editAssignmentEmploymentType || null,
          benefits: editAssignmentBenefits.length > 0 ? editAssignmentBenefits : null,
        },
      });

      handleCloseEditDialog();
    } catch (err: any) {
      console.error("Error updating assignment:", err);
      setEditAssignmentError(
        err?.response?.data?.message || "Er is iets misgegaan bij het opslaan"
      );
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

  const toggleNotesImageExpanded = (assignmentId: number) => {
    setExpandedNotesImages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(assignmentId)) {
        newSet.delete(assignmentId);
      } else {
        newSet.add(assignmentId);
      }
      return newSet;
    });
  };

  const handleStatusMenuOpen = (
    assignmentId: number,
    event: React.MouseEvent<HTMLElement>
  ) => {
    setStatusMenuAnchor((prev) => ({
      ...prev,
      [assignmentId]: event.currentTarget,
    }));
  };

  const handleStatusMenuClose = (assignmentId: number) => {
    setStatusMenuAnchor((prev) => ({ ...prev, [assignmentId]: null }));
  };

  const handleStatusChange = async (
    assignmentId: number,
    newStatus: string
  ) => {
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment || !assignment.uid) {
      console.error("Assignment not found or missing uid");
      return;
    }

    // Optimistically update local state
    setAssignmentStatuses((prev) => ({ ...prev, [assignmentId]: newStatus }));
    handleStatusMenuClose(assignmentId);

    try {
      await updateAssignmentMutation.mutateAsync({
        uid: assignment.uid,
        data: { status: newStatus },
      });
      // Cache is automatically invalidated by the mutation, so the UI will update
    } catch (e: any) {
      console.error("Error updating assignment status:", e);
      // Revert optimistic update on error
      setAssignmentStatuses((prev) => {
        const updated = { ...prev };
        delete updated[assignmentId];
        return updated;
      });
      alert(e?.response?.data?.message || "Fout bij bijwerken van status");
    }
  };

  const handleCandidateStatusMenuOpen = (
    assignmentId: number,
    candidateId: number,
    event: React.MouseEvent<HTMLElement>
  ) => {
    event.stopPropagation();
    const key = `${assignmentId}-${candidateId}`;
    setCandidateStatusMenuAnchor((prev) => ({
      ...prev,
      [key]: event.currentTarget,
    }));
  };

  const handleCandidateStatusMenuClose = (
    assignmentId: number,
    candidateId: number
  ) => {
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

    const candidateToUpdate = localCandidateAssignments[assignmentId]?.find(
      (c) => c.id === candidateId
    );
    if (!candidateToUpdate) return;

    handleCandidateStatusMenuClose(assignmentId, candidateId);

    try {
      await updateCandidateStatusMutation.mutateAsync({
        assignmentUid: assignment.uid,
        contactUid: candidateToUpdate.contact.uid,
        status: newStatus,
      });
      // Cache is automatically invalidated by the mutation
    } catch (e: any) {
      console.error("Error updating candidate status:", e);
      alert(e?.response?.data?.message || "Fout bij bijwerken van status");
    }
  };

  const handleOpenAddCandidateDialog = (assignmentId: number) => {
    setSelectedAssignmentId(assignmentId);

    // Pre-select already linked candidates
    const existingCandidates = localCandidateAssignments[assignmentId] || [];
    const existingCandidateUids = new Set(
      existingCandidates.map((c) => c.contact.uid)
    );
    setSelectedCandidateIds(existingCandidateUids);

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
    const selectedCandidates = candidates.filter((c) =>
      selectedCandidateIds.has(c.uid)
    );

    // Check which candidates are already in the assignment
    const existingCandidates =
      localCandidateAssignments[selectedAssignmentId] || [];
    const existingCandidateUids = new Set(
      existingCandidates.map((c) => c.contact.uid)
    );

    // Filter out already added candidates
    const newCandidates = selectedCandidates.filter(
      (c) => !existingCandidateUids.has(c.uid)
    );

    if (newCandidates.length === 0) {
      handleCloseAddCandidateDialog();
      return;
    }

    // Get UIDs of new candidates to add
    const contactUids = newCandidates.map((c) => c.uid);

    try {
      await addCandidatesMutation.mutateAsync({
        assignmentUid: assignment.uid,
        contactUids,
      });
      handleCloseAddCandidateDialog();
      // Cache is automatically invalidated by the mutation
    } catch (e: any) {
      console.error("Error adding candidates to assignment:", e);
      alert(e?.response?.data?.message || "Fout bij toevoegen van kandidaten");
    }
  };

  const handleRemoveCandidateFromAssignment = async (
    assignmentId: number,
    candidateId: number
  ) => {
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment || !assignment.uid) return;

    const candidateToRemove = localCandidateAssignments[assignmentId]?.find(
      (c) => c.id === candidateId
    );
    if (!candidateToRemove) return;

    try {
      await removeCandidateMutation.mutateAsync({
        assignmentUid: assignment.uid,
        contactUid: candidateToRemove.contact.uid,
      });
      // Cache is automatically invalidated by the mutation
    } catch (e: any) {
      console.error("Error removing candidate from assignment:", e);
      alert(e?.response?.data?.message || "Fout bij verwijderen van kandidaat");
    }
  };

  // Get available candidates for the selected assignment (includes already linked candidates)
  const getAvailableCandidates = () => {
    if (!selectedAssignmentId) return [];

    return candidates.filter((c) => {
      // Filter by company_role (case-insensitive partial match)
      if (companyRoleFilter && c.company_role) {
        if (
          !c.company_role
            .toLowerCase()
            .includes(companyRoleFilter.toLowerCase())
        ) {
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

  // Get UIDs of candidates already linked to the selected assignment
  const getLinkedCandidateUids = (): Set<string> => {
    if (!selectedAssignmentId) return new Set();
    const existingCandidates =
      localCandidateAssignments[selectedAssignmentId] || [];
    return new Set(existingCandidates.map((c) => c.contact.uid));
  };

  const filteredAssignments = assignments.filter((assignment) => {
    const matchesSearch =
      assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.account?.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      assignmentStatuses[assignment.id] === statusFilter;
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
            Je hebt nog geen klanten. Voeg eerst een klant toe voordat je een
            opdracht kunt aanmaken.
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
          <Alert severity="error">
            {assignmentsError.message || String(assignmentsError)}
          </Alert>
        )}

        {/* Assignments List */}
        {filteredAssignments.map((assignment) => {
          const currentStatus =
            assignmentStatuses[assignment.id] || assignment.status || "active";
          const statusLabel =
            statusOptions.find((opt) => opt.value === currentStatus)?.label ||
            currentStatus;
          const isExpanded = expandedAssignments.has(assignment.id);
          const assignmentCandidates =
            localCandidateAssignments[assignment.id] || [];

          return (
            <React.Fragment key={assignment.id}>
              <AssignmentCandidatesLoader
                assignmentId={assignment.id}
                assignmentUid={assignment.uid}
                onCandidatesLoaded={handleCandidatesLoaded}
              />
              <Paper
                sx={{
                  p: 2,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    boxShadow: 3,
                  },
                }}
              >
                {/* Collapsed View - Always Visible */}
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  onClick={() => toggleExpanded(assignment.id)}
                  sx={{ cursor: "pointer" }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {assignment.title}
                    </Typography>
                    <Link
                      component="button"
                      variant="body2"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        assignment.account?.uid &&
                          navigate(`/accounts/${assignment.account.uid}`);
                      }}
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
                    <Tooltip title="Bewerk opdracht">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditDialog(assignment);
                        }}
                        sx={{ color: "text.secondary" }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Button
                      variant="contained"
                      color={getStatusColor(currentStatus)}
                      endIcon={<SwapVertIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusMenuOpen(assignment.id, e);
                      }}
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
                          onClick={() =>
                            handleStatusChange(assignment.id, option.value)
                          }
                          selected={currentStatus === option.value}
                        >
                          {option.label}
                        </MenuItem>
                      ))}
                    </Menu>
                    {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </Stack>
                </Stack>

                {/* Expanded View - Animated Collapse */}
                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                  <Box
                    sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: "divider" }}
                  >
                    <Stack spacing={3}>
                      {assignment.description && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 600, mb: 1 }}
                          >
                            Omschrijving
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ whiteSpace: "pre-wrap" }}
                          >
                            {assignment.description}
                          </Typography>
                        </Box>
                      )}

                      {assignment.location && (
                        <Typography variant="body2" color="text.secondary">
                          Locatie: {assignment.location}
                        </Typography>
                      )}

                      {/* Voorwaarden (Conditions) Section */}
                      <Box>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 600, mb: 1.5 }}
                        >
                          Voorwaarden
                        </Typography>
                        <Stack direction="row" spacing={4} flexWrap="wrap">
                          {assignment.employment_type && (
                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Dienstverband
                              </Typography>
                              <Typography variant="body2">
                                {assignment.employment_type}
                              </Typography>
                            </Box>
                          )}
                          {(assignment.salary_min || assignment.salary_max) && (
                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Jaarsalaris indicatie
                              </Typography>
                              <Typography variant="body2">
                                {assignment.salary_min && assignment.salary_max
                                  ? `€${assignment.salary_min.toLocaleString("nl-NL")} - €${assignment.salary_max.toLocaleString("nl-NL")}`
                                  : assignment.salary_min
                                    ? `vanaf €${assignment.salary_min.toLocaleString("nl-NL")}`
                                    : `tot €${(assignment.salary_max || 0).toLocaleString("nl-NL")}`}
                              </Typography>
                            </Box>
                          )}
                          {assignment.vacation_days && (
                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Vakantiedagen
                              </Typography>
                              <Typography variant="body2">
                                {assignment.vacation_days} dagen
                              </Typography>
                            </Box>
                          )}
                        </Stack>
                      </Box>

                      {/* Benefits/Arbeidsvoorwaarden */}
                      {assignment.benefits &&
                        assignment.benefits.length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ mb: 1, display: "block" }}
                            >
                              Arbeidsvoorwaarden
                            </Typography>
                            <Box
                              sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 0.5,
                              }}
                            >
                              {assignment.benefits.map((benefit) => (
                                <Chip
                                  key={benefit}
                                  label={benefit}
                                  size="small"
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                          </Box>
                        )}

                      {/* Notes Image Section */}
                      {assignment.notes_image_url && (
                        <Box>
                          <Box
                            onClick={() =>
                              toggleNotesImageExpanded(assignment.id)
                            }
                            sx={{
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              mb: 1.5,
                              "&:hover": {
                                bgcolor: "action.hover",
                              },
                              p: 0.5,
                              borderRadius: 1,
                            }}
                          >
                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: 600 }}
                            >
                              Notities
                            </Typography>
                            {expandedNotesImages.has(assignment.id) ? (
                              <ExpandLessIcon />
                            ) : (
                              <ExpandMoreIcon />
                            )}
                          </Box>
                          <Collapse
                            in={expandedNotesImages.has(assignment.id)}
                            timeout="auto"
                            unmountOnExit
                          >
                            <Box
                              sx={{
                                maxWidth: 600,
                                borderRadius: 1,
                                overflow: "hidden",
                                border: 1,
                                borderColor: "divider",
                              }}
                            >
                              <img
                                src={assignment.notes_image_url}
                                alt="Notities"
                                style={{
                                  width: "100%",
                                  height: "auto",
                                  display: "block",
                                  cursor: "pointer",
                                }}
                                onClick={() =>
                                  window.open(
                                    assignment.notes_image_url!,
                                    "_blank"
                                  )
                                }
                              />
                            </Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ mt: 0.5, display: "block" }}
                            >
                              Klik op de afbeelding om te vergroten
                            </Typography>
                          </Collapse>
                        </Box>
                      )}

                      {/* Candidates Table */}
                      <Box>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          sx={{ mb: 1.5 }}
                        >
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 600 }}
                          >
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
                        {assignmentCandidates &&
                          assignmentCandidates.length > 0 ? (
                          <>
                            <TableContainer>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Naam</TableCell>
                                    <TableCell>E-mail</TableCell>
                                    <TableCell>Telefoon</TableCell>
                                    <TableCell>Functie</TableCell>
                                    <TableCell>Bedrijf</TableCell>
                                    <TableCell>Locatie</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell align="right">Acties</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {assignmentCandidates.map((candidate) => (
                                    <TableRow key={candidate.id} hover>
                                      <TableCell>
                                        <Link
                                          component="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/candidates`, {
                                              state: {
                                                contactUid:
                                                  candidate.contact.uid,
                                              },
                                            });
                                          }}
                                          sx={{
                                            textDecoration: "underline",
                                            color: "inherit",
                                            cursor: "pointer",
                                            "&:hover": {
                                              color: "primary.main",
                                            },
                                          }}
                                        >
                                          {candidate.contact.prefix
                                            ? `${candidate.contact.first_name} ${candidate.contact.prefix} ${candidate.contact.last_name}`
                                            : `${candidate.contact.first_name} ${candidate.contact.last_name}`}
                                        </Link>
                                      </TableCell>
                                      <TableCell>
                                        {candidate.contact.email ? (
                                          <Link
                                            href={`mailto:${candidate.contact.email}`}
                                            sx={{ color: "inherit" }}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {candidate.contact.email}
                                          </Link>
                                        ) : (
                                          "-"
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {candidate.contact.phone ? (
                                          <Link
                                            href={`tel:${candidate.contact.phone}`}
                                            sx={{ color: "inherit" }}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {candidate.contact.phone}
                                          </Link>
                                        ) : (
                                          "-"
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {candidate.contact.company_role || "-"}
                                      </TableCell>
                                      <TableCell>
                                        {candidate.contact.current_company ||
                                          "-"}
                                      </TableCell>
                                      <TableCell>
                                        {candidate.contact.location || "-"}
                                      </TableCell>
                                      <TableCell>
                                        <Box
                                          onClick={(e) =>
                                            handleCandidateStatusMenuOpen(
                                              assignment.id,
                                              candidate.id,
                                              e
                                            )
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
                                              bgcolor: getCandidateStatusColor(
                                                candidate.status
                                              ),
                                            }}
                                          />
                                          <Typography variant="body2">
                                            {candidate.status_label}
                                          </Typography>
                                          <SwapVertIcon
                                            fontSize="small"
                                            sx={{ opacity: 0.5 }}
                                          />
                                        </Box>
                                        <Menu
                                          anchorEl={
                                            candidateStatusMenuAnchor[
                                            `${assignment.id}-${candidate.id}`
                                            ]
                                          }
                                          open={Boolean(
                                            candidateStatusMenuAnchor[
                                            `${assignment.id}-${candidate.id}`
                                            ]
                                          )}
                                          onClose={() =>
                                            handleCandidateStatusMenuClose(
                                              assignment.id,
                                              candidate.id
                                            )
                                          }
                                        >
                                          {candidateStatusOptions.map(
                                            (option) => (
                                              <MenuItem
                                                key={option.value}
                                                onClick={() =>
                                                  handleCandidateStatusChange(
                                                    assignment.id,
                                                    candidate.id,
                                                    option.value
                                                  )
                                                }
                                                selected={
                                                  candidate.status ===
                                                  option.value
                                                }
                                              >
                                                <Stack
                                                  direction="row"
                                                  alignItems="center"
                                                  spacing={1}
                                                >
                                                  <Box
                                                    sx={{
                                                      width: 8,
                                                      height: 8,
                                                      borderRadius: "50%",
                                                      bgcolor:
                                                        getCandidateStatusColor(
                                                          option.value
                                                        ),
                                                    }}
                                                  />
                                                  <Typography variant="body2">
                                                    {option.label}
                                                  </Typography>
                                                </Stack>
                                              </MenuItem>
                                            )
                                          )}
                                        </Menu>
                                      </TableCell>
                                      <TableCell align="right">
                                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                          {candidate.contact.linkedin_url && (
                                            <Tooltip title="Bekijk LinkedIn profiel">
                                              <IconButton
                                                size="small"
                                                color="primary"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  window.open(
                                                    candidate.contact.linkedin_url,
                                                    "_blank",
                                                    "noopener,noreferrer"
                                                  );
                                                }}
                                              >
                                                <LinkedInIcon fontSize="small" />
                                              </IconButton>
                                            </Tooltip>
                                          )}
                                          <Tooltip title="Verwijderen uit opdracht">
                                            <IconButton
                                              size="small"
                                              color="error"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveCandidateFromAssignment(
                                                  assignment.id,
                                                  candidate.id
                                                );
                                              }}
                                            >
                                              <DeleteOutlineIcon fontSize="small" />
                                            </IconButton>
                                          </Tooltip>
                                        </Stack>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              alignItems="center"
                              sx={{ mt: 2 }}
                            >
                              <Pagination
                                count={3}
                                page={1}
                                color="primary"
                                size="small"
                              />
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
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ py: 2, textAlign: "center" }}
                          >
                            Geen kandidaten toegevoegd. Klik op "Kandidaat
                            toevoegen" om te beginnen.
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </Box>
                </Collapse>
              </Paper>
            </React.Fragment>
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
                    const randomRole =
                      Math.random() > 0.5
                        ? roles[Math.floor(Math.random() * roles.length)]
                        : "";
                    const randomLocation =
                      Math.random() > 0.5
                        ? locations[
                        Math.floor(Math.random() * locations.length)
                        ]
                        : "";

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
                      const allFilteredUids = getAvailableCandidates().map(
                        (c) => c.uid
                      );
                      setSelectedCandidateIds(new Set(allFilteredUids));
                    }}
                    disabled={
                      selectedCandidateIds.size ===
                      getAvailableCandidates().length
                    }
                  >
                    Selecteer alle ({getAvailableCandidates().length})
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      // Keep only already linked candidates selected
                      setSelectedCandidateIds(getLinkedCandidateUids());
                    }}
                    disabled={
                      // Disable if only linked candidates are selected
                      [...selectedCandidateIds].filter(
                        (uid) => !getLinkedCandidateUids().has(uid)
                      ).length === 0
                    }
                  >
                    Deselecteer nieuwe
                  </Button>
                </Stack>
              )}

              {/* Candidates List */}
              {getAvailableCandidates().length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ py: 2, textAlign: "center" }}
                >
                  {companyRoleFilter || locationFilter
                    ? "Geen kandidaten gevonden met de geselecteerde filters."
                    : "Geen kandidaten beschikbaar."}
                </Typography>
              ) : (
                <List sx={{ maxHeight: 400, overflow: "auto" }}>
                  {getAvailableCandidates().map((candidate) => {
                    const isAlreadyLinked = getLinkedCandidateUids().has(
                      candidate.uid
                    );
                    return (
                      <ListItem key={candidate.uid} disablePadding>
                        <ListItemButton
                          onClick={() =>
                            handleToggleCandidateSelection(candidate.uid)
                          }
                          dense
                          sx={
                            isAlreadyLinked
                              ? { bgcolor: "action.selected" }
                              : undefined
                          }
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
                            primary={
                              <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                              >
                                <span>{`${candidate.first_name} ${candidate.last_name}`}</span>
                                {isAlreadyLinked && (
                                  <Chip
                                    label="Gekoppeld"
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                    sx={{ height: 20, fontSize: "0.7rem" }}
                                  />
                                )}
                              </Stack>
                            }
                            secondary={
                              <Stack
                                direction="row"
                                spacing={2}
                                flexWrap="wrap"
                              >
                                {candidate.company_role && (
                                  <Typography
                                    variant="caption"
                                    component="span"
                                  >
                                    {candidate.company_role}
                                  </Typography>
                                )}
                                {candidate.current_company && (
                                  <Typography
                                    variant="caption"
                                    component="span"
                                    color="text.secondary"
                                  >
                                    {candidate.current_company}
                                  </Typography>
                                )}
                                {candidate.location && (
                                  <Typography
                                    variant="caption"
                                    component="span"
                                    color="text.secondary"
                                  >
                                    {candidate.location}
                                  </Typography>
                                )}
                              </Stack>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseAddCandidateDialog}
            disabled={addCandidatesMutation.isPending}
          >
            Annuleren
          </Button>
          <Button
            onClick={handleAddCandidatesToAssignment}
            variant="contained"
            disabled={
              // Disable if no NEW candidates are selected (only already linked ones)
              [...selectedCandidateIds].filter(
                (uid) => !getLinkedCandidateUids().has(uid)
              ).length === 0 || addCandidatesMutation.isPending
            }
          >
            {addCandidatesMutation.isPending
              ? "Bezig..."
              : `Toevoegen (${[...selectedCandidateIds].filter(
                (uid) => !getLinkedCandidateUids().has(uid)
              ).length
              } nieuw)`}
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
          setNewAssignmentVacationDays("");
          setNewAssignmentLocation("");
          setNewAssignmentEmploymentType("");
          setNewAssignmentBenefits([]);
          handleClearNotesImage();
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Nieuwe opdracht aanmaken</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <FormControl
              fullWidth
              required
              error={!newAssignmentAccountUid && !!createAssignmentError}
            >
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
                  onChange={(e) =>
                    setNewAssignmentEmploymentType(e.target.value)
                  }
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
                label="Jaarsalaris min"
                fullWidth
                value={newAssignmentSalaryMin}
                onChange={(e) =>
                  setNewAssignmentSalaryMin(formatNumberInput(e.target.value))
                }
                InputProps={{
                  startAdornment: <InputAdornment position="start">€</InputAdornment>,
                }}
                placeholder="bijv. 48.000"
              />
              <TextField
                label="Jaarsalaris max"
                fullWidth
                value={newAssignmentSalaryMax}
                onChange={(e) =>
                  setNewAssignmentSalaryMax(formatNumberInput(e.target.value))
                }
                InputProps={{
                  startAdornment: <InputAdornment position="start">€</InputAdornment>,
                }}
                placeholder="bijv. 60.000"
              />
            </Stack>
            <TextField
              label="Vakantiedagen"
              type="number"
              value={newAssignmentVacationDays}
              onChange={(e) =>
                setNewAssignmentVacationDays(
                  e.target.value ? parseInt(e.target.value) : ""
                )
              }
              InputProps={{ inputProps: { min: 0, max: 100 } }}
              sx={{ width: 160 }}
            />

            {/* Benefits Selection - Toggleable Chips */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                Arbeidsvoorwaarden
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {benefitsOptions.map((benefit) => {
                  const isSelected = newAssignmentBenefits.includes(benefit);
                  return (
                    <Chip
                      key={benefit}
                      label={benefit}
                      size="small"
                      variant={isSelected ? "filled" : "outlined"}
                      color={isSelected ? "primary" : "default"}
                      onClick={() => {
                        if (isSelected) {
                          setNewAssignmentBenefits(
                            newAssignmentBenefits.filter((b) => b !== benefit)
                          );
                        } else {
                          setNewAssignmentBenefits([
                            ...newAssignmentBenefits,
                            benefit,
                          ]);
                        }
                      }}
                      sx={{
                        cursor: "pointer",
                        "&:hover": {
                          bgcolor: isSelected ? "primary.dark" : "action.hover",
                        },
                      }}
                    />
                  );
                })}
              </Box>
            </Box>

            {/* Notes Image Upload */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Notities afbeelding (optioneel)
              </Typography>
              {newAssignmentNotesImagePreview ? (
                <Box sx={{ position: "relative", display: "inline-block" }}>
                  <Box
                    component="img"
                    src={newAssignmentNotesImagePreview}
                    alt="Notities preview"
                    sx={{
                      maxWidth: "100%",
                      maxHeight: 200,
                      borderRadius: 1,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={handleClearNotesImage}
                    sx={{
                      position: "absolute",
                      top: -8,
                      right: -8,
                      bgcolor: "error.main",
                      color: "white",
                      "&:hover": { bgcolor: "error.dark" },
                    }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<AddIcon />}
                  sx={{ width: "100%" }}
                >
                  Afbeelding uploaden
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleNotesImageUpload}
                  />
                </Button>
              )}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.5 }}
              >
                Upload een foto van je notities (max 5MB)
              </Typography>
            </Box>

            {createAssignmentError && (
              <Alert
                severity="error"
                onClose={() => setCreateAssignmentError(null)}
              >
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
              setNewAssignmentVacationDays("");
              setNewAssignmentLocation("");
              setNewAssignmentEmploymentType("");
              setNewAssignmentBenefits([]);
              handleClearNotesImage();
            }}
            disabled={createAssignmentMutation.isPending}
          >
            Annuleren
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateAssignment}
            disabled={createAssignmentMutation.isPending}
          >
            {createAssignmentMutation.isPending ? "Bezig..." : "Aanmaken"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Assignment Dialog */}
      <Dialog
        open={editAssignmentDialog.isOpen}
        onClose={handleCloseEditDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Opdracht bewerken</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <TextField
              label="Titel"
              required
              fullWidth
              value={editAssignmentTitle}
              onChange={(e) => setEditAssignmentTitle(e.target.value)}
              error={!editAssignmentTitle.trim() && !!editAssignmentError}
            />

            <TextField
              label="Omschrijving"
              fullWidth
              multiline
              rows={3}
              value={editAssignmentDescription}
              onChange={(e) => setEditAssignmentDescription(e.target.value)}
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="Locatie"
                fullWidth
                value={editAssignmentLocation}
                onChange={(e) => setEditAssignmentLocation(e.target.value)}
              />
              <FormControl fullWidth>
                <InputLabel>Dienstverband</InputLabel>
                <Select
                  value={editAssignmentEmploymentType}
                  onChange={(e) =>
                    setEditAssignmentEmploymentType(e.target.value)
                  }
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
                label="Jaarsalaris min"
                fullWidth
                value={editAssignmentSalaryMin}
                onChange={(e) =>
                  setEditAssignmentSalaryMin(formatNumberInput(e.target.value))
                }
                InputProps={{
                  startAdornment: <InputAdornment position="start">€</InputAdornment>,
                }}
                placeholder="bijv. 48.000"
              />
              <TextField
                label="Jaarsalaris max"
                fullWidth
                value={editAssignmentSalaryMax}
                onChange={(e) =>
                  setEditAssignmentSalaryMax(formatNumberInput(e.target.value))
                }
                InputProps={{
                  startAdornment: <InputAdornment position="start">€</InputAdornment>,
                }}
                placeholder="bijv. 60.000"
              />
            </Stack>
            <TextField
              label="Vakantiedagen"
              type="number"
              value={editAssignmentVacationDays}
              onChange={(e) =>
                setEditAssignmentVacationDays(
                  e.target.value ? parseInt(e.target.value) : ""
                )
              }
              InputProps={{ inputProps: { min: 0, max: 100 } }}
              sx={{ width: 160 }}
            />

            {/* Benefits Selection - Toggleable Chips */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                Arbeidsvoorwaarden
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {benefitsOptions.map((benefit) => {
                  const isSelected = editAssignmentBenefits.includes(benefit);
                  return (
                    <Chip
                      key={benefit}
                      label={benefit}
                      size="small"
                      variant={isSelected ? "filled" : "outlined"}
                      color={isSelected ? "primary" : "default"}
                      onClick={() => {
                        if (isSelected) {
                          setEditAssignmentBenefits(
                            editAssignmentBenefits.filter((b) => b !== benefit)
                          );
                        } else {
                          setEditAssignmentBenefits([
                            ...editAssignmentBenefits,
                            benefit,
                          ]);
                        }
                      }}
                      sx={{
                        cursor: "pointer",
                        "&:hover": {
                          bgcolor: isSelected ? "primary.dark" : "action.hover",
                        },
                      }}
                    />
                  );
                })}
              </Box>
            </Box>

            {editAssignmentError && (
              <Alert
                severity="error"
                onClose={() => setEditAssignmentError(null)}
              >
                {editAssignmentError}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseEditDialog}
            disabled={updateAssignmentMutation.isPending}
          >
            Annuleren
          </Button>
          <Button
            variant="contained"
            onClick={handleUpdateAssignment}
            disabled={updateAssignmentMutation.isPending}
          >
            {updateAssignmentMutation.isPending ? "Bezig..." : "Opslaan"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
