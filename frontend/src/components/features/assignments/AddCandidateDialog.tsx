import React, { useState, useCallback } from "react";
import {
  Box,
  Typography,
  Stack,
  Button,
  TextField,
  InputAdornment,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import { useSearchCandidates } from "../../../api/queries/contacts";
import { useAddAssignmentCandidates } from "../../../api/mutations/assignmentCandidates";
import CandidatePickerGrid from "./CandidatePickerGrid";

const CANDIDATES_PAGE_SIZE = 50;

type AddCandidateDialogProps = {
  open: boolean;
  onClose: () => void;
  assignmentUid: string | undefined;
  linkedCandidateUids: Set<string>;
};

export default function AddCandidateDialog({
  open,
  onClose,
  assignmentUid,
  linkedCandidateUids,
}: AddCandidateDialogProps) {
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());

  const { data: searchResponse, isLoading } = useSearchCandidates(
    searchQuery,
    open,
    page,
    CANDIDATES_PAGE_SIZE,
  );

  const candidates = searchResponse?.data || [];
  const totalPages = Math.max(searchResponse?.meta?.last_page || 1, 1);
  const currentPage = Math.max(
    searchResponse?.meta?.current_page || page,
    1,
  );
  const totalCount = searchResponse?.meta?.total || 0;

  const addCandidatesMutation = useAddAssignmentCandidates();

  React.useEffect(() => {
    if (!open) return;
    setPage((prev) => (prev === 1 ? prev : 1));
  }, [open, searchQuery]);

  const handleClose = useCallback(() => {
    onClose();
    setSelectedUids(new Set());
    if (searchInputRef.current) searchInputRef.current.value = "";
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setSearchQuery("");
  }, [onClose]);

  const handleToggleSelection = useCallback((uid: string) => {
    setSelectedUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }, []);

  const newSelectedCount = [...selectedUids].filter(
    (uid) => !linkedCandidateUids.has(uid),
  ).length;

  const handleAdd = async () => {
    if (!assignmentUid) return;

    const contactUids = [...selectedUids].filter(
      (uid) => !linkedCandidateUids.has(uid),
    );
    if (contactUids.length === 0) {
      handleClose();
      return;
    }

    try {
      await addCandidatesMutation.mutateAsync({
        assignmentUid,
        contactUids,
      });
      handleClose();
    } catch (e: any) {
      console.error("Error adding candidates to assignment:", e);
      alert(e?.response?.data?.message || "Fout bij toevoegen van kandidaten");
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>Kandidaat toevoegen aan opdracht</DialogTitle>
      <DialogContent>
        {isLoading ? (
          <Typography variant="body2" sx={{ py: 2 }}>
            Laden...
          </Typography>
        ) : (
          <>
            <TextField
              label="Zoeken op naam, e-mail, bedrijf of functie"
              placeholder="Typ om te zoeken..."
              inputRef={searchInputRef}
              defaultValue=""
              onChange={(e) => {
                const nextValue = e.target.value;
                if (debounceTimerRef.current) {
                  clearTimeout(debounceTimerRef.current);
                }
                debounceTimerRef.current = setTimeout(
                  () => setSearchQuery(nextValue.trim()),
                  300,
                );
              }}
              size="small"
              fullWidth
              sx={{ mb: 2, mt: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            {candidates.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() =>
                    setSelectedUids(new Set(candidates.map((c) => c.uid)))
                  }
                  disabled={selectedUids.size === candidates.length}
                >
                  Selecteer alle ({candidates.length})
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setSelectedUids(new Set())}
                  disabled={selectedUids.size === 0}
                >
                  Deselecteer alles
                </Button>
              </Stack>
            )}

            {candidates.length === 0 ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ py: 2, textAlign: "center" }}
              >
                {searchQuery.trim()
                  ? "Geen kandidaten gevonden. Probeer een andere zoekterm."
                  : "Typ in het zoekveld om kandidaten te vinden."}
              </Typography>
            ) : (
              <CandidatePickerGrid
                rows={candidates}
                linkedCandidateUids={linkedCandidateUids}
                selectedCandidateUids={selectedUids}
                onToggleSelection={handleToggleSelection}
              />
            )}
          </>
        )}
      </DialogContent>

      {open && totalPages > 1 && (
        <Box
          sx={{
            px: 3,
            pb: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Pagina {currentPage} van {totalPages} ({totalCount} kandidaten)
          </Typography>
          <Pagination
            count={totalPages}
            page={currentPage}
            size="small"
            color="primary"
            onChange={(_event, p) => setPage(p)}
            disabled={isLoading}
          />
        </Box>
      )}

      <DialogActions>
        <Button
          onClick={handleClose}
          disabled={addCandidatesMutation.isPending}
        >
          Annuleren
        </Button>
        <Button
          onClick={handleAdd}
          variant="contained"
          disabled={newSelectedCount === 0 || addCandidatesMutation.isPending}
        >
          {addCandidatesMutation.isPending
            ? "Bezig..."
            : `Toevoegen (${newSelectedCount} nieuw)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
