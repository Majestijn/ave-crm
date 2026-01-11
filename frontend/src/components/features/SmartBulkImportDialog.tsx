import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Alert,
  Box,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  IconButton,
  Collapse,
} from "@mui/material";
import {
  UploadFile as UploadFileIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CloudUpload as CloudUploadIcon,
} from "@mui/icons-material";
import API from "../../api/client";
import { useImportProgress } from "../../contexts/ImportProgressContext";

interface SmartBulkImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FailedImport {
  filename: string;
  reason: string;
}

interface SkippedImport {
  filename: string;
  reason: string;
}

interface SuccessImport {
  filename: string;
  contact_id: number;
  contact_uid: string;
  name: string;
}

interface BatchStatus {
  batch_id: string;
  total: number;
  processed: number;
  success_count: number;
  failed_count: number;
  skipped_count: number;
  is_complete: boolean;
  success: SuccessImport[];
  failed: FailedImport[];
  skipped: SkippedImport[];
}

type ImportState = "idle" | "uploading" | "processing" | "complete";

const BATCH_SIZE = 5; // Number of files to upload per request
const POLL_INTERVAL = 2000; // Poll every 2 seconds

export default function SmartBulkImportDialog({
  open,
  onClose,
  onSuccess,
}: SmartBulkImportDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [importState, setImportState] = useState<ImportState>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null);
  const [showFailedList, setShowFailedList] = useState(false);
  const [showSuccessList, setShowSuccessList] = useState(false);
  const [showSkippedList, setShowSkippedList] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Global progress context for minimized indicator
  const { startImport: startGlobalImport, updateStatus: updateGlobalStatus } = useImportProgress();

  const validTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    files.forEach((file) => {
      if (validTypes.includes(file.type)) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0) {
      setError(
        `${invalidFiles.length} bestand(en) overgeslagen (alleen PDF/Word): ${invalidFiles.slice(0, 3).join(", ")}${invalidFiles.length > 3 ? "..." : ""}`
      );
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const files = Array.from(event.dataTransfer.files);
      const validFiles: File[] = [];
      const invalidFiles: string[] = [];

      files.forEach((file) => {
        if (validTypes.includes(file.type)) {
          validFiles.push(file);
        } else {
          invalidFiles.push(file.name);
        }
      });

      if (invalidFiles.length > 0) {
        setError(
          `${invalidFiles.length} bestand(en) overgeslagen (alleen PDF/Word)`
        );
      }

      setSelectedFiles((prev) => [...prev, ...validFiles]);
    },
    [validTypes]
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
    },
    []
  );

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const pollBatchStatus = useCallback(async (id: string) => {
    try {
      // API client returns data directly, not wrapped in response.data
      const status = await API.get<BatchStatus>(`/contacts/smart-import/${id}`);
      setBatchStatus(status);
      updateGlobalStatus(status); // Update global indicator too

      if (status.is_complete) {
        setImportState("complete");
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
    } catch (err) {
      console.error("Error polling batch status:", err);
    }
  }, [updateGlobalStatus]);

  const startPolling = useCallback(
    (id: string) => {
      // Poll immediately
      pollBatchStatus(id);

      // Then poll at intervals
      pollIntervalRef.current = setInterval(() => {
        pollBatchStatus(id);
      }, POLL_INTERVAL);
    },
    [pollBatchStatus]
  );

  const handleImport = async () => {
    if (selectedFiles.length === 0) {
      setError("Selecteer eerst CV bestanden");
      return;
    }

    setImportState("uploading");
    setError(null);
    setUploadProgress(0);

    try {
      // Upload files in batches
      const totalBatches = Math.ceil(selectedFiles.length / BATCH_SIZE);
      let uploadedBatches = 0;
      let currentBatchId: string | null = null;

      for (let i = 0; i < selectedFiles.length; i += BATCH_SIZE) {
        const batch = selectedFiles.slice(i, i + BATCH_SIZE);
        const formData = new FormData();

        batch.forEach((file) => {
          formData.append("files[]", file);
        });

        // Pass batch_id to subsequent uploads so they join the same batch
        if (currentBatchId) {
          formData.append("batch_id", currentBatchId);
        }

        const response = await API.post<{
          batch_id: string;
          queued_count: number;
        }>("/contacts/smart-import", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        // Use the batch_id from the first response
        if (!currentBatchId) {
          currentBatchId = response.batch_id;
          setBatchId(currentBatchId);
          // Start global progress indicator
          startGlobalImport(currentBatchId, selectedFiles.length);
        }

        uploadedBatches++;
        setUploadProgress(Math.round((uploadedBatches / totalBatches) * 100));
      }

      // All files uploaded, start polling for status
      setImportState("processing");
      if (currentBatchId) {
        startPolling(currentBatchId);
      }
    } catch (err: any) {
      console.error(err);
      setImportState("idle");
      if (err?.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Er is iets misgegaan bij het uploaden. Probeer het opnieuw.");
      }
    }
  };

  const handleClose = () => {
    // Stop polling if active
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    // Call onSuccess if we completed with any successful imports
    if (importState === "complete" && batchStatus && batchStatus.success_count > 0) {
      onSuccess?.();
    }

    // Reset state
    setError(null);
    setSelectedFiles([]);
    setImportState("idle");
    setUploadProgress(0);
    setBatchId(null);
    setBatchStatus(null);
    setShowFailedList(false);
    setShowSuccessList(false);
    setShowSkippedList(false);
    onClose();
  };

  const renderIdleState = () => (
    <>
      <Box
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        sx={{
          border: "2px dashed",
          borderColor: "divider",
          borderRadius: 2,
          p: 4,
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.2s",
          "&:hover": {
            borderColor: "primary.main",
            bgcolor: "action.hover",
          },
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <CloudUploadIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Sleep CV's hierheen
        </Typography>
        <Typography variant="body2" color="text.secondary">
          of klik om bestanden te selecteren
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" mt={1}>
          PDF en Word bestanden (max 10MB per bestand)
        </Typography>
        <input
          ref={fileInputRef}
          type="file"
          hidden
          multiple
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileSelect}
        />
      </Box>

      {selectedFiles.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle2">
              {selectedFiles.length} bestand(en) geselecteerd
            </Typography>
            <Button size="small" onClick={clearFiles} color="error">
              Alles verwijderen
            </Button>
          </Stack>
          <Box
            sx={{
              maxHeight: 200,
              overflow: "auto",
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            <List dense>
              {selectedFiles.map((file, index) => (
                <ListItem
                  key={`${file.name}-${index}`}
                  secondaryAction={
                    <IconButton edge="end" size="small" onClick={() => removeFile(index)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <ListItemIcon>
                    <UploadFileIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={file.name}
                    secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </Box>
      )}
    </>
  );

  const renderUploadingState = () => (
    <Box sx={{ textAlign: "center", py: 4 }}>
      <Typography variant="h6" gutterBottom>
        Bestanden uploaden...
      </Typography>
      <Box sx={{ width: "100%", mt: 2 }}>
        <LinearProgress variant="determinate" value={uploadProgress} />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {uploadProgress}% voltooid
      </Typography>
    </Box>
  );

  const renderProcessingState = () => (
    <Box sx={{ textAlign: "center", py: 4 }}>
      <Typography variant="h6" gutterBottom>
        CV's worden verwerkt met AI...
      </Typography>
      {batchStatus && (
        <>
          <Box sx={{ width: "100%", mt: 2 }}>
            <LinearProgress
              variant="determinate"
              value={(batchStatus.processed / batchStatus.total) * 100}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {batchStatus.processed} van {batchStatus.total} verwerkt
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" sx={{ mt: 2, gap: 1 }}>
            <Chip
              icon={<CheckCircleIcon />}
              label={`${batchStatus.success_count} succesvol`}
              color="success"
              variant="outlined"
              size="small"
            />
            {batchStatus.skipped_count > 0 && (
              <Chip
                icon={<WarningIcon />}
                label={`${batchStatus.skipped_count} duplicaat`}
                color="warning"
                variant="outlined"
                size="small"
              />
            )}
            {batchStatus.failed_count > 0 && (
              <Chip
                icon={<ErrorIcon />}
                label={`${batchStatus.failed_count} mislukt`}
                color="error"
                variant="outlined"
                size="small"
              />
            )}
          </Stack>
        </>
      )}
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
        Dit kan enkele minuten duren. Je kunt dit venster sluiten - de import gaat door op de achtergrond.
      </Typography>
    </Box>
  );

  const renderCompleteState = () => {
    const hasFailures = (batchStatus?.failed_count ?? 0) > 0;
    const hasSkipped = (batchStatus?.skipped_count ?? 0) > 0;
    const hasSuccess = (batchStatus?.success_count ?? 0) > 0;

    // Determine alert message and severity
    let alertSeverity: "success" | "warning" | "error" = "success";
    let alertMessage = "";

    if (hasFailures) {
      alertSeverity = "error";
      alertMessage = `${batchStatus?.success_count} CV's geïmporteerd, ${batchStatus?.failed_count} mislukt`;
      if (hasSkipped) {
        alertMessage += `, ${batchStatus?.skipped_count} overgeslagen (duplicaat)`;
      }
    } else if (hasSkipped && hasSuccess) {
      alertSeverity = "success";
      alertMessage = `${batchStatus?.success_count} CV's succesvol geïmporteerd. ${batchStatus?.skipped_count} overgeslagen (duplicaat).`;
    } else if (hasSkipped && !hasSuccess) {
      alertSeverity = "warning";
      alertMessage = `Alle ${batchStatus?.skipped_count} CV's zijn duplicaten en overgeslagen.`;
    } else {
      alertMessage = `Alle ${batchStatus?.success_count} CV's zijn succesvol geïmporteerd!`;
    }

    return (
      <Box sx={{ py: 2 }}>
        <Alert severity={alertSeverity} sx={{ mb: 2 }}>
          {alertMessage}
        </Alert>

        {/* Failed imports - actual errors */}
        {batchStatus && batchStatus.failed_count > 0 && (
          <Box sx={{ mb: 2 }}>
            <Button
              onClick={() => setShowFailedList(!showFailedList)}
              endIcon={showFailedList ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              color="error"
              variant="outlined"
              fullWidth
            >
              Bekijk mislukte imports ({batchStatus.failed_count})
            </Button>
            <Collapse in={showFailedList}>
              <Box
                sx={{
                  mt: 1,
                  maxHeight: 200,
                  overflow: "auto",
                  border: 1,
                  borderColor: "error.light",
                  borderRadius: 1,
                }}
              >
                <List dense>
                  {batchStatus.failed.map((item, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <ErrorIcon color="error" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.filename}
                        secondary={item.reason}
                        primaryTypographyProps={{ variant: "body2" }}
                        secondaryTypographyProps={{ variant: "caption", color: "error" }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                Deze CV's moeten handmatig worden ingevoerd.
              </Typography>
            </Collapse>
          </Box>
        )}

        {/* Skipped imports - duplicates */}
        {batchStatus && batchStatus.skipped_count > 0 && (
          <Box sx={{ mb: 2 }}>
            <Button
              onClick={() => setShowSkippedList(!showSkippedList)}
              endIcon={showSkippedList ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              color="warning"
              variant="outlined"
              fullWidth
            >
              Bekijk overgeslagen duplicaten ({batchStatus.skipped_count})
            </Button>
            <Collapse in={showSkippedList}>
              <Box
                sx={{
                  mt: 1,
                  maxHeight: 200,
                  overflow: "auto",
                  border: 1,
                  borderColor: "warning.light",
                  borderRadius: 1,
                }}
              >
                <List dense>
                  {batchStatus.skipped.map((item, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <WarningIcon color="warning" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.filename}
                        secondary={item.reason}
                        primaryTypographyProps={{ variant: "body2" }}
                        secondaryTypographyProps={{ variant: "caption" }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                Deze contacten bestaan al in het systeem.
              </Typography>
            </Collapse>
          </Box>
        )}

        {/* Successful imports */}
        {batchStatus && batchStatus.success_count > 0 && (
          <Box>
            <Button
              onClick={() => setShowSuccessList(!showSuccessList)}
              endIcon={showSuccessList ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              color="success"
              variant="outlined"
              fullWidth
            >
              Bekijk succesvol geïmporteerde kandidaten ({batchStatus.success_count})
            </Button>
            <Collapse in={showSuccessList}>
              <Box
                sx={{
                  mt: 1,
                  maxHeight: 200,
                  overflow: "auto",
                  border: 1,
                  borderColor: "success.light",
                  borderRadius: 1,
                }}
              >
                <List dense>
                  {batchStatus.success.map((item, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.name}
                        secondary={item.filename}
                        primaryTypographyProps={{ variant: "body2" }}
                        secondaryTypographyProps={{ variant: "caption" }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Collapse>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Dialog open={open} fullWidth maxWidth="sm" onClose={handleClose}>
      <DialogTitle>
        {importState === "idle" && "Smart CV Import"}
        {importState === "uploading" && "Uploaden..."}
        {importState === "processing" && "Verwerken..."}
        {importState === "complete" && "Import Voltooid"}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {importState === "idle" && (
            <Typography variant="body2" color="text.secondary">
              Upload meerdere CV's tegelijk. De AI extraheert automatisch naam, contactgegevens, opleiding en werkervaring uit elk CV.
            </Typography>
          )}

          {importState === "idle" && renderIdleState()}
          {importState === "uploading" && renderUploadingState()}
          {importState === "processing" && renderProcessingState()}
          {importState === "complete" && renderCompleteState()}

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={importState === "uploading"}>
          {importState === "complete" ? "Sluiten" : importState === "processing" ? "Minimaliseren" : "Annuleren"}
        </Button>
        {importState === "idle" && (
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={selectedFiles.length === 0}
            startIcon={<CloudUploadIcon />}
          >
            {selectedFiles.length > 0
              ? `${selectedFiles.length} CV's importeren`
              : "CV's importeren"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
