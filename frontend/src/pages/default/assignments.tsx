import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Link,
  Menu,
  Collapse,
} from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  GridToolbarContainer,
  GridToolbarFilterButton,
} from "@mui/x-data-grid";
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Sort as SortIcon,
  SwapVert as SwapVertIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Add as AddIcon,
  DeleteOutline as DeleteOutlineIcon,
  Edit as EditIcon,
  LinkedIn as LinkedInIcon,
  Close as CloseIcon,
  Description as DescriptionIcon,
  ViewColumn as ViewColumnIcon,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import type { Assignment } from "../../types/accounts";
import type { Contact } from "../../types/contacts";
import { useSearchCandidates } from "../../api/queries/contacts";
import {
  useAssignments,
  type AssignmentFromAPI,
  useAssignmentCandidates,
  type CandidateAssignment,
} from "../../api/queries/assignments";
import { useAccounts } from "../../api/queries/accounts";
import { useUsersForDropdown } from "../../api/queries/users";
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
import { ColumnOrderDialog } from "../../components/ColumnOrderDialog";
import { networkRoleLabels } from "../../utils/formatters";
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
  recruiter?: {
    uid: string;
    name: string;
  } | null;
  secondary_recruiters?: {
    uid: string;
    name: string;
  }[];
  location?: string;
  employment_type?: string;
  salary_min?: number;
  salary_max?: number;
  vacation_days?: number;
  start_date?: string;
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

const CANDIDATES_COLUMN_ORDER_KEY = "ave-crm-assignment-candidates-column-order";

const CANDIDATES_COLUMN_META = [
  { field: "name", headerName: "Naam" },
  { field: "email", headerName: "E-mail" },
  { field: "phone", headerName: "Telefoon" },
  { field: "company_role", headerName: "Functie" },
  { field: "current_company", headerName: "Bedrijf" },
  { field: "location", headerName: "Locatie" },
  { field: "date_of_birth", headerName: "Geboortedatum" },
  { field: "availability_date", headerName: "Beschikbaar" },
  { field: "network_roles", headerName: "Netwerk rollen" },
  { field: "status", headerName: "Status" },
  { field: "cv", headerName: "CV" },
  { field: "actions", headerName: "Acties" },
];

function AssignmentCandidatesDataGrid({
  assignmentId,
  candidates,
  columnOrder,
  onColumnOrderChange,
  onStatusMenuOpen,
  onStatusMenuClose,
  onStatusChange,
  onRemove,
  onNavigateToContact,
  candidateStatusMenuAnchor,
  candidateStatusOptions,
  getCandidateStatusColor,
}: {
  assignmentId: number;
  candidates: CandidateAssignment[];
  columnOrder: string[];
  onColumnOrderChange: (order: string[]) => void;
  onStatusMenuOpen: (
    assignmentId: number,
    candidateId: number,
    e: React.MouseEvent<HTMLElement>
  ) => void;
  onStatusMenuClose: (assignmentId: number, candidateId: number) => void;
  onStatusChange: (
    assignmentId: number,
    candidateId: number,
    status: CandidateAssignment["status"]
  ) => void;
  onRemove: (assignmentId: number, candidateId: number) => void;
  onNavigateToContact: (contactUid: string) => void;
  candidateStatusMenuAnchor: Record<string, HTMLElement | null>;
  candidateStatusOptions: {
    value: CandidateAssignment["status"];
    label: string;
  }[];
  getCandidateStatusColor: (status: CandidateAssignment["status"]) => string;
}) {
  const allColumns = useMemo<GridColDef[]>(
    () => [
      {
        field: "name",
        headerName: "Naam",
        flex: 1,
        minWidth: 180,
        valueGetter: (_value, row) =>
          row.contact.prefix
            ? `${row.contact.first_name} ${row.contact.prefix} ${row.contact.last_name}`
            : `${row.contact.first_name} ${row.contact.last_name}`,
        renderCell: ({ row }) => (
          <Link
            component="button"
            onClick={(e) => {
              e.stopPropagation();
              onNavigateToContact(row.contact.uid);
            }}
            sx={{
              textDecoration: "underline",
              color: "inherit",
              cursor: "pointer",
              "&:hover": { color: "primary.main" },
            }}
          >
            {row.contact.prefix
              ? `${row.contact.first_name} ${row.contact.prefix} ${row.contact.last_name}`
              : `${row.contact.first_name} ${row.contact.last_name}`}
          </Link>
        ),
      },
      {
        field: "email",
        headerName: "E-mail",
        flex: 1,
        minWidth: 180,
        valueGetter: (_value, row) => row.contact.email || "",
        renderCell: ({ row }) =>
          row.contact.email ? (
            <Link
              href={`mailto:${row.contact.email}`}
              sx={{ color: "inherit" }}
              onClick={(e) => e.stopPropagation()}
            >
              {row.contact.email}
            </Link>
          ) : (
            "-"
          ),
      },
      {
        field: "phone",
        headerName: "Telefoon",
        width: 130,
        valueGetter: (_value, row) => row.contact.phone || "",
        renderCell: ({ row }) =>
          row.contact.phone ? (
            <Link
              href={`tel:${row.contact.phone}`}
              sx={{ color: "inherit" }}
              onClick={(e) => e.stopPropagation()}
            >
              {row.contact.phone}
            </Link>
          ) : (
            "-"
          ),
      },
      {
        field: "company_role",
        headerName: "Functie",
        flex: 1,
        minWidth: 150,
        valueGetter: (_value, row) => row.contact.company_role || "-",
      },
      {
        field: "current_company",
        headerName: "Bedrijf",
        flex: 1,
        minWidth: 150,
        valueGetter: (_value, row) => row.contact.current_company || "-",
      },
      {
        field: "location",
        headerName: "Locatie",
        width: 130,
        valueGetter: (_value, row) => row.contact.location || "-",
      },
      {
        field: "date_of_birth",
        headerName: "Geboortedatum",
        width: 130,
        valueGetter: (_value, row) => {
          const v = row.contact.date_of_birth;
          if (!v) return "-";
          return new Date(v).toLocaleDateString("nl-NL");
        },
      },
      {
        field: "availability_date",
        headerName: "Beschikbaar",
        width: 130,
        valueGetter: (_value, row) => {
          const v = (row.contact as { availability_date?: string }).availability_date;
          if (!v) return "-";
          return new Date(v).toLocaleDateString("nl-NL");
        },
      },
      {
        field: "network_roles",
        headerName: "Netwerk rollen",
        width: 200,
        valueGetter: (_value, row) => {
          const roles = row.contact.network_roles;
          if (!roles?.length) return "-";
          return roles.map((r) => networkRoleLabels[r] || r).join(", ");
        },
      },
      {
        field: "status",
        headerName: "Status",
        width: 150,
        valueGetter: (_value, row) => row.status_label,
        renderCell: ({ row }) => {
          const key = `${assignmentId}-${row.id}`;
          const anchorEl = candidateStatusMenuAnchor[key];
          return (
            <>
              <Box
                onClick={(e) =>
                  onStatusMenuOpen(assignmentId, row.id, e)
                }
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1,
                  cursor: "pointer",
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: getCandidateStatusColor(row.status),
                  }}
                />
                <Typography variant="body2">{row.status_label}</Typography>
                <SwapVertIcon fontSize="small" sx={{ opacity: 0.5 }} />
              </Box>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => onStatusMenuClose(assignmentId, row.id)}
              >
                {candidateStatusOptions.map((option) => (
                  <MenuItem
                    key={option.value}
                    onClick={() =>
                      onStatusChange(assignmentId, row.id, option.value)
                    }
                    selected={row.status === option.value}
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
            </>
          );
        },
      },
      {
        field: "cv",
        headerName: "CV",
        width: 80,
        sortable: false,
        renderCell: ({ row }) => {
          const cvUrl = (row.contact as { cv_url?: string }).cv_url;
          return cvUrl ? (
            <Tooltip title="Bekijk contact (CV)">
              <IconButton
                size="small"
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateToContact(row.contact.uid);
                }}
              >
                <DescriptionIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            "-"
          );
        },
      },
      {
        field: "actions",
        headerName: "",
        width: 100,
        sortable: false,
        filterable: false,
        renderCell: ({ row }) => (
          <Stack
            direction="row"
            spacing={0.5}
            justifyContent="flex-end"
            onClick={(e) => e.stopPropagation()}
          >
            {row.contact.linkedin_url && (
              <Tooltip title="Bekijk LinkedIn profiel">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(
                      row.contact.linkedin_url!,
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
                  onRemove(assignmentId, row.id);
                }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [
      assignmentId,
      candidateStatusMenuAnchor,
      candidateStatusOptions,
      getCandidateStatusColor,
      onNavigateToContact,
      onRemove,
      onStatusChange,
      onStatusMenuClose,
      onStatusMenuOpen,
    ]
  );

  const orderedColumns = useMemo(() => {
    const byField = new Map(allColumns.map((c) => [c.field, c]));
    return columnOrder
      .map((field) => byField.get(field))
      .filter((c): c is GridColDef => c != null);
  }, [allColumns, columnOrder]);

  return (
    <DataGrid
      rows={candidates}
      columns={orderedColumns}
      getRowId={(row) => row.id}
      slots={{
        toolbar: () => (
          <GridToolbarContainer>
            <GridToolbarFilterButton />
          </GridToolbarContainer>
        ),
      }}
      initialState={{
        pagination: {
          paginationModel: { page: 0, pageSize: 10 },
        },
      }}
      pageSizeOptions={[5, 10, 25, 50]}
      disableRowSelectionOnClick
      sx={{
        border: 0,
        "& .MuiDataGrid-row:hover": { bgcolor: "action.hover" },
        "& .MuiDataGrid-cell:focus": { outline: "none" },
      }}
    />
  );
}

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
  const location = useLocation();
  const [candidateSearchInput, setCandidateSearchInput] = useState("");
  const [candidateSearchQuery, setCandidateSearchQuery] = useState("");
  const {
    data: apiAssignments = [],
    isLoading: assignmentsLoading,
    error: assignmentsError,
  } = useAssignments();
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const { data: users = [] } = useUsersForDropdown();

  // Mutations
  const createAssignmentMutation = useCreateAssignment();
  const updateAssignmentMutation = useUpdateAssignment();
  const addCandidatesMutation = useAddAssignmentCandidates();
  const updateCandidateStatusMutation = useUpdateAssignmentCandidateStatus();
  const removeCandidateMutation = useRemoveAssignmentCandidate();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    | "title_asc"
    | "title_desc"
    | "account_asc"
    | "account_desc"
    | "status"
    | "salary_desc"
    | "salary_asc"
    | "candidates_desc"
    | "candidates_asc"
  >("title_asc");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [employmentTypeFilters, setEmploymentTypeFilters] = useState<string[]>(
    []
  );
  const [sortAnchor, setSortAnchor] = useState<null | HTMLElement>(null);
  const [filterAnchor, setFilterAnchor] = useState<null | HTMLElement>(null);
  const [expandedAssignments, setExpandedAssignments] = useState<Set<number>>(
    new Set()
  );

  // Expand assignment when navigated from account detail with assignmentUid in state
  const assignmentUidFromState = (location.state as { assignmentUid?: string })
    ?.assignmentUid;
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
  const candidateColumnOrderDialog = useDisclosure();
  const [candidatesColumnOrder, setCandidatesColumnOrder] = useState<
    string[]
  >(() => {
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
  });
  const persistCandidatesColumnOrder = useCallback((order: string[]) => {
    setCandidatesColumnOrder(order);
    localStorage.setItem(
      CANDIDATES_COLUMN_ORDER_KEY,
      JSON.stringify(order)
    );
  }, []);
  const { data: searchCandidates = [], isLoading: candidatesLoading } =
    useSearchCandidates(candidateSearchQuery, addCandidateDialogOpen);

  // Debounce candidate search input
  React.useEffect(() => {
    if (!addCandidateDialogOpen) return;
    const timer = setTimeout(() => setCandidateSearchQuery(candidateSearchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [candidateSearchInput, addCandidateDialogOpen]);

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<
    number | null
  >(null);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(
    new Set()
  );
  const [candidateStatusMenuAnchor, setCandidateStatusMenuAnchor] = useState<{
    [key: string]: HTMLElement | null;
  }>({});

  // Create assignment dialog state
  const createAssignmentDialog = useDisclosure();
  const [newAssignmentTitle, setNewAssignmentTitle] = useState("");
  const [newAssignmentDescription, setNewAssignmentDescription] = useState("");
  const [newAssignmentAccountUid, setNewAssignmentAccountUid] = useState("");
  const [newAssignmentRecruiterUid, setNewAssignmentRecruiterUid] = useState("");
  const [newAssignmentSecondaryRecruiterUids, setNewAssignmentSecondaryRecruiterUids] = useState<string[]>([]);
  const [newAssignmentSalaryMin, setNewAssignmentSalaryMin] = useState("");
  const [newAssignmentSalaryMax, setNewAssignmentSalaryMax] = useState("");
  const [newAssignmentVacationDays, setNewAssignmentVacationDays] = useState<
    number | ""
  >("");
  const [newAssignmentLocation, setNewAssignmentLocation] = useState("");
  const [newAssignmentEmploymentType, setNewAssignmentEmploymentType] =
    useState("");
  const [newAssignmentStartDate, setNewAssignmentStartDate] = useState("");
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
  const [editAssignmentRecruiterUid, setEditAssignmentRecruiterUid] = useState("");
  const [editAssignmentSecondaryRecruiterUids, setEditAssignmentSecondaryRecruiterUids] = useState<string[]>([]);
  const [editAssignmentSalaryMin, setEditAssignmentSalaryMin] = useState("");
  const [editAssignmentSalaryMax, setEditAssignmentSalaryMax] = useState("");
  const [editAssignmentVacationDays, setEditAssignmentVacationDays] = useState<
    number | ""
  >("");
  const [editAssignmentLocation, setEditAssignmentLocation] = useState("");
  const [editAssignmentEmploymentType, setEditAssignmentEmploymentType] =
    useState("");
  const [editAssignmentStartDate, setEditAssignmentStartDate] = useState("");
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
      candidates: [], // Will be populated by AssignmentCandidatesLoader component
    }));
  }, [apiAssignments]);

  // Expand assignment when navigated from account detail with assignmentUid
  useEffect(() => {
    if (!assignmentUidFromState || apiAssignments.length === 0) return;
    const match = apiAssignments.find((a) => a.uid === assignmentUidFromState);
    if (match) {
      setExpandedAssignments((prev) => new Set(prev).add(match.id));
      // Clear state so we don't re-expand on later visits
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [assignmentUidFromState, apiAssignments, navigate, location.pathname]);

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
        recruiter_uid: newAssignmentRecruiterUid || null,
        secondary_recruiter_uids: newAssignmentSecondaryRecruiterUids.length > 0 ? newAssignmentSecondaryRecruiterUids : undefined,
        title: newAssignmentTitle.trim(),
        description: newAssignmentDescription.trim() || null,
        salary_min: parseFormattedNumber(newAssignmentSalaryMin) || null,
        salary_max: parseFormattedNumber(newAssignmentSalaryMax) || null,
        vacation_days: newAssignmentVacationDays || null,
        location: newAssignmentLocation.trim() || null,
        employment_type: newAssignmentEmploymentType || null,
        start_date: newAssignmentStartDate || null,
        benefits:
          newAssignmentBenefits.length > 0 ? newAssignmentBenefits : null,
        notes_image: newAssignmentNotesImage,
      });

      // Reset form and close dialog
      setNewAssignmentTitle("");
      setNewAssignmentDescription("");
      setNewAssignmentAccountUid("");
      setNewAssignmentRecruiterUid("");
      setNewAssignmentSecondaryRecruiterUids([]);
      setNewAssignmentSalaryMin("");
      setNewAssignmentSalaryMax("");
      setNewAssignmentVacationDays("");
      setNewAssignmentLocation("");
      setNewAssignmentEmploymentType("");
      setNewAssignmentStartDate("");
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
    setEditAssignmentRecruiterUid(assignment.recruiter?.uid || "");
    setEditAssignmentSecondaryRecruiterUids(assignment.secondary_recruiters?.map(r => r.uid) || []);
    setEditAssignmentSalaryMin(assignment.salary_min ? assignment.salary_min.toLocaleString("nl-NL") : "");
    setEditAssignmentSalaryMax(assignment.salary_max ? assignment.salary_max.toLocaleString("nl-NL") : "");
    setEditAssignmentVacationDays(assignment.vacation_days || "");
    setEditAssignmentLocation(assignment.location || "");
    setEditAssignmentEmploymentType(assignment.employment_type || "");
    setEditAssignmentStartDate(assignment.start_date || "");
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
          recruiter_uid: editAssignmentRecruiterUid || null,
          secondary_recruiter_uids: editAssignmentSecondaryRecruiterUids,
          title: editAssignmentTitle.trim(),
          description: editAssignmentDescription.trim() || null,
          salary_min: parseFormattedNumber(editAssignmentSalaryMin) || null,
          salary_max: parseFormattedNumber(editAssignmentSalaryMax) || null,
          vacation_days: editAssignmentVacationDays || null,
          location: editAssignmentLocation.trim() || null,
          employment_type: editAssignmentEmploymentType || null,
          start_date: editAssignmentStartDate || null,
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

    setCandidateSearchInput("");
    setCandidateSearchQuery("");
    setAddCandidateDialogOpen(true);
  };

  const handleCloseAddCandidateDialog = () => {
    setAddCandidateDialogOpen(false);
    setSelectedAssignmentId(null);
    setSelectedCandidateIds(new Set());
    setCandidateSearchInput("");
    setCandidateSearchQuery("");
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

    const existingCandidates =
      localCandidateAssignments[selectedAssignmentId] || [];
    const existingCandidateUids = new Set(
      existingCandidates.map((c) => c.contact.uid)
    );

    // Filter to only NEW candidates (not already in assignment)
    const contactUids = [...selectedCandidateIds].filter(
      (uid) => !existingCandidateUids.has(uid)
    );

    if (contactUids.length === 0) {
      handleCloseAddCandidateDialog();
      return;
    }

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

  // Merge search results with already-linked (so they always show as selected)
  const getAvailableCandidates = (): Array<{ uid: string; first_name?: string; last_name?: string; company_role?: string; current_company?: string; location?: string }> => {
    if (!selectedAssignmentId) return [];

    const existing = localCandidateAssignments[selectedAssignmentId] || [];
    const existingMap = new Map(existing.map((c) => [c.contact.uid, c.contact]));
    const searchIds = new Set(searchCandidates.map((c) => c.uid));

    // Already-linked that aren't in search results - include them so user sees who's added
    const fromExisting = existing
      .filter((c) => !searchIds.has(c.contact.uid))
      .map((c) => c.contact);
    return [...fromExisting, ...searchCandidates];
  };

  // Get UIDs of candidates already linked to the selected assignment
  const getLinkedCandidateUids = (): Set<string> => {
    if (!selectedAssignmentId) return new Set();
    const existingCandidates =
      localCandidateAssignments[selectedAssignmentId] || [];
    return new Set(existingCandidates.map((c) => c.contact.uid));
  };

  const getCurrentStatus = (a: AssignmentWithDetails) =>
    assignmentStatuses[a.id] || a.status || "active";

  const toggleStatusFilter = (status: string) => {
    setStatusFilters((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const toggleEmploymentType = (type: string) => {
    setEmploymentTypeFilters((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const sortLabels: Record<typeof sortBy, string> = {
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

  const filteredAssignments = React.useMemo(() => {
    let result = assignments.filter((assignment) => {
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

    const sorted = [...result].sort((a, b) => {
      const aStatus = getCurrentStatus(a);
      const bStatus = getCurrentStatus(b);
      const statusOrder = ["active", "proposed", "hired", "shadow_management", "completed", "cancelled"];
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
          return (aStatusIdx - bStatusIdx) || (a.title || "").localeCompare(b.title || "");
        case "salary_desc":
          return (b.salary_max ?? b.salary_min ?? 0) - (a.salary_max ?? a.salary_min ?? 0);
        case "salary_asc":
          return (a.salary_min ?? a.salary_max ?? 0) - (b.salary_min ?? b.salary_max ?? 0);
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
    return sorted;
  }, [
    assignments,
    searchQuery,
    statusFilters,
    employmentTypeFilters,
    sortBy,
    assignmentStatuses,
    localCandidateAssignments,
  ]);

  return (
    <Box>
      <Stack spacing={3}>
        {/* Header with Search, Sort, Filter, and Add Button */}
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
            <MenuItem onClick={() => { setSortBy("title_asc"); setSortAnchor(null); }}>
              Titel A–Z
            </MenuItem>
            <MenuItem onClick={() => { setSortBy("title_desc"); setSortAnchor(null); }}>
              Titel Z–A
            </MenuItem>
            <MenuItem onClick={() => { setSortBy("account_asc"); setSortAnchor(null); }}>
              Klant A–Z
            </MenuItem>
            <MenuItem onClick={() => { setSortBy("account_desc"); setSortAnchor(null); }}>
              Klant Z–A
            </MenuItem>
            <MenuItem onClick={() => { setSortBy("status"); setSortAnchor(null); }}>
              Status
            </MenuItem>
            <MenuItem onClick={() => { setSortBy("salary_desc"); setSortAnchor(null); }}>
              Salaris hoog → laag
            </MenuItem>
            <MenuItem onClick={() => { setSortBy("salary_asc"); setSortAnchor(null); }}>
              Salaris laag → hoog
            </MenuItem>
            <MenuItem onClick={() => { setSortBy("candidates_desc"); setSortAnchor(null); }}>
              Meeste kandidaten eerst
            </MenuItem>
            <MenuItem onClick={() => { setSortBy("candidates_asc"); setSortAnchor(null); }}>
              Minste kandidaten eerst
            </MenuItem>
          </Menu>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={(e) => setFilterAnchor(e.currentTarget)}
            color={statusFilters.length > 0 || employmentTypeFilters.length > 0 ? "primary" : "inherit"}
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
              <MenuItem key={opt.value} onClick={() => toggleStatusFilter(opt.value)}>
                <Checkbox checked={statusFilters.includes(opt.value)} size="small" sx={{ mr: 1 }} disableRipple />
                {opt.label}
              </MenuItem>
            ))}
            <Box sx={{ borderTop: 1, borderColor: "divider", my: 0.5 }} />
            <MenuItem onClick={() => toggleEmploymentType("Fulltime")}>
              <Checkbox checked={employmentTypeFilters.includes("Fulltime")} size="small" sx={{ mr: 1 }} disableRipple />
              Fulltime
            </MenuItem>
            <MenuItem onClick={() => toggleEmploymentType("Parttime")}>
              <Checkbox checked={employmentTypeFilters.includes("Parttime")} size="small" sx={{ mr: 1 }} disableRipple />
              Parttime
            </MenuItem>
            <MenuItem onClick={() => toggleEmploymentType("Freelance")}>
              <Checkbox checked={employmentTypeFilters.includes("Freelance")} size="small" sx={{ mr: 1 }} disableRipple />
              Freelance
            </MenuItem>
            <MenuItem onClick={() => toggleEmploymentType("ZZP")}>
              <Checkbox checked={employmentTypeFilters.includes("ZZP")} size="small" sx={{ mr: 1 }} disableRipple />
              ZZP
            </MenuItem>
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
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
          <Chip
            size="small"
            label={`Sorteren: ${sortLabels[sortBy]}`}
            onDelete={sortBy !== "title_asc" ? () => setSortBy("title_asc") : undefined}
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
          {(statusFilters.length > 0 || employmentTypeFilters.length > 0 || searchQuery) && (
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
                    {assignment.recruiter?.name && (
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                        Lead: {assignment.recruiter.name}
                        {assignment.secondary_recruiters && assignment.secondary_recruiters.length > 0 && (
                          <> | Team: {assignment.secondary_recruiters.map(r => r.name).join(', ')}</>
                        )}
                      </Typography>
                    )}
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

                      {/* Candidates DataGrid */}
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
                          <Stack direction="row" spacing={1}>
                            <Tooltip title="Kolomvolgorde">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  candidateColumnOrderDialog.open();
                                }}
                              >
                                <ViewColumnIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
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
                        </Stack>
                        {assignmentCandidates &&
                        assignmentCandidates.length > 0 ? (
                          <Paper
                            elevation={0}
                            variant="outlined"
                            sx={{
                              height: 'calc(100vh - 200px)',
                              width: "100%",
                              overflow: "hidden",
                            }}
                          >
                            <AssignmentCandidatesDataGrid
                              assignmentId={assignment.id}
                              candidates={assignmentCandidates}
                              columnOrder={candidatesColumnOrder}
                              onColumnOrderChange={
                                persistCandidatesColumnOrder
                              }
                              onStatusMenuOpen={handleCandidateStatusMenuOpen}
                              onStatusMenuClose={handleCandidateStatusMenuClose}
                              onStatusChange={handleCandidateStatusChange}
                              onRemove={handleRemoveCandidateFromAssignment}
                              onNavigateToContact={(uid) =>
                                navigate(`/network?kandidaten=1`, {
                                  state: { contactUid: uid },
                                })
                              }
                              candidateStatusMenuAnchor={
                                candidateStatusMenuAnchor
                              }
                              candidateStatusOptions={
                                candidateStatusOptions
                              }
                              getCandidateStatusColor={
                                getCandidateStatusColor
                              }
                            />
                          </Paper>
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
              {/* Search - server-side, max 50 results */}
              <TextField
                label="Zoeken op naam, e-mail, bedrijf of functie"
                placeholder="Typ om te zoeken..."
                value={candidateSearchInput}
                onChange={(e) => setCandidateSearchInput(e.target.value)}
                size="small"
                fullWidth
                sx={{ mb: 2, mt: 1 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />

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
                  {candidateSearchInput.trim()
                    ? "Geen kandidaten gevonden. Probeer een andere zoekterm."
                    : "Typ in het zoekveld om kandidaten te vinden."}
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
                                {candidate.network_roles?.map((role) => {
                                  const roleLabels: Record<string, { label: string; color: "default" | "success" | "error" | "warning" | "info" }> = {
                                    candidate: { label: "Kandidaat", color: "info" },
                                    candidate_placed: { label: "Geplaatst", color: "success" },
                                    candidate_rejected: { label: "Afgewezen", color: "error" },
                                    interim: { label: "Interimmer", color: "warning" },
                                    ambassador: { label: "Ambassadeur", color: "default" },
                                    budget_holder: { label: "Budgethouder", color: "default" },
                                    client_principal: { label: "Opdrachtgever", color: "info" },
                                    signing_authority: { label: "Tekenbevoegd", color: "warning" },
                                    final_decision_maker: { label: "Eindbeslisser", color: "success" },
                                  };
                                  const config = roleLabels[role];
                                  if (!config) return null;
                                  return (
                                    <Chip
                                      key={role}
                                      label={config.label}
                                      size="small"
                                      color={config.color}
                                      sx={{ height: 20, fontSize: "0.7rem" }}
                                    />
                                  );
                                })}
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
          setNewAssignmentRecruiterUid("");
          setNewAssignmentSecondaryRecruiterUids([]);
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

            <FormControl fullWidth>
              <InputLabel>Lead Recruiter</InputLabel>
              <Select
                value={newAssignmentRecruiterUid}
                onChange={(e) => setNewAssignmentRecruiterUid(e.target.value)}
                label="Lead Recruiter"
              >
                <MenuItem value="">Geen recruiter toegewezen</MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.uid} value={user.uid}>
                    {user.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Secundaire Recruiters</InputLabel>
              <Select
                multiple
                value={newAssignmentSecondaryRecruiterUids}
                onChange={(e) => setNewAssignmentSecondaryRecruiterUids(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value as string[])}
                label="Secundaire Recruiters"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((uid) => {
                      const user = users.find(u => u.uid === uid);
                      return <Chip key={uid} label={user?.name || uid} size="small" />;
                    })}
                  </Box>
                )}
              >
                {users
                  .filter(u => u.uid !== newAssignmentRecruiterUid)
                  .map((user) => (
                    <MenuItem key={user.uid} value={user.uid}>
                      {user.name}
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
                label="Startdatum"
                type="date"
                value={newAssignmentStartDate}
                onChange={(e) => setNewAssignmentStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 200 }}
              />
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

            <FormControl fullWidth>
              <InputLabel>Lead Recruiter</InputLabel>
              <Select
                value={editAssignmentRecruiterUid}
                onChange={(e) => setEditAssignmentRecruiterUid(e.target.value)}
                label="Lead Recruiter"
              >
                <MenuItem value="">Geen recruiter toegewezen</MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.uid} value={user.uid}>
                    {user.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Secundaire Recruiters</InputLabel>
              <Select
                multiple
                value={editAssignmentSecondaryRecruiterUids}
                onChange={(e) => setEditAssignmentSecondaryRecruiterUids(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value as string[])}
                label="Secundaire Recruiters"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((uid) => {
                      const user = users.find(u => u.uid === uid);
                      return <Chip key={uid} label={user?.name || uid} size="small" />;
                    })}
                  </Box>
                )}
              >
                {users
                  .filter(u => u.uid !== editAssignmentRecruiterUid)
                  .map((user) => (
                    <MenuItem key={user.uid} value={user.uid}>
                      {user.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

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
                label="Startdatum"
                type="date"
                value={editAssignmentStartDate}
                onChange={(e) => setEditAssignmentStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 200 }}
              />
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

      {/* Candidate columns order */}
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
