import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  MenuItem,
  Autocomplete,
  Chip,
} from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  GridActionsCellItem,
} from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useContacts } from "../../hooks/useContacts";
import BulkImportDialog from "../../components/features/BulkImportDialog";
import { useDisclosure } from "../../hooks/useDisclosure";
import API from "../../../axios-client";
import type { Contact } from "../../types/contacts";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const networkRoleOptions = [
  { value: "invoice_contact", label: "Factuurcontact" },
  { value: "candidate", label: "Kandidaat" },
  { value: "interim", label: "Interimmer" },
  { value: "ambassador", label: "Ambassadeur" },
  { value: "potential_management", label: "Potentieel Management" },
  { value: "co_decision_maker", label: "Medebeslisser" },
  { value: "potential_directie", label: "Potentieel Directie" },
  { value: "candidate_reference", label: "Referentie van kandidaat" },
  { value: "hr_employment", label: "HR arbeidsvoorwaarden" },
  { value: "hr_recruiters", label: "HR recruiters" },
  { value: "directie", label: "Directie" },
  { value: "owner", label: "Eigenaar" },
  { value: "expert", label: "Expert" },
  { value: "coach", label: "Coach" },
  { value: "former_owner", label: "Oud eigenaar" },
  { value: "former_director", label: "Oud directeur" },
  { value: "commissioner", label: "Commissaris" },
  { value: "investor", label: "Investeerder" },
  { value: "network_group", label: "Netwerkgroep" },
];

const ContactSchema = z.object({
  first_name: z.string().min(1, "Voornaam is verplicht"),
  prefix: z.string().optional(),
  last_name: z.string().min(1, "Achternaam is verplicht"),
  gender: z.string().optional(),
  location: z.string().optional(),
  company_role: z.string().optional(),
  network_roles: z.array(
    z.enum([
      "invoice_contact",
      "candidate",
      "interim",
      "ambassador",
      "potential_management",
      "co_decision_maker",
      "potential_directie",
      "candidate_reference",
      "hr_employment",
      "hr_recruiters",
      "directie",
      "owner",
      "expert",
      "coach",
      "former_owner",
      "former_director",
      "commissioner",
      "investor",
      "network_group",
    ])
  ).optional(),
  current_company: z.string().optional(),
  current_salary_cents: z.number().optional(),
  education: z.enum(["MBO", "HBO", "UNI"]).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  linkedin_url: z.string().url().optional().or(z.literal("")),
  notes: z.string().optional(),
});

type ContactForm = z.infer<typeof ContactSchema>;

const networkRoleLabels: Record<string, string> = {
  invoice_contact: "Factuurcontact",
  candidate: "Kandidaat",
  interim: "Interimmer",
  ambassador: "Ambassadeur",
  potential_management: "Potentieel Management",
  co_decision_maker: "Medebeslisser",
  potential_directie: "Potentieel Directie",
  candidate_reference: "Referentie van kandidaat",
  hr_employment: "HR arbeidsvoorwaarden",
  hr_recruiters: "HR recruiters",
  directie: "Directie",
  owner: "Eigenaar",
  expert: "Expert",
  coach: "Coach",
  former_owner: "Oud eigenaar",
  former_director: "Oud directeur",
  commissioner: "Commissaris",
  investor: "Investeerder",
  network_group: "Netwerkgroep",
};

export default function NetworkPage() {
  const { contacts, loading, error, refresh } = useContacts();
  const addContact = useDisclosure();
  const bulkImport = useDisclosure();
  const deleteConfirm = useDisclosure();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    control,
  } = useForm<ContactForm>({
    resolver: zodResolver(ContactSchema),
    mode: "onBlur",
    defaultValues: {
      first_name: "",
      prefix: "",
      last_name: "",
      gender: "",
      location: "",
      company_role: "",
      network_roles: [],
      current_company: "",
      current_salary_cents: undefined,
      education: undefined,
      email: "",
      phone: "",
      linkedin_url: "",
      notes: "",
    },
  });

  const onSubmit = async (data: ContactForm) => {
    setSubmitError(null);
    try {
      await API.post("/contacts", data);
      addContact.close();
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

  const handleDeleteClick = (contact: Contact) => {
    setDeletingContact(contact);
    setDeleteError(null);
    deleteConfirm.open();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingContact) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await API.delete(`/contacts/${deletingContact.uid}`);
      deleteConfirm.close();
      setDeletingContact(null);
      await refresh();
    } catch (err: any) {
      console.error("Error deleting contact:", err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Fout bij verwijderen van contact";
      setDeleteError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    deleteConfirm.close();
    setDeletingContact(null);
    setDeleteError(null);
  };

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Naam",
      flex: 1,
      minWidth: 200,
      valueGetter: (value, row) =>
        row.name || [row.first_name, row.prefix, row.last_name].filter(Boolean).join(" "),
    },
    {
      field: "email",
      headerName: "E-mail",
      flex: 1,
      minWidth: 200,
      valueGetter: (value) => value || "-",
    },
    {
      field: "phone",
      headerName: "Telefoon",
      width: 150,
      valueGetter: (value) => value || "-",
    },
    {
      field: "company_role",
      headerName: "Functie",
      flex: 1,
      minWidth: 180,
      valueGetter: (value) => value || "-",
    },
    {
      field: "current_company",
      headerName: "Bedrijf",
      flex: 1,
      minWidth: 180,
      valueGetter: (value) => value || "-",
    },
    {
      field: "location",
      headerName: "Locatie",
      width: 150,
      valueGetter: (value) => value || "-",
    },
    {
      field: "network_roles",
      headerName: "Netwerk rollen",
      width: 250,
      valueGetter: (value: string[] | null | undefined) => {
        if (!value || value.length === 0) return "-";
        return value.map((role) => networkRoleLabels[role] || role).join(", ");
      },
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Acties",
      width: 100,
      getActions: (params) => {
        const contact = params.row as Contact;
        return [
          <GridActionsCellItem
            key="delete"
            icon={<DeleteOutlineIcon />}
            label="Verwijderen"
            onClick={() => handleDeleteClick(contact)}
            showInMenu={false}
          />,
        ];
      },
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5" component="h1">
          Netwerk
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={bulkImport.open}
          >
            Bulk Import (50)
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={addContact.open}
          >
            Contact toevoegen
          </Button>
        </Stack>
      </Box>

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={bulkImport.isOpen}
        onClose={bulkImport.close}
        onSuccess={refresh}
      />

      {/* Add Contact Dialog */}
      <Dialog
        open={addContact.isOpen}
        fullWidth
        maxWidth="md"
        onClose={() => {
          addContact.close();
          setSubmitError(null);
          reset();
        }}
      >
        <DialogTitle>Nieuw contact</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Voornaam"
                required
                error={!!errors.first_name}
                helperText={errors.first_name?.message ?? " "}
                {...register("first_name")}
                sx={{ flex: 2 }}
              />
              <TextField
                label="Tussenvoegsel"
                error={!!errors.prefix}
                helperText={errors.prefix?.message ?? " "}
                placeholder="van, de, van der..."
                {...register("prefix")}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Achternaam"
                required
                error={!!errors.last_name}
                helperText={errors.last_name?.message ?? " "}
                {...register("last_name")}
                sx={{ flex: 2 }}
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                label="E-mail"
                type="email"
                error={!!errors.email}
                helperText={errors.email?.message ?? " "}
                {...register("email")}
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
                label="Functie"
                error={!!errors.company_role}
                helperText={errors.company_role?.message ?? " "}
                {...register("company_role")}
                fullWidth
              />
              <Controller
                name="network_roles"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    multiple
                    options={networkRoleOptions}
                    getOptionLabel={(option) => option.label}
                    value={networkRoleOptions.filter((opt) =>
                      (field.value || []).includes(opt.value as any)
                    )}
                    onChange={(_, newValue) => {
                      field.onChange(newValue.map((v) => v.value));
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Netwerk rollen"
                        error={!!errors.network_roles}
                        helperText={errors.network_roles?.message ?? " "}
                      />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          label={option.label}
                          size="small"
                          {...getTagProps({ index })}
                          key={option.value}
                        />
                      ))
                    }
                    fullWidth
                    sx={{ minWidth: 250 }}
                  />
                )}
              />
              <TextField
                label="Bedrijf"
                error={!!errors.current_company}
                helperText={errors.current_company?.message ?? " "}
                {...register("current_company")}
                fullWidth
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Locatie"
                error={!!errors.location}
                helperText={errors.location?.message ?? " "}
                {...register("location")}
                fullWidth
              />
              <TextField
                select
                label="Opleiding"
                error={!!errors.education}
                helperText={errors.education?.message ?? " "}
                {...register("education")}
                fullWidth
              >
                <MenuItem value="">Geen</MenuItem>
                <MenuItem value="MBO">MBO</MenuItem>
                <MenuItem value="HBO">HBO</MenuItem>
                <MenuItem value="UNI">Universiteit</MenuItem>
              </TextField>
            </Stack>

            <TextField
              label="LinkedIn URL"
              error={!!errors.linkedin_url}
              helperText={errors.linkedin_url?.message ?? " "}
              {...register("linkedin_url")}
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
              addContact.close();
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirm.isOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Contact verwijderen</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography>
              Weet je zeker dat je{" "}
              <strong>
                {deletingContact?.name || [deletingContact?.first_name, deletingContact?.prefix, deletingContact?.last_name].filter(Boolean).join(" ")}
              </strong>{" "}
              wilt verwijderen?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Deze actie kan niet ongedaan worden gemaakt.
            </Typography>
            {deleteError && (
              <Alert severity="error" onClose={() => setDeleteError(null)}>
                {deleteError}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={isDeleting}>
            Annuleren
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={isDeleting}
            startIcon={<DeleteOutlineIcon />}
          >
            {isDeleting ? "Bezig..." : "Verwijderen"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Contacts List */}
      {loading && <Typography variant="body2">Laden…</Typography>}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && contacts.length === 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="body2" color="text.secondary" align="center">
            Geen contacten gevonden. Voeg een contact toe om te beginnen.
          </Typography>
        </Paper>
      )}

      {!loading && !error && contacts.length > 0 && (
        <Paper sx={{ height: 600, width: "100%" }}>
          <DataGrid
            rows={contacts}
            columns={columns}
            getRowId={(row) => row.uid}
            initialState={{
              pagination: {
                paginationModel: { page: 0, pageSize: 10 },
              },
            }}
            pageSizeOptions={[5, 10, 25, 50]}
            sx={{ border: 0 }}
            disableRowSelectionOnClick
          />
        </Paper>
      )}
    </Box>
  );
}

