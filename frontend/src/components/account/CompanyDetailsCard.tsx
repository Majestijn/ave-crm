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
import type { Account } from "../../types/accounts";
import { formatRevenueFullEuro } from "../../utils/formatters";

// Helper function to format number with thousand separators (Dutch format)
const formatNumberInput = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return parseInt(digits, 10).toLocaleString("nl-NL");
};
import { useUpdateAccount, type UpdateAccountData } from "../../api/mutations/accounts";

const SECONDARY_CATEGORY_OPTIONS = [
  "Retailer",
  "Groothandel",
  "Leverancier",
  "Industrie",
  "Andere",
] as const;

const TERTIARY_CATEGORY_OPTIONS = ["Non-food", "Food"] as const;

const MERKEN_OPTIONS = ["Merk", "Private label"] as const;

const LABELS_OPTIONS = [
  "Vers",
  "Zuivel & eieren",
  "Diepvries",
  "DKW (houdbaar voedsel)",
  "Dranken",
  "Snacks & snoep",
  "Non-food",
  "Verpakkingen",
  "Convenience & ready-to-use",
] as const;

type Props = {
  account: Account;
};

export default function CompanyDetailsCard({ account }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [formData, setFormData] = useState<UpdateAccountData>({
    name: account.name,
    logo_url: account.logo_url || "",
    location: account.location || "",
    website: account.website || "",
    phone: account.phone || "",
    industry: account.industry || "",
    category: account.category || "",
    secondary_category: account.secondary_category || "",
    tertiary_category: account.tertiary_category || null,
    merken: account.merken || null,
    labels: account.labels || null,
    fte_count: account.fte_count || null,
    revenue_cents: account.revenue_cents || null,
    notes: account.notes || "",
  });
  const [revenueInput, setRevenueInput] = useState(
    account.revenue_cents ? Math.round(account.revenue_cents / 100).toLocaleString("nl-NL") : ""
  );
  const [fteInput, setFteInput] = useState(
    account.fte_count ? account.fte_count.toString() : ""
  );

  const updateAccountMutation = useUpdateAccount();

  const handleOpen = () => {
    setFormData({
      name: account.name,
      logo_url: account.logo_url || "",
      location: account.location || "",
      website: account.website || "",
      phone: account.phone || "",
      industry: account.industry || "",
      category: account.category || "",
      secondary_category: account.secondary_category || "",
      tertiary_category: account.tertiary_category || null,
      merken: account.merken || null,
      labels: account.labels || null,
      fte_count: account.fte_count || null,
      revenue_cents: account.revenue_cents || null,
      notes: account.notes || "",
    });
    setRevenueInput(
      account.revenue_cents ? Math.round(account.revenue_cents / 100).toLocaleString("nl-NL") : ""
    );
    setFteInput(account.fte_count ? account.fte_count.toString() : "");
    setEditOpen(true);
  };

  const handleClose = () => {
    setEditOpen(false);
    updateAccountMutation.reset();
  };

  const handleRevenueChange = (value: string) => {
    const formatted = formatNumberInput(value);
    setRevenueInput(formatted);
    const digits = value.replace(/\D/g, "");
    if (digits) {
      setFormData((prev) => ({ ...prev, revenue_cents: parseInt(digits, 10) * 100 }));
    } else {
      setFormData((prev) => ({ ...prev, revenue_cents: null }));
    }
  };

  const handleFteChange = (value: string) => {
    setFteInput(value);
    const parsed = parseInt(value.replace(/[^\d]/g, ""), 10);
    if (!isNaN(parsed)) {
      setFormData((prev) => ({ ...prev, fte_count: parsed }));
    } else if (value === "") {
      setFormData((prev) => ({ ...prev, fte_count: null }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dataToSubmit: UpdateAccountData = {
      name: formData.name,
      logo_url: formData.logo_url || null,
      location: formData.location || null,
      website: formData.website || null,
      phone: formData.phone || null,
      industry: formData.industry || null,
      category: formData.category || null,
      secondary_category: formData.secondary_category || null,
      tertiary_category: formData.tertiary_category,
      merken: formData.merken,
      labels: formData.labels,
      fte_count: formData.fte_count,
      revenue_cents: formData.revenue_cents,
      notes: formData.notes || null,
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
        <form onSubmit={handleSubmit}>
          <DialogTitle>Bedrijfsgegevens bewerken</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              {updateAccountMutation.isError && (
                <Alert severity="error">
                  Er ging iets mis bij het opslaan. Probeer het opnieuw.
                </Alert>
              )}

              <TextField
                label="Bedrijfsnaam"
                value={formData.name || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                fullWidth
                required
              />

              <TextField
                label="Logo URL"
                value={formData.logo_url || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, logo_url: e.target.value }))}
                fullWidth
                placeholder="https://example.com/logo.png"
                type="url"
              />

              <TextField
                label="Locatie"
                value={formData.location || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                fullWidth
                placeholder="bijv. Amsterdam, Nederland"
              />

              <TextField
                label="Website"
                value={formData.website || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
                fullWidth
                placeholder="https://www.voorbeeld.nl"
                type="url"
              />

              <TextField
                label="Telefoon"
                value={formData.phone || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                fullWidth
                placeholder="bijv. +31 20 123 4567"
              />

              <TextField
                label="Branche"
                value={formData.industry || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, industry: e.target.value }))}
                fullWidth
                placeholder="bijv. IT, Financiën, Logistiek"
              />

              <TextField
                select
                label="Categorie"
                value={formData.category || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                fullWidth
              >
                <MenuItem value="">Geen categorie</MenuItem>
                <MenuItem value="FMCG">FMCG</MenuItem>
                <MenuItem value="Foodservice">Foodservice</MenuItem>
                <MenuItem value="Overig">Overig</MenuItem>
              </TextField>

              <TextField
                select
                label="Secundaire categorie"
                value={formData.secondary_category || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, secondary_category: e.target.value }))
                }
                fullWidth
              >
                <MenuItem value="">Geen secundaire categorie</MenuItem>
                {SECONDARY_CATEGORY_OPTIONS.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </TextField>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Tertiaire categorie
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {TERTIARY_CATEGORY_OPTIONS.map((opt) => {
                    const isSelected = (formData.tertiary_category || []).includes(opt);
                    return (
                      <Chip
                        key={opt}
                        label={opt}
                        size="small"
                        variant={isSelected ? "filled" : "outlined"}
                        color={isSelected ? "primary" : "default"}
                        onClick={() => {
                          setFormData((prev) => {
                            const current = prev.tertiary_category || [];
                            const next = current.includes(opt)
                              ? current.filter((o) => o !== opt)
                              : [...current, opt];
                            return { ...prev, tertiary_category: next };
                          });
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
                  Merken
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {MERKEN_OPTIONS.map((opt) => {
                    const isSelected = (formData.merken || []).includes(opt);
                    return (
                      <Chip
                        key={opt}
                        label={opt}
                        size="small"
                        variant={isSelected ? "filled" : "outlined"}
                        color={isSelected ? "primary" : "default"}
                        onClick={() => {
                          setFormData((prev) => {
                            const current = prev.merken || [];
                            const next = current.includes(opt)
                              ? current.filter((o) => o !== opt)
                              : [...current, opt];
                            return { ...prev, merken: next };
                          });
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
                  Labels
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {LABELS_OPTIONS.map((opt) => {
                    const isSelected = (formData.labels || []).includes(opt);
                    return (
                      <Chip
                        key={opt}
                        label={opt}
                        size="small"
                        variant={isSelected ? "filled" : "outlined"}
                        color={isSelected ? "primary" : "default"}
                        onClick={() => {
                          setFormData((prev) => {
                            const current = prev.labels || [];
                            const next = current.includes(opt)
                              ? current.filter((o) => o !== opt)
                              : [...current, opt];
                            return { ...prev, labels: next };
                          });
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

              <TextField
                label="Aantal FTE"
                value={fteInput}
                onChange={(e) => handleFteChange(e.target.value)}
                fullWidth
                placeholder="50"
                type="number"
                inputProps={{ min: 0 }}
              />

              <TextField
                label="Jaaromzet"
                value={revenueInput}
                onChange={(e) => handleRevenueChange(e.target.value)}
                fullWidth
                placeholder="1000000"
                InputProps={{
                  startAdornment: <InputAdornment position="start">€</InputAdornment>,
                }}
                helperText="Voer het bedrag in euro's in"
              />

              <TextField
                label="Notities"
                value={formData.notes || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
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
              disabled={updateAccountMutation.isPending || !formData.name?.trim()}
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
