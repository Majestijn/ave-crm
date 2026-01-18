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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import type { Account } from "../../types/accounts";
import { formatRevenueFullEuro } from "../../utils/formatters";
import { useUpdateAccount, type UpdateAccountData } from "../../api/mutations/accounts";

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
    industry: account.industry || "",
    fte_count: account.fte_count || null,
    revenue_cents: account.revenue_cents || null,
    notes: account.notes || "",
  });
  const [revenueInput, setRevenueInput] = useState(
    account.revenue_cents ? (account.revenue_cents / 100).toString() : ""
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
      industry: account.industry || "",
      fte_count: account.fte_count || null,
      revenue_cents: account.revenue_cents || null,
      notes: account.notes || "",
    });
    setRevenueInput(
      account.revenue_cents ? (account.revenue_cents / 100).toString() : ""
    );
    setFteInput(account.fte_count ? account.fte_count.toString() : "");
    setEditOpen(true);
  };

  const handleClose = () => {
    setEditOpen(false);
    updateAccountMutation.reset();
  };

  const handleRevenueChange = (value: string) => {
    setRevenueInput(value);
    const parsed = parseFloat(value.replace(/[^\d.,]/g, "").replace(",", "."));
    if (!isNaN(parsed)) {
      setFormData((prev) => ({ ...prev, revenue_cents: Math.round(parsed * 100) }));
    } else if (value === "") {
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
      industry: formData.industry || null,
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
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  {account.website.replace(/^https?:\/\//, "")}
                </a>
              ) : (
                "-"
              )}
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography color="text.secondary">Branche</Typography>
            <Typography fontWeight="bold">{account.industry || "-"}</Typography>
          </Box>
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
                label="Branche"
                value={formData.industry || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, industry: e.target.value }))}
                fullWidth
                placeholder="bijv. IT, Financiën, Logistiek"
              />

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
