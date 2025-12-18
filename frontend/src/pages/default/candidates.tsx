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
  IconButton,
  MenuItem,
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
import { useCandidates } from "../../hooks/useCandidates";
import { useDisclosure } from "../../hooks/useDisclosure";
import API from "../../../axios-client";
import type { Contact } from "../../types/contacts";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import BulkImportDialog from "../../components/features/BulkImportDialog";

const ContactSchema = z.object({
  first_name: z.string().min(1, "Voornaam is verplicht"),
  last_name: z.string().min(1, "Achternaam is verplicht"),
  gender: z.string().optional(),
  location: z.string().optional(),
  company_role: z.string().optional(),
  network_role: z
    .enum([
      "candidate",
      "candidate_placed",
      "candidate_rejected",
      "ambassador",
      "client_decision",
      "client_no_decision",
    ])
    .optional(),
  current_company: z.string().optional(),
  current_salary_cents: z.number().optional(),
  education: z.enum(["MBO", "HBO", "UNI"]).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  linkedin_url: z.string().url().optional().or(z.literal("")),
  notes: z.string().optional(),
});

type ContactForm = z.infer<typeof ContactSchema>;

export default function CandidatesPage() {
  const { candidates, loading, error, refresh } = useCandidates();
  const addCandidate = useDisclosure();
  const bulkImport = useDisclosure();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const cvViewer = useDisclosure();
  const deleteConfirm = useDisclosure();
  const [viewingContact, setViewingContact] = useState<Contact | null>(null);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
  const [cvContent, setCvContent] = useState<string | null>(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [cvError, setCvError] = useState<string | null>(null);
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
  } = useForm<ContactForm>({
    resolver: zodResolver(ContactSchema),
    mode: "onBlur",
    defaultValues: {
      first_name: "",
      last_name: "",
      gender: "",
      location: "",
      company_role: "",
      network_role: undefined,
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
    console.log("Submitting data:", data);
    try {
      await API.post("/contacts", data);
      addCandidate.close();
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
      console.error("Error deleting candidate:", err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Fout bij verwijderen van kandidaat";
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
      // Extract the path from the storage URL (e.g., /storage/cvs/filename.docx)
      let cvPath = contact.cv_url;

      // If it's a storage URL, extract the path after /storage/
      if (cvPath.includes("/storage/")) {
        cvPath = cvPath.split("/storage/")[1];
      } else if (cvPath.startsWith("cvs/")) {
        // Already just the path
        cvPath = cvPath;
      } else {
        // Try to extract from full URL
        const urlParts = cvPath.split("/");
        const storageIndex = urlParts.indexOf("storage");
        if (storageIndex !== -1 && storageIndex < urlParts.length - 1) {
          cvPath = urlParts.slice(storageIndex + 1).join("/");
        }
      }

      // Construct the API URL for CV access
      const baseURL = API.defaults.baseURL || "";
      const cvUrl = `${baseURL}/candidates/cv/${encodeURIComponent(cvPath)}`;

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
        throw new Error(
          "Bestandstype niet ondersteund. Alleen PDF en Word documenten worden ondersteund."
        );
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
    setCvContent(null);
    setCvError(null);
    // Clean up object URL if it was a PDF
    if (cvContent && cvContent.startsWith("blob:")) {
      URL.revokeObjectURL(cvContent);
    }
  };

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
          Kandidaten
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
            onClick={addCandidate.open}
          >
            Kandidaat toevoegen
          </Button>
        </Stack>
      </Box>

      {/* Add Candidate Dialog */}
      <Dialog
        open={addCandidate.isOpen}
        fullWidth
        maxWidth="md"
        onClose={() => {
          addCandidate.close();
          setSubmitError(null);
          reset();
        }}
      >
        <DialogTitle>Nieuwe kandidaat</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                // Random first names
                const firstNames = [
                  "Jan",
                  "Piet",
                  "Klaas",
                  "Anna",
                  "Maria",
                  "Emma",
                  "Lucas",
                  "Noah",
                  "Sophie",
                  "Lisa",
                ];
                // Random last names
                const lastNames = [
                  "de Vries",
                  "Jansen",
                  "de Boer",
                  "Bakker",
                  "Visser",
                  "Smit",
                  "Meijer",
                  "de Boer",
                  "Mulder",
                  "de Groot",
                ];
                // Random emails
                const emailDomains = [
                  "gmail.com",
                  "hotmail.com",
                  "outlook.com",
                  "yahoo.com",
                ];
                // Random companies
                const companies = [
                  "TechCorp",
                  "Innovate BV",
                  "Global Inc",
                  "StartupXYZ",
                  "Digital Solutions",
                ];
                // Random roles
                const roles = [
                  "Software Developer",
                  "Product Manager",
                  "UX Designer",
                  "Data Analyst",
                  "Marketing Manager",
                ];
                // Random locations
                const locations = [
                  "Amsterdam",
                  "Rotterdam",
                  "Utrecht",
                  "Den Haag",
                  "Eindhoven",
                ];
                // Random phone numbers
                const phones = [
                  "06-12345678",
                  "06-98765432",
                  "020-1234567",
                  "010-9876543",
                ];

                const randomFirstName =
                  firstNames[Math.floor(Math.random() * firstNames.length)];
                const randomLastName =
                  lastNames[Math.floor(Math.random() * lastNames.length)];
                const randomEmail = `${randomFirstName.toLowerCase()}.${randomLastName
                  .toLowerCase()
                  .replace(" ", ".")}@${
                  emailDomains[Math.floor(Math.random() * emailDomains.length)]
                }`;
                const randomCompany =
                  companies[Math.floor(Math.random() * companies.length)];
                const randomRole =
                  roles[Math.floor(Math.random() * roles.length)];
                const randomLocation =
                  locations[Math.floor(Math.random() * locations.length)];
                const randomPhone =
                  phones[Math.floor(Math.random() * phones.length)];
                const networkRoles: Array<
                  | "candidate"
                  | "candidate_placed"
                  | "candidate_rejected"
                  | "ambassador"
                > = [
                  "candidate",
                  "candidate_placed",
                  "candidate_rejected",
                  "ambassador",
                ];
                const educations: Array<"MBO" | "HBO" | "UNI"> = [
                  "MBO",
                  "HBO",
                  "UNI",
                ];
                const randomNetworkRole =
                  networkRoles[Math.floor(Math.random() * networkRoles.length)];
                const randomEducation =
                  educations[Math.floor(Math.random() * educations.length)];

                reset({
                  first_name: randomFirstName,
                  last_name: randomLastName,
                  email: randomEmail,
                  phone: randomPhone,
                  company_role: randomRole,
                  current_company: randomCompany,
                  location: randomLocation,
                  network_role: randomNetworkRole,
                  education: randomEducation,
                  linkedin_url: `https://linkedin.com/in/${randomFirstName.toLowerCase()}-${randomLastName
                    .toLowerCase()
                    .replace(" ", "-")}`,
                  notes: `Test kandidaat - ${new Date().toLocaleString()}`,
                });
              }}
              sx={{
                alignSelf: "flex-start",
                borderColor: "warning.main",
                color: "warning.main",
                "&:hover": {
                  borderColor: "warning.dark",
                  backgroundColor: "warning.light",
                },
              }}
            >
              🐛 Debug: Vul formulier in
            </Button>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Voornaam"
                required
                error={!!errors.first_name}
                helperText={errors.first_name?.message ?? " "}
                {...register("first_name")}
                fullWidth
              />
              <TextField
                label="Achternaam"
                required
                error={!!errors.last_name}
                helperText={errors.last_name?.message ?? " "}
                {...register("last_name")}
                fullWidth
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
                label="Huidige functie"
                error={!!errors.company_role}
                helperText={errors.company_role?.message ?? " "}
                {...register("company_role")}
                fullWidth
              />
              <TextField
                select
                label="Netwerk functie"
                error={!!errors.network_role}
                helperText={errors.network_role?.message ?? " "}
                {...register("network_role")}
                fullWidth
              >
                <MenuItem value="candidate">Kandidaat</MenuItem>
                <MenuItem value="candidate_placed">
                  Kandidaat geplaatst
                </MenuItem>
                <MenuItem value="candidate_rejected">
                  Kandidaat afgewezen
                </MenuItem>
                <MenuItem value="ambassador">Ambassadeur</MenuItem>
                <MenuItem value="client_decision">
                  Opdrachtgever met bevoegdheid
                </MenuItem>
                <MenuItem value="client_no_decision">
                  Opdrachtgever zonder bevoegdheid
                </MenuItem>
              </TextField>
              <TextField
                label="Huidig bedrijf"
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
                <MenuItem value="UNI">UNI</MenuItem>
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
              addCandidate.close();
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

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={bulkImport.isOpen}
        onClose={bulkImport.close}
        onSuccess={refresh}
      />

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
          CV van {viewingContact?.first_name} {viewingContact?.last_name}
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirm.isOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Kandidaat verwijderen</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography>
              Weet je zeker dat je{" "}
              <strong>
                {deletingContact?.first_name} {deletingContact?.last_name}
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

      {/* Candidates List */}
      {loading && <Typography variant="body2">Laden…</Typography>}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && candidates.length === 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="body2" color="text.secondary" align="center">
            Geen kandidaten gevonden. Voeg een kandidaat toe om te beginnen.
          </Typography>
        </Paper>
      )}

      {!loading && !error && candidates.length > 0 && (
        <Paper sx={{ height: 600, width: "100%" }}>
          <DataGrid
            rows={candidates}
            columns={[
              {
                field: "name",
                headerName: "Naam",
                flex: 1,
                minWidth: 200,
                valueGetter: (value, row) =>
                  `${row.first_name || ""} ${row.last_name || ""}`.trim(),
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
                field: "current_role",
                headerName: "Huidige functie",
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
                field: "network_role",
                headerName: "Netwerk functie",
                width: 180,
                valueGetter: (value) => {
                  if (!value) return "-";
                  const roleMap: Record<string, string> = {
                    candidate: "Kandidaat",
                    candidate_placed: "Kandidaat geplaatst",
                    candidate_rejected: "Kandidaat afgewezen",
                    ambassador: "Ambassadeur",
                    client_decision: "Klant beslissing",
                    client_no_decision: "Klant geen beslissing",
                  };
                  return roleMap[value] || value;
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
            ]}
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
