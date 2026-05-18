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
  IconButton,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DescriptionIcon from "@mui/icons-material/Description";
import type { User } from "../../../types/users";
import {
  useUpdateAssignment,
  useUploadAssignmentRoleProfile,
  useDeleteAssignmentRoleProfile,
} from "../../../api/mutations/assignments";
import { useDropdownOptions } from "../../../api/queries/dropdownOptions";
import { buildAllowedValueSet } from "../../../utils/dropdownValidation";
import type { AssignmentWithDetails } from "./types";
import { benefitsOptions as defaultBenefitsOptions, formatNumberInput, parseFormattedNumber } from "./types";

const EMPLOYMENT_TYPE_FALLBACK = [
  "Fulltime",
  "Parttime",
  "Freelance",
  "Interim",
] as const;

const ROLE_PROFILE_MAX_BYTES = 15 * 1024 * 1024;

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
  const uploadRoleProfileMutation = useUploadAssignmentRoleProfile();
  const deleteRoleProfileMutation = useDeleteAssignmentRoleProfile();

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
  const [roleProfileFile, setRoleProfileFile] = useState<File | null>(null);
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
    setBonusPercentage(
      assignment.bonus_percentage != null
        ? Number(assignment.bonus_percentage)
        : "",
    );
    setTotalFee(
      assignment.total_fee
        ? assignment.total_fee.toLocaleString("nl-NL")
        : "",
    );
    setAdvanceFee(
      assignment.advance_fee
        ? assignment.advance_fee.toLocaleString("nl-NL")
        : "",
    );
    setLocation(assignment.location || "");
    setEmploymentType(assignment.employment_type || "");
    setHoursPerWeekMin(assignment.hours_per_week_min ?? "");
    setHoursPerWeekMax(assignment.hours_per_week_max ?? "");
    setStartDate(assignment.start_date || "");
    setEndDate(assignment.end_date || "");
    setBenefits(assignment.benefits || []);
    setRoleProfileFile(null);
    setError(null);
  }, [assignment, open]);

  const handleClose = () => {
    setRoleProfileFile(null);
    onClose();
    setError(null);
  };

  const handleRoleProfileFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const ext = file.name.toLowerCase().split(".").pop();
    const allowed = ["pdf", "doc", "docx"];
    if (!ext || !allowed.includes(ext)) {
      setError(
        "Alleen PDF of Word (.doc, .docx) zijn toegestaan voor het rolprofiel."
      );
      return;
    }

    if (file.size > ROLE_PROFILE_MAX_BYTES) {
      setError("Rolprofiel mag maximaal 15 MB zijn.");
      return;
    }

    setRoleProfileFile(file);
    setError(null);
    event.target.value = "";
  };

  const handleDeleteRoleProfile = async () => {
    if (!assignment?.uid) return;

    setError(null);
    try {
      await deleteRoleProfileMutation.mutateAsync(assignment.uid);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(
        ax.response?.data?.message ?? "Rolprofiel verwijderen is mislukt."
      );
    }
  };

  const handleSave = async () => {
    if (!assignment?.uid) return;

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
        },
      });

      if (roleProfileFile) {
        await uploadRoleProfileMutation.mutateAsync({
          uid: assignment.uid,
          file: roleProfileFile,
        });
        setRoleProfileFile(null);
      }

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

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Rolprofiel
            </Typography>
            {assignment?.role_profile_url && (
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                flexWrap="wrap"
                sx={{ mb: 1 }}
              >
                <Button
                  size="small"
                  variant="outlined"
                  href={assignment?.role_profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {assignment?.role_profile_original_filename ||
                    "Bekijk rolprofiel"}
                </Button>
                <Button
                  size="small"
                  color="error"
                  onClick={handleDeleteRoleProfile}
                  disabled={deleteRoleProfileMutation.isPending}
                >
                  Verwijderen
                </Button>
              </Stack>
            )}
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Button
                variant="outlined"
                component="label"
                size="small"
                startIcon={<DescriptionIcon />}
              >
                Nieuw bestand
                <input
                  type="file"
                  hidden
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleRoleProfileFileChange}
                />
              </Button>
              {roleProfileFile && (
                <>
                  <Typography variant="body2" color="text.secondary">
                    {roleProfileFile.name}
                  </Typography>
                  <IconButton
                    size="small"
                    aria-label="Geselecteerd bestand wissen"
                    onClick={() => setRoleProfileFile(null)}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </>
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              PDF of Word, max. 15 MB. Opslaan uploadt een nieuw bestand en vervangt het vorige.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleClose}
          disabled={
            updateMutation.isPending ||
            uploadRoleProfileMutation.isPending ||
            deleteRoleProfileMutation.isPending
          }
        >
          Annuleren
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={
            updateMutation.isPending ||
            uploadRoleProfileMutation.isPending ||
            deleteRoleProfileMutation.isPending
          }
        >
          {updateMutation.isPending || uploadRoleProfileMutation.isPending
            ? "Bezig..."
            : "Opslaan"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
