import React from "react";
import { Box, Paper, Stack, Typography, IconButton } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import type { Account } from "../../types/accounts";
import { formatNetworkRoles } from "../../utils/formatters";

type Props = {
  account: Account;
  onAddContact: () => void;
};

export default function AccountContactsCard({ account, onAddContact }: Props) {
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
          account.contacts.map((ac) => (
            <Box
              key={ac.id}
              sx={{
                borderLeft: "3px solid",
                borderColor: "error.main",
                pl: 2,
              }}
            >
              <Typography fontWeight="bold">
                {ac.contact?.name || "Onbekend"}
              </Typography>
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
          ))
        ) : (
          <Typography variant="body2" color="text.secondary">
            Geen contactpersonen
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}

