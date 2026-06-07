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
  FormHelperText,
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
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import type { Account } from "../../../types/accounts";
import type { User } from "../../../types/users";
import {
  useCreateAssignment,
  useUpdateAssignment,
  useUploadAssignmentRoleProfile,
  useDeleteAssignmentRoleProfile,
} from "../../../api/mutations/assignments";
import { useDropdownOptions } from "../../../api/queries/dropdownOptions";
import { buildAllowedValueSet } from "../../../utils/dropdownValidation";
import type { AssignmentWithDetails } from "./types";
import {
  benefitsOptions as defaultBenefitsOptions,
  formatNumberInput,
  parseFormattedNumber,
} from "./types";

const EMPLOYMENT_TYPE_FALLBACK = [
  "Fulltime",
  "Parttime",
  "Freelance",
  "Interim",
] as const;

const EMPLOYMENT_TYPE_FALLBACK_OPTIONS = EMPLOYMENT_TYPE_FALLBACK.map((v) => ({
  value: v,
  label: v,
}));

const ROLE_PROFILE_MAX_BYTES = 15 * 1024 * 1024;
const NOTES_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

type NumberOrEmpty = number | "";

type AssignmentFormValues = {
  accountUid: string;
  recruiterUid: string;
  secondaryRecruiterUids: string[];
  title: string;
  description: string;
  location: string;
  employmentType: string;
  startDate: string;
  endDate: string;
  hoursPerWeekMin: NumberOrEmpty;
  hoursPerWeekMax: NumberOrEmpty;
  salaryMin: string;
  salaryMax: string;
  totalFee: string;
  advanceFee: string;
  vacationDays: NumberOrEmpty;
  bonusPercentage: NumberOrEmpty;
  benefits: string[];
};

const emptyDefaults: AssignmentFormValues = {
  accountUid: "",
  recruiterUid: "",
  secondaryRecruiterUids: [],
  title: "",
  description: "",
  location: "",
  employmentType: "",
  startDate: "",
  endDate: "",
  hoursPerWeekMin: "",
  hoursPerWeekMax: "",
  salaryMin: "",
  salaryMax: "",
  totalFee: "",
  advanceFee: "",
  vacationDays: "",
  bonusPercentage: "",
  benefits: [],
};

function assignmentToDefaults(
  assignment: AssignmentWithDetails
): AssignmentFormValues {
  return {
    accountUid: assignment.account?.uid ?? "",
    recruiterUid: assignment.recruiter?.uid ?? "",
    secondaryRecruiterUids:
      assignment.secondary_recruiters?.map((r) => r.uid) ?? [],
    title: assignment.title ?? "",
    description: assignment.description ?? "",
    location: assignment.location ?? "",
    employmentType: assignment.employment_type ?? "",
    startDate: assignment.start_date ?? "",
    endDate: assignment.end_date ?? "",
    hoursPerWeekMin: assignment.hours_per_week_min ?? "",
    hoursPerWeekMax: assignment.hours_per_week_max ?? "",
    salaryMin: assignment.salary_min
      ? assignment.salary_min.toLocaleString("nl-NL")
      : "",
    salaryMax: assignment.salary_max
      ? assignment.salary_max.toLocaleString("nl-NL")
      : "",
    totalFee: assignment.total_fee
      ? assignment.total_fee.toLocaleString("nl-NL")
      : "",
    advanceFee: assignment.advance_fee
      ? assignment.advance_fee.toLocaleString("nl-NL")
      : "",
    vacationDays: assignment.vacation_days ?? "",
    bonusPercentage:
      assignment.bonus_percentage != null
        ? Number(assignment.bonus_percentage)
        : "",
    benefits: assignment.benefits ?? [],
  };
}

const buildSchema = (
  mode: "create" | "edit",
  allowedEmployment: Set<string>,
  allowedBenefits: Set<string>
) =>
  z
    .object({
      accountUid: z.string(),
      recruiterUid: z.string(),
      secondaryRecruiterUids: z.array(z.string()),
      title: z.string(),
      description: z.string(),
      location: z.string(),
      employmentType: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      hoursPerWeekMin: z.union([z.number(), z.literal("")]),
      hoursPerWeekMax: z.union([z.number(), z.literal("")]),
      salaryMin: z.string(),
      salaryMax: z.string(),
      totalFee: z.string(),
      advanceFee: z.string(),
      vacationDays: z.union([z.number(), z.literal("")]),
      bonusPercentage: z.union([z.number(), z.literal("")]),
      benefits: z.array(z.string()),
    })
    .refine((v) => v.title.trim().length > 0, {
      message: "Vul een titel in",
      path: ["title"],
    })
    .refine((v) => mode === "edit" || v.accountUid.length > 0, {
      message: "Selecteer een klant",
      path: ["accountUid"],
    })
    .refine((v) => !v.employmentType || allowedEmployment.has(v.employmentType), {
      message: "Selecteer een geldig dienstverband uit de lijst.",
      path: ["employmentType"],
    })
    .refine((v) => v.benefits.every((b) => allowedBenefits.has(b)), {
      message:
        "Een of meer arbeidsvoorwaarden zijn ongeldig. Kies opties uit de lijst.",
      path: ["benefits"],
    })
    .refine(
      (v) =>
        v.hoursPerWeekMin === "" ||
        v.hoursPerWeekMax === "" ||
        v.hoursPerWeekMin <= v.hoursPerWeekMax,
      {
        message:
          "Het minimum aantal werkuren per week mag niet hoger zijn dan het maximum.",
        path: ["hoursPerWeekMax"],
      }
    )
    .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, {
      message: "De einddatum mag niet vóór de startdatum liggen.",
      path: ["endDate"],
    })
    .refine(
      (v) => {
        const total = parseFormattedNumber(v.totalFee);
        const advance = parseFormattedNumber(v.advanceFee);
        return total === "" || advance === "" || advance <= total;
      },
      {
        message: "De voorfee mag niet hoger zijn dan de totale fee.",
        path: ["advanceFee"],
      }
    );

type AssignmentFormDialogProps = {
  open: boolean;
  onClose: () => void;
  users: User[];
} & (
  | { mode: "create"; accounts: Account[]; assignment?: undefined }
  | { mode: "edit"; assignment: AssignmentWithDetails | null; accounts?: undefined }
);

export default function AssignmentFormDialog(props: AssignmentFormDialogProps) {
  const { open, onClose, users, mode } = props;
  const isEdit = mode === "edit";
  const assignment = isEdit ? props.assignment : null;
  const accounts = isEdit ? [] : props.accounts;

  const createMutation = useCreateAssignment();
  const updateMutation = useUpdateAssignment();
  const uploadRoleProfileMutation = useUploadAssignmentRoleProfile();
  const deleteRoleProfileMutation = useDeleteAssignmentRoleProfile();

  const { data: dbBenefitsOptions } = useDropdownOptions("benefit");
  const { data: dbEmploymentTypeOptions } = useDropdownOptions("employment_type");

  const activeBenefits = useMemo(
    () =>
      dbBenefitsOptions
        ? dbBenefitsOptions.filter((o) => o.is_active).map((o) => o.value)
        : defaultBenefitsOptions,
    [dbBenefitsOptions]
  );

  const activeEmploymentTypes = useMemo(
    () =>
      dbEmploymentTypeOptions
        ? dbEmploymentTypeOptions
            .filter((o) => o.is_active)
            .map((o) => ({ value: o.value, label: o.label }))
        : EMPLOYMENT_TYPE_FALLBACK_OPTIONS,
    [dbEmploymentTypeOptions]
  );

  const allowedEmploymentSet = useMemo(
    () => buildAllowedValueSet(dbEmploymentTypeOptions, [...EMPLOYMENT_TYPE_FALLBACK]),
    [dbEmploymentTypeOptions]
  );

  const allowedBenefitsSet = useMemo(
    () => buildAllowedValueSet(dbBenefitsOptions, defaultBenefitsOptions),
    [dbBenefitsOptions]
  );

  const schema = useMemo(
    () => buildSchema(mode, allowedEmploymentSet, allowedBenefitsSet),
    [mode, allowedEmploymentSet, allowedBenefitsSet]
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<AssignmentFormValues>({
    // zod infers the `number | ""` fields as optional; the resolver is correct
    // at runtime, so align the static type to our explicit form-values shape.
    resolver: zodResolver(schema) as Resolver<AssignmentFormValues>,
    mode: "onSubmit",
    defaultValues: emptyDefaults,
  });

  // Files live outside RHF (object-URL side effects, not plain form values).
  const [roleProfileFile, setRoleProfileFile] = useState<File | null>(null);
  const [notesImageFile, setNotesImageFile] = useState<File | null>(null);
  const [notesImagePreview, setNotesImagePreview] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const recruiterUid = watch("recruiterUid");
  const employmentType = watch("employmentType");

  // (Re)initialise the form whenever the dialog opens.
  useEffect(() => {
    if (!open) {
      if (notesImagePreview) URL.revokeObjectURL(notesImagePreview);
      setNotesImagePreview(null);
      setNotesImageFile(null);
      setRoleProfileFile(null);
      setSubmitError(null);
      return;
    }
    reset(isEdit && assignment ? assignmentToDefaults(assignment) : emptyDefaults);
    setNotesImageFile(null);
    setNotesImagePreview(null);
    setRoleProfileFile(null);
    setSubmitError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, assignment, isEdit]);

  const busy =
    createMutation.isPending ||
    updateMutation.isPending ||
    uploadRoleProfileMutation.isPending ||
    deleteRoleProfileMutation.isPending;

  const handleClose = () => {
    if (notesImagePreview) URL.revokeObjectURL(notesImagePreview);
    setNotesImagePreview(null);
    setNotesImageFile(null);
    setRoleProfileFile(null);
    setSubmitError(null);
    onClose();
  };

  const handleNotesImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setSubmitError("Selecteer een afbeelding (JPG, PNG, etc.)");
      return;
    }
    if (file.size > NOTES_IMAGE_MAX_BYTES) {
      setSubmitError("Afbeelding mag maximaal 5MB zijn");
      return;
    }
    if (notesImagePreview) URL.revokeObjectURL(notesImagePreview);
    setNotesImagePreview(URL.createObjectURL(file));
    setNotesImageFile(file);
    setSubmitError(null);
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
    if (!ext || !["pdf", "doc", "docx"].includes(ext)) {
      setSubmitError(
        "Alleen PDF of Word (.doc, .docx) zijn toegestaan voor het rolprofiel."
      );
      return;
    }
    if (file.size > ROLE_PROFILE_MAX_BYTES) {
      setSubmitError("Rolprofiel mag maximaal 15 MB zijn.");
      return;
    }
    setRoleProfileFile(file);
    setSubmitError(null);
    event.target.value = "";
  };

  const handleDeleteRoleProfile = async () => {
    if (!assignment?.uid) return;
    setSubmitError(null);
    try {
      await deleteRoleProfileMutation.mutateAsync(assignment.uid);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setSubmitError(
        ax.response?.data?.message ?? "Rolprofiel verwijderen is mislukt."
      );
    }
  };

  const onSubmit = async (values: AssignmentFormValues) => {
    setSubmitError(null);

    // Lead recruiter is never also a secondary recruiter.
    const secondary = values.secondaryRecruiterUids.filter(
      (uid) => uid && uid !== values.recruiterUid
    );

    const salaryMin = parseFormattedNumber(values.salaryMin);
    const salaryMax = parseFormattedNumber(values.salaryMax);
    const totalFee = parseFormattedNumber(values.totalFee);
    const advanceFee = parseFormattedNumber(values.advanceFee);

    const shared = {
      recruiter_uid: values.recruiterUid || null,
      title: values.title.trim(),
      description: values.description.trim() || null,
      salary_min: salaryMin === "" ? null : salaryMin,
      salary_max: salaryMax === "" ? null : salaryMax,
      vacation_days: values.vacationDays === "" ? null : values.vacationDays,
      bonus_percentage:
        values.bonusPercentage === "" ? null : values.bonusPercentage,
      total_fee: totalFee === "" ? null : totalFee,
      advance_fee: advanceFee === "" ? null : advanceFee,
      location: values.location.trim() || null,
      employment_type: values.employmentType || null,
      hours_per_week_min:
        values.hoursPerWeekMin === "" ? null : values.hoursPerWeekMin,
      hours_per_week_max:
        values.hoursPerWeekMax === "" ? null : values.hoursPerWeekMax,
      start_date: values.startDate || null,
      end_date: values.endDate || null,
      benefits: values.benefits.length > 0 ? values.benefits : null,
    };

    try {
      if (isEdit) {
        if (!assignment?.uid) return;
        await updateMutation.mutateAsync({
          uid: assignment.uid,
          data: { ...shared, secondary_recruiter_uids: secondary },
        });
        if (roleProfileFile) {
          await uploadRoleProfileMutation.mutateAsync({
            uid: assignment.uid,
            file: roleProfileFile,
          });
        }
      } else {
        await createMutation.mutateAsync({
          ...shared,
          account_uid: values.accountUid,
          secondary_recruiter_uids: secondary.length > 0 ? secondary : undefined,
          notes_image: notesImageFile,
          role_profile: roleProfileFile ?? undefined,
        });
      }
      handleClose();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setSubmitError(
        ax.response?.data?.message ??
          (isEdit
            ? "Er is iets misgegaan bij het opslaan"
            : "Er is iets misgegaan bij het aanmaken")
      );
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEdit ? "Opdracht bewerken" : "Nieuwe opdracht aanmaken"}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3} sx={{ pt: 1 }} component="form" id="assignment-form">
          {!isEdit && (
            <Controller
              name="accountUid"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth required error={!!errors.accountUid}>
                  <InputLabel>Klant</InputLabel>
                  <Select {...field} label="Klant">
                    {accounts.map((account) => (
                      <MenuItem key={account.uid} value={account.uid}>
                        {account.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.accountUid && (
                    <FormHelperText>{errors.accountUid.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />
          )}

          <TextField
            label="Titel"
            required
            fullWidth
            {...register("title")}
            error={!!errors.title}
            helperText={errors.title?.message}
          />

          <TextField
            label="Omschrijving"
            fullWidth
            multiline
            rows={3}
            {...register("description")}
          />

          <Controller
            name="recruiterUid"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>Lead Recruiter</InputLabel>
                <Select {...field} label="Lead Recruiter">
                  <MenuItem value="">Geen recruiter toegewezen</MenuItem>
                  {users
                    .filter((u) => !!u.uid)
                    .map((user) => (
                      <MenuItem key={user.uid} value={user.uid}>
                        {user.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            )}
          />

          <Controller
            name="secondaryRecruiterUids"
            control={control}
            render={({ field }) => {
              const value = (field.value || []).filter(
                (uid) => uid !== recruiterUid
              );
              return (
                <FormControl fullWidth>
                  <InputLabel>Secundaire Recruiters</InputLabel>
                  <Select
                    multiple
                    value={value}
                    onChange={(e) =>
                      field.onChange(
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
                            <Chip key={uid} label={user?.name || uid} size="small" />
                          );
                        })}
                      </Box>
                    )}
                  >
                    {users
                      .filter((u) => !!u.uid && u.uid !== recruiterUid)
                      .map((user) => (
                        <MenuItem key={user.uid} value={user.uid}>
                          {user.name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              );
            }}
          />

          <Stack direction="row" spacing={2}>
            <TextField label="Locatie" fullWidth {...register("location")} />
            <Controller
              name="employmentType"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.employmentType}>
                  <InputLabel>Dienstverband</InputLabel>
                  <Select {...field} label="Dienstverband">
                    <MenuItem value="">Geen</MenuItem>
                    {activeEmploymentTypes.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.employmentType && (
                    <FormHelperText>
                      {errors.employmentType.message}
                    </FormHelperText>
                  )}
                </FormControl>
              )}
            />
          </Stack>

          <Stack direction="row" spacing={2} alignItems="flex-start" flexWrap="wrap">
            <Controller
              name="startDate"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Startdatum"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  sx={{ width: 200 }}
                />
              )}
            />
            <Controller
              name="endDate"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Einddatum"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  sx={{ width: 200 }}
                  error={!!errors.endDate}
                  helperText={
                    errors.endDate?.message ??
                    (employmentType.toLowerCase().includes("interim")
                      ? "Voor interim opdrachten op het dashboard"
                      : "Optioneel")
                  }
                />
              )}
            />
          </Stack>

          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Controller
              name="hoursPerWeekMin"
              control={control}
              render={({ field }) => (
                <TextField
                  label="Werkuren per week min"
                  type="number"
                  fullWidth
                  value={field.value}
                  onChange={(e) =>
                    field.onChange(
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
              )}
            />
            <Controller
              name="hoursPerWeekMax"
              control={control}
              render={({ field }) => (
                <TextField
                  label="Werkuren per week max"
                  type="number"
                  fullWidth
                  value={field.value}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? parseInt(e.target.value, 10) : ""
                    )
                  }
                  error={!!errors.hoursPerWeekMax}
                  helperText={errors.hoursPerWeekMax?.message}
                  InputProps={{
                    inputProps: { min: 0, max: 168, step: 1 },
                    endAdornment: (
                      <InputAdornment position="end">uur</InputAdornment>
                    ),
                  }}
                  placeholder="bijv. 40"
                />
              )}
            />
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center">
            <Controller
              name="salaryMin"
              control={control}
              render={({ field }) => (
                <TextField
                  label="Jaarsalaris min"
                  fullWidth
                  value={field.value}
                  onChange={(e) =>
                    field.onChange(formatNumberInput(e.target.value))
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">€</InputAdornment>
                    ),
                  }}
                  placeholder="bijv. 48.000"
                />
              )}
            />
            <Controller
              name="salaryMax"
              control={control}
              render={({ field }) => (
                <TextField
                  label="Jaarsalaris max"
                  fullWidth
                  value={field.value}
                  onChange={(e) =>
                    field.onChange(formatNumberInput(e.target.value))
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">€</InputAdornment>
                    ),
                  }}
                  placeholder="bijv. 60.000"
                />
              )}
            />
          </Stack>

          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Controller
              name="totalFee"
              control={control}
              render={({ field }) => (
                <TextField
                  label="Totale fee"
                  fullWidth
                  value={field.value}
                  onChange={(e) =>
                    field.onChange(formatNumberInput(e.target.value))
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">€</InputAdornment>
                    ),
                  }}
                  placeholder="bijv. 25.000"
                />
              )}
            />
            <Controller
              name="advanceFee"
              control={control}
              render={({ field }) => (
                <TextField
                  label="Voorfee"
                  fullWidth
                  value={field.value}
                  onChange={(e) =>
                    field.onChange(formatNumberInput(e.target.value))
                  }
                  error={!!errors.advanceFee}
                  helperText={
                    errors.advanceFee?.message ??
                    "Mag niet hoger zijn dan de totale fee"
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">€</InputAdornment>
                    ),
                  }}
                  placeholder="bijv. 5.000"
                />
              )}
            />
          </Stack>

          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Controller
              name="vacationDays"
              control={control}
              render={({ field }) => (
                <TextField
                  label="Vakantiedagen"
                  type="number"
                  fullWidth
                  value={field.value}
                  onChange={(e) =>
                    field.onChange(e.target.value ? parseInt(e.target.value) : "")
                  }
                  InputProps={{ inputProps: { min: 0, max: 100 } }}
                />
              )}
            />
            <Controller
              name="bonusPercentage"
              control={control}
              render={({ field }) => (
                <TextField
                  label="Bonusregeling"
                  type="number"
                  fullWidth
                  value={field.value}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      field.onChange("");
                      return;
                    }
                    const n = parseFloat(raw);
                    if (!Number.isNaN(n)) field.onChange(n);
                  }}
                  InputProps={{
                    inputProps: { min: 0, max: 100, step: 0.01 },
                    endAdornment: (
                      <InputAdornment position="end">%</InputAdornment>
                    ),
                  }}
                  helperText="Percentage van het jaarsalaris (optioneel)"
                />
              )}
            />
          </Stack>

          {/* Arbeidsvoorwaarden - toggleable chips */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Arbeidsvoorwaarden
            </Typography>
            <Controller
              name="benefits"
              control={control}
              render={({ field }) => {
                const selected: string[] = field.value || [];
                return (
                  <>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {activeBenefits.map((benefit) => {
                        const isSelected = selected.includes(benefit);
                        return (
                          <Chip
                            key={benefit}
                            label={benefit}
                            size="small"
                            variant={isSelected ? "filled" : "outlined"}
                            color={isSelected ? "primary" : "default"}
                            onClick={() =>
                              field.onChange(
                                isSelected
                                  ? selected.filter((b) => b !== benefit)
                                  : [...selected, benefit]
                              )
                            }
                            sx={{
                              cursor: "pointer",
                              "&:hover": {
                                bgcolor: isSelected
                                  ? "primary.dark"
                                  : "action.hover",
                              },
                            }}
                          />
                        );
                      })}
                    </Box>
                    {errors.benefits && (
                      <FormHelperText error>
                        {errors.benefits.message}
                      </FormHelperText>
                    )}
                  </>
                );
              }}
            />
          </Box>

          {/* Rolprofiel */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {isEdit ? "Rolprofiel" : "Rolprofiel (optioneel)"}
            </Typography>
            {isEdit && assignment?.role_profile_url && (
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
                  href={assignment.role_profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {assignment.role_profile_original_filename ||
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
                size={isEdit ? "small" : "medium"}
                startIcon={<DescriptionIcon />}
                sx={isEdit ? undefined : { flexShrink: 0 }}
              >
                {isEdit ? "Nieuw bestand" : "PDF of Word uploaden"}
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
                    aria-label="Geselecteerd bestand wissen"
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
              {isEdit
                ? "PDF of Word, max. 15 MB. Opslaan uploadt een nieuw bestand en vervangt het vorige."
                : "PDF of Word (max. 15 MB). Het document wordt bij de opdracht getoond."}
            </Typography>
          </Box>

          {/* Notities afbeelding - alleen bij aanmaken */}
          {!isEdit && (
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
          )}

          {submitError && (
            <Alert severity="error" onClose={() => setSubmitError(null)}>
              {submitError}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={busy}>
          Annuleren
        </Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={busy}>
          {busy ? "Bezig..." : isEdit ? "Opslaan" : "Aanmaken"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
