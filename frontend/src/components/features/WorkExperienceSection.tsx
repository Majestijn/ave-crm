import React from "react";
import {
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import AddIcon from "@mui/icons-material/Add";
import type { ContactWorkExperience } from "../../types/contacts";
import type { UseFieldArrayReturn } from "react-hook-form";

type WorkExperienceFormItem = ContactWorkExperience & { id?: string };

interface WorkExperienceSectionProps {
  fieldArray: UseFieldArrayReturn<{ work_experiences: WorkExperienceFormItem[] }, "work_experiences", "id">;
  register: any;
  errors?: Record<string, { message?: string }>;
}

export function formatDateRange(startDate: string, endDate?: string | null): string {
  const format = (d: string) => {
    const [y, m] = d.split("-");
    const months: Record<string, string> = {
      "01": "jan", "02": "feb", "03": "mrt", "04": "apr", "05": "mei", "06": "jun",
      "07": "jul", "08": "aug", "09": "sep", "10": "okt", "11": "nov", "12": "dec",
    };
    return `${months[m] || m} ${y}`;
  };
  const start = format(startDate);
  const end = endDate ? format(endDate) : "heden";
  return `${start} – ${end}`;
}

export default function WorkExperienceSection({
  fieldArray,
  register,
  errors = {},
}: WorkExperienceSectionProps) {
  const { fields, append, remove } = fieldArray;

  const emptyExperience: WorkExperienceFormItem = {
    job_title: "",
    company_name: "",
    start_date: "",
    end_date: null,
    location: "",
    description: "",
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={600}>
          Werkgeschiedenis
        </Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => append(emptyExperience)}
          variant="outlined"
        >
          Ervaring toevoegen
        </Button>
      </Stack>

      {fields.length === 0 ? (
        <Box
          sx={{
            py: 3,
            px: 2,
            textAlign: "center",
            bgcolor: "grey.50",
            borderRadius: 1,
            border: "1px dashed",
            borderColor: "divider",
          }}
        >
          <WorkOutlineIcon sx={{ fontSize: 32, color: "text.disabled", mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            Nog geen werkervaring toegevoegd
          </Typography>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => append(emptyExperience)}
            sx={{ mt: 1 }}
          >
            Eerste ervaring toevoegen
          </Button>
        </Box>
      ) : (
        <Stack spacing={2}>
          {fields.map((field, index) => (
            <Box
              key={field.id}
              sx={{
                p: 2,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                bgcolor: "grey.50",
                position: "relative",
              }}
            >
              <Stack direction="row" alignItems="flex-start" spacing={1}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: "primary.main",
                    mt: 1.5,
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                    <span />
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => remove(index)}
                      title="Verwijderen"
                      sx={{ mt: -0.5, mr: -0.5 }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={2} flexWrap="wrap">
                      <TextField
                        label="Functietitel"
                        size="small"
                        {...register(`work_experiences.${index}.job_title`)}
                        error={!!errors[`work_experiences.${index}.job_title`]}
                        helperText={errors[`work_experiences.${index}.job_title`]?.message}
                        sx={{ minWidth: 200, flex: 1 }}
                      />
                      <TextField
                        label="Bedrijfsnaam"
                        size="small"
                        {...register(`work_experiences.${index}.company_name`)}
                        error={!!errors[`work_experiences.${index}.company_name`]}
                        helperText={errors[`work_experiences.${index}.company_name`]?.message}
                        sx={{ minWidth: 200, flex: 1 }}
                      />
                    </Stack>
                    <Stack direction="row" spacing={2} flexWrap="wrap">
                      <TextField
                        label="Startdatum"
                        type="date"
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        {...register(`work_experiences.${index}.start_date`)}
                        error={!!errors[`work_experiences.${index}.start_date`]}
                        helperText={errors[`work_experiences.${index}.start_date`]?.message}
                        sx={{ minWidth: 140 }}
                      />
                      <TextField
                        label="Einddatum"
                        type="date"
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        {...register(`work_experiences.${index}.end_date`)}
                        error={!!errors[`work_experiences.${index}.end_date`]}
                        sx={{ minWidth: 140 }}
                        helperText="Leeg = huidige functie"
                      />
                      <TextField
                        label="Locatie"
                        size="small"
                        {...register(`work_experiences.${index}.location`)}
                        sx={{ minWidth: 160, flex: 1 }}
                      />
                    </Stack>
                    <TextField
                      label="Beschrijving"
                      size="small"
                      multiline
                      rows={2}
                      {...register(`work_experiences.${index}.description`)}
                      sx={{ width: "100%" }}
                    />
                  </Stack>
                </Box>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
