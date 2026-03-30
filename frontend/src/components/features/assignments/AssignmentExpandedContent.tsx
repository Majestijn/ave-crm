import React from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  Chip,
  Collapse,
  Tooltip,
  IconButton,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Add as AddIcon,
  ViewColumn as ViewColumnIcon,
} from "@mui/icons-material";
import type { CandidateAssignment } from "../../../api/queries/assignments";
import { useAssignmentCandidates } from "../../../api/queries/assignments";
import type { AssignmentWithDetails } from "./types";
import AssignmentCandidatesDataGrid from "./AssignmentCandidatesDataGrid";

export const AssignmentCandidatesLoader = React.memo(
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

      const candidatesJson = JSON.stringify(candidates);
      if (candidatesJson !== prevCandidatesRef.current) {
        prevCandidatesRef.current = candidatesJson;
        onCandidatesLoaded(assignmentId, candidates as CandidateAssignment[]);
      }
    }, [assignmentId, candidates, assignmentUid, onCandidatesLoaded]);

    return null;
  },
);

type AssignmentExpandedContentProps = {
  assignment: AssignmentWithDetails;
  assignmentCandidates: CandidateAssignment[];
  expandedNotesImages: Set<number>;
  onToggleNotesImageExpanded: (assignmentId: number) => void;
  onOpenColumnOrderDialog: () => void;
  onOpenAddCandidateDialog: (assignmentId: number) => void;
  candidatesColumnOrder: string[];
  onColumnOrderChange: (order: string[]) => void;
  onStatusMenuOpen: (
    assignmentId: number,
    candidateId: number,
    anchor: React.MouseEvent<HTMLElement>,
  ) => void;
  onStatusMenuClose: (assignmentId: number, candidateId: number) => void;
  onStatusChange: (
    assignmentId: number,
    candidateId: number,
    nextStatus: CandidateAssignment["status"],
  ) => void;
  onRemoveCandidate: (assignmentId: number, candidateId: number) => void;
  onNavigateToContact: (uid: string) => void;
  candidateStatusMenuAnchor: Record<string, HTMLElement | null>;
  candidateStatusOptions: Array<{
    value: CandidateAssignment["status"];
    label: string;
  }>;
  getCandidateStatusColor: (
    status: CandidateAssignment["status"],
  ) => string;
};

const AssignmentExpandedContent = React.memo(
  function AssignmentExpandedContent({
    assignment,
    assignmentCandidates,
    expandedNotesImages,
    onToggleNotesImageExpanded,
    onOpenColumnOrderDialog,
    onOpenAddCandidateDialog,
    candidatesColumnOrder,
    onColumnOrderChange,
    onStatusMenuOpen,
    onStatusMenuClose,
    onStatusChange,
    onRemoveCandidate,
    onNavigateToContact,
    candidateStatusMenuAnchor,
    candidateStatusOptions,
    getCandidateStatusColor,
  }: AssignmentExpandedContentProps) {
    return (
      <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: "divider" }}>
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
                  <Typography variant="caption" color="text.secondary">
                    Dienstverband
                  </Typography>
                  <Typography variant="body2">
                    {assignment.employment_type}
                  </Typography>
                </Box>
              )}
              {(assignment.salary_min || assignment.salary_max) && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
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
                  <Typography variant="caption" color="text.secondary">
                    Vakantiedagen
                  </Typography>
                  <Typography variant="body2">
                    {assignment.vacation_days} dagen
                  </Typography>
                </Box>
              )}
              {assignment.bonus_percentage != null && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Bonusregeling
                  </Typography>
                  <Typography variant="body2">
                    {Number(assignment.bonus_percentage).toLocaleString(
                      "nl-NL",
                      {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      },
                    )}
                    %
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>

          {assignment.benefits && assignment.benefits.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 1, display: "block" }}
              >
                Arbeidsvoorwaarden
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
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

          {assignment.notes_image_url && (
            <Box>
              <Box
                onClick={() => onToggleNotesImageExpanded(assignment.id)}
                sx={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 1.5,
                  "&:hover": { bgcolor: "action.hover" },
                  p: 0.5,
                  borderRadius: 1,
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
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
                      window.open(assignment.notes_image_url!, "_blank")
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

          <Box>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 1.5 }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Kandidaten
              </Typography>
              <Stack direction="row" spacing={1}>
                <Tooltip title="Kolomvolgorde">
                  <IconButton size="small" onClick={onOpenColumnOrderDialog}>
                    <ViewColumnIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => onOpenAddCandidateDialog(assignment.id)}
                >
                  Kandidaat toevoegen
                </Button>
              </Stack>
            </Stack>
            {assignmentCandidates && assignmentCandidates.length > 0 ? (
              <Paper
                elevation={0}
                variant="outlined"
                sx={{
                  height: "calc(100vh - 200px)",
                  width: "100%",
                  overflow: "hidden",
                }}
              >
                <AssignmentCandidatesDataGrid
                  assignmentId={assignment.id}
                  candidates={assignmentCandidates}
                  columnOrder={candidatesColumnOrder}
                  onColumnOrderChange={onColumnOrderChange}
                  onStatusMenuOpen={onStatusMenuOpen}
                  onStatusMenuClose={onStatusMenuClose}
                  onStatusChange={onStatusChange}
                  onRemove={onRemoveCandidate}
                  onNavigateToContact={onNavigateToContact}
                  candidateStatusMenuAnchor={candidateStatusMenuAnchor}
                  candidateStatusOptions={candidateStatusOptions}
                  getCandidateStatusColor={getCandidateStatusColor}
                />
              </Paper>
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ py: 2, textAlign: "center" }}
              >
                Geen kandidaten toegevoegd. Klik op &quot;Kandidaat
                toevoegen&quot; om te beginnen.
              </Typography>
            )}
          </Box>
        </Stack>
      </Box>
    );
  },
);

export default AssignmentExpandedContent;
