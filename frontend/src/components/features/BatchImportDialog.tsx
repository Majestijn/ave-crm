import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  LinearProgress,
  Stack,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
} from "@mui/material";
import {
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Folder as FolderIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";
import API from "../../api/client";
import { useImportProgress } from "../../contexts/ImportProgressContext";

interface BatchImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface BatchStatus {
  batch_id: string;
  status: string;
  total_files: number;
  extracted_files: number;
  processed_files: number;
  success_count: number;
  failed_count: number;
  skipped_count: number;
  progress_percentage: number;
  is_complete: boolean;
  error_message: string | null;
  failed_files: Array<{ filename: string; reason: string }>;
  skipped_files: Array<{ filename: string; reason: string }>;
  started_at: string | null;
  completed_at: string | null;
}

type DialogState = "idle" | "uploading" | "processing" | "complete";

const POLL_INTERVAL = 5000;

export default function BatchImportDialog({
  open,
  onClose,
  onSuccess,
}: BatchImportDialogProps) {
  const [dialogState, setDialogState] = useState<DialogState>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null);
  const [showFailedList, setShowFailedList] = useState(false);
  const [showSkippedList, setShowSkippedList] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentBatchIdRef = useRef<string | null>(null);

  // Global progress context
  const { startBatchImport: startGlobalBatchImport, updateStatus: updateGlobalStatus } = useImportProgress();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/zip" && !file.name.endsWith(".zip")) {
      setError("Alleen ZIP bestanden zijn toegestaan");
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      setError("Bestand mag maximaal 500MB zijn");
      return;
    }

    setSelectedFile(file);
    setError(null);
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer.files[0];
    if (!file) return;

    if (file.type !== "application/zip" && !file.name.endsWith(".zip")) {
      setError("Alleen ZIP bestanden zijn toegestaan");
      return;
    }

    setSelectedFile(file);
    setError(null);
  }, []);

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
    },
    []
  );

  const pollBatchStatus = useCallback(async (batchId: string) => {
    try {
      const status = await API.get<BatchStatus>(`/cv-import/batch/${batchId}`);
      setBatchStatus(status);

      if (status.is_complete) {
        setDialogState("complete");
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
    } catch (err) {
      console.error("Error polling batch status:", err);
    }
  }, []);

  const startPolling = useCallback(
    (batchId: string) => {
      pollBatchStatus(batchId);
      pollIntervalRef.current = setInterval(() => {
        pollBatchStatus(batchId);
      }, POLL_INTERVAL);
    },
    [pollBatchStatus]
  );

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Selecteer eerst een ZIP bestand");
      return;
    }

    setDialogState("uploading");
    setError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await API.post<{
        batch_id: string;
        total_files: number;
      }>("/cv-import/batch", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round(
              (progressEvent.loaded / progressEvent.total) * 100
            );
            setUploadProgress(progress);
          }
        },
      });

      setDialogState("processing");
      currentBatchIdRef.current = response.batch_id;
      
      // Start global progress indicator
      startGlobalBatchImport(response.batch_id, response.total_files);
      
      startPolling(response.batch_id);
    } catch (err: any) {
      console.error(err);
      setDialogState("idle");
      setError(
        err?.response?.data?.message ||
          "Er is iets misgegaan bij het uploaden"
      );
    }
  };

  const handleClose = () => {
    // Stop dialog's own polling (global context polling continues)
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    // Call success callback if completed with imports
    if (dialogState === "complete" && batchStatus && batchStatus.success_count > 0) {
      onSuccess?.();
    }

    // Reset dialog state (but global progress continues if still processing)
    setDialogState("idle");
    setSelectedFile(null);
    setBatchStatus(null);
    setShowFailedList(false);
    setShowSkippedList(false);
    setError(null);
    currentBatchIdRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    onClose();
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Wachten";
      case "extracting":
        return "Tekst extracten";
      case "processing":
        return "Verwerken";
      case "completed":
        return "Voltooid";
      case "failed":
        return "Mislukt";
      default:
        return status;
    }
  };

  const renderIdleState = () => (
    <>
      <Box
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        sx={{
          border: "2px dashed",
          borderColor: selectedFile ? "primary.main" : "divider",
          borderRadius: 2,
          p: 4,
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.2s",
          bgcolor: selectedFile ? "primary.50" : "transparent",
          "&:hover": {
            borderColor: "primary.main",
            bgcolor: "action.hover",
          },
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        {selectedFile ? (
          <>
            <FolderIcon sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {selectedFile.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </Typography>
          </>
        ) : (
          <>
            <CloudUploadIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Sleep een ZIP bestand hierheen
            </Typography>
            <Typography variant="body2" color="text.secondary">
              of klik om te selecteren
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              ZIP bestand met CV's (PDF/Word), max 500MB
            </Typography>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept=".zip,application/zip"
          onChange={handleFileSelect}
        />
      </Box>

      <Alert severity="info" sx={{ mt: 2 }}>
        <strong>Hoe werkt het?</strong>
        <Typography variant="body2" component="div">
          <ol style={{ margin: "8px 0 0 0", paddingLeft: 20 }}>
            <li>Zip alle CV's (PDF/Word) in één bestand</li>
            <li>Upload het ZIP bestand hier</li>
            <li>De AI parseert alle CV's automatisch via Vertex AI</li>
            <li>Dit kan enkele minuten tot uren duren</li>
          </ol>
        </Typography>
      </Alert>
    </>
  );

  const renderUploadingState = () => (
    <Box sx={{ textAlign: "center", py: 4 }}>
      <CloudUploadIcon sx={{ fontSize: 64, color: "primary.main", mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        Bestand uploaden...
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
      <ScheduleIcon sx={{ fontSize: 64, color: "primary.main", mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        CV's worden verwerkt met AI...
      </Typography>

      {batchStatus && (
        <>
          <Chip
            label={getStatusLabel(batchStatus.status)}
            color="primary"
            sx={{ mb: 2 }}
          />

          <Box sx={{ width: "100%", mt: 2 }}>
            <LinearProgress
              variant="determinate"
              value={batchStatus.progress_percentage}
            />
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {batchStatus.processed_files} van {batchStatus.total_files} verwerkt ({batchStatus.progress_percentage}%)
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

      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 3 }}>
        Dit kan enkele minuten tot uren duren. Je kunt dit venster sluiten - de import gaat door op de achtergrond.
      </Typography>
    </Box>
  );

  const renderCompleteState = () => {
    const hasFailures = (batchStatus?.failed_count ?? 0) > 0;
    const hasSkipped = (batchStatus?.skipped_count ?? 0) > 0;
    const hasSuccess = (batchStatus?.success_count ?? 0) > 0;

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
              <Box sx={{ mt: 1, maxHeight: 150, overflow: "auto", border: 1, borderColor: "error.light", borderRadius: 1 }}>
                <List dense>
                  {batchStatus.failed_files.map((item, index) => (
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
            </Collapse>
          </Box>
        )}

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
              <Box sx={{ mt: 1, maxHeight: 150, overflow: "auto", border: 1, borderColor: "warning.light", borderRadius: 1 }}>
                <List dense>
                  {batchStatus.skipped_files?.map((item, index) => (
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
            </Collapse>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Dialog open={open} fullWidth maxWidth="sm" onClose={handleClose}>
      <DialogTitle>
        {dialogState === "idle" && "Bulk CV Import (ZIP)"}
        {dialogState === "uploading" && "Uploaden..."}
        {dialogState === "processing" && "Verwerken..."}
        {dialogState === "complete" && "Import Voltooid"}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {dialogState === "idle" && (
            <Typography variant="body2" color="text.secondary">
              Upload een ZIP bestand met meerdere CV's. Ideaal voor grote hoeveelheden (100+ CV's).
            </Typography>
          )}

          {dialogState === "idle" && renderIdleState()}
          {dialogState === "uploading" && renderUploadingState()}
          {dialogState === "processing" && renderProcessingState()}
          {dialogState === "complete" && renderCompleteState()}

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={dialogState === "uploading"}>
          {dialogState === "complete" ? "Sluiten" : dialogState === "processing" ? "Minimaliseren" : "Annuleren"}
        </Button>
        {dialogState === "idle" && (
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!selectedFile}
            startIcon={<CloudUploadIcon />}
          >
            Start Import
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
