import React, { useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Button,
  IconButton,
  Switch,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Divider,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
} from "@mui/icons-material";
import {
  useAllDropdownOptions,
  type DropdownOption,
} from "../../../api/queries/dropdownOptions";
import {
  useCreateDropdownOption,
  useUpdateDropdownOption,
  useDeleteDropdownOption,
  useReorderDropdownOptions,
} from "../../../api/mutations/dropdownOptions";

const DROPDOWN_TYPE_GROUPS: {
  label: string;
  types: { type: string; label: string }[];
}[] = [
  {
    label: "Contact / Netwerk",
    types: [
      { type: "education", label: "Opleiding" },
      { type: "network_role", label: "Netwerk rollen" },
      { type: "gender", label: "Geslacht" },
    ],
  },
  {
    label: "Accounts",
    types: [
      { type: "account_category", label: "Categorie" },
      { type: "account_secondary_category", label: "Secundaire categorie" },
      { type: "account_tertiary_category", label: "Tertiaire categorie" },
      { type: "account_brand", label: "Merken" },
      { type: "account_label", label: "Labels" },
      { type: "sales_target", label: "Sales doel" },
      { type: "client_status", label: "Klant status" },
    ],
  },
  {
    label: "Opdrachten",
    types: [
      { type: "assignment_status", label: "Opdracht status" },
      {
        type: "candidate_assignment_status",
        label: "Kandidaat opdracht status",
      },
      { type: "employment_type", label: "Dienstverband" },
      { type: "benefit", label: "Arbeidsvoorwaarden" },
    ],
  },
  {
    label: "Overig",
    types: [
      { type: "activity_type", label: "Activiteittype" },
      { type: "calendar_event_type", label: "Kalender event type" },
    ],
  },
];

const ALL_TYPES = DROPDOWN_TYPE_GROUPS.flatMap((g) => g.types);

function TypeLabel(typeName: string): string {
  return ALL_TYPES.find((t) => t.type === typeName)?.label ?? typeName;
}

export default function DropdownOptionsTab() {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  if (selectedType) {
    return (
      <TypeEditor
        type={selectedType}
        typeLabel={TypeLabel(selectedType)}
        onBack={() => setSelectedType(null)}
      />
    );
  }

  return <TypeList onSelect={setSelectedType} />;
}

function TypeList({ onSelect }: { onSelect: (type: string) => void }) {
  const { data: allOptions, isLoading } = useAllDropdownOptions();

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Dropdown opties
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Beheer de opties die beschikbaar zijn in dropdown-menu&apos;s door de
        applicatie heen. Klik op een categorie om de opties te bewerken.
      </Typography>

      {isLoading ? (
        <Typography variant="body2" color="text.secondary">
          Laden...
        </Typography>
      ) : (
        <Stack spacing={3}>
          {DROPDOWN_TYPE_GROUPS.map((group) => (
            <Paper key={group.label} variant="outlined">
              <Typography
                variant="subtitle2"
                sx={{ px: 2, pt: 1.5, pb: 0.5, fontWeight: 600 }}
              >
                {group.label}
              </Typography>
              <List disablePadding>
                {group.types.map((t) => {
                  const options = allOptions?.[t.type] || [];
                  const activeCount = options.filter(
                    (o) => o.is_active,
                  ).length;
                  return (
                    <ListItemButton
                      key={t.type}
                      onClick={() => onSelect(t.type)}
                      sx={{ px: 2 }}
                    >
                      <ListItemText
                        primary={t.label}
                        secondary={`${activeCount} actieve opties`}
                      />
                      <Chip
                        label={`${options.length} totaal`}
                        size="small"
                        variant="outlined"
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}

function TypeEditor({
  type,
  typeLabel,
  onBack,
}: {
  type: string;
  typeLabel: string;
  onBack: () => void;
}) {
  const { data: allOptions } = useAllDropdownOptions();
  const options = (allOptions?.[type] || []).sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  const createMutation = useCreateDropdownOption();
  const updateMutation = useUpdateDropdownOption();
  const deleteMutation = useDeleteDropdownOption();
  const reorderMutation = useReorderDropdownOptions();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editColor, setEditColor] = useState("");
  const [error, setError] = useState<string | null>(null);

  const hasColors = options.some((o) => o.color);

  const handleAdd = async () => {
    if (!newValue.trim() || !newLabel.trim()) return;

    try {
      await createMutation.mutateAsync({
        type,
        value: newValue.trim(),
        label: newLabel.trim(),
        color: newColor.trim() || null,
      });
      setNewValue("");
      setNewLabel("");
      setNewColor("");
      setAddDialogOpen(false);
      setError(null);
    } catch (e: any) {
      setError(
        e?.response?.data?.message || "Fout bij toevoegen van optie",
      );
    }
  };

  const handleSaveEdit = async (option: DropdownOption) => {
    try {
      await updateMutation.mutateAsync({
        id: option.id,
        label: editLabel.trim(),
        color: editColor.trim() || null,
      });
      setEditingId(null);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Fout bij opslaan");
    }
  };

  const handleToggleActive = async (option: DropdownOption) => {
    try {
      await updateMutation.mutateAsync({
        id: option.id,
        is_active: !option.is_active,
      });
    } catch (e: any) {
      setError(e?.response?.data?.message || "Fout bij bijwerken");
    }
  };

  const handleDelete = async (option: DropdownOption) => {
    if (
      !window.confirm(
        `Weet je zeker dat je "${option.label}" wilt verwijderen?`,
      )
    )
      return;
    try {
      await deleteMutation.mutateAsync(option.id);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Fout bij verwijderen");
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= options.length) return;

    const newOrder = [...options];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(newIndex, 0, moved);

    try {
      await reorderMutation.mutateAsync({
        type,
        order: newOrder.map((o) => o.id),
      });
    } catch (e: any) {
      setError(e?.response?.data?.message || "Fout bij herschikken");
    }
  };

  const startEdit = (option: DropdownOption) => {
    setEditingId(option.id);
    setEditLabel(option.label);
    setEditColor(option.color || "");
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton onClick={onBack} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6">{typeLabel}</Typography>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined">
        <Stack divider={<Divider />}>
          {options.map((option, index) => (
            <Box
              key={option.id}
              sx={{
                px: 2,
                py: 1.5,
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                opacity: option.is_active ? 1 : 0.5,
              }}
            >
              <Stack direction="column" spacing={0}>
                <IconButton
                  size="small"
                  disabled={index === 0}
                  onClick={() => handleMove(index, "up")}
                  sx={{ p: 0.25 }}
                >
                  <ArrowUpIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <IconButton
                  size="small"
                  disabled={index === options.length - 1}
                  onClick={() => handleMove(index, "down")}
                  sx={{ p: 0.25 }}
                >
                  <ArrowDownIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Stack>

              {option.color && (
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    bgcolor: option.color,
                    flexShrink: 0,
                    border: 1,
                    borderColor: "divider",
                  }}
                />
              )}

              {editingId === option.id ? (
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ flex: 1 }}
                >
                  <TextField
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    size="small"
                    label="Label"
                    sx={{ flex: 1 }}
                  />
                  {hasColors && (
                    <TextField
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      size="small"
                      label="Kleur"
                      placeholder="#hex"
                      sx={{ width: 120 }}
                      InputProps={{
                        startAdornment: editColor ? (
                          <InputAdornment position="start">
                            <Box
                              sx={{
                                width: 14,
                                height: 14,
                                borderRadius: "50%",
                                bgcolor: editColor,
                              }}
                            />
                          </InputAdornment>
                        ) : undefined,
                      }}
                    />
                  )}
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => handleSaveEdit(option)}
                    disabled={updateMutation.isPending}
                  >
                    Opslaan
                  </Button>
                  <Button size="small" onClick={() => setEditingId(null)}>
                    Annuleren
                  </Button>
                </Stack>
              ) : (
                <>
                  <Box
                    sx={{ flex: 1, cursor: "pointer" }}
                    onClick={() => startEdit(option)}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {option.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      waarde: {option.value}
                    </Typography>
                  </Box>

                  <Switch
                    size="small"
                    checked={option.is_active}
                    onChange={() => handleToggleActive(option)}
                    title={option.is_active ? "Actief" : "Inactief"}
                  />

                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(option)}
                    disabled={deleteMutation.isPending}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </>
              )}
            </Box>
          ))}
        </Stack>
      </Paper>

      <Button
        startIcon={<AddIcon />}
        onClick={() => setAddDialogOpen(true)}
        sx={{ mt: 2 }}
        variant="outlined"
      >
        Optie toevoegen
      </Button>

      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Nieuwe optie toevoegen</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Waarde (intern)"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              fullWidth
              size="small"
              helperText="Technische sleutel, niet meer wijzigbaar na aanmaken"
            />
            <TextField
              label="Label (weergave)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              fullWidth
              size="small"
            />
            {hasColors && (
              <TextField
                label="Kleur (hex)"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                fullWidth
                size="small"
                placeholder="#818cf8"
                InputProps={{
                  startAdornment: newColor ? (
                    <InputAdornment position="start">
                      <Box
                        sx={{
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          bgcolor: newColor,
                        }}
                      />
                    </InputAdornment>
                  ) : undefined,
                }}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Annuleren</Button>
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={
              !newValue.trim() ||
              !newLabel.trim() ||
              createMutation.isPending
            }
          >
            Toevoegen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
