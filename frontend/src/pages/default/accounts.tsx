import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Search as SearchIcon,
  Sort as SortIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  ArrowForward as ArrowForwardIcon,
  DeleteOutline as DeleteOutlineIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { useQueryClient } from "@tanstack/react-query";
import { useAccounts } from "../../hooks/useAccounts";
import { useDeleteAccount } from "../../api/mutations/accounts";
import { queryKeys } from "../../api/queries/keys";
import { useDisclosure } from "../../hooks/useDisclosure";
import API from "../../../axios-client";
import type { Account } from "../../types/accounts";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
function AccountCardLogo({
  logoUrl,
  name,
}: {
  logoUrl: string | null | undefined;
  name: string;
}) {
  const [imgError, setImgError] = React.useState(false);
  const showFallback = !logoUrl || imgError;

  return (
    <Box
      sx={{
        width: { xs: 60, sm: 80 },
        height: { xs: 60, sm: 80 },
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 1,
        bgcolor: showFallback ? "grey.100" : "transparent",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {showFallback && (
        <Typography
          variant="h6"
          sx={{ fontWeight: 600, color: "grey.500", fontSize: "1.5rem" }}
        >
          {name.charAt(0).toUpperCase()}
        </Typography>
      )}
      {logoUrl && !imgError && (
        <img
          src={logoUrl}
          alt={name}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
          }}
          loading="lazy"
          onError={() => setImgError(true)}
        />
      )}
    </Box>
  );
}

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

const AccountSchema = z.object({
  name: z.string().min(1, "Bedrijfsnaam is verplicht"),
  logo_url: z.string().optional().or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  industry: z.string().optional().or(z.literal("")),
  category: z.string().optional().or(z.literal("")),
  secondary_category: z.string().optional().or(z.literal("")),
  fte_count: z.number().optional(),
  notes: z.string().optional().or(z.literal("")),
});

type AccountForm = z.infer<typeof AccountSchema>;

// Helper function to format number with thousand separators (Dutch format)
const formatNumberInput = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return parseInt(digits, 10).toLocaleString("nl-NL");
};

// Helper function to format revenue (stored in cents, display in euros)
const formatRevenue = (revenueCents?: number): string => {
  if (!revenueCents) return "-";

  const euros = revenueCents / 100;
  const thousands = euros / 1000;
  const millions = euros / 1000000;
  const billions = euros / 1000000000;

  if (billions >= 1) {
    return `€${billions.toFixed(1)} mld`;
  } else if (millions >= 1) {
    return `€${millions.toFixed(1)} mln`;
  } else if (thousands >= 1) {
    return `€${thousands.toFixed(0)}k`;
  } else {
    return `€${euros.toFixed(0)}`;
  }
};

export default function AccountsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { accounts, loading, error, refresh } = useAccounts();
  const addAccount = useDisclosure();
  const deleteAccount = useDisclosure();
  const deleteAccountMutation = useDeleteAccount();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [revenueInput, setRevenueInput] = useState("");
  const [revenueValue, setRevenueValue] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<"name_asc" | "name_desc" | "revenue_desc" | "revenue_asc" | "assignments_desc" | "assignments_asc">("name_asc");
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [tertiaryCategory, setTertiaryCategory] = useState<string[]>([]);
  const [merken, setMerken] = useState<string[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [activeOnlyFilter, setActiveOnlyFilter] = useState(false);
  const [sortAnchor, setSortAnchor] = useState<null | HTMLElement>(null);
  const [filterAnchor, setFilterAnchor] = useState<null | HTMLElement>(null);

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
      phone: "",
      industry: "",
      category: "",
      secondary_category: "",
      fte_count: undefined,
      notes: "",
    },
  });

  const onSubmit = async (data: AccountForm) => {
    setSubmitError(null);
    try {
      const submitData = {
        ...data,
        secondary_category: data.secondary_category || undefined,
        tertiary_category: tertiaryCategory.length ? tertiaryCategory : undefined,
        merken: merken.length ? merken : undefined,
        labels: labels.length ? labels : undefined,
        revenue_cents: revenueValue ? revenueValue * 100 : undefined,
      };
      await API.post("/accounts", submitData);
      addAccount.close();
      reset();
      setRevenueInput("");
      setRevenueValue(undefined);
      setTertiaryCategory([]);
      setMerken([]);
      setLabels([]);
      await refresh();
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
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

  const filteredAccounts = React.useMemo(() => {
    let result = accounts.filter((account) =>
      account.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (categoryFilters.length > 0) {
      result = result.filter((a) => a.category && categoryFilters.includes(a.category));
    }
    if (activeOnlyFilter) {
      result = result.filter((a) => a.has_active_assignments);
    }

    const sorted = [...result].sort((a, b) => {
      switch (sortBy) {
        case "name_asc":
          return (a.name || "").localeCompare(b.name || "");
        case "name_desc":
          return (b.name || "").localeCompare(a.name || "");
        case "revenue_desc":
          return (b.revenue_cents ?? 0) - (a.revenue_cents ?? 0);
        case "revenue_asc":
          return (a.revenue_cents ?? 0) - (b.revenue_cents ?? 0);
        case "assignments_desc":
          return (b.assignments_count ?? 0) - (a.assignments_count ?? 0);
        case "assignments_asc":
          return (a.assignments_count ?? 0) - (b.assignments_count ?? 0);
        default:
          return 0;
      }
    });
    return sorted;
  }, [accounts, searchQuery, categoryFilters, activeOnlyFilter, sortBy]);

  const sortLabels: Record<typeof sortBy, string> = {
    name_asc: "Naam A–Z",
    name_desc: "Naam Z–A",
    revenue_desc: "Omzet hoog → laag",
    revenue_asc: "Omzet laag → hoog",
    assignments_desc: "Meeste opdrachten eerst",
    assignments_asc: "Minste opdrachten eerst",
  };

  const toggleCategory = (cat: string) => {
    setCategoryFilters((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleDeleteClick = (e: React.MouseEvent, account: Account) => {
    e.stopPropagation();
    setAccountToDelete(account);
    setDeleteError(null);
    deleteAccount.open();
  };

  const handleDeleteConfirm = async () => {
    if (!accountToDelete) return;
    setDeleteError(null);
    try {
      await deleteAccountMutation.mutateAsync(accountToDelete.uid);
      deleteAccount.close();
      setAccountToDelete(null);
      await refresh();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Fout bij verwijderen van klant";
      setDeleteError(msg);
    }
  };

  const handleDeleteCancel = () => {
    deleteAccount.close();
    setAccountToDelete(null);
    setDeleteError(null);
  };

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
          onClick={(e) => setSortAnchor(e.currentTarget)}
          color={sortBy !== "name_asc" ? "primary" : "inherit"}
        >
          Sorteren
        </Button>
        <Menu
          anchorEl={sortAnchor}
          open={Boolean(sortAnchor)}
          onClose={() => setSortAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        >
          <MenuItem onClick={() => { setSortBy("name_asc"); setSortAnchor(null); }}>
            Naam A–Z
          </MenuItem>
          <MenuItem onClick={() => { setSortBy("name_desc"); setSortAnchor(null); }}>
            Naam Z–A
          </MenuItem>
          <MenuItem onClick={() => { setSortBy("revenue_desc"); setSortAnchor(null); }}>
            Omzet hoog → laag
          </MenuItem>
          <MenuItem onClick={() => { setSortBy("revenue_asc"); setSortAnchor(null); }}>
            Omzet laag → hoog
          </MenuItem>
          <MenuItem onClick={() => { setSortBy("assignments_desc"); setSortAnchor(null); }}>
            Meeste opdrachten eerst
          </MenuItem>
          <MenuItem onClick={() => { setSortBy("assignments_asc"); setSortAnchor(null); }}>
            Minste opdrachten eerst
          </MenuItem>
        </Menu>
        <Button
          variant="outlined"
          startIcon={<FilterIcon />}
          onClick={(e) => setFilterAnchor(e.currentTarget)}
          color={categoryFilters.length > 0 || activeOnlyFilter ? "primary" : "inherit"}
        >
          Filteren
        </Button>
        <Menu
          anchorEl={filterAnchor}
          open={Boolean(filterAnchor)}
          onClose={() => setFilterAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        >
          <MenuItem onClick={() => toggleCategory("FMCG")}>
            <Checkbox checked={categoryFilters.includes("FMCG")} size="small" sx={{ mr: 1 }} disableRipple />
            FMCG
          </MenuItem>
          <MenuItem onClick={() => toggleCategory("Foodservice")}>
            <Checkbox checked={categoryFilters.includes("Foodservice")} size="small" sx={{ mr: 1 }} disableRipple />
            Foodservice
          </MenuItem>
          <MenuItem onClick={() => toggleCategory("Overig")}>
            <Checkbox checked={categoryFilters.includes("Overig")} size="small" sx={{ mr: 1 }} disableRipple />
            Overig
          </MenuItem>
          <Box sx={{ borderTop: 1, borderColor: "divider", my: 0.5 }} />
          <MenuItem
            onClick={() => setActiveOnlyFilter((prev) => !prev)}
            sx={{ bgcolor: activeOnlyFilter ? "action.selected" : undefined }}
          >
            <Checkbox checked={activeOnlyFilter} size="small" sx={{ mr: 1 }} disableRipple />
            Alleen met actieve opdrachten
          </MenuItem>
        </Menu>
      </Box>

      {/* Active filters & sort chips */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", mb: 2 }}>
        <Chip
          size="small"
          label={`Sorteren: ${sortLabels[sortBy]}`}
          onDelete={sortBy !== "name_asc" ? () => setSortBy("name_asc") : undefined}
          deleteIcon={sortBy !== "name_asc" ? <CloseIcon /> : undefined}
          variant="outlined"
        />
        {categoryFilters.map((cat) => (
          <Chip
            key={cat}
            size="small"
            label={`Categorie: ${cat}`}
            onDelete={() => toggleCategory(cat)}
            deleteIcon={<CloseIcon />}
          />
        ))}
        {activeOnlyFilter && (
          <Chip
            size="small"
            label="Alleen actieve opdrachten"
            onDelete={() => setActiveOnlyFilter(false)}
            deleteIcon={<CloseIcon />}
          />
        )}
        {searchQuery && (
          <Chip
            size="small"
            label={`Zoeken: "${searchQuery.length > 20 ? searchQuery.slice(0, 20) + "…" : searchQuery}"`}
            onDelete={() => setSearchQuery("")}
            deleteIcon={<CloseIcon />}
          />
        )}
        {(categoryFilters.length > 0 || activeOnlyFilter || searchQuery) && (
          <Button
            size="small"
            onClick={() => {
              setSortBy("name_asc");
              setCategoryFilters([]);
              setActiveOnlyFilter(false);
              setSearchQuery("");
            }}
          >
            Alles wissen
          </Button>
        )}
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
          setTertiaryCategory([]);
          setMerken([]);
          setLabels([]);
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
              <TextField
                label="Telefoon"
                error={!!errors.phone}
                helperText={errors.phone?.message ?? " "}
                {...register("phone")}
                fullWidth
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Branche"
                error={!!errors.industry}
                helperText={errors.industry?.message ?? " "}
                {...register("industry")}
                fullWidth
              />
              <TextField
                select
                label="Categorie"
                error={!!errors.category}
                helperText={errors.category?.message ?? " "}
                {...register("category")}
                defaultValue=""
                fullWidth
              >
                <MenuItem value="">Selecteer categorie...</MenuItem>
                <MenuItem value="FMCG">FMCG</MenuItem>
                <MenuItem value="Foodservice">Foodservice</MenuItem>
                <MenuItem value="Overig">Overig</MenuItem>
              </TextField>
              <TextField
                select
                label="Secundaire categorie"
                error={!!errors.secondary_category}
                helperText={errors.secondary_category?.message ?? " "}
                {...register("secondary_category")}
                defaultValue=""
                fullWidth
              >
                <MenuItem value="">Selecteer secundaire categorie...</MenuItem>
                {SECONDARY_CATEGORY_OPTIONS.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                Tertiaire categorie
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {TERTIARY_CATEGORY_OPTIONS.map((opt) => {
                  const isSelected = tertiaryCategory.includes(opt);
                  return (
                    <Chip
                      key={opt}
                      label={opt}
                      size="small"
                      variant={isSelected ? "filled" : "outlined"}
                      color={isSelected ? "primary" : "default"}
                      onClick={() => {
                        setTertiaryCategory((prev) =>
                          prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
                        );
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
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                Merken
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {MERKEN_OPTIONS.map((opt) => {
                  const isSelected = merken.includes(opt);
                  return (
                    <Chip
                      key={opt}
                      label={opt}
                      size="small"
                      variant={isSelected ? "filled" : "outlined"}
                      color={isSelected ? "primary" : "default"}
                      onClick={() => {
                        setMerken((prev) =>
                          prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
                        );
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
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                Labels
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {LABELS_OPTIONS.map((opt) => {
                  const isSelected = labels.includes(opt);
                  return (
                    <Chip
                      key={opt}
                      label={opt}
                      size="small"
                      variant={isSelected ? "filled" : "outlined"}
                      color={isSelected ? "primary" : "default"}
                      onClick={() => {
                        setLabels((prev) =>
                          prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
                        );
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

            <Stack direction="row" spacing={2}>
              <TextField
                label="Aantal FTE"
                type="number"
                error={!!errors.fte_count}
                helperText={errors.fte_count?.message ?? " "}
                {...register("fte_count", { valueAsNumber: true })}
                fullWidth
                InputProps={{ inputProps: { min: 0 } }}
              />

              <TextField
                label="Jaaromzet"
                value={revenueInput}
                onChange={(e) => {
                  const formatted = formatNumberInput(e.target.value);
                  setRevenueInput(formatted);
                  const digits = e.target.value.replace(/\D/g, "");
                  setRevenueValue(digits ? parseInt(digits, 10) : undefined);
                }}
                fullWidth
                helperText="Voer het bedrag in euro's in"
                InputProps={{
                  startAdornment: <InputAdornment position="start">€</InputAdornment>,
                }}
              />
            </Stack>

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

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={deleteAccount.isOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Klant verwijderen</DialogTitle>
        <Box sx={{ px: 3, pb: 1 }}>
          <Typography>
            Weet je zeker dat je {accountToDelete?.name} wilt verwijderen? Dit
            kan niet ongedaan worden gemaakt.
          </Typography>
          {deleteError && (
            <Alert
              severity="error"
              onClose={() => setDeleteError(null)}
              sx={{ mt: 2 }}
            >
              {deleteError}
            </Alert>
          )}
        </Box>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleDeleteCancel}
            disabled={deleteAccountMutation.isPending}
          >
            Annuleren
          </Button>
          <Button
            color="error"
            variant="contained"
            startIcon={<DeleteOutlineIcon />}
            onClick={handleDeleteConfirm}
            disabled={deleteAccountMutation.isPending}
          >
            {deleteAccountMutation.isPending ? "Bezig..." : "Verwijderen"}
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
                  bgcolor: account.has_active_assignments ? "green" : "grey.400",
                  flexShrink: 0,
                }}
              />

              <CardContent
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "60px 1fr 70px 80px auto",
                    sm: "80px 1fr 90px 100px auto",
                  },
                  gap: { xs: 2, sm: 3 },
                  alignItems: "center",
                  width: "100%",
                  minHeight: 72,
                }}
              >
                {/* Logo – altijd ruimte gereserveerd voor consistente uitlijning */}
                <AccountCardLogo logoUrl={account.logo_url} name={account.name} />

                {/* Bedrijfsnaam */}
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary" component="div">
                    Bedrijf
                  </Typography>
                  <Typography
                    variant="h6"
                    component="div"
                    sx={{
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {account.name}
                  </Typography>
                </Box>

                {/* Omzet */}
                <Box>
                  <Typography variant="caption" color="text.secondary" component="div">
                    Omzet
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {formatRevenue(account.revenue_cents)}
                  </Typography>
                </Box>

                {/* Opdrachten */}
                <Box>
                  <Typography variant="caption" color="text.secondary" component="div">
                    Opdrachten
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {account.assignments_count ?? 0} ({account.active_assignments_count ?? 0})
                  </Typography>
                </Box>

                {/* Actions */}
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 0.5, justifySelf: "end" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Tooltip title="Klant verwijderen">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => handleDeleteClick(e, account)}
                      aria-label={`${account.name} verwijderen`}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
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
