import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DescriptionIcon from "@mui/icons-material/Description";

import type { Account } from "../../../types/accounts";
import type { User } from "../../../types/users";
import { useCreateAssignment } from "../../../api/mutations/assignments";
import { useDropdownOptions } from "../../../api/queries/dropdownOptions";
import { buildAllowedValueSet } from "../../../utils/dropdownValidation";
import { benefitsOptions as defaultBenefitsOptions } from "./types";

const EMPLOYMENT_TYPE_FALLBACK = [
  "Fulltime",
  "Parttime",
  "Freelance",
  "Interim",
] as const;

const ROLE_PROFILE_MAX_BYTES = 15 * 1024 * 1024;

type CreateAssignmentDialogProps = {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
  users: User[];
};

// Helper function to format number with thousand separators (Dutch format)
const formatNumberInput = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return parseInt(digits, 10).toLocaleString("nl-NL");
};

// Helper function to parse formatted number back to integer
const parseFormattedNumber = (value: string): number | "" => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return parseInt(digits, 10);
};

export default function CreateAssignmentDialog({
  open,
  onClose,
  accounts,
  users,
}: CreateAssignmentDialogProps) {
  const createAssignmentMutation = useCreateAssignment();

  const { data: dbBenefitsOptions } = useDropdownOptions("benefit");
  const { data: dbEmploymentTypeOptions } = useDropdownOptions("employment_type");

  const activeBenefits = React.useMemo(() => {
    if (dbBenefitsOptions) return dbBenefitsOptions.filter(o => o.is_active).map(o => o.value);
    return defaultBenefitsOptions;
  }, [dbBenefitsOptions]);

  const activeEmploymentTypes = React.useMemo(() => {
    if (dbEmploymentTypeOptions) {
      return dbEmploymentTypeOptions.filter(o => o.is_active).map(o => ({ value: o.value, label: o.label }));
    }
    return [
      { value: "Fulltime", label: "Fulltime" },
      { value: "Parttime", label: "Parttime" },
      { value: "Freelance", label: "Freelance" },
      { value: "Interim", label: "Interim" },
    ];
  }, [dbEmploymentTypeOptions]);

  const allowedEmploymentSet = React.useMemo(
    () => buildAllowedValueSet(dbEmploymentTypeOptions, [...EMPLOYMENT_TYPE_FALLBACK]),
    [dbEmploymentTypeOptions]
  );

  const allowedBenefitsSet = React.useMemo(
    () => buildAllowedValueSet(dbBenefitsOptions, defaultBenefitsOptions),
    [dbBenefitsOptions]
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [accountUid, setAccountUid] = useState("");
  const [recruiterUid, setRecruiterUid] = useState("");
  const [secondaryRecruiterUids, setSecondaryRecruiterUids] = useState<
    string[]
  >([]);
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [vacationDays, setVacationDays] = useState<number | "">("");
  const [bonusPercentage, setBonusPercentage] = useState<number | "">("");
  const [totalFee, setTotalFee] = useState("");
  const [advanceFee, setAdvanceFee] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [hoursPerWeekMin, setHoursPerWeekMin] = useState<number | "">("");
  const [hoursPerWeekMax, setHoursPerWeekMax] = useState<number | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [benefits, setBenefits] = useState<string[]>([]);
  const [notesImageFile, setNotesImageFile] = useState<File | null>(null);
  const [notesImagePreview, setNotesImagePreview] = useState<string | null>(
    null
  );
  const [roleProfileFile, setRoleProfileFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedSecondaryRecruiters = useMemo(() => {
    // Ensure recruiter isn't duplicated in secondary selection
    const recruiter = recruiterUid || "";
    return secondaryRecruiterUids.filter((uid) => uid !== recruiter);
  }, [recruiterUid, secondaryRecruiterUids]);

  // Reset dialog state when opening/closing.
  useEffect(() => {
    if (!open) {
      if (notesImagePreview) URL.revokeObjectURL(notesImagePreview);
      setTitle("");
      setDescription("");
      setAccountUid("");
      setRecruiterUid("");
      setSecondaryRecruiterUids([]);
      setSalaryMin("");
      setSalaryMax("");
      setVacationDays("");
      setBonusPercentage("");
      setTotalFee("");
      setAdvanceFee("");
      setLocation("");
      setEmploymentType("");
      setHoursPerWeekMin("");
      setHoursPerWeekMax("");
      setStartDate("");
      setEndDate("");
      setBenefits([]);
      setNotesImageFile(null);
      setNotesImagePreview(null);
      setRoleProfileFile(null);
      setError(null);
      return;
    }

    // When opening: start clean (in case it was previously open)
    setError(null);
    // (Do not revoke preview here; preview is cleared on close)
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNotesImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Selecteer een afbeelding (JPG, PNG, etc.)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Afbeelding mag maximaal 5MB zijn");
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setNotesImagePreview(previewUrl);
    setNotesImageFile(file);
    setError(null);
  };

  const handleClearNotesImage = () => {
    setNotesImageFile(null);
    if (notesImagePreview) URL.revokeObjectURL(notesImagePreview);
    setNotesImagePreview(null);
  };

  const handleRoleProfileUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const ext = file.name.toLowerCase().split(".").pop();
    const allowed = ["pdf", "doc", "docx"];
    if (!ext || !allowed.includes(ext)) {
      setError("Alleen PDF of Word (.doc, .docx) zijn toegestaan voor het rolprofiel.");
      return;
    }

    if (file.size > ROLE_PROFILE_MAX_BYTES) {
      setError("Rolprofiel mag maximaal 15 MB zijn.");
      return;
    }

    setRoleProfileFile(file);
    setError(null);
  };

  const handleCreateAssignment = async () => {
    if (!accountUid) {
      setError("Selecteer een klant");
      return;
    }
    if (!title.trim()) {
      setError("Vul een titel in");
      return;
    }

    if (employmentType && !allowedEmploymentSet.has(employmentType)) {
      setError("Selecteer een geldig dienstverband uit de lijst.");
      return;
    }

    if (benefits.some((b) => !allowedBenefitsSet.has(b))) {
      setError(
        "Een of meer arbeidsvoorwaarden zijn ongeldig. Kies opties uit de lijst."
      );
      return;
    }

    if (
      hoursPerWeekMin !== "" &&
      hoursPerWeekMax !== "" &&
      hoursPerWeekMin > hoursPerWeekMax
    ) {
      setError(
        "Het minimum aantal werkuren per week mag niet hoger zijn dan het maximum."
      );
      return;
    }

    if (startDate && endDate && endDate < startDate) {
      setError("De einddatum mag niet vóór de startdatum liggen.");
      return;
    }

    const parsedTotalFee = parseFormattedNumber(totalFee);
    const parsedAdvanceFee = parseFormattedNumber(advanceFee);
    if (
      parsedTotalFee !== "" &&
      parsedAdvanceFee !== "" &&
      parsedAdvanceFee > parsedTotalFee
    ) {
      setError("De voorfee mag niet hoger zijn dan de totale fee.");
      return;
    }

    setError(null);

    const parsedSalaryMin = parseFormattedNumber(salaryMin);
    const parsedSalaryMax = parseFormattedNumber(salaryMax);

    try {
      await createAssignmentMutation.mutateAsync({
        account_uid: accountUid,
        recruiter_uid: recruiterUid || null,
        secondary_recruiter_uids:
          selectedSecondaryRecruiters.length > 0
            ? selectedSecondaryRecruiters
            : undefined,
        title: title.trim(),
        description: description.trim() || null,
        salary_min: parsedSalaryMin === "" ? null : parsedSalaryMin,
        salary_max: parsedSalaryMax === "" ? null : parsedSalaryMax,
        vacation_days: vacationDays === "" ? null : vacationDays,
        bonus_percentage:
          bonusPercentage === "" ? null : bonusPercentage,
        total_fee: parsedTotalFee === "" ? null : parsedTotalFee,
        advance_fee: parsedAdvanceFee === "" ? null : parsedAdvanceFee,
        location: location.trim() || null,
        employment_type: employmentType || null,
        hours_per_week_min: hoursPerWeekMin === "" ? null : hoursPerWeekMin,
        hours_per_week_max: hoursPerWeekMax === "" ? null : hoursPerWeekMax,
        start_date: startDate || null,
        end_date: endDate || null,
        benefits: benefits.length > 0 ? benefits : null,
        notes_image: notesImageFile,
        role_profile: roleProfileFile ?? undefined,
      });

      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Er is iets misgegaan bij het aanmaken"
      );
    }
  };

  const handleRequestClose = () => {
    if (notesImagePreview) URL.revokeObjectURL(notesImagePreview);
    setNotesImagePreview(null);
    setNotesImageFile(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleRequestClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Nieuwe opdracht aanmaken</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <FormControl
            fullWidth
            required
            error={!accountUid && !!error}
          >
            <InputLabel>Klant</InputLabel>
            <Select
              value={accountUid}
              onChange={(e) => setAccountUid(e.target.value as string)}
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
              value={recruiterUid}
              onChange={(e) => setRecruiterUid(e.target.value as string)}
              label="Lead Recruiter"
            >
              <MenuItem value="">Geen recruiter toegewezen</MenuItem>
              {users
                .filter((u) => !!u.uid)
                .map((user) => (
                  <MenuItem key={user.uid as string} value={user.uid as string}>
                  {user.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Secundaire Recruiters</InputLabel>
            <Select
              multiple
              value={selectedSecondaryRecruiters}
              onChange={(e) =>
                setSecondaryRecruiterUids(
                  typeof e.target.value === "string"
                    ? e.target.value.split(",")
                    : (e.target.value as string[])
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
                .filter((u) => !!u.uid && u.uid !== recruiterUid)
                .map((user) => (
                  <MenuItem key={user.uid as string} value={user.uid as string}>
                    {user.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

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
                onChange={(e) => setEmploymentType(e.target.value as string)}
                label="Dienstverband"
              >
                <MenuItem value="">Geen</MenuItem>
                {activeEmploymentTypes.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <TextField
              label="Startdatum"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 200 }}
            />
            <TextField
              label="Einddatum"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 200 }}
              helperText={
                employmentType.toLowerCase().includes("interim")
                  ? "Voor interim opdrachten op het dashboard"
                  : "Optioneel"
              }
            />
          </Stack>

          <Stack direction="row" spacing={2} alignItems="flex-start">
            <TextField
              label="Werkuren per week min"
              type="number"
              fullWidth
              value={hoursPerWeekMin}
              onChange={(e) =>
                setHoursPerWeekMin(
                  e.target.value ? parseInt(e.target.value, 10) : ""
                )
              }
              InputProps={{
                inputProps: { min: 0, max: 168, step: 1 },
                endAdornment: (
                  <InputAdornment position="end">uur</InputAdornment>
                ),
              }}
              placeholder="bijv. 24"
            />
            <TextField
              label="Werkuren per week max"
              type="number"
              fullWidth
              value={hoursPerWeekMax}
              onChange={(e) =>
                setHoursPerWeekMax(
                  e.target.value ? parseInt(e.target.value, 10) : ""
                )
              }
              InputProps={{
                inputProps: { min: 0, max: 168, step: 1 },
                endAdornment: (
                  <InputAdornment position="end">uur</InputAdornment>
                ),
              }}
              placeholder="bijv. 40"
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

          <Stack direction="row" spacing={2} alignItems="flex-start">
            <TextField
              label="Totale fee"
              fullWidth
              value={totalFee}
              onChange={(e) => setTotalFee(formatNumberInput(e.target.value))}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">€</InputAdornment>
                ),
              }}
              placeholder="bijv. 25.000"
            />
            <TextField
              label="Voorfee"
              fullWidth
              value={advanceFee}
              onChange={(e) => setAdvanceFee(formatNumberInput(e.target.value))}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">€</InputAdornment>
                ),
              }}
              placeholder="bijv. 5.000"
              helperText="Mag niet hoger zijn dan de totale fee"
            />
          </Stack>

          <Stack direction="row" spacing={2} alignItems="flex-start">
            <TextField
              label="Vakantiedagen"
              type="number"
              fullWidth
              value={vacationDays}
              onChange={(e) =>
                setVacationDays(e.target.value ? parseInt(e.target.value) : "")
              }
              InputProps={{ inputProps: { min: 0, max: 100 } }}
            />
            <TextField
              label="Bonusregeling"
              type="number"
              fullWidth
              value={bonusPercentage}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  setBonusPercentage("");
                  return;
                }
                const n = parseFloat(raw);
                if (!Number.isNaN(n)) setBonusPercentage(n);
              }}
              InputProps={{
                inputProps: { min: 0, max: 100, step: 0.01 },
                endAdornment: (
                  <InputAdornment position="end">%</InputAdornment>
                ),
              }}
              helperText="Percentage van het jaarsalaris (optioneel)"
            />
          </Stack>

          {/* Benefits Selection - Toggleable Chips */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Arbeidsvoorwaarden
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {activeBenefits.map((benefit) => {
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

          {/* Rolprofiel */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Rolprofiel (optioneel)
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Button
                variant="outlined"
                component="label"
                startIcon={<DescriptionIcon />}
                sx={{ flexShrink: 0 }}
              >
                PDF of Word uploaden
                <input
                  type="file"
                  hidden
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleRoleProfileUpload}
                />
              </Button>
              {roleProfileFile && (
                <>
                  <Typography variant="body2" color="text.secondary">
                    {roleProfileFile.name}
                  </Typography>
                  <IconButton
                    size="small"
                    aria-label="Rolprofiel verwijderen"
                    onClick={() => setRoleProfileFile(null)}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </>
              )}
            </Stack>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 0.5 }}
            >
              PDF of Word (max. 15 MB). Het document wordt bij de opdracht getoond.
            </Typography>
          </Box>

          {/* Notes Image Upload */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Notities afbeelding (optioneel)
            </Typography>
            {notesImagePreview ? (
              <Box sx={{ position: "relative", display: "inline-block" }}>
                <Box
                  component="img"
                  src={notesImagePreview}
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

          {error && (
            <Alert
              severity="error"
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleRequestClose} disabled={createAssignmentMutation.isPending}>
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
  );
}

