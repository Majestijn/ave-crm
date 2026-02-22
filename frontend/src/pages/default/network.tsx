import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  InputAdornment,
  Menu,
  Skeleton,
  Divider,
  Slider,
  Collapse,
  CircularProgress,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  GridActionsCellItem,
} from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ImageIcon from "@mui/icons-material/Image";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DescriptionIcon from "@mui/icons-material/Description";
import EditIcon from "@mui/icons-material/Edit";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import SearchIcon from "@mui/icons-material/Search";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";
import CakeIcon from "@mui/icons-material/Cake";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import mammoth from "mammoth";
import {
  useContacts,
  useGeocode,
  useContactDocuments,
  type LocationFilter,
  type AgeFilter,
  type ContactDocument,
} from "../../api/queries/contacts";
import { useAccounts } from "../../api/queries/accounts";
import API from "../../api/client";
import {
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
  useUploadContactDocument,
  useDeleteContactDocument,
} from "../../api/mutations/contacts";
import SmartBulkImportDialog from "../../components/features/SmartBulkImportDialog";
import BatchImportDialog from "../../components/features/BatchImportDialog";
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
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  location: z.string().optional(),
  company_role: z.string().optional(),
  network_roles: z
    .array(
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
    )
    .optional(),
  current_company: z.string().optional(),
  current_salary_cents: z.number().optional(),
  education: z.enum(["MBO", "HBO", "UNI"]).optional(),
  availability_date: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  linkedin_url: z.string().url().optional().or(z.literal("")),
  notes: z.string().optional(),
  is_company_contact: z.boolean().optional(),
  account_uid: z.string().optional(),
});

type ContactForm = z.infer<typeof ContactSchema>;

export default function NetworkPage() {
  // Location filter state - must be declared before useContacts
  const [showLocationFilter, setShowLocationFilter] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState<
    LocationFilter | undefined
  >(undefined);
  const [radius, setRadius] = useState(25); // Default 25km
  const [debouncedLocation, setDebouncedLocation] = useState("");

  // Age filter state
  const [showAgeFilter, setShowAgeFilter] = useState(false);
  const [ageFilter, setAgeFilter] = useState<AgeFilter | undefined>(undefined);
  const [minAgeInput, setMinAgeInput] = useState("");
  const [maxAgeInput, setMaxAgeInput] = useState("");

  // Data fetching hooks
  const {
    data: contacts = [],
    isLoading: loading,
    error: contactsError,
    refetch,
  } = useContacts(locationFilter, ageFilter);
  const { data: accounts = [] } = useAccounts();
  const { data: geocodeResult, isLoading: isGeocoding } = useGeocode(
    debouncedLocation || null
  );

  // Notes viewer disclosure and state (declared before useContactDocuments that depends on it)
  const notesViewer = useDisclosure();
  const [notesViewingContact, setNotesViewingContact] = useState<Contact | null>(null);
  const [notesImageUrls, setNotesImageUrls] = useState<Map<number, string>>(new Map());
  const [notesImagesLoading, setNotesImagesLoading] = useState(false);

  // Fetch documents for contact being viewed
  const { data: contactDocuments = [], isLoading: documentsLoading } =
    useContactDocuments(notesViewingContact?.uid || null);

  // Filter to only notes images
  const notesImages = contactDocuments.filter(
    (doc: ContactDocument) =>
      doc.type === "notes" && doc.mime_type.startsWith("image/")
  );

  // Fetch notes images with auth when viewer opens
  React.useEffect(() => {
    if (!notesViewer.isOpen || notesImages.length === 0) {
      return;
    }

    const fetchImages = async () => {
      setNotesImagesLoading(true);
      const hostname = window.location.hostname;
      const protocol = window.location.protocol;
      const isLocal = hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".lvh.me");
      const baseURL = isLocal ? `${protocol}//${hostname}:8080/api/v1` : `${protocol}//${hostname}/api/v1`;
      const token = localStorage.getItem("auth_token");
      const newUrls = new Map<number, string>();

      for (const doc of notesImages) {
        try {
          let url = doc.download_url;
          if (!url.startsWith("http")) {
            if (url.startsWith("/api/v1/")) {
              url = url.replace("/api/v1", "");
            }
            if (!url.startsWith("/")) {
              url = "/" + url;
            }
            url = `${baseURL}${url}`;
          }

          const response = await fetch(url, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });

          if (response.ok) {
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            newUrls.set(doc.id, blobUrl);
          }
        } catch (err) {
          console.error(`Error fetching notes image ${doc.id}:`, err);
        }
      }

      setNotesImageUrls(newUrls);
      setNotesImagesLoading(false);
    };

    fetchImages();

    // Cleanup blob URLs on unmount or when viewer closes
    return () => {
      notesImageUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [notesViewer.isOpen, notesImages.length]);

  // Mutation hooks
  const createContactMutation = useCreateContact();
  const deleteContactMutation = useDeleteContact();
  const uploadDocumentMutation = useUploadContactDocument();
  const deleteDocumentMutation = useDeleteContactDocument();
  const updateContactMutation = useUpdateContact();

  // Dialog state
  const location = useLocation();
  const navigate = useNavigate();

  // Sync kandidaten filter met URL bij mount en bij wijziging
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const isKandidaten = params.get("kandidaten") === "1";
    setCandidatesOnlyFilter(isKandidaten);
  }, [location.search]);

  const handleCandidatesFilterToggle = () => {
    const params = new URLSearchParams(location.search);
    const newValue = !candidatesOnlyFilter;
    if (newValue) {
      params.set("kandidaten", "1");
    } else {
      params.delete("kandidaten");
    }
    const search = params.toString();
    navigate({ pathname: "/network", search: search ? `?${search}` : "" }, { replace: true });
  };
  const addContact = useDisclosure();
  const editContact = useDisclosure();
  const bulkImport = useDisclosure();
  const smartImport = useDisclosure();
  const deleteConfirm = useDisclosure();
  const cvViewer = useDisclosure();

  // Other state
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [candidatesOnlyFilter, setCandidatesOnlyFilter] = useState(false);

  // Debounce location search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (locationSearch.trim().length >= 2) {
        setDebouncedLocation(locationSearch.trim());
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [locationSearch]);

  // Apply location filter when geocode result comes back
  const applyLocationFilter = useCallback(() => {
    if (geocodeResult) {
      setLocationFilter({
        lat: geocodeResult.latitude,
        lng: geocodeResult.longitude,
        radius: radius,
      });
    }
  }, [geocodeResult, radius]);

  const clearLocationFilter = useCallback(() => {
    setLocationFilter(undefined);
    setLocationSearch("");
    setDebouncedLocation("");
  }, []);

  // Import menu anchor
  const [importMenuAnchor, setImportMenuAnchor] = useState<null | HTMLElement>(
    null
  );

  // CV upload state
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvFileName, setCvFileName] = useState<string | null>(null);

  // Notes image upload state
  const [notesImageFile, setNotesImageFile] = useState<File | null>(null);
  const [notesImagePreview, setNotesImagePreview] = useState<string | null>(null);

  // CV viewer state
  const [viewingContact, setViewingContact] = useState<Contact | null>(null);
  const [cvContent, setCvContent] = useState<string | null>(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [cvError, setCvError] = useState<string | null>(null);

  const error = contactsError
    ? (contactsError as any)?.response?.data?.message ||
    "Fout bij laden van contacten"
    : null;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    control,
    watch,
    setValue,
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
      availability_date: "",
      email: "",
      phone: "",
      linkedin_url: "",
      notes: "",
      is_company_contact: false,
      account_uid: "",
    },
  });

  // Edit form - separate form instance
  const {
    register: editRegister,
    handleSubmit: handleEditSubmit,
    formState: { errors: editErrors, isSubmitting: isEditSubmitting },
    reset: editReset,
    control: editControl,
  } = useForm<ContactForm>({
    resolver: zodResolver(ContactSchema),
    mode: "onBlur",
  });

  // Handle navigation state from account detail page (prefill add contact form)
  useEffect(() => {
    const state = location.state as {
      openAddContact?: boolean;
      prefill?: { is_company_contact?: boolean; account_uid?: string };
    } | null;

    if (state?.openAddContact) {
      // Open the dialog and set the checkbox immediately
      addContact.open();

      if (state.prefill?.is_company_contact) {
        setValue("is_company_contact", true);
      }

      // Only set account_uid once accounts are loaded
      if (state.prefill?.account_uid && accounts.length > 0) {
        setValue("account_uid", state.prefill.account_uid);
        // Clear the state only after we've fully consumed it
        navigate(location.pathname, { replace: true, state: null });
      }
    }
  }, [location.state, accounts]);

  // Reset edit form when editing contact changes
  React.useEffect(() => {
    if (editingContact) {
      const formattedDob = editingContact.date_of_birth
        ? editingContact.date_of_birth.split("T")[0]
        : "";

      editReset({
        first_name: editingContact.first_name || "",
        prefix: editingContact.prefix || "",
        last_name: editingContact.last_name || "",
        date_of_birth: formattedDob,
        gender: editingContact.gender || "",
        location: editingContact.location || "",
        company_role: editingContact.company_role || "",
        network_roles: (editingContact.network_roles as any) || [],
        current_company: editingContact.current_company || "",
        current_salary_cents: editingContact.current_salary_cents || undefined,
        education: (editingContact.education as any) || undefined,
        availability_date: editingContact.availability_date
          ? editingContact.availability_date.split("T")[0]
          : "",
        email: editingContact.email || "",
        phone: editingContact.phone || "",
        linkedin_url: editingContact.linkedin_url || "",
        notes: editingContact.notes || "",
      });
    }
  }, [editingContact, editReset]);

  // Filter contacts based on search query and kandidaten filter
  const filteredContacts = useMemo(() => {
    let result = contacts;

    // Filter op alleen kandidaten (netwerkrol "candidate")
    if (candidatesOnlyFilter) {
      result = result.filter((c) => c.network_roles?.includes("candidate"));
    }

    if (!searchQuery.trim()) return result;

    const query = searchQuery.toLowerCase();
    return result.filter((contact) => {
      const fullName = formatContactName(contact).toLowerCase();
      const email = (contact.email || "").toLowerCase();
      const company = (contact.current_company || "").toLowerCase();
      const role = (contact.company_role || "").toLowerCase();
      const location = (contact.location || "").toLowerCase();

      return (
        fullName.includes(query) ||
        email.includes(query) ||
        company.includes(query) ||
        role.includes(query) ||
        location.includes(query)
      );
    });
  }, [contacts, searchQuery, candidatesOnlyFilter]);

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
          setSubmitError(
            "Contact aangemaakt, maar CV upload is mislukt. Je kunt het later opnieuw proberen."
          );
          addContact.close();
          reset();
          setCvFile(null);
          setCvFileName(null);
          handleClearNotesImage();
          return;
        }
      }

      // If there's a notes image, upload it separately
      if (notesImageFile && createdContact?.uid) {
        try {
          await uploadDocumentMutation.mutateAsync({
            contactUid: createdContact.uid,
            file: notesImageFile,
            type: "notes",
          });
        } catch (notesErr) {
          console.error("Error uploading notes image:", notesErr);
          // Contact was created, but notes upload failed - show warning but don't block
          setSubmitError(
            "Contact aangemaakt, maar notitie-afbeelding upload is mislukt. Je kunt het later opnieuw proberen."
          );
          addContact.close();
          reset();
          setCvFile(null);
          setCvFileName(null);
          handleClearNotesImage();
          return;
        }
      }

      // If is_company_contact is checked and account_uid is provided, link the contact to the account
      if (data.is_company_contact && data.account_uid && createdContact?.uid) {
        try {
          await API.post(`/accounts/${data.account_uid}/contacts`, {
            contact_uid: createdContact.uid,
          });
        } catch (linkErr) {
          console.error("Error linking contact to account:", linkErr);
          setSubmitError(
            "Contact aangemaakt, maar koppeling aan bedrijf is mislukt. Je kunt dit handmatig doen via de klantpagina."
          );
          addContact.close();
          reset();
          setCvFile(null);
          setCvFileName(null);
          handleClearNotesImage();
          return;
        }
      }

      addContact.close();
      reset();
      setCvFile(null);
      setCvFileName(null);
      handleClearNotesImage();
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
      setSubmitError(
        "CV moet een PDF of Word bestand zijn (.pdf, .doc, .docx)"
      );
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

  // Handle notes image file selection
  const handleNotesImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setSubmitError("Selecteer een afbeelding (JPG, PNG, GIF, etc.)");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setSubmitError("Afbeelding mag maximaal 10MB zijn");
      return;
    }

    // Create preview URL
    if (notesImagePreview) {
      URL.revokeObjectURL(notesImagePreview);
    }
    const previewUrl = URL.createObjectURL(file);
    setNotesImagePreview(previewUrl);
    setNotesImageFile(file);
  };

  // Clear notes image
  const handleClearNotesImage = () => {
    if (notesImagePreview) {
      URL.revokeObjectURL(notesImagePreview);
    }
    setNotesImageFile(null);
    setNotesImagePreview(null);
  };

  // Edit contact handlers
  const handleEditClick = (contact: Contact) => {
    setEditingContact(contact);
    setSubmitError(null);
    editContact.open();
  };

  const onEditSubmit = async (data: ContactForm) => {
    if (!editingContact) return;

    setSubmitError(null);
    try {
      await updateContactMutation.mutateAsync({
        uid: editingContact.uid,
        data,
      });
      editContact.close();
      setEditingContact(null);
    } catch (err: any) {
      console.error(err);
      if (err?.response?.data?.message) {
        setSubmitError(err.response.data.message);
      } else {
        setSubmitError(
          "Er is iets misgegaan bij het opslaan. Probeer het opnieuw."
        );
      }
    }
  };

  // Import menu handlers
  const handleImportMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setImportMenuAnchor(event.currentTarget);
  };

  const handleImportMenuClose = () => {
    setImportMenuAnchor(null);
  };

  const handleSmartImport = () => {
    handleImportMenuClose();
    smartImport.open();
  };

  const handleBulkImport = () => {
    handleImportMenuClose();
    bulkImport.open();
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
      const hostname = window.location.hostname;
      const protocol = window.location.protocol;
      const isLocal = hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".lvh.me");
      const baseURL = isLocal ? `${protocol}//${hostname}:8080/api/v1` : `${protocol}//${hostname}/api/v1`;
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
    // Clean up object URL if it was a PDF
    if (cvContent && cvContent.startsWith("blob:")) {
      URL.revokeObjectURL(cvContent);
    }
    setCvContent(null);
    setCvError(null);
  };

  // Notes viewer handlers
  const handleViewNotes = (contact: Contact) => {
    setNotesViewingContact(contact);
    notesViewer.open();
  };

  const handleCloseNotesViewer = () => {
    notesViewer.close();
    setNotesViewingContact(null);
    // Clean up blob URLs
    notesImageUrls.forEach((url) => URL.revokeObjectURL(url));
    setNotesImageUrls(new Map());
  };

  // Delete a notes image
  const handleDeleteNotesImage = async (documentId: number) => {
    if (!notesViewingContact) return;

    if (!window.confirm("Weet je zeker dat je deze notitie-afbeelding wilt verwijderen?")) {
      return;
    }

    try {
      await deleteDocumentMutation.mutateAsync({
        documentId,
        contactUid: notesViewingContact.uid,
      });
      // Clean up the blob URL for this image
      const url = notesImageUrls.get(documentId);
      if (url) {
        URL.revokeObjectURL(url);
        const newUrls = new Map(notesImageUrls);
        newUrls.delete(documentId);
        setNotesImageUrls(newUrls);
      }
    } catch (err) {
      console.error("Error deleting notes image:", err);
      alert("Fout bij verwijderen van notitie-afbeelding");
    }
  };

  // Upload additional notes image
  const handleUploadNotesImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !notesViewingContact) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Selecteer een afbeelding (JPG, PNG, GIF, etc.)");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("Afbeelding mag maximaal 10MB zijn");
      return;
    }

    try {
      await uploadDocumentMutation.mutateAsync({
        contactUid: notesViewingContact.uid,
        file,
        type: "notes",
      });
    } catch (err) {
      console.error("Error uploading notes image:", err);
      alert("Fout bij uploaden van notitie-afbeelding");
    }

    // Reset the input
    event.target.value = "";
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
      field: "date_of_birth",
      headerName: "Geboortedatum",
      width: 130,
      valueGetter: (value) => {
        if (!value) return "-";
        return new Date(value).toLocaleDateString("nl-NL");
      },
    },
    {
      field: "availability_date",
      headerName: "Beschikbaar",
      width: 130,
      valueGetter: (value) => {
        if (!value) return "-";
        return new Date(value).toLocaleDateString("nl-NL");
      },
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
      headerName: "",
      width: 180,
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
            key="notes"
            icon={<PhotoLibraryIcon />}
            label="Notities bekijken"
            onClick={() => handleViewNotes(contact)}
            showInMenu={false}
          />,
        );

        actions.push(
          <GridActionsCellItem
            key="edit"
            icon={<EditIcon />}
            label="Bewerken"
            onClick={() => handleEditClick(contact)}
            showInMenu={false}
          />,
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
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h5" component="h1" fontWeight={600}>
            Netwerk
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Beheer je contacten en kandidaten
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            color="inherit"
            endIcon={<KeyboardArrowDownIcon />}
            onClick={handleImportMenuOpen}
            sx={{ borderColor: "divider" }}
          >
            Importeren
          </Button>
          <Menu
            anchorEl={importMenuAnchor}
            open={Boolean(importMenuAnchor)}
            onClose={handleImportMenuClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <MenuItem onClick={handleSmartImport}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <UploadFileIcon fontSize="small" color="action" />
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    Smart CV Import
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Upload individuele CV's met AI-extractie
                  </Typography>
                </Box>
              </Stack>
            </MenuItem>
            <MenuItem onClick={handleBulkImport}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <UploadFileIcon fontSize="small" color="action" />
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    Bulk Import (ZIP)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Importeer meerdere CV's tegelijk
                  </Typography>
                </Box>
              </Stack>
            </MenuItem>
          </Menu>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={addContact.open}
          >
            Contact toevoegen
          </Button>
        </Stack>
      </Box>

      {/* Statistics & Search Bar */}
      <Paper
        sx={{
          p: 2,
          mb: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
        }}
        elevation={0}
        variant="outlined"
      >
        <Stack direction="row" spacing={3} alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <PeopleOutlineIcon color="primary" />
            <Box>
              <Typography variant="h6" fontWeight={600}>
                {loading ? "-" : contacts.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Totaal contacten
              </Typography>
            </Box>
          </Stack>
          <Divider orientation="vertical" flexItem />
          <Box>
            <Typography variant="h6" fontWeight={600}>
              {loading
                ? "-"
                : contacts.filter((c) => c.network_roles?.includes("candidate"))
                  .length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Kandidaten
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            placeholder="Zoeken op naam, email, bedrijf..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 280 }}
          />
          <Button
            variant={
              showLocationFilter || locationFilter ? "contained" : "outlined"
            }
            size="small"
            startIcon={<LocationOnIcon />}
            onClick={() => setShowLocationFilter(!showLocationFilter)}
            color={locationFilter ? "primary" : "inherit"}
          >
            {locationFilter ? `${radius} km` : "Locatie"}
          </Button>
          <Button
            variant={showAgeFilter || ageFilter ? "contained" : "outlined"}
            size="small"
            startIcon={<CakeIcon />}
            onClick={() => setShowAgeFilter(!showAgeFilter)}
            color={ageFilter ? "primary" : "inherit"}
          >
            {ageFilter
              ? `${ageFilter.minAge || ""}${ageFilter.minAge && ageFilter.maxAge ? "-" : ""}${ageFilter.maxAge || ""} jaar`
              : "Leeftijd"}
          </Button>
          <Button
            variant={candidatesOnlyFilter ? "contained" : "outlined"}
            size="small"
            startIcon={<PeopleOutlineIcon />}
            onClick={handleCandidatesFilterToggle}
            color={candidatesOnlyFilter ? "primary" : "inherit"}
          >
            Kandidaten
          </Button>
        </Stack>
      </Paper>

      {/* Location Filter Panel */}
      <Collapse in={showLocationFilter}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              placeholder="Zoek stad of plaats..."
              size="small"
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LocationOnIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: isGeocoding ? (
                  <InputAdornment position="end">
                    <Typography variant="caption" color="text.secondary">
                      Zoeken...
                    </Typography>
                  </InputAdornment>
                ) : null,
              }}
              sx={{ minWidth: 200 }}
            />
            <Box sx={{ minWidth: 200 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Radius: {radius} km
              </Typography>
              <Slider
                value={radius}
                onChange={(_, value) => setRadius(value as number)}
                min={5}
                max={100}
                step={5}
                size="small"
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `${v} km`}
              />
            </Box>
            <Button
              variant="contained"
              size="small"
              onClick={applyLocationFilter}
              disabled={!geocodeResult || isGeocoding}
            >
              Toepassen
            </Button>
            {locationFilter && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<ClearIcon />}
                onClick={clearLocationFilter}
              >
                Wissen
              </Button>
            )}
          </Stack>
          {geocodeResult && locationSearch && (
            <Typography
              variant="caption"
              color="success.main"
              sx={{ mt: 1, display: "block" }}
            >
              ✓ Locatie gevonden: {locationSearch}
            </Typography>
          )}
          {locationFilter && (
            <Alert severity="info" sx={{ mt: 1 }}>
              Toont contacten binnen {radius} km van{" "}
              {locationSearch || "geselecteerde locatie"}
              {contacts.length > 0 && contacts[0].distance !== undefined && (
                <> — gesorteerd op afstand</>
              )}
            </Alert>
          )}
        </Paper>
      </Collapse>

      {/* Age Filter Panel */}
      <Collapse in={showAgeFilter}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              label="Min. leeftijd"
              type="number"
              size="small"
              value={minAgeInput}
              onChange={(e) => setMinAgeInput(e.target.value)}
              inputProps={{ min: 0, max: 100 }}
              sx={{ width: 150 }}
            />
            <Typography>-</Typography>
            <TextField
              label="Max. leeftijd"
              type="number"
              size="small"
              value={maxAgeInput}
              onChange={(e) => setMaxAgeInput(e.target.value)}
              inputProps={{ min: 0, max: 100 }}
              sx={{ width: 150 }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                const minAge = minAgeInput ? parseInt(minAgeInput, 10) : undefined;
                const maxAge = maxAgeInput ? parseInt(maxAgeInput, 10) : undefined;
                if (minAge !== undefined || maxAge !== undefined) {
                  setAgeFilter({ minAge, maxAge });
                }
              }}
              disabled={!minAgeInput && !maxAgeInput}
            >
              Toepassen
            </Button>
            {ageFilter && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<ClearIcon />}
                onClick={() => {
                  setAgeFilter(undefined);
                  setMinAgeInput("");
                  setMaxAgeInput("");
                }}
              >
                Wissen
              </Button>
            )}
          </Stack>
          {ageFilter && (
            <Alert severity="info" sx={{ mt: 1 }}>
              Toont contacten{" "}
              {ageFilter.minAge && ageFilter.maxAge
                ? `tussen ${ageFilter.minAge} en ${ageFilter.maxAge} jaar`
                : ageFilter.minAge
                  ? `van ${ageFilter.minAge} jaar of ouder`
                  : `tot ${ageFilter.maxAge} jaar`}
            </Alert>
          )}
        </Paper>
      </Collapse>

      {/* Smart CV Import Dialog */}
      <SmartBulkImportDialog
        open={smartImport.isOpen}
        onClose={smartImport.close}
        onSuccess={() => refetch()}
      />

      {/* Batch/Bulk Import Dialog (ZIP) */}
      <BatchImportDialog
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
          handleClearNotesImage();
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
                label="Geboortedatum"
                type="date"
                InputLabelProps={{ shrink: true }}
                error={!!errors.date_of_birth}
                helperText={errors.date_of_birth?.message ?? " "}
                {...register("date_of_birth")}
                sx={{ width: 200 }}
              />

              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <TextField
                    select
                    label="Geslacht"
                    {...field}
                    value={field.value || ""}
                    sx={{ width: 150 }}
                    helperText=" "
                  >
                    <MenuItem value="">-</MenuItem>
                    <MenuItem value="man">Man</MenuItem>
                    <MenuItem value="vrouw">Vrouw</MenuItem>
                  </TextField>
                )}
              />
              <TextField
                label="Beschikbaarheidsdatum"
                type="date"
                InputLabelProps={{ shrink: true }}
                error={!!errors.availability_date}
                helperText={errors.availability_date?.message ?? " "}
                {...register("availability_date")}
                sx={{ width: 200 }}
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
                        ? educationOptions.find(
                          (opt) => opt.value === field.value
                        ) || null
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

            {/* Company Contact Section */}
            <Box sx={{ bgcolor: "grey.50", p: 2, borderRadius: 1 }}>
              <Controller
                name="is_company_contact"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={field.value || false}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    }
                    label="Is contactpersoon van een bedrijf"
                  />
                )}
              />
              {watch("is_company_contact") && (
                <Controller
                  name="account_uid"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      select
                      label="Kies bedrijf"
                      {...field}
                      value={field.value || ""}
                      fullWidth
                      sx={{ mt: 1 }}
                    >
                      <MenuItem value="">Selecteer een bedrijf...</MenuItem>
                      {accounts.map((account) => (
                        <MenuItem key={account.uid} value={account.uid}>
                          {account.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              )}
            </Box>

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
                    {cvFile
                      ? `${(cvFile.size / 1024 / 1024).toFixed(2)} MB`
                      : ""}
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

            {/* Notes Image Upload Section */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Notitie afbeelding (optioneel)
              </Typography>
              {notesImagePreview ? (
                <Box sx={{ position: "relative", display: "inline-block" }}>
                  <Box
                    component="img"
                    src={notesImagePreview}
                    alt="Notitie preview"
                    sx={{
                      maxWidth: "100%",
                      maxHeight: 200,
                      borderRadius: 1,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={handleClearNotesImage}
                    sx={{
                      position: "absolute",
                      top: -8,
                      right: -8,
                      bgcolor: "error.main",
                      color: "white",
                      "&:hover": { bgcolor: "error.dark" },
                    }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                    {notesImageFile
                      ? `${(notesImageFile.size / 1024 / 1024).toFixed(2)} MB`
                      : ""}
                  </Typography>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<ImageIcon />}
                >
                  Afbeelding selecteren
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleNotesImageChange}
                  />
                </Button>
              )}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.5 }}
              >
                Upload een foto van je notities (max 10MB)
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
              handleClearNotesImage();
            }}
          >
            Annuleren
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting || uploadDocumentMutation.isPending}
          >
            {isSubmitting || uploadDocumentMutation.isPending
              ? "Bezig..."
              : "Opslaan"}
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
          <Button
            onClick={handleDeleteCancel}
            disabled={deleteContactMutation.isPending}
          >
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

      {/* Edit Contact Dialog */}
      <Dialog
        open={editContact.isOpen}
        fullWidth
        maxWidth="md"
        onClose={() => {
          editContact.close();
          setSubmitError(null);
          setEditingContact(null);
        }}
      >
        <DialogTitle>Contact bewerken</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Voornaam"
                required
                error={!!editErrors.first_name}
                helperText={editErrors.first_name?.message ?? " "}
                {...editRegister("first_name")}
                sx={{ flex: 2 }}
              />
              <TextField
                label="Tussenvoegsel"
                error={!!editErrors.prefix}
                helperText={editErrors.prefix?.message ?? " "}
                placeholder="van, de, van der..."
                {...editRegister("prefix")}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Achternaam"
                required
                error={!!editErrors.last_name}
                helperText={editErrors.last_name?.message ?? " "}
                {...editRegister("last_name")}
                sx={{ flex: 2 }}
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Geboortedatum"
                type="date"
                InputLabelProps={{ shrink: true }}
                error={!!editErrors.date_of_birth}
                helperText={editErrors.date_of_birth?.message ?? " "}
                {...editRegister("date_of_birth")}
                sx={{ width: 200 }}
              />

              <Controller
                name="gender"
                control={editControl}
                render={({ field }) => (
                  <TextField
                    select
                    label="Geslacht"
                    {...field}
                    value={field.value || ""}
                    sx={{ width: 150 }}
                    helperText=" "
                  >
                    <MenuItem value="">-</MenuItem>
                    <MenuItem value="man">Man</MenuItem>
                    <MenuItem value="vrouw">Vrouw</MenuItem>
                  </TextField>
                )}
              />
              <TextField
                label="Beschikbaarheidsdatum"
                type="date"
                InputLabelProps={{ shrink: true }}
                error={!!editErrors.availability_date}
                helperText={editErrors.availability_date?.message ?? " "}
                {...editRegister("availability_date")}
                sx={{ width: 200 }}
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                label="E-mail"
                type="email"
                error={!!editErrors.email}
                helperText={editErrors.email?.message ?? " "}
                {...editRegister("email")}
                fullWidth
              />
              <TextField
                label="Telefoon"
                error={!!editErrors.phone}
                helperText={editErrors.phone?.message ?? " "}
                {...editRegister("phone")}
                fullWidth
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Functie"
                error={!!editErrors.company_role}
                helperText={editErrors.company_role?.message ?? " "}
                {...editRegister("company_role")}
                fullWidth
              />
              <Controller
                name="network_roles"
                control={editControl}
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
                        error={!!editErrors.network_roles}
                        helperText={editErrors.network_roles?.message ?? " "}
                      />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          {...getTagProps({ index })}
                          key={option.value}
                          label={option.label}
                          size="small"
                        />
                      ))
                    }
                    fullWidth
                  />
                )}
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Bedrijf"
                error={!!editErrors.current_company}
                helperText={editErrors.current_company?.message ?? " "}
                {...editRegister("current_company")}
                fullWidth
              />
              <TextField
                label="Locatie"
                error={!!editErrors.location}
                helperText={editErrors.location?.message ?? " "}
                {...editRegister("location")}
                fullWidth
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <Controller
                name="education"
                control={editControl}
                render={({ field }) => (
                  <Autocomplete
                    options={educationOptions}
                    getOptionLabel={(option) => option.label}
                    value={
                      field.value
                        ? educationOptions.find(
                          (opt) => opt.value === field.value
                        ) || null
                        : null
                    }
                    onChange={(_, newValue) => {
                      field.onChange(newValue?.value);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Opleiding"
                        error={!!editErrors.education}
                        helperText={editErrors.education?.message ?? " "}
                      />
                    )}
                    fullWidth
                  />
                )}
              />
              <TextField
                label="LinkedIn URL"
                error={!!editErrors.linkedin_url}
                helperText={editErrors.linkedin_url?.message ?? " "}
                {...editRegister("linkedin_url")}
                fullWidth
              />
            </Stack>

            <TextField
              label="Notities"
              multiline
              rows={4}
              error={!!editErrors.notes}
              helperText={editErrors.notes?.message ?? " "}
              {...editRegister("notes")}
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
              editContact.close();
              setSubmitError(null);
              setEditingContact(null);
            }}
          >
            Annuleren
          </Button>
          <Button
            variant="contained"
            onClick={handleEditSubmit(onEditSubmit)}
            disabled={isEditSubmitting || updateContactMutation.isPending}
          >
            {isEditSubmitting || updateContactMutation.isPending
              ? "Bezig..."
              : "Opslaan"}
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

      {/* Notes Viewer Dialog */}
      <Dialog
        open={notesViewer.isOpen}
        onClose={handleCloseNotesViewer}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Notities van{" "}
          {notesViewingContact ? formatContactName(notesViewingContact) : ""}
        </DialogTitle>
        <DialogContent dividers>
          {documentsLoading && (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <CircularProgress size={24} sx={{ mr: 1 }} />
              <Typography variant="body2" component="span">
                Notities laden...
              </Typography>
            </Box>
          )}
          {!documentsLoading && notesImages.length === 0 && (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <PhotoLibraryIcon
                sx={{ fontSize: 48, color: "text.secondary", mb: 2 }}
              />
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                Geen notitie-afbeeldingen gevonden voor dit contact.
              </Typography>
              <Button
                variant="outlined"
                component="label"
                startIcon={<ImageIcon />}
                disabled={uploadDocumentMutation.isPending}
              >
                {uploadDocumentMutation.isPending ? "Uploaden..." : "Afbeelding toevoegen"}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleUploadNotesImage}
                />
              </Button>
            </Box>
          )}
          {(documentsLoading || notesImagesLoading) && notesImages.length > 0 && (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <CircularProgress size={24} sx={{ mr: 1 }} />
              <Typography variant="body2" component="span">
                Afbeeldingen laden...
              </Typography>
            </Box>
          )}
          {!documentsLoading && !notesImagesLoading && notesImages.length > 0 && (
            <Stack spacing={3}>
              {notesImages.map((doc: ContactDocument) => {
                const imageUrl = notesImageUrls.get(doc.id);
                if (!imageUrl) return null;
                return (
                  <Box key={doc.id}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ mb: 1 }}
                    >
                      <Typography variant="subtitle2">
                        {doc.original_filename}
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                          sx={{ ml: 1 }}
                        >
                          ({doc.formatted_file_size})
                        </Typography>
                      </Typography>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteNotesImage(doc.id)}
                        disabled={deleteDocumentMutation.isPending}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                    <Box
                      component="img"
                      src={imageUrl}
                      alt={doc.original_filename}
                      sx={{
                        maxWidth: "100%",
                        maxHeight: 600,
                        borderRadius: 1,
                        border: "1px solid",
                        borderColor: "divider",
                        cursor: "pointer",
                      }}
                      onClick={() => window.open(imageUrl, "_blank")}
                    />
                  </Box>
                );
              })}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            component="label"
            startIcon={<ImageIcon />}
            disabled={uploadDocumentMutation.isPending}
          >
            {uploadDocumentMutation.isPending ? "Uploaden..." : "Afbeelding toevoegen"}
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={handleUploadNotesImage}
            />
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={handleCloseNotesViewer}>Sluiten</Button>
        </DialogActions>
      </Dialog>

      {/* Contacts List */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Loading State - Skeleton */}
      {loading && (
        <Paper sx={{ p: 2 }} elevation={0} variant="outlined">
          <Stack spacing={1}>
            {[...Array(8)].map((_, i) => (
              <Skeleton
                key={i}
                variant="rectangular"
                height={52}
                sx={{ borderRadius: 1 }}
              />
            ))}
          </Stack>
        </Paper>
      )}

      {/* Empty State */}
      {!loading && !error && contacts.length === 0 && (
        <Paper
          sx={{
            p: 6,
            textAlign: "center",
            bgcolor: "background.default",
          }}
          elevation={0}
          variant="outlined"
        >
          <PeopleOutlineIcon
            sx={{ fontSize: 64, color: "action.disabled", mb: 2 }}
          />
          <Typography variant="h6" gutterBottom>
            Nog geen contacten
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Voeg je eerste contact toe of importeer CV's om te beginnen.
          </Typography>
          <Stack
            direction="row"
            spacing={2}
            justifyContent="center"
            flexWrap="wrap"
          >
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={addContact.open}
            >
              Contact toevoegen
            </Button>
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              onClick={smartImport.open}
            >
              CV's importeren
            </Button>
          </Stack>
        </Paper>
      )}

      {/* No Search Results */}
      {!loading &&
        !error &&
        contacts.length > 0 &&
        filteredContacts.length === 0 && (
          <Paper
            sx={{
              p: 4,
              textAlign: "center",
              bgcolor: "background.default",
            }}
            elevation={0}
            variant="outlined"
          >
            <SearchIcon
              sx={{ fontSize: 48, color: "action.disabled", mb: 2 }}
            />
            <Typography variant="h6" gutterBottom>
              Geen resultaten
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Geen contacten gevonden voor "{searchQuery}"
            </Typography>
            <Button sx={{ mt: 2 }} onClick={() => setSearchQuery("")}>
              Zoekopdracht wissen
            </Button>
          </Paper>
        )}

      {/* DataGrid */}
      {!loading && !error && filteredContacts.length > 0 && (
        <Paper
          sx={{ height: 600, width: "100%" }}
          elevation={0}
          variant="outlined"
        >
          <DataGrid
            rows={filteredContacts}
            columns={columns}
            getRowId={(row) => row.uid}
            initialState={{
              pagination: {
                paginationModel: { page: 0, pageSize: 10 },
              },
            }}
            pageSizeOptions={[5, 10, 25, 50, 100, 250]}
            sx={{
              border: 0,
              "& .MuiDataGrid-row:hover": {
                bgcolor: "action.hover",
              },
              "& .MuiDataGrid-row:nth-of-type(even)": {
                bgcolor: "grey.50",
              },
              "& .MuiDataGrid-columnHeaders": {
                bgcolor: "grey.100",
                fontWeight: 600,
              },
              "& .MuiDataGrid-cell:focus": {
                outline: "none",
              },
            }}
            disableRowSelectionOnClick
          />
        </Paper>
      )}
    </Box>
  );
}
