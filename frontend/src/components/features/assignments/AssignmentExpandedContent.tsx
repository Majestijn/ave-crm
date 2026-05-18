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
import mammoth from "mammoth";
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
    const [wordHtml, setWordHtml] = React.useState<string | null>(null);
    const [wordLoading, setWordLoading] = React.useState(false);
    const [wordError, setWordError] = React.useState<string | null>(null);

    React.useEffect(() => {
      let isCancelled = false;

      const loadWordInline = async () => {
        if (
          assignment.role_profile_kind !== "word" ||
          !assignment.role_profile_download_url
        ) {
          setWordHtml(null);
          setWordError(null);
          setWordLoading(false);
          return;
        }

        setWordLoading(true);
        setWordError(null);
        setWordHtml(null);

        try {
          const res = await fetch(
            `${assignment.role_profile_download_url}?disposition=attachment`,
          );
          if (!res.ok) {
            throw new Error(`Download mislukt (${res.status})`);
          }

          const arrayBuffer = await res.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });

          if (!isCancelled) {
            setWordHtml(result.value || "<p><em>Geen inhoud gevonden.</em></p>");
          }
        } catch (error) {
          if (!isCancelled) {
            const message =
              error instanceof Error
                ? error.message
                : "Kon Word-document niet inline laden.";
            setWordError(message);
          }
        } finally {
          if (!isCancelled) {
            setWordLoading(false);
          }
        }
      };

      loadWordInline();

      return () => {
        isCancelled = true;
      };
    }, [assignment.role_profile_kind, assignment.role_profile_download_url]);

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
              {assignment.start_date && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Startdatum
                  </Typography>
                  <Typography variant="body2">
                    {new Date(assignment.start_date).toLocaleDateString("nl-NL")}
                  </Typography>
                </Box>
              )}
              {assignment.end_date && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Einddatum
                  </Typography>
                  <Typography variant="body2">
                    {new Date(assignment.end_date).toLocaleDateString("nl-NL")}
                  </Typography>
                </Box>
              )}
              {(assignment.hours_per_week_min != null ||
                assignment.hours_per_week_max != null) && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Werkuren per week
                  </Typography>
                  <Typography variant="body2">
                    {assignment.hours_per_week_min != null &&
                    assignment.hours_per_week_max != null
                      ? `${assignment.hours_per_week_min} - ${assignment.hours_per_week_max} uur`
                      : assignment.hours_per_week_min != null
                        ? `vanaf ${assignment.hours_per_week_min} uur`
                        : `tot ${assignment.hours_per_week_max} uur`}
                  </Typography>
                </Box>
              )}
              {(assignment.total_fee != null || assignment.advance_fee != null) && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Fee
                  </Typography>
                  <Typography variant="body2">
                    {assignment.total_fee != null && (
                      <>Totale fee: €{assignment.total_fee.toLocaleString("nl-NL")}</>
                    )}
                    {assignment.total_fee != null &&
                      assignment.advance_fee != null &&
                      " · "}
                    {assignment.advance_fee != null && (
                      <>Voorfee: €{assignment.advance_fee.toLocaleString("nl-NL")}</>
                    )}
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

          {(assignment.role_profile_url || assignment.role_profile_download_url) && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Rolprofiel
              </Typography>
              {/*
                Prefer same-origin proxy URL for inline rendering to avoid R2 CORS.
                Fall back to the signed R2 URL for direct download/open.
              */}
              {(() => {
                const viewUrl =
                  assignment.role_profile_download_url ??
                  assignment.role_profile_url!;
                const downloadUrl =
                  assignment.role_profile_download_url ??
                  assignment.role_profile_url!;

                return assignment.role_profile_kind === "pdf" ? (
                  <>
                    <Box
                      sx={{
                        width: "100%",
                        maxWidth: 900,
                        height: 480,
                        borderRadius: 1,
                        overflow: "hidden",
                        border: 1,
                        borderColor: "divider",
                        bgcolor: "grey.100",
                      }}
                    >
                      <iframe
                        title="Rolprofiel PDF"
                        src={
                          assignment.role_profile_download_url
                            ? `${viewUrl}?disposition=inline`
                            : viewUrl
                        }
                        style={{
                          width: "100%",
                          height: "100%",
                          border: "none",
                        }}
                      />
                    </Box>
                    <Button
                      size="small"
                      sx={{ mt: 1 }}
                      href={
                        assignment.role_profile_download_url
                          ? `${viewUrl}?disposition=inline`
                          : viewUrl
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Openen in nieuw tabblad
                    </Button>
                  </>
                ) : (
                  <Stack spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                      {assignment.role_profile_original_filename ||
                        "Word-document"}
                    </Typography>
                    {wordLoading && (
                      <Typography variant="body2" color="text.secondary">
                        Word-document laden...
                      </Typography>
                    )}
                    {!wordLoading && wordError && (
                      <Typography variant="body2" color="error.main">
                        {wordError}
                      </Typography>
                    )}
                    {!wordLoading && !wordError && wordHtml && (
                      <Box
                        sx={{
                          maxWidth: 900,
                          maxHeight: 520,
                          overflow: "auto",
                          p: 2,
                          border: 1,
                          borderColor: "divider",
                          borderRadius: 1,
                          bgcolor: "background.paper",
                          "& p": { mt: 0, mb: 1.25 },
                          "& h1, & h2, & h3": { mt: 0.5, mb: 1 },
                          "& ul, & ol": { pl: 2.5, my: 0.5 },
                        }}
                        dangerouslySetInnerHTML={{ __html: wordHtml }}
                      />
                    )}
                    <Button
                      variant="outlined"
                      size="small"
                      href={
                        assignment.role_profile_download_url
                          ? `${downloadUrl}?disposition=attachment`
                          : downloadUrl
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Downloaden / openen
                    </Button>
                  </Stack>
                );
              })()}
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
