import React, { useState } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  MenuItem,
  Chip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { useForm, Controller } from "react-hook-form";
import type { Account } from "../../types/accounts";
import { formatRevenueFullEuro } from "../../utils/formatters";
import {
  useUpdateAccount,
  type UpdateAccountData,
} from "../../api/mutations/accounts";
import { useDropdownOptions } from "../../api/queries/dropdownOptions";
import {
  activeDropdownLabeled,
  activeDropdownLabeledWithColor,
} from "../../utils/dropdownValidation";
import ClassificationFields from "../features/ClassificationFields";

/** Minimale vorm van een axios-foutrespons met een backend-bericht. */
type ApiError = {
  response?: { data?: { message?: string } };
};

/** Normaliseert API-waarde (legacy string of array) naar opgeslagen waarden. */
function accountSalesTargetsAsValues(
  value: string | string[] | null | undefined,
): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  const s = String(value).trim();
  return s ? [s] : [];
}

/** Bouwt de formulierwaarden op uit een account. */
function accountToForm(account: Account): UpdateAccountData {
  return {
    name: account.name,
    parent_company: account.parent_company || "",
    parent_logo_url: account.parent_logo_url || "",
    logo_url: account.logo_url || "",
    location: account.location || "",
    website: account.website || "",
    phone: account.phone || "",
    industry: account.industry || "",
    category: account.category || "",
    secondary_category: account.secondary_category || "",
    sales_target: accountSalesTargetsAsValues(account.sales_target),
    client_status: account.client_status || "",
    tertiary_category: account.tertiary_category || [],
    merken: account.merken || [],
    labels: account.labels || [],
    fte_count: account.fte_count ?? null,
    revenue_cents: account.revenue_cents ?? null,
    notes: account.notes || "",
  };
}

type Props = {
  account: Account;
};

export default function CompanyDetailsCard({ account }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const updateAccountMutation = useUpdateAccount();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<UpdateAccountData>({
    defaultValues: accountToForm(account),
  });

  const { data: dbSalesTarget, isPending: isSalesTargetPending } =
    useDropdownOptions("sales_target");
  const { data: dbClientStatus } = useDropdownOptions("client_status");

  const activeSalesTargets = React.useMemo(
    () => activeDropdownLabeled(dbSalesTarget),
    [dbSalesTarget],
  );

  const activeClientStatus = React.useMemo(
    () => activeDropdownLabeledWithColor(dbClientStatus),
    [dbClientStatus],
  );

  const handleOpen = () => {
    reset(accountToForm(account));
    setEditOpen(true);
  };

  const handleClose = () => {
    setEditOpen(false);
    updateAccountMutation.reset();
  };

  const onSubmit = async (data: UpdateAccountData) => {
    const dataToSubmit: UpdateAccountData = {
      name: data.name,
      parent_company: data.parent_company?.trim() || null,
      parent_logo_url: data.parent_logo_url?.trim() || null,
      logo_url: data.logo_url || null,
      location: data.location || null,
      website: data.website || null,
      phone: data.phone || null,
      industry: data.industry || null,
      category: data.category || null,
      secondary_category: data.secondary_category || null,
      sales_target: data.sales_target?.length ? data.sales_target : null,
      client_status: data.client_status || null,
      tertiary_category: data.tertiary_category?.length
        ? data.tertiary_category
        : null,
      merken: data.merken?.length ? data.merken : null,
      labels: data.labels?.length ? data.labels : null,
      fte_count:
        typeof data.fte_count === "number" && Number.isFinite(data.fte_count)
          ? data.fte_count
          : null,
      revenue_cents:
        typeof data.revenue_cents === "number" &&
        Number.isFinite(data.revenue_cents)
          ? data.revenue_cents
          : null,
      notes: data.notes || null,
    };

    try {
      await updateAccountMutation.mutateAsync({
        uid: account.uid,
        data: dataToSubmit,
      });
      handleClose();
    } catch (error) {
      console.error("Failed to update account:", error);
    }
  };

  const nameValue = watch("name");

  return (
    <>
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h6" fontWeight="bold">
            Bedrijfsdetails
          </Typography>
          <IconButton
            size="small"
            onClick={handleOpen}
            sx={{ color: "text.secondary" }}
            aria-label="Bewerk bedrijfsgegevens"
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Box>
        <Stack spacing={2}>
          <Box display="flex" justifyContent="space-between">
            <Typography color="text.secondary">Bedrijfsnaam</Typography>
            <Typography fontWeight="bold">{account.name}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography color="text.secondary">Moederbedrijf</Typography>
            <Typography fontWeight="bold">{account.parent_company?.trim() || "-"}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography color="text.secondary">Locatie</Typography>
            <Typography fontWeight="bold">{account.location || "-"}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography color="text.secondary">Website</Typography>
            <Typography fontWeight="bold">
              {account.website ? (
                <a
                  href={account.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "inherit", textDecoration: "underline" }}
                >
                  {account.website.replace(/^https?:\/\//, "")}
                </a>
              ) : (
                "-"
              )}
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography color="text.secondary">Telefoon</Typography>
            <Typography fontWeight="bold">{account.phone || "-"}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography color="text.secondary">Branche</Typography>
            <Typography fontWeight="bold">{account.industry || "-"}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography color="text.secondary">Categorie</Typography>
            <Typography fontWeight="bold">{account.category || "-"}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography color="text.secondary">Secundaire categorie</Typography>
            <Typography fontWeight="bold">{account.secondary_category || "-"}</Typography>
          </Box>
          <Box>
            <Typography color="text.secondary" sx={{ mb: 0.5 }}>
              Sales doel
            </Typography>
            {(() => {
              const values = accountSalesTargetsAsValues(account.sales_target);
              if (!values.length) {
                return <Typography fontWeight="bold">-</Typography>;
              }
              return (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {values.map((v) => (
                    <Chip
                      key={v}
                      label={activeSalesTargets.find((o) => o.value === v)?.label ?? v}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              );
            })()}
          </Box>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography color="text.secondary">Klant status</Typography>
            {account.client_status ? (
              <Chip
                label={activeClientStatus.find((o) => o.value === account.client_status)?.label || account.client_status}
                size="small"
                sx={{
                  bgcolor: activeClientStatus.find((o) => o.value === account.client_status)?.color || "grey.400",
                  color: ["active_client", "lost"].includes(account.client_status) ? "white" : "black",
                  fontWeight: "bold",
                }}
              />
            ) : (
              <Typography fontWeight="bold">-</Typography>
            )}
          </Box>
          {account.tertiary_category && account.tertiary_category.length > 0 && (
            <Box>
              <Typography color="text.secondary" sx={{ mb: 0.5 }}>
                Tertiaire categorie
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {account.tertiary_category.map((c) => (
                  <Chip key={c} label={c} size="small" variant="outlined" />
                ))}
              </Box>
            </Box>
          )}
          {account.merken && account.merken.length > 0 && (
            <Box>
              <Typography color="text.secondary" sx={{ mb: 0.5 }}>
                Merken
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {account.merken.map((m) => (
                  <Chip key={m} label={m} size="small" variant="outlined" />
                ))}
              </Box>
            </Box>
          )}
          {account.labels && account.labels.length > 0 && (
            <Box>
              <Typography color="text.secondary" sx={{ mb: 0.5 }}>
                Labels
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {account.labels.map((l) => (
                  <Chip key={l} label={l} size="small" variant="outlined" />
                ))}
              </Box>
            </Box>
          )}
          <Box display="flex" justifyContent="space-between">
            <Typography color="text.secondary">Aantal FTE</Typography>
            <Typography fontWeight="bold">
              {account.fte_count ? account.fte_count.toLocaleString("nl-NL") : "-"}
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography color="text.secondary">Omzet</Typography>
            <Typography fontWeight="bold">
              {formatRevenueFullEuro(account.revenue_cents)}
            </Typography>
          </Box>
          {account.notes && (
            <Box>
              <Typography color="text.secondary" sx={{ mb: 0.5 }}>
                Notities
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  whiteSpace: "pre-wrap",
                  bgcolor: "grey.50",
                  p: 1.5,
                  borderRadius: 1,
                }}
              >
                {account.notes}
              </Typography>
            </Box>
          )}
        </Stack>
      </Paper>

      <Dialog open={editOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>Bedrijfsgegevens bewerken</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              {updateAccountMutation.isError && (
                <Alert severity="error">
                  {(updateAccountMutation.error as ApiError)?.response?.data
                    ?.message ||
                    "Er ging iets mis bij het opslaan. Probeer het opnieuw."}
                </Alert>
              )}

              <TextField
                label="Bedrijfsnaam"
                {...register("name", { required: true })}
                fullWidth
                required
                error={!!errors.name}
              />

              <TextField
                label="Moederbedrijf"
                {...register("parent_company")}
                fullWidth
                placeholder="Vrij veld, bijv. naam van de holding"
              />

              <TextField
                label="Moederbedrijf logo URL"
                {...register("parent_logo_url")}
                fullWidth
                placeholder="https://example.com/holding-logo.png"
                type="url"
              />

              <TextField
                label="Logo URL"
                {...register("logo_url")}
                fullWidth
                placeholder="https://example.com/logo.png"
                type="url"
              />

              <TextField
                label="Locatie"
                {...register("location")}
                fullWidth
                placeholder="bijv. Amsterdam, Nederland"
              />

              <TextField
                label="Website"
                {...register("website")}
                fullWidth
                placeholder="https://www.voorbeeld.nl"
                type="url"
              />

              <TextField
                label="Telefoon"
                {...register("phone")}
                fullWidth
                placeholder="bijv. +31 20 123 4567"
              />

              <TextField
                label="Branche"
                {...register("industry")}
                fullWidth
                placeholder="bijv. IT, Financiën, Logistiek"
              />

              <ClassificationFields control={control} errors={errors} />

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Sales doel
                </Typography>
                <Controller
                  name="sales_target"
                  control={control}
                  render={({ field }) => (
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 1,
                        alignItems: "center",
                        minHeight: 36,
                      }}
                    >
                      {isSalesTargetPending ? (
                        <CircularProgress size={22} />
                      ) : activeSalesTargets.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          Geen actieve opties. Stel ze in of zet ze aan bij
                          Instellingen → Dropdown opties → Sales doel.
                        </Typography>
                      ) : (
                        activeSalesTargets.map((opt) => {
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
                                    : [...selected, opt.value],
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
                        })
                      )}
                    </Box>
                  )}
                />
              </Box>

              <Controller
                name="client_status"
                control={control}
                render={({ field }) => (
                  <TextField
                    select
                    label="Klant status"
                    {...field}
                    value={field.value || ""}
                    fullWidth
                  >
                    <MenuItem value="">Geen status</MenuItem>
                    {activeClientStatus.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: opt.color, flexShrink: 0 }} />
                          {opt.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />

              <TextField
                label="Aantal FTE"
                {...register("fte_count", { valueAsNumber: true })}
                fullWidth
                placeholder="50"
                type="number"
                inputProps={{ min: 0 }}
              />

              <Controller
                name="revenue_cents"
                control={control}
                render={({ field }) => (
                  <TextField
                    label="Jaaromzet"
                    value={
                      typeof field.value === "number"
                        ? Math.round(field.value / 100).toLocaleString("nl-NL")
                        : ""
                    }
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      field.onChange(digits ? parseInt(digits, 10) * 100 : null);
                    }}
                    fullWidth
                    placeholder="1000000"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">€</InputAdornment>
                      ),
                    }}
                    helperText="Voer het bedrag in euro's in"
                  />
                )}
              />

              <TextField
                label="Notities"
                {...register("notes")}
                fullWidth
                multiline
                rows={4}
                placeholder="Extra informatie over dit bedrijf..."
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleClose} disabled={updateAccountMutation.isPending}>
              Annuleren
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={updateAccountMutation.isPending || !nameValue?.trim()}
              startIcon={updateAccountMutation.isPending ? <CircularProgress size={16} /> : null}
            >
              {updateAccountMutation.isPending ? "Opslaan..." : "Opslaan"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
