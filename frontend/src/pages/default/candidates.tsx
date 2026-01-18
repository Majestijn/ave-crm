import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  IconButton,
  Button,
  Stack,
} from "@mui/material";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DescriptionIcon from "@mui/icons-material/Description";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import mammoth from "mammoth";
import { useCandidates } from "../../hooks/useCandidates";
import { useDisclosure } from "../../hooks/useDisclosure";
import API from "../../../axios-client";
import type { Contact } from "../../types/contacts";

export default function CandidatesPage() {
  const { candidates, loading, error, refresh } = useCandidates();
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
        console.log("CV URL debug:", {
          original: contact.cv_url,
          final: cvUrl,
        });
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
        <Typography variant="body2" color="text.secondary">
          Contacten toevoegen kan via de{" "}
          <a href="/network" style={{ color: "inherit" }}>
            Netwerk pagina
          </a>
        </Typography>
      </Box>

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
          CV van{" "}
          {viewingContact?.name ||
            [
              viewingContact?.first_name,
              viewingContact?.prefix,
              viewingContact?.last_name,
            ]
              .filter(Boolean)
              .join(" ")}
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
                {deletingContact?.name ||
                  [
                    deletingContact?.first_name,
                    deletingContact?.prefix,
                    deletingContact?.last_name,
                  ]
                    .filter(Boolean)
                    .join(" ")}
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
                  row.name ||
                  [row.first_name, row.prefix, row.last_name]
                    .filter(Boolean)
                    .join(" "),
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
                field: "date_of_birth",
                headerName: "Geboortedatum",
                width: 130,
                valueGetter: (value) => {
                  if (!value) return "-";
                  return new Date(value).toLocaleDateString("nl-NL");
                },
              },
              {
                field: "network_roles",
                headerName: "Netwerk rollen",
                width: 220,
                valueGetter: (value: string[] | null | undefined) => {
                  if (!value || value.length === 0) return "-";
                  const roleMap: Record<string, string> = {
                    invoice_contact: "Factuurcontact",
                    candidate: "Kandidaat",
                    interim: "Interimmer",
                    ambassador: "Ambassadeur",
                    potential_management: "Pot. Management",
                    co_decision_maker: "Medebeslisser",
                    potential_directie: "Pot. Directie",
                    candidate_reference: "Referentie",
                    hr_employment: "HR arbeidsv.",
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
                  return value.map((role) => roleMap[role] || role).join(", ");
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
                  const actions = [];
                  
                  if (contact.linkedin_url) {
                    actions.push(
                      <GridActionsCellItem
                        key="linkedin"
                        icon={<LinkedInIcon />}
                        label="LinkedIn"
                        onClick={() => window.open(contact.linkedin_url, "_blank", "noopener,noreferrer")}
                        showInMenu={false}
                      />
                    );
                  }
                  
                  actions.push(
                    <GridActionsCellItem
                      key="delete"
                      icon={<DeleteOutlineIcon />}
                      label="Verwijderen"
                      onClick={() => handleDeleteClick(contact)}
                      showInMenu={false}
                    />
                  );
                  
                  return actions;
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
