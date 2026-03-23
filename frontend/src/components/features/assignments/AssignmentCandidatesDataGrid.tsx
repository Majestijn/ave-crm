import React, { useMemo } from "react";
import {
  Box,
  Typography,
  Stack,
  Link,
  Menu,
  MenuItem,
  Tooltip,
  IconButton,
} from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  GridToolbarContainer,
  GridToolbarFilterButton,
} from "@mui/x-data-grid";
import {
  LinkedIn as LinkedInIcon,
  DeleteOutline as DeleteOutlineIcon,
  Description as DescriptionIcon,
  SwapVert as SwapVertIcon,
} from "@mui/icons-material";
import type { CandidateAssignment } from "../../../api/queries/assignments";
import { networkRoleLabels } from "../../../utils/formatters";
import { getCandidateStatusColor } from "./types";

type AssignmentCandidatesDataGridProps = {
  assignmentId: number;
  candidates: CandidateAssignment[];
  columnOrder: string[];
  onColumnOrderChange: (order: string[]) => void;
  onStatusMenuOpen: (
    assignmentId: number,
    candidateId: number,
    e: React.MouseEvent<HTMLElement>,
  ) => void;
  onStatusMenuClose: (assignmentId: number, candidateId: number) => void;
  onStatusChange: (
    assignmentId: number,
    candidateId: number,
    status: CandidateAssignment["status"],
  ) => void;
  onRemove: (assignmentId: number, candidateId: number) => void;
  onNavigateToContact: (contactUid: string) => void;
  candidateStatusMenuAnchor: Record<string, HTMLElement | null>;
  candidateStatusOptions: {
    value: CandidateAssignment["status"];
    label: string;
  }[];
  getCandidateStatusColor: (status: CandidateAssignment["status"]) => string;
};

export default function AssignmentCandidatesDataGrid({
  assignmentId,
  candidates,
  columnOrder,
  onStatusMenuOpen,
  onStatusMenuClose,
  onStatusChange,
  onRemove,
  onNavigateToContact,
  candidateStatusMenuAnchor,
  candidateStatusOptions,
  getCandidateStatusColor: getStatusColor,
}: AssignmentCandidatesDataGridProps) {
  const onNavigateToContactRef = React.useRef(onNavigateToContact);
  React.useEffect(() => {
    onNavigateToContactRef.current = onNavigateToContact;
  }, [onNavigateToContact]);

  const onRemoveRef = React.useRef(onRemove);
  React.useEffect(() => {
    onRemoveRef.current = onRemove;
  }, [onRemove]);

  const onStatusChangeRef = React.useRef(onStatusChange);
  React.useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  const onStatusMenuOpenRef = React.useRef(onStatusMenuOpen);
  React.useEffect(() => {
    onStatusMenuOpenRef.current = onStatusMenuOpen;
  }, [onStatusMenuOpen]);

  const onStatusMenuCloseRef = React.useRef(onStatusMenuClose);
  React.useEffect(() => {
    onStatusMenuCloseRef.current = onStatusMenuClose;
  }, [onStatusMenuClose]);

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
              onNavigateToContactRef.current(row.contact.uid);
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
          const v = (row.contact as { availability_date?: string })
            .availability_date;
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
                  onStatusMenuOpenRef.current(assignmentId, row.id, e)
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
                    bgcolor: getStatusColor(row.status),
                  }}
                />
                <Typography variant="body2">{row.status_label}</Typography>
                <SwapVertIcon fontSize="small" sx={{ opacity: 0.5 }} />
              </Box>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() =>
                  onStatusMenuCloseRef.current(assignmentId, row.id)
                }
              >
                {candidateStatusOptions.map((option) => (
                  <MenuItem
                    key={option.value}
                    onClick={() =>
                      onStatusChangeRef.current(
                        assignmentId,
                        row.id,
                        option.value,
                      )
                    }
                    selected={row.status === option.value}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: getStatusColor(option.value),
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
                      "noopener,noreferrer",
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
                  onRemoveRef.current(assignmentId, row.id);
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
      getStatusColor,
    ],
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
