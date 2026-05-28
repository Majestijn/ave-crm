import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from "@mui/material";
import API from "../../api/client";
import { useAssignments, type AssignmentFromAPI } from "../../api/queries/assignments";

/** Opdrachten die niet als afgesloten worden beschouwd (voltooid / geannuleerd). */
const CLOSED_ASSIGNMENT_STATUSES = new Set(["completed", "cancelled"]);

function isOngoingAssignment(a: AssignmentFromAPI): boolean {
  return !CLOSED_ASSIGNMENT_STATUSES.has(a.status);
}

function formatAssignmentLabel(a: AssignmentFromAPI): string {
  const client = a.account?.name?.trim() || "Klant";
  return `${a.title} — ${client}`;
}

export type LinkedInImportSuccess = {
  message: string;
  contact: { uid: string; name?: string; first_name?: string; last_name?: string };
  assignment?: { uid: string; title: string } | null;
};

interface LinkedInImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (result: LinkedInImportSuccess) => void;
}

export default function LinkedInImportDialog({
  open,
  onClose,
  onSuccess,
}: LinkedInImportDialogProps) {
  const [profileText, setProfileText] = useState("");
  const [assignmentUid, setAssignmentUid] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateHint, setDuplicateHint] = useState<string | null>(null);

  const { data: assignments = [], isLoading: assignmentsLoading } = useAssignments();

  const ongoingAssignments = useMemo(
    () => assignments.filter(isOngoingAssignment).sort((a, b) => a.title.localeCompare(b.title, "nl")),
    [assignments]
  );

  useEffect(() => {
    if (!open) {
      setProfileText("");
      setAssignmentUid("");
      setError(null);
      setDuplicateHint(null);
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    const trimmed = profileText.trim();
    if (trimmed.length < 30) {
      setError("Plak minstens een korte profieltekst (minimaal 30 tekens). Gebruik Ctrl+A op LinkedIn en plak hier.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setDuplicateHint(null);

    try {
      const payload: {
        profile_text: string;
        assignment_uid?: string | null;
        linkedin_url?: string | null;
      } = {
        profile_text: trimmed,
      };
      if (assignmentUid) {
        payload.assignment_uid = assignmentUid;
      }

      const result = (await API.post("/linkedin-import", payload)) as LinkedInImportSuccess & {
        duplicate_contact?: { uid: string; name: string };
      };

      onSuccess?.(result);
      onClose();
    } catch (err: unknown) {
      const ax = err as {
        response?: {
          status?: number;
          data?: { message?: string; duplicate_contact?: { uid: string; name: string } };
        };
      };
      const status = ax.response?.status;
      const data = ax.response?.data;
      setError(data?.message ?? "Importeren mislukt. Probeer het opnieuw of controleer de Google Cloud-configuratie.");
      if (status === 409 && data?.duplicate_contact) {
        setDuplicateHint(
          `Bestaand contact: ${data.duplicate_contact.name} (uid: ${data.duplicate_contact.uid})`
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>LinkedIn-import</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            Ga naar een LinkedIn-profiel, selecteer alles met Ctrl+A, kopieer met Ctrl+C, en plak de volledige
            paginatekst hieronder met Ctrl+V. De tekst wordt via Gemini geanalyseerd; er wordt een netwerkcontact
            aangemaakt. Optioneel koppel je direct aan een lopende opdracht.
          </Typography>

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
              {duplicateHint && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {duplicateHint}
                </Typography>
              )}
            </Alert>
          )}

          <TextField
            label="Profieltekst van LinkedIn"
            value={profileText}
            onChange={(e) => setProfileText(e.target.value)}
            multiline
            minRows={12}
            maxRows={24}
            fullWidth
            placeholder="Plak hier de volledige paginatekst…"
            disabled={submitting}
            inputProps={{ maxLength: 50000 }}
            helperText={`${profileText.length.toLocaleString("nl-NL")} / 50.000 tekens`}
          />

          <FormControl fullWidth disabled={submitting || assignmentsLoading}>
            <InputLabel id="linkedin-import-assignment-label">Opdracht (optioneel)</InputLabel>
            <Select
              labelId="linkedin-import-assignment-label"
              label="Opdracht (optioneel)"
              value={assignmentUid}
              onChange={(e) => setAssignmentUid(e.target.value as string)}
            >
              <MenuItem value="">
                <em>Geen — alleen contact aanmaken</em>
              </MenuItem>
              {ongoingAssignments.map((a) => (
                <MenuItem key={a.uid} value={a.uid}>
                  {formatAssignmentLabel(a)}
                </MenuItem>
              ))}
            </Select>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              Toont opdrachten die niet op voltooid of geannuleerd staan.
            </Typography>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Annuleren
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || profileText.trim().length < 30}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          {submitting ? "Bezig met importeren…" : "Importeren"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
