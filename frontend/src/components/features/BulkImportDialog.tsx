import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Alert,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import API from "../../../axios-client";

interface BulkImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BulkImportDialog({
  open,
  onClose,
  onSuccess,
}: BulkImportDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!validTypes.includes(file.type)) {
        setError("Alleen PDF of Word documenten zijn toegestaan");
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleBulkImport = async () => {
    if (!selectedFile) {
      setError("Selecteer eerst een CV bestand");
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("cv_file", selectedFile);

      await API.post("/candidates/bulk-import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      handleClose();
      onSuccess?.();
    } catch (err: any) {
      console.error(err);
      if (err?.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Er is iets misgegaan bij het importeren. Probeer het opnieuw.");
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setSelectedFile(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth="sm"
      onClose={handleClose}
    >
      <DialogTitle>Bulk Import - 50 Kandidaten</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Selecteer een CV bestand (PDF of Word). Er worden 50 kandidaten aangemaakt met willekeurige gegevens, allemaal met hetzelfde CV.
          </Typography>

          <Button
            variant="outlined"
            component="label"
            startIcon={<UploadFileIcon />}
            fullWidth
          >
            {selectedFile ? selectedFile.name : "Selecteer CV bestand"}
            <input
              type="file"
              hidden
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileSelect}
            />
          </Button>

          {selectedFile && (
            <Alert severity="success">
              Bestand geselecteerd: {selectedFile.name}
            </Alert>
          )}

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleClose}
          disabled={isImporting}
        >
          Annuleren
        </Button>
        <Button
          variant="contained"
          onClick={handleBulkImport}
          disabled={!selectedFile || isImporting}
          startIcon={<UploadFileIcon />}
        >
          {isImporting ? "Bezig met importeren..." : "50 Kandidaten toevoegen"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

