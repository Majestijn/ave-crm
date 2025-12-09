import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Stack,
  Button,
  TextField,
  IconButton,
  InputAdornment,
} from "@mui/material";
import {
  Search as SearchIcon,
  Sort as SortIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  ArrowForward as ArrowForwardIcon,
} from "@mui/icons-material";
import { useAccounts } from "../../hooks/useAccounts";
import { useDisclosure } from "../../hooks/useDisclosure";
import API from "../../../axios-client";
import type { Account } from "../../types/accounts";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from "@mui/material";

const AccountSchema = z.object({
  name: z.string().min(1, "Bedrijfsnaam is verplicht"),
  logo_url: z.string().optional().or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  revenue_cents: z.number().optional(),
  notes: z.string().optional().or(z.literal("")),
});

type AccountForm = z.infer<typeof AccountSchema>;

// Helper function to format revenue
const formatRevenue = (revenueCents?: number): string => {
  if (!revenueCents) return "-";

  const millions = revenueCents / 1000000;
  const billions = revenueCents / 1000000000;

  if (billions >= 1) {
    return `${billions.toFixed(0)} mld`;
  } else if (millions >= 1) {
    return `${millions.toFixed(0)} mln`;
  } else {
    return `${(revenueCents / 1000).toFixed(0)} k`;
  }
};

export default function AccountsPage() {
  const navigate = useNavigate();
  const { accounts, loading, error, refresh } = useAccounts();
  const addAccount = useDisclosure();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    refresh();
  }, [refresh]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<AccountForm>({
    resolver: zodResolver(AccountSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      logo_url: "",
      location: "",
      website: "",
      revenue_cents: undefined,
      notes: "",
    },
  });

  const onSubmit = async (data: AccountForm) => {
    setSubmitError(null);
    try {
      await API.post("/accounts", data);
      addAccount.close();
      reset();
      await refresh();
    } catch (err: any) {
      console.error(err);
      if (err?.response?.data?.message) {
        setSubmitError(err.response.data.message);
      } else if (err?.response?.data?.errors) {
        const errors = err.response.data.errors;
        setSubmitError(Object.values(errors).flat().join(", "));
      } else {
        setSubmitError("Er is iets misgegaan. Probeer het opnieuw.");
      }
    }
  };

  const filteredAccounts = accounts.filter((account) =>
    account.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with search and filters */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" component="h1">
          Accounts
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={addAccount.open}
        >
          Account toevoegen
        </Button>
      </Box>

      {/* Search and filter bar */}
      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        <TextField
          placeholder="Zoeken..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ flexGrow: 1 }}
        />
        <Button
          variant="outlined"
          startIcon={<SortIcon />}
        >
          Sorteren
        </Button>
        <Button
          variant="outlined"
          startIcon={<FilterIcon />}
        >
          Filteren
        </Button>
      </Box>

      {/* Add Client Dialog */}
      <Dialog
        open={addAccount.isOpen}
        fullWidth
        maxWidth="md"
        onClose={() => {
          addAccount.close();
          setSubmitError(null);
          reset();
        }}
      >
        <DialogTitle>Nieuw account</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Bedrijfsnaam"
              required
              error={!!errors.name}
              helperText={errors.name?.message ?? " "}
              {...register("name")}
              fullWidth
            />

            <TextField
              label="Logo URL"
              error={!!errors.logo_url}
              helperText={errors.logo_url?.message ?? " "}
              {...register("logo_url")}
              fullWidth
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="Locatie"
                error={!!errors.location}
                helperText={errors.location?.message ?? " "}
                {...register("location")}
                fullWidth
              />
              <TextField
                label="Website"
                error={!!errors.website}
                helperText={errors.website?.message ?? " "}
                {...register("website")}
                fullWidth
              />
            </Stack>

            <TextField
              label="Omzet (in cents)"
              type="number"
              error={!!errors.revenue_cents}
              helperText={errors.revenue_cents?.message || "Bijv. 750000000 voor 750 miljoen"}
              {...register("revenue_cents", { valueAsNumber: true })}
              fullWidth
            />

            <TextField
              label="Notities"
              multiline
              rows={4}
              error={!!errors.notes}
              helperText={errors.notes?.message ?? " "}
              {...register("notes")}
              fullWidth
            />

            {submitError && (
              <Alert severity="error" onClose={() => setSubmitError(null)}>
                {submitError}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              addAccount.close();
              setSubmitError(null);
              reset();
            }}
          >
            Annuleren
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Bezig..." : "Opslaan"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clients Grid */}
      {loading && <Typography variant="body2">Laden…</Typography>}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && filteredAccounts.length === 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="body2" color="text.secondary" align="center">
            {searchQuery ? "Geen accounts gevonden voor deze zoekopdracht." : "Geen accounts gevonden. Voeg een account toe om te beginnen."}
          </Typography>
        </Paper>
      )}

      {!loading && !error && filteredAccounts.length > 0 && (
        <Stack spacing={2}>
          {filteredAccounts.map((account) => (
            <Card
              key={account.uid}
              sx={{
                width: "100%",
                cursor: "pointer",
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: 4,
                },
                display: "flex",
                flexDirection: "row",
              }}
              onClick={() => navigate(`/accounts/${account.uid}`)}
            >
              {/* Left indicator bar */}
              <Box
                sx={{
                  width: 4,
                  bgcolor: "green",
                  flexShrink: 0,
                }}
              />

              <CardContent sx={{ display: "flex", flexDirection: "row", alignItems: "center", width: "100%", gap: 3, justifyContent: "space-between" }}>
                {/* Logo */}
                {account.logo_url && (
                  <Box
                    sx={{
                      width: 120,
                      height: 120,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 1,
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={account.logo_url}
                      alt={account.name}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </Box>
                )}
                {/* Company Info */}
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Bedrijf
                  </Typography>
                  <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                    {account.name}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Omzet
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {formatRevenue(account.revenue_cents)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Opdrachten
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {account.assignments_count || 0} ({account.assignments_count || 0})
                  </Typography>
                </Box>

                {/* Arrow */}
                <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                  <ArrowForwardIcon color="action" />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
