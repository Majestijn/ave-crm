import React, { useState, useRef, useCallback } from "react";
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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
} from "@mui/material";
import {
  TableChart as TableChartIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CloudUpload as CloudUploadIcon,
} from "@mui/icons-material";
import API from "../../api/client";

interface ExcelImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FailedRow {
  row: number;
  reason: string;
  name?: string;
}

interface SkippedRow {
  row: number;
  reason: string;
  name?: string;
}

interface SuccessRow {
  row: number;
  name: string;
}

interface ImportResult {
  success_count: number;
  success: SuccessRow[];
  failed: FailedRow[];
  skipped: SkippedRow[];
}

type ImportState = "idle" | "uploading" | "complete";

export default function ExcelImportDialog({
  open,
  onClose,
  onSuccess,
}: ExcelImportDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importState, setImportState] = useState<ImportState>("idle");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showFailed, setShowFailed] = useState(false);
  const [showSkipped, setShowSkipped] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "application/csv",
  ];
  const validExtensions = [".xlsx", ".csv"];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    const isValidType = validTypes.includes(file.type) || validExtensions.includes(ext);

    if (!isValidType) {
      setError("Alleen Excel (.xlsx) en CSV bestanden worden ondersteund.");
      return;
    }

    setSelectedFile(file);
    setError(null);
    setResult(null);
  };

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const file = event.dataTransfer.files?.[0];
      if (!file) return;

      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
      const isValidType = validTypes.includes(file.type) || validExtensions.includes(ext);

      if (!isValidType) {
        setError("Alleen Excel (.xlsx) en CSV bestanden worden ondersteund.");
        return;
      }

      setSelectedFile(file);
      setError(null);
      setResult(null);
    },
    []
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleImport = async () => {
    if (!selectedFile) {
      setError("Selecteer eerst een bestand");
      return;
    }

    setImportState("uploading");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const data = await API.post<ImportResult>("/contacts/excel-import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResult(data);
      setImportState("complete");

      if (data.success_count > 0) {
        onSuccess?.();
      }
    } catch (err: unknown) {
      setImportState("idle");
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(
        axiosErr?.response?.data?.message ??
          "Er is iets misgegaan bij het importeren. Probeer het opnieuw."
      );
    }
  };

  const handleClose = () => {
    if (importState === "complete" && result && result.success_count > 0) {
      onSuccess?.();
    }
    setSelectedFile(null);
    setImportState("idle");
    setResult(null);
    setError(null);
    setShowFailed(false);
    setShowSkipped(false);
    setShowSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
        <TableChartIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Sleep Excel of CSV hierheen
        </Typography>
        <Typography variant="body2" color="text.secondary">
          of klik om een bestand te selecteren
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          Eerste rij moet kolomkoppen bevatten. Verplicht: kolom &quot;Naam&quot; OF kolommen &quot;Voornaam&quot; + &quot;Achternaam&quot;. 
          Bij &quot;Naam&quot; wordt automatisch gesplitst (bijv. &quot;Jan van der Berg&quot; → Jan, van der, Berg).
          Optioneel: Email, Telefoon, Bedrijf, Functie, Locatie, Opleiding, etc.
        </Typography>
        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          onChange={handleFileSelect}
        />
      </Box>

      {selectedFile && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" color="primary">
            Geselecteerd: {selectedFile.name}
          </Typography>
        </Box>
      )}
    </>
  );

  const renderUploadingState = () => (
    <Box sx={{ textAlign: "center", py: 4 }}>
      <Typography variant="h6" gutterBottom>
        Bestand verwerken...
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Contacten worden geïmporteerd.
      </Typography>
    </Box>
  );

  const renderCompleteState = () => {
    if (!result) return null;

    const { success_count, success, failed, skipped } = result;
    const hasFailures = failed.length > 0;
    const hasSkipped = skipped.length > 0;

    let alertSeverity: "success" | "warning" | "error" = "success";
    let alertMessage = "";
    if (hasFailures) {
      alertSeverity = "error";
      alertMessage = `${success_count} nieuw geïmporteerd, ${failed.length} mislukt`;
      if (hasSkipped) alertMessage += `, ${skipped.length} overgeslagen`;
    } else if (hasSkipped && success_count > 0) {
      alertMessage = `${success_count} nieuw geïmporteerd. ${skipped.length} rijen overgeslagen (duplicaten of ontbrekende naam).`;
    } else if (hasSkipped && success_count === 0) {
      alertSeverity = "warning";
      alertMessage = `Alle ${skipped.length} rijen overgeslagen (duplicaten of ontbrekende naam).`;
    } else {
      alertMessage = success_count > 0 ? `${success_count} contacten nieuw geïmporteerd.` : "Geen contacten geïmporteerd.";
    }

    const listBoxSx = { mt: 1, maxHeight: 200, overflow: "auto", border: 1, borderRadius: 1 };

    return (
      <Box sx={{ py: 2 }}>
        <Alert severity={alertSeverity} sx={{ mb: 2 }}>
          {alertMessage}
        </Alert>

        {/* Mislukt - rood */}
        {failed.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Button
              onClick={() => setShowFailed(!showFailed)}
              endIcon={showFailed ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              color="error"
              variant="outlined"
              fullWidth
            >
              Bekijk mislukte rijen ({failed.length})
            </Button>
            <Collapse in={showFailed}>
              <Box sx={{ ...listBoxSx, borderColor: "error.light" }}>
                <List dense>
                  {failed.map((item, i) => (
                    <ListItem key={i}>
                      <ListItemIcon>
                        <ErrorIcon color="error" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Rij ${item.row}${item.name ? ": " + item.name : ""}`}
                        secondary={item.reason}
                        primaryTypographyProps={{ variant: "body2" }}
                        secondaryTypographyProps={{ variant: "caption", color: "error" }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                Deze rijen moeten handmatig worden ingevoerd.
              </Typography>
            </Collapse>
          </Box>
        )}

        {/* Overgeslagen - oranje */}
        {skipped.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Button
              onClick={() => setShowSkipped(!showSkipped)}
              endIcon={showSkipped ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              color="warning"
              variant="outlined"
              fullWidth
            >
              Bekijk overgeslagen rijen ({skipped.length})
            </Button>
            <Collapse in={showSkipped}>
              <Box sx={{ ...listBoxSx, borderColor: "warning.light" }}>
                <List dense>
                  {skipped.map((item, i) => (
                    <ListItem key={i}>
                      <ListItemIcon>
                        <WarningIcon color="warning" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Rij ${item.row}${item.name ? ": " + item.name : ""}`}
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

        {/* Nieuw geïmporteerd - groen */}
        {success.length > 0 && (
          <Box>
            <Button
              onClick={() => setShowSuccess(!showSuccess)}
              endIcon={showSuccess ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              color="success"
              variant="outlined"
              fullWidth
            >
              Nieuw geïmporteerd ({success.length})
            </Button>
            <Collapse in={showSuccess}>
              <Box sx={{ ...listBoxSx, borderColor: "success.light" }}>
                <List dense>
                  {success.map((item, i) => (
                    <ListItem key={i}>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.name}
                        secondary={`Rij ${item.row}`}
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
        {importState === "idle" && "Excel Import"}
        {importState === "uploading" && "Verwerken..."}
        {importState === "complete" && "Import Voltooid"}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {importState === "idle" && (
            <Typography variant="body2" color="text.secondary">
              Importeer contacten uit een Excel (.xlsx) of CSV bestand. Gebruik een kolom &quot;Naam&quot; 
              (wordt automatisch gesplitst) of aparte kolommen Voornaam en Achternaam.
            </Typography>
          )}

          {importState === "idle" && renderIdleState()}
          {importState === "uploading" && renderUploadingState()}
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
          {importState === "complete" ? "Sluiten" : "Annuleren"}
        </Button>
        {importState === "idle" && (
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={!selectedFile}
            startIcon={<CloudUploadIcon />}
          >
            Importeren
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
