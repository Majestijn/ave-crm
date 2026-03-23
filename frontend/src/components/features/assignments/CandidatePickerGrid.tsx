import React from "react";
import {
  Typography,
  Stack,
  Chip,
  Checkbox,
  IconButton,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
  LinkedIn as LinkedInIcon,
  Description as DescriptionIcon,
} from "@mui/icons-material";
import type { Contact } from "../../../types/contacts";
import { candidateNetworkRoleLabels } from "./types";

type CandidatePickerGridProps = {
  rows: Contact[];
  linkedCandidateUids: Set<string>;
  selectedCandidateUids: Set<string>;
  onToggleSelection: (uid: string) => void;
};

export default function CandidatePickerGrid({
  rows,
  linkedCandidateUids,
  selectedCandidateUids,
  onToggleSelection,
}: CandidatePickerGridProps) {
  const formatDate = React.useCallback((value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("nl-NL");
  }, []);

  const columns = React.useMemo<GridColDef[]>(
    () => [
      {
        field: "select",
        headerName: "",
        width: 56,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => {
          const candidate = params.row as Contact;
          return (
            <Checkbox
              size="small"
              checked={selectedCandidateUids.has(candidate.uid)}
              onChange={() => onToggleSelection(candidate.uid)}
              onClick={(e) => e.stopPropagation()}
            />
          );
        },
      },
      {
        field: "name",
        headerName: "Kandidaat",
        minWidth: 220,
        sortable: false,
        renderCell: (params) => {
          const candidate = params.row as Contact;
          const isLinked = linkedCandidateUids.has(candidate.uid);
          return (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="space-between"
              sx={{ height: "100%", width: "100%" }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {`${candidate.first_name} ${candidate.last_name}`}
              </Typography>
              {isLinked && (
                <Chip
                  label="Gekoppeld"
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ height: 20, fontSize: "0.7rem" }}
                />
              )}
            </Stack>
          );
        },
      },
      {
        field: "email",
        headerName: "E-mail",
        minWidth: 220,
        flex: 1,
        valueGetter: (_value, row) => row.email || "-",
      },
      {
        field: "phone",
        headerName: "Telefoon",
        minWidth: 140,
        valueGetter: (_value, row) => row.phone || "-",
      },
      {
        field: "company_role",
        headerName: "Functie",
        minWidth: 180,
        valueGetter: (_value, row) => row.company_role || "-",
      },
      {
        field: "current_company",
        headerName: "Bedrijf",
        minWidth: 180,
        valueGetter: (_value, row) => row.current_company || "-",
      },
      {
        field: "location",
        headerName: "Locatie",
        minWidth: 160,
        valueGetter: (_value, row) => row.location || "-",
      },
      {
        field: "date_of_birth",
        headerName: "Geboortedatum",
        minWidth: 140,
        valueGetter: (_value, row) => formatDate(row.date_of_birth),
      },
      {
        field: "availability_date",
        headerName: "Beschikbaar",
        minWidth: 130,
        valueGetter: (_value, row) => formatDate(row.availability_date),
      },
      {
        field: "network_roles",
        headerName: "Netwerk rollen",
        minWidth: 260,
        sortable: false,
        renderCell: (params) => {
          const candidate = params.row as Contact;
          if (!candidate.network_roles?.length) return "-";
          return (
            <Stack direction="row" spacing={0.5} flexWrap="wrap">
              {candidate.network_roles.map((role) => {
                const config = candidateNetworkRoleLabels[role];
                return (
                  <Chip
                    key={role}
                    label={config?.label || role}
                    size="small"
                    color={config?.color || "default"}
                    sx={{ height: 20, fontSize: "0.7rem" }}
                  />
                );
              })}
            </Stack>
          );
        },
      },
      {
        field: "cv",
        headerName: "CV",
        width: 80,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => {
          const candidate = params.row as Contact;
          return candidate.cv_url ? (
            <IconButton
              size="small"
              color="primary"
              title="Bekijk CV"
              onClick={(e) => {
                e.stopPropagation();
                window.open(candidate.cv_url, "_blank", "noopener,noreferrer");
              }}
            >
              <DescriptionIcon fontSize="small" />
            </IconButton>
          ) : (
            "-"
          );
        },
      },
      {
        field: "linkedin",
        headerName: "LinkedIn",
        width: 90,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => {
          const candidate = params.row as Contact;
          return candidate.linkedin_url ? (
            <IconButton
              size="small"
              color="primary"
              title="Open LinkedIn"
              onClick={(e) => {
                e.stopPropagation();
                window.open(
                  candidate.linkedin_url,
                  "_blank",
                  "noopener,noreferrer",
                );
              }}
            >
              <LinkedInIcon fontSize="small" />
            </IconButton>
          ) : (
            "-"
          );
        },
      },
    ],
    [formatDate, linkedCandidateUids, onToggleSelection, selectedCandidateUids],
  );

  return (
    <DataGrid
      rows={rows}
      columns={columns}
      getRowId={(row) => row.uid}
      onRowClick={(params, event) => {
        const target = event?.target as HTMLElement | null;
        if (target?.closest('input[type="checkbox"], button')) return;
        onToggleSelection((params.row as Contact).uid);
      }}
      getRowClassName={(params) =>
        linkedCandidateUids.has((params.row as Contact).uid)
          ? "linked-row"
          : ""
      }
      hideFooter
      disableColumnMenu
      density="compact"
      sx={{
        height: 400,
        "& .MuiDataGrid-cell": {
          display: "flex",
          alignItems: "center",
        },
        "& .linked-row": {
          backgroundColor: "rgba(25, 118, 210, 0.06)",
        },
      }}
    />
  );
}
