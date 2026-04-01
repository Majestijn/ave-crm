import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Autocomplete,
  Alert,
} from "@mui/material";
import type { Contact } from "../../types/contacts";
import type { ActivityType } from "../../api/queries/activities";
import { useCreateActivity } from "../../api/mutations/activities";
import { formatContactName } from "../../utils/formatters";
import { primaryButtonSx } from "./styles";
import { useDropdownOptions } from "../../api/queries/dropdownOptions";
import { buildAllowedValueSet } from "../../utils/dropdownValidation";

const ACTIVITY_TYPE_FALLBACK = [
  "call",
  "proposal",
  "interview",
  "hired",
  "rejected",
  "personality_test",
  "test",
  "interview_training",
] as const;

type Props = {
  open: boolean;
  onClose: () => void;
  assignmentUid: string;
  contacts: Contact[];
};

export default function AddActivityDialog({
  open,
  onClose,
  assignmentUid,
  contacts,
}: Props) {
  const [activityType, setActivityType] = useState<ActivityType>("call");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createActivityMutation = useCreateActivity(assignmentUid);
  const { data: dbActivityTypes } = useDropdownOptions("activity_type");

  const activeActivityTypes = React.useMemo(() => {
    if (dbActivityTypes) return dbActivityTypes.filter(o => o.is_active);
    return [
      { value: "call", label: "Gebeld" },
      { value: "proposal", label: "Voorgesteld" },
      { value: "interview", label: "Gesprek" },
      { value: "hired", label: "Aangenomen" },
      { value: "rejected", label: "Afgewezen" },
      { value: "personality_test", label: "Persoonlijkheidstest afgenomen" },
      { value: "test", label: "Test afgenomen" },
      { value: "interview_training", label: "Sollicitatie training" },
    ];
  }, [dbActivityTypes]);

  const allowedActivityTypeSet = React.useMemo(
    () => buildAllowedValueSet(dbActivityTypes, [...ACTIVITY_TYPE_FALLBACK]),
    [dbActivityTypes]
  );

  // Keep selected type valid when dropdown options load or change
  useEffect(() => {
    if (activeActivityTypes.length === 0) return;
    const values = activeActivityTypes.map((o) => o.value);
    if (!values.includes(activityType)) {
      setActivityType(values[0] as ActivityType);
    }
  }, [activeActivityTypes, activityType]);

  // Auto-fill description based on type and contact
  useEffect(() => {
    if (!selectedContact) return;

    const contactName = formatContactName(selectedContact);
    let template = "";

    switch (activityType) {
      case "call":
        template = `Gebeld met ${contactName}`;
        break;
      case "proposal":
        template = `${contactName} voorgesteld`;
        break;
      case "interview":
        template = `Gesprek met ${contactName}`;
        break;
      case "hired":
        template = `${contactName} aangenomen`;
        break;
      case "rejected":
        template = `${contactName} afgewezen`;
        break;
      case "personality_test":
        template = `Persoonlijkheidstest afgenomen met ${contactName}`;
        break;
      case "test":
        template = `Test afgenomen met ${contactName}`;
        break;
      case "interview_training":
        template = `Sollicitatie training met ${contactName}`;
        break;
      default:
        template = "";
    }

    setDescription(template);
  }, [activityType, selectedContact]);

  const handleSubmit = async () => {
    setError(null);

    if (!allowedActivityTypeSet.has(activityType)) {
      setError("Selecteer een geldig activiteitstype uit de lijst.");
      return;
    }

    try {
      await createActivityMutation.mutateAsync({
        type: activityType,
        description,
        date,
        contact_uid: selectedContact?.uid,
      });

      // Reset form and close dialog
      handleClose();
    } catch (err: any) {
      console.error("Error saving activity:", err);
      setError(err?.response?.data?.message || "Er is iets misgegaan");
    }
  };

  const handleClose = () => {
    setDescription("");
    setActivityType("call");
    setDate(new Date().toISOString().split("T")[0]);
    setSelectedContact(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Nieuwe activiteit toevoegen</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>Type activiteit</InputLabel>
            <Select
              value={activityType}
              label="Type activiteit"
              onChange={(e) => setActivityType(e.target.value as ActivityType)}
            >
              {activeActivityTypes.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Autocomplete
            options={contacts}
            getOptionLabel={(option) => formatContactName(option)}
            value={selectedContact}
            onChange={(_, newValue) => setSelectedContact(newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Kandidaat (optioneel)" />
            )}
          />

          <TextField
            fullWidth
            label="Datum"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <TextField
            fullWidth
            label="Omschrijving"
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose} disabled={createActivityMutation.isPending}>
          Annuleren
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!description || createActivityMutation.isPending}
          sx={primaryButtonSx}
        >
          {createActivityMutation.isPending ? "Bezig..." : "Toevoegen"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

