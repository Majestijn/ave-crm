import React, { useState } from "react";
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
  IconButton,
} from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  GridActionsCellItem,
} from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DescriptionIcon from "@mui/icons-material/Description";
import mammoth from "mammoth";
import { useContacts } from "../../api/queries/contacts";
import { useCreateContact, useDeleteContact, useUploadContactDocument } from "../../api/mutations/contacts";
import BulkImportDialog from "../../components/features/BulkImportDialog";
import { useDisclosure } from "../../hooks/useDisclosure";
import type { Contact } from "../../types/contacts";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { networkRoleLabels, formatContactName } from "../../utils/formatters";

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

const educationOptions = [
  { value: "MBO", label: "MBO" },
  { value: "HBO", label: "HBO" },
  { value: "UNI", label: "Universiteit" },
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

export default function NetworkPage() {
  const { data: contacts = [], isLoading: loading, error: contactsError, refetch } = useContacts();
  const createContactMutation = useCreateContact();
  const deleteContactMutation = useDeleteContact();
  const uploadDocumentMutation = useUploadContactDocument();
  
  const addContact = useDisclosure();
  const bulkImport = useDisclosure();
  const deleteConfirm = useDisclosure();
  const cvViewer = useDisclosure();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // CV upload state
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvFileName, setCvFileName] = useState<string | null>(null);
  
  // CV viewer state
  const [viewingContact, setViewingContact] = useState<Contact | null>(null);
  const [cvContent, setCvContent] = useState<string | null>(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [cvError, setCvError] = useState<string | null>(null);

  const error = contactsError
    ? (contactsError as any)?.response?.data?.message || "Fout bij laden van contacten"
    : null;

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
      // Create the contact first
      const createdContact = await createContactMutation.mutateAsync(data);
      
      // If there's a CV file, upload it separately
      if (cvFile && createdContact?.uid) {
        try {
          await uploadDocumentMutation.mutateAsync({
            contactUid: createdContact.uid,
            file: cvFile,
            type: "cv",
          });
        } catch (cvErr) {
          console.error("Error uploading CV:", cvErr);
          // Contact was created, but CV upload failed - show warning but don't block
          setSubmitError("Contact aangemaakt, maar CV upload is mislukt. Je kunt het later opnieuw proberen.");
          addContact.close();
          reset();
          setCvFile(null);
          setCvFileName(null);
          return;
        }
      }
      
      addContact.close();
      reset();
      setCvFile(null);
      setCvFileName(null);
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
  
  // Handle CV file selection
  const handleCvFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      setSubmitError("CV moet een PDF of Word bestand zijn (.pdf, .doc, .docx)");
      return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setSubmitError("CV bestand mag maximaal 10MB zijn");
      return;
    }
    
    setCvFile(file);
    setCvFileName(file.name);
    setSubmitError(null);
  };
  
  // Clear CV file
  const handleClearCvFile = () => {
    setCvFile(null);
    setCvFileName(null);
  };

  const handleDeleteClick = (contact: Contact) => {
    setDeletingContact(contact);
    setDeleteError(null);
    deleteConfirm.open();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingContact) return;

    setDeleteError(null);

    try {
      await deleteContactMutation.mutateAsync(deletingContact.uid);
      deleteConfirm.close();
      setDeletingContact(null);
    } catch (err: any) {
      console.error("Error deleting contact:", err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Fout bij verwijderen van contact";
      setDeleteError(errorMessage);
    }
  };

  const handleDeleteCancel = () => {
    deleteConfirm.close();
    setDeletingContact(null);
    setDeleteError(null);
  };

  const handleViewCv = async (contact: Contact) => {
    if (!contact.cv_url) {
      alert("Geen CV beschikbaar voor dit contact");
      return;
    }

    setViewingContact(contact);
    cvViewer.open();
    setCvLoading(true);
    setCvError(null);
    setCvContent(null);

    try {
      const baseURL = `${window.location.protocol}//${window.location.hostname}:8080/api/v1`;
      let cvUrl: string;

      // Check if this is a new-style download URL (contact-documents route)
      if (contact.cv_url.includes("contact-documents")) {
        if (contact.cv_url.startsWith("http")) {
          // Full URL - use as is
          cvUrl = contact.cv_url;
        } else {
          // Relative URL - normalize it
          let relativePath = contact.cv_url;
          
          // Remove /api/v1 prefix if present (to avoid duplication)
          if (relativePath.startsWith("/api/v1/")) {
            relativePath = relativePath.replace("/api/v1", "");
          }
          
          // Ensure it starts with /
          if (!relativePath.startsWith("/")) {
            relativePath = "/" + relativePath;
          }
          
          cvUrl = `${baseURL}${relativePath}`;
        }
        console.log("CV URL debug:", { original: contact.cv_url, final: cvUrl });
      } else {
        // Legacy format: storage URL like /storage/cvs/filename.docx
        let cvPath = contact.cv_url;

        if (cvPath.includes("/storage/")) {
          cvPath = cvPath.split("/storage/")[1];
        } else if (!cvPath.startsWith("cvs/")) {
          const urlParts = cvPath.split("/");
          const storageIndex = urlParts.indexOf("storage");
          if (storageIndex !== -1 && storageIndex < urlParts.length - 1) {
            cvPath = urlParts.slice(storageIndex + 1).join("/");
          }
        }

        cvUrl = `${baseURL}/contacts/cv/${encodeURIComponent(cvPath)}`;
      }

      // Fetch with authentication headers
      const token = localStorage.getItem("auth_token");
      const response = await fetch(cvUrl, {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
      });

      if (!response.ok) {
        throw new Error("CV kon niet worden geladen");
      }

      const blob = await response.blob();
      const fileType = blob.type;

      // Check if it's a PDF
      if (
        fileType === "application/pdf" ||
        contact.cv_url.toLowerCase().endsWith(".pdf")
      ) {
        // For PDF, create object URL
        const pdfUrl = URL.createObjectURL(blob);
        setCvContent(pdfUrl);
      }
      // Check if it's a Word document
      else if (
        fileType === "application/msword" ||
        fileType ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        contact.cv_url.toLowerCase().endsWith(".doc") ||
        contact.cv_url.toLowerCase().endsWith(".docx")
      ) {
        // Convert Word document to HTML using mammoth
        const arrayBuffer = await blob.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setCvContent(result.value);

        // Handle warnings if any
        if (result.messages.length > 0) {
          console.warn("Mammoth conversion warnings:", result.messages);
        }
      } else {
        // Fallback: try to determine from Content-Disposition or treat as Word
        const arrayBuffer = await blob.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setCvContent(result.value);
      }
    } catch (err: any) {
      console.error("Error loading CV:", err);
      setCvError(err?.message || "Fout bij laden van CV");
    } finally {
      setCvLoading(false);
    }
  };

  const handleCloseCvViewer = () => {
    cvViewer.close();
    setViewingContact(null);
    // Clean up object URL if it was a PDF
    if (cvContent && cvContent.startsWith("blob:")) {
      URL.revokeObjectURL(cvContent);
    }
    setCvContent(null);
    setCvError(null);
  };

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Naam",
      flex: 1,
      minWidth: 200,
      valueGetter: (value, row) => formatContactName(row),
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
      field: "cv",
      headerName: "CV",
      width: 80,
      sortable: false,
      renderCell: (params) => {
        const contact = params.row as Contact;
        return contact.cv_url ? (
          <IconButton
            size="small"
            color="primary"
            onClick={() => handleViewCv(contact)}
            title="Bekijk CV"
          >
            <DescriptionIcon />
          </IconButton>
        ) : (
          "-"
        );
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
        onSuccess={() => refetch()}
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
          setCvFile(null);
          setCvFileName(null);
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
              <Controller
                name="education"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    options={educationOptions}
                    getOptionLabel={(option) => option.label}
                    value={
                      field.value
                        ? educationOptions.find((opt) => opt.value === field.value) || null
                        : null
                    }
                    onChange={(_, newValue) => {
                      field.onChange(newValue?.value || undefined);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Opleiding"
                        error={!!errors.education}
                        helperText={errors.education?.message ?? " "}
                      />
                    )}
                    fullWidth
                  />
                )}
              />
            </Stack>

            <TextField
              label="LinkedIn URL"
              error={!!errors.linkedin_url}
              helperText={errors.linkedin_url?.message ?? " "}
              {...register("linkedin_url")}
              fullWidth
            />

            {/* CV Upload Section */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                CV uploaden (optioneel)
              </Typography>
              {cvFileName ? (
                <Stack direction="row" spacing={2} alignItems="center">
                  <Chip
                    label={cvFileName}
                    onDelete={handleClearCvFile}
                    color="primary"
                    variant="outlined"
                  />
                  <Typography variant="caption" color="text.secondary">
                    {cvFile ? `${(cvFile.size / 1024 / 1024).toFixed(2)} MB` : ""}
                  </Typography>
                </Stack>
              ) : (
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadFileIcon />}
                >
                  CV selecteren
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleCvFileChange}
                  />
                </Button>
              )}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.5 }}
              >
                PDF of Word bestand, max 10MB
              </Typography>
            </Box>

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
              setCvFile(null);
              setCvFileName(null);
            }}
          >
            Annuleren
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting || uploadDocumentMutation.isPending}
          >
            {isSubmitting || uploadDocumentMutation.isPending ? "Bezig..." : "Opslaan"}
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
                {deletingContact ? formatContactName(deletingContact) : ""}
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
          <Button onClick={handleDeleteCancel} disabled={deleteContactMutation.isPending}>
            Annuleren
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={deleteContactMutation.isPending}
            startIcon={<DeleteOutlineIcon />}
          >
            {deleteContactMutation.isPending ? "Bezig..." : "Verwijderen"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* CV Viewer Dialog */}
      <Dialog
        open={cvViewer.isOpen}
        onClose={handleCloseCvViewer}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            height: "90vh",
            maxHeight: "90vh",
          },
        }}
      >
        <DialogTitle>
          CV van {viewingContact ? formatContactName(viewingContact) : ""}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, overflow: "hidden" }}>
          {cvLoading && (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <Typography variant="body2">CV laden...</Typography>
            </Box>
          )}
          {cvError && (
            <Box sx={{ p: 3 }}>
              <Alert severity="error">{cvError}</Alert>
            </Box>
          )}
          {cvContent && !cvLoading && !cvError && (
            <Box
              sx={{
                height: "100%",
                overflow: "auto",
                p: 2,
              }}
            >
              {cvContent.startsWith("blob:") ||
              viewingContact?.cv_url?.toLowerCase().endsWith(".pdf") ? (
                // PDF viewer
                <iframe
                  src={cvContent}
                  style={{
                    width: "100%",
                    height: "70vh",
                    border: "none",
                  }}
                  title="CV PDF Viewer"
                />
              ) : (
                // Word document converted to HTML
                <Box
                  dangerouslySetInnerHTML={{ __html: cvContent }}
                  sx={{
                    "& p": {
                      marginBottom: 1,
                    },
                    "& h1, & h2, & h3": {
                      marginTop: 2,
                      marginBottom: 1,
                    },
                    "& ul, & ol": {
                      marginLeft: 3,
                      marginBottom: 1,
                    },
                  }}
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCvViewer}>Sluiten</Button>
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

