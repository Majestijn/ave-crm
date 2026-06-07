import React from "react";
import { Box, Paper, Stack, Typography, IconButton } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import type { Account } from "../../types/accounts";
import type { Contact } from "../../types/contacts";
import { formatNetworkRoles } from "../../utils/formatters";

type Props = {
  account: Account;
  onAddContact: () => void;
  onSelectContact?: (contact: Contact) => void;
};

export default function AccountContactsCard({
  account,
  onAddContact,
  onSelectContact,
}: Props) {
  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap={2}
        mb={3}
      >
        <Typography variant="h6" fontWeight="bold">
          Contactpersonen
        </Typography>
        <IconButton
          size="small"
          onClick={onAddContact}
          sx={{
            width: 28,
            height: 28,
            border: "1px solid",
            borderColor: "error.main",
            color: "error.main",
            "&:hover": { bgcolor: "error.light", color: "white" },
          }}
        >
          <AddIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      <Stack spacing={3}>
        {account.contacts && account.contacts.length > 0 ? (
          account.contacts.map((ac) => {
            const clickable = !!onSelectContact && !!ac.contact;
            return (
            <Box
              key={ac.id}
              onClick={
                clickable ? () => onSelectContact!(ac.contact!) : undefined
              }
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectContact!(ac.contact!);
                      }
                    }
                  : undefined
              }
              sx={{
                borderLeft: "3px solid",
                borderColor: "error.main",
                pl: 2,
                ...(clickable && {
                  cursor: "pointer",
                  borderRadius: 1,
                  transition: "background-color 0.15s",
                  "&:hover": { bgcolor: "action.hover" },
                }),
              }}
            >
              <Typography fontWeight="bold">
                {ac.contact?.name || "Onbekend"}
              </Typography>
              {ac.contact?.company_role && (
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8rem" }}>
                  {ac.contact.company_role}
                </Typography>
              )}
              {ac.contact?.network_roles &&
                ac.contact.network_roles.length > 0 && (
                  <Typography
                    variant="body2"
                    color="primary.main"
                    sx={{ fontSize: "0.75rem" }}
                  >
                    {formatNetworkRoles(ac.contact.network_roles, true)}
                  </Typography>
                )}
              <Typography variant="body2" color="text.secondary">
                {ac.contact?.phone || "-"}
              </Typography>
            </Box>
            );
          })
        ) : (
          <Typography variant="body2" color="text.secondary">
            Geen contactpersonen
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}

