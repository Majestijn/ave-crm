import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Stack,
  Button,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  Chip,
  FormControl,
  InputLabel,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import type { User } from "../../../types/users";
import { useUpdateAssignment } from "../../../api/mutations/assignments";
import type { AssignmentWithDetails } from "./types";
import { benefitsOptions, formatNumberInput, parseFormattedNumber } from "./types";

type EditAssignmentDialogProps = {
  open: boolean;
  onClose: () => void;
  assignment: AssignmentWithDetails | null;
  users: User[];
};

export default function EditAssignmentDialog({
  open,
  onClose,
  assignment,
  users,
}: EditAssignmentDialogProps) {
  const updateMutation = useUpdateAssignment();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [recruiterUid, setRecruiterUid] = useState("");
  const [secondaryRecruiterUids, setSecondaryRecruiterUids] = useState<
    string[]
  >([]);
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [vacationDays, setVacationDays] = useState<number | "">("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [benefits, setBenefits] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assignment || !open) return;
    setTitle(assignment.title || "");
    setDescription(assignment.description || "");
    setRecruiterUid(assignment.recruiter?.uid || "");
    setSecondaryRecruiterUids(
      assignment.secondary_recruiters?.map((r) => r.uid) || [],
    );
    setSalaryMin(
      assignment.salary_min
        ? assignment.salary_min.toLocaleString("nl-NL")
        : "",
    );
    setSalaryMax(
      assignment.salary_max
        ? assignment.salary_max.toLocaleString("nl-NL")
        : "",
    );
    setVacationDays(assignment.vacation_days || "");
    setLocation(assignment.location || "");
    setEmploymentType(assignment.employment_type || "");
    setStartDate(assignment.start_date || "");
    setBenefits(assignment.benefits || []);
    setError(null);
  }, [assignment, open]);

  const handleClose = () => {
    onClose();
    setError(null);
  };

  const handleSave = async () => {
    if (!assignment?.uid) return;

    if (!title.trim()) {
      setError("Vul een titel in");
      return;
    }

    setError(null);

    try {
      await updateMutation.mutateAsync({
        uid: assignment.uid,
        data: {
          recruiter_uid: recruiterUid || null,
          secondary_recruiter_uids: secondaryRecruiterUids,
          title: title.trim(),
          description: description.trim() || null,
          salary_min: parseFormattedNumber(salaryMin) || null,
          salary_max: parseFormattedNumber(salaryMax) || null,
          vacation_days: vacationDays || null,
          location: location.trim() || null,
          employment_type: employmentType || null,
          start_date: startDate || null,
          benefits: benefits.length > 0 ? benefits : null,
        },
      });
      handleClose();
    } catch (err: any) {
      console.error("Error updating assignment:", err);
      setError(
        err?.response?.data?.message || "Er is iets misgegaan bij het opslaan",
      );
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Opdracht bewerken</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <TextField
            label="Titel"
            required
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={!title.trim() && !!error}
          />

          <TextField
            label="Omschrijving"
            fullWidth
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <FormControl fullWidth>
            <InputLabel>Lead Recruiter</InputLabel>
            <Select
              value={recruiterUid}
              onChange={(e) => setRecruiterUid(e.target.value)}
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
              value={secondaryRecruiterUids}
              onChange={(e) =>
                setSecondaryRecruiterUids(
                  typeof e.target.value === "string"
                    ? e.target.value.split(",")
                    : (e.target.value as string[]),
                )
              }
              label="Secundaire Recruiters"
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {(selected as string[]).map((uid) => {
                    const user = users.find((u) => u.uid === uid);
                    return (
                      <Chip
                        key={uid}
                        label={user?.name || uid}
                        size="small"
                      />
                    );
                  })}
                </Box>
              )}
            >
              {users
                .filter((u) => u.uid !== recruiterUid)
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
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <FormControl fullWidth>
              <InputLabel>Dienstverband</InputLabel>
              <Select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
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
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 200 }}
            />
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              label="Jaarsalaris min"
              fullWidth
              value={salaryMin}
              onChange={(e) => setSalaryMin(formatNumberInput(e.target.value))}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">€</InputAdornment>
                ),
              }}
              placeholder="bijv. 48.000"
            />
            <TextField
              label="Jaarsalaris max"
              fullWidth
              value={salaryMax}
              onChange={(e) => setSalaryMax(formatNumberInput(e.target.value))}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">€</InputAdornment>
                ),
              }}
              placeholder="bijv. 60.000"
            />
          </Stack>
          <TextField
            label="Vakantiedagen"
            type="number"
            value={vacationDays}
            onChange={(e) =>
              setVacationDays(e.target.value ? parseInt(e.target.value) : "")
            }
            InputProps={{ inputProps: { min: 0, max: 100 } }}
            sx={{ width: 160 }}
          />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Arbeidsvoorwaarden
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {benefitsOptions.map((benefit) => {
                const isSelected = benefits.includes(benefit);
                return (
                  <Chip
                    key={benefit}
                    label={benefit}
                    size="small"
                    variant={isSelected ? "filled" : "outlined"}
                    color={isSelected ? "primary" : "default"}
                    onClick={() => {
                      if (isSelected) {
                        setBenefits(benefits.filter((b) => b !== benefit));
                      } else {
                        setBenefits([...benefits, benefit]);
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

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={updateMutation.isPending}>
          Annuleren
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? "Bezig..." : "Opslaan"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
