import React from "react";
import {
  Box,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { useDropdownOptions } from "../../api/queries/dropdownOptions";
import { activeDropdownLabeled } from "../../utils/dropdownValidation";
import { flattenRhfFieldErrorMessage } from "../../utils/formErrors";

type LabeledOption = { value: string; label: string };

/**
 * Sector-/classificatievelden die zowel op klanten als contacten voorkomen:
 * hoofd-/secundaire categorie (select) en tertiaire categorie, merken & labels
 * (multi-select chips). Werkt met elk react-hook-form formulier dat deze vijf
 * velden bevat (`category`, `secondary_category`, `tertiary_category`,
 * `merken`, `labels`). Haalt de dropdown-opties zelf op.
 */

function ChipMultiSelect({
  control,
  name,
  label,
  options,
  isPending,
  error,
}: {
  control: Control<any>;
  name: string;
  label: string;
  options: LabeledOption[];
  isPending: boolean;
  error: unknown;
}) {
  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        sx={{ mb: 1 }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1,
          alignItems: "center",
          minHeight: 36,
        }}
      >
        {isPending ? (
          <CircularProgress size={22} />
        ) : options.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Geen actieve opties. Configureer ze onder Instellingen → Dropdown
            opties.
          </Typography>
        ) : (
          <Controller
            name={name}
            control={control}
            render={({ field }) => (
              <>
                {options.map((opt) => {
                  const selected: string[] = field.value || [];
                  const isSelected = selected.includes(opt.value);
                  return (
                    <Chip
                      key={opt.value}
                      label={opt.label}
                      size="small"
                      variant={isSelected ? "filled" : "outlined"}
                      color={isSelected ? "primary" : "default"}
                      onClick={() =>
                        field.onChange(
                          isSelected
                            ? selected.filter((o) => o !== opt.value)
                            : [...selected, opt.value]
                        )
                      }
                      sx={{
                        cursor: "pointer",
                        "&:hover": {
                          bgcolor: isSelected ? "primary.dark" : "action.hover",
                        },
                      }}
                    />
                  );
                })}
              </>
            )}
          />
        )}
      </Box>
      {error ? (
        <Typography variant="caption" color="error">
          {flattenRhfFieldErrorMessage(error) ?? "Ongeldige selectie."}
        </Typography>
      ) : null}
    </Box>
  );
}

export default function ClassificationFields({
  control,
  errors,
}: {
  control: Control<any>;
  errors: FieldErrors<any>;
}) {
  const { data: dbCategory } = useDropdownOptions("sector_category");
  const { data: dbSecondary } = useDropdownOptions(
    "sector_secondary_category"
  );
  const { data: dbTertiary, isPending: isTertiaryPending } = useDropdownOptions(
    "sector_tertiary_category"
  );
  const { data: dbBrand, isPending: isBrandsPending } =
    useDropdownOptions("sector_brand");
  const { data: dbLabel, isPending: isLabelsPending } =
    useDropdownOptions("sector_label");

  const categories = React.useMemo(
    () => activeDropdownLabeled(dbCategory),
    [dbCategory]
  );
  const secondary = React.useMemo(
    () => activeDropdownLabeled(dbSecondary),
    [dbSecondary]
  );
  const tertiary = React.useMemo(
    () => activeDropdownLabeled(dbTertiary),
    [dbTertiary]
  );
  const brands = React.useMemo(
    () => activeDropdownLabeled(dbBrand),
    [dbBrand]
  );
  const labels = React.useMemo(
    () => activeDropdownLabeled(dbLabel),
    [dbLabel]
  );

  return (
    <Box sx={{ bgcolor: "grey.50", p: 2, borderRadius: 1 }}>
      <Typography variant="subtitle2" sx={{ mb: 2 }}>
        Sector &amp; labels (zelfde opties voor klanten en contacten)
      </Typography>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <TextField
                select
                label="Hoofdcategorie"
                {...field}
                value={field.value || ""}
                fullWidth
                error={!!errors.category}
                helperText={(errors.category?.message as string) ?? " "}
              >
                <MenuItem value="">Geen</MenuItem>
                {categories.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <Controller
            name="secondary_category"
            control={control}
            render={({ field }) => (
              <TextField
                select
                label="Secundaire categorie"
                {...field}
                value={field.value || ""}
                fullWidth
                error={!!errors.secondary_category}
                helperText={
                  (errors.secondary_category?.message as string) ?? " "
                }
              >
                <MenuItem value="">Geen</MenuItem>
                {secondary.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </Stack>

        <ChipMultiSelect
          control={control}
          name="tertiary_category"
          label="Tertiaire categorie"
          options={tertiary}
          isPending={isTertiaryPending}
          error={errors.tertiary_category}
        />
        <ChipMultiSelect
          control={control}
          name="merken"
          label="Merken"
          options={brands}
          isPending={isBrandsPending}
          error={errors.merken}
        />
        <ChipMultiSelect
          control={control}
          name="labels"
          label="Labels"
          options={labels}
          isPending={isLabelsPending}
          error={errors.labels}
        />
      </Stack>
    </Box>
  );
}
