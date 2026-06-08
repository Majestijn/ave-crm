import React from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  Link,
  Menu,
  MenuItem,
  Collapse,
  Tooltip,
  IconButton,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Edit as EditIcon,
  DeleteOutline as DeleteOutlineIcon,
  SwapVert as SwapVertIcon,
} from "@mui/icons-material";
import type { CandidateAssignment } from "../../../api/queries/assignments";
import type { AssignmentWithDetails } from "./types";
import {
  getStatusColor,
  candidateStatusOptions,
  getCandidateStatusColor,
  formatFeeSummary,
  formatAssignmentDateSummary,
} from "./types";
import { AssignmentCandidatesLoader } from "./AssignmentExpandedContent";
import AssignmentExpandedContent from "./AssignmentExpandedContent";

type AssignmentCardProps = {
  assignment: AssignmentWithDetails;
  currentStatus: string;
  statusLabel: string;
  // DB-driven assignment_status options (parent resolves these); the status
  // menu must use these, not a hardcoded list, or it sends invalid values.
  // `color` is the optional per-status color configured on the dropdown option.
  statusOptions: { value: string; label: string; color?: string | null }[];
  isExpanded: boolean;
  assignmentCandidates: CandidateAssignment[];
  expandedNotesImages: Set<number>;
  candidatesColumnOrder: string[];
  candidateStatusMenuAnchor: Record<string, HTMLElement | null>;
  statusMenuAnchorEl: HTMLElement | null;
  onToggleExpanded: (id: number) => void;
  onToggleNotesImageExpanded: (id: number) => void;
  onOpenEditDialog: (assignment: AssignmentWithDetails) => void;
  onDeleteAssignment: (assignment: AssignmentWithDetails) => void;
  onStatusMenuOpen: (id: number, e: React.MouseEvent<HTMLElement>) => void;
  onStatusMenuClose: (id: number) => void;
  onStatusChange: (id: number, status: string) => void;
  onOpenColumnOrderDialog: () => void;
  onOpenAddCandidateDialog: (id: number) => void;
  onColumnOrderChange: (order: string[]) => void;
  onCandidateStatusMenuOpen: (
    assignmentId: number,
    candidateId: number,
    e: React.MouseEvent<HTMLElement>,
  ) => void;
  onCandidateStatusMenuClose: (
    assignmentId: number,
    candidateId: number,
  ) => void;
  onCandidateStatusChange: (
    assignmentId: number,
    candidateId: number,
    status: CandidateAssignment["status"],
  ) => void;
  onRemoveCandidate: (assignmentId: number, candidateId: number) => void;
  onNavigateToContact: (uid: string) => void;
  onNavigateToAccount: (uid: string) => void;
  onCandidatesLoaded: (id: number, candidates: CandidateAssignment[]) => void;
};

const AssignmentCard = React.memo(function AssignmentCard({
  assignment,
  currentStatus,
  statusLabel,
  statusOptions,
  isExpanded,
  assignmentCandidates,
  expandedNotesImages,
  candidatesColumnOrder,
  candidateStatusMenuAnchor,
  statusMenuAnchorEl,
  onToggleExpanded,
  onToggleNotesImageExpanded,
  onOpenEditDialog,
  onDeleteAssignment,
  onStatusMenuOpen,
  onStatusMenuClose,
  onStatusChange,
  onOpenColumnOrderDialog,
  onOpenAddCandidateDialog,
  onColumnOrderChange,
  onCandidateStatusMenuOpen,
  onCandidateStatusMenuClose,
  onCandidateStatusChange,
  onRemoveCandidate,
  onNavigateToContact,
  onNavigateToAccount,
  onCandidatesLoaded,
}: AssignmentCardProps) {
  const feeSummary = formatFeeSummary(
    assignment.total_fee,
    assignment.advance_fee,
  );
  const dateSummary = formatAssignmentDateSummary(
    assignment.start_date,
    assignment.end_date,
  );

  // Prefer a per-status color configured on the dropdown option; fall back to
  // the semantic default mapping (getStatusColor) when none is set.
  const dbStatusColor =
    statusOptions.find((o) => o.value === currentStatus)?.color || undefined;

  return (
    <React.Fragment>
      <AssignmentCandidatesLoader
        assignmentId={assignment.id}
        assignmentUid={assignment.uid}
        onCandidatesLoaded={onCandidatesLoaded}
      />
      <Paper
        sx={{
          p: 2,
          transition: "box-shadow 0.2s ease",
          "&:hover": { boxShadow: 3 },
        }}
      >
        {/* Collapsed header */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          onClick={() => onToggleExpanded(assignment.id)}
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
                if (assignment.account?.uid) {
                  onNavigateToAccount(assignment.account.uid);
                }
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
              <Typography
                variant="caption"
                display="block"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Lead: {assignment.recruiter.name}
                {assignment.secondary_recruiters &&
                  assignment.secondary_recruiters.length > 0 && (
                    <>
                      {" "}
                      | Team:{" "}
                      {assignment.secondary_recruiters
                        .map((r) => r.name)
                        .join(", ")}
                    </>
                  )}
              </Typography>
            )}
            {dateSummary && (
              <Typography
                variant="caption"
                display="block"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                {dateSummary}
              </Typography>
            )}
            {feeSummary && (
              <Typography
                variant="caption"
                display="block"
                color="text.secondary"
                sx={{ mt: 0.5, fontWeight: 500 }}
              >
                {feeSummary}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={2} alignItems="center">
            {/* Status button first: its width varies per status, so keeping the
                fixed-width action icons to its right keeps them vertically
                aligned across cards. */}
            <Tooltip title={statusLabel}>
              <Button
                variant="contained"
                color={dbStatusColor ? "inherit" : getStatusColor(currentStatus)}
                endIcon={<SwapVertIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusMenuOpen(assignment.id, e);
                }}
                sx={{
                  width: 220,
                  flexShrink: 0,
                  justifyContent: "space-between",
                  "& .MuiButton-endIcon": { ml: 1, flexShrink: 0 },
                  ...(dbStatusColor && {
                    bgcolor: dbStatusColor,
                    color: "#fff",
                    "&:hover": { bgcolor: dbStatusColor, filter: "brightness(0.92)" },
                  }),
                }}
              >
                <Box
                  component="span"
                  sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    minWidth: 0,
                  }}
                >
                  {statusLabel}
                </Box>
              </Button>
            </Tooltip>
            <Menu
              anchorEl={statusMenuAnchorEl}
              open={Boolean(statusMenuAnchorEl)}
              onClose={() => onStatusMenuClose(assignment.id)}
            >
              {statusOptions.map((option) => (
                <MenuItem
                  key={option.value}
                  onClick={() => onStatusChange(assignment.id, option.value)}
                  selected={currentStatus === option.value}
                >
                  {option.label}
                </MenuItem>
              ))}
            </Menu>
            <Tooltip title="Bewerk opdracht">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenEditDialog(assignment);
                }}
                sx={{ color: "text.secondary" }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Verwijder opdracht">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteAssignment(assignment);
                }}
                sx={{ color: "text.secondary", "&:hover": { color: "error.main" } }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </Stack>
        </Stack>

        {/* Expanded content */}
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <AssignmentExpandedContent
            assignment={assignment}
            assignmentCandidates={assignmentCandidates}
            expandedNotesImages={expandedNotesImages}
            onToggleNotesImageExpanded={onToggleNotesImageExpanded}
            onOpenColumnOrderDialog={onOpenColumnOrderDialog}
            onOpenAddCandidateDialog={onOpenAddCandidateDialog}
            candidatesColumnOrder={candidatesColumnOrder}
            onColumnOrderChange={onColumnOrderChange}
            onStatusMenuOpen={onCandidateStatusMenuOpen}
            onStatusMenuClose={onCandidateStatusMenuClose}
            onStatusChange={onCandidateStatusChange}
            onRemoveCandidate={onRemoveCandidate}
            onNavigateToContact={onNavigateToContact}
            candidateStatusMenuAnchor={candidateStatusMenuAnchor}
            candidateStatusOptions={candidateStatusOptions}
            getCandidateStatusColor={getCandidateStatusColor}
          />
        </Collapse>
      </Paper>
    </React.Fragment>
  );
});

export default AssignmentCard;
