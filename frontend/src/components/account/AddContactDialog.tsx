import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  Autocomplete,
  Typography,
} from "@mui/material";
import type { Contact } from "../../types/contacts";
import { useAddContactToAccount } from "../../api/mutations/accounts";
import { formatContactName, formatNetworkRoles } from "../../utils/formatters";
import { primaryButtonSx } from "./styles";

type Props = {
  open: boolean;
  onClose: () => void;
  accountUid: string;
  contacts: Contact[];
  existingContactUids: string[];
};

export default function AddContactDialog({
  open,
  onClose,
  accountUid,
  contacts,
  existingContactUids,
}: Props) {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addContactMutation = useAddContactToAccount(accountUid);

  // Filter out contacts that are already linked
  const availableContacts = contacts.filter(
    (c) => !existingContactUids.includes(c.uid)
  );

  const handleSubmit = async () => {
    if (!selectedContact) {
      setError("Selecteer een contact");
      return;
    }

    setError(null);

    try {
      await addContactMutation.mutateAsync({
        contact_uid: selectedContact.uid,
      });

      handleClose();
    } catch (err: any) {
      console.error("Error adding contact:", err);
      setError(err?.response?.data?.message || "Er is iets misgegaan");
    }
  };

  const handleClose = () => {
    setSelectedContact(null);
    setError(null);
    onClose();
  };

  const getOptionLabel = (option: Contact): string => {
    const name = formatContactName(option);
    const company = option.current_company ? ` - ${option.current_company}` : "";
    const roles =
      option.network_roles && option.network_roles.length > 0
        ? ` (${formatNetworkRoles(option.network_roles, true)})`
        : "";
    return `${name}${company}${roles}`;
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Contactpersoon koppelen</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Autocomplete
            options={availableContacts}
            getOptionLabel={getOptionLabel}
            value={selectedContact}
            onChange={(_, newValue) => setSelectedContact(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Selecteer contact"
                required
                error={!selectedContact && !!error}
              />
            )}
            isOptionEqualToValue={(option, value) => option.uid === value.uid}
          />
          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose} disabled={addContactMutation.isPending}>
          Annuleren
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={addContactMutation.isPending || !selectedContact}
          sx={primaryButtonSx}
        >
          {addContactMutation.isPending ? "Bezig..." : "Koppelen"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

