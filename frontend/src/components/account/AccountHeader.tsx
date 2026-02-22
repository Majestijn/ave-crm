import React from "react";
import { Box, IconButton, Paper, Stack, Tooltip, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type { Account } from "../../types/accounts";
import { formatRevenue } from "../../utils/formatters";

type Props = {
  account: Account;
  totalAssignments: number;
  activeAssignments: number;
  onDelete?: () => void;
  isDeleting?: boolean;
};

export default function AccountHeader({
  account,
  totalAssignments,
  activeAssignments,
  onDelete,
  isDeleting = false,
}: Props) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        mb: 4,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderRadius: 2,
      }}
    >
      {/* Logo */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        {account.logo_url ? (
          <img
            src={account.logo_url}
            alt={account.name}
            style={{ height: 60, objectFit: "contain" }}
          />
        ) : (
          <Typography variant="h4" fontWeight="bold">
            {account.name}
          </Typography>
        )}
      </Box>

      {/* Stats */}
      <Stack direction="row" spacing={8} sx={{ mr: 4 }}>
        <Box>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
            Bedrijf
          </Typography>
          <Typography variant="body1">{account.name}</Typography>
        </Box>
        <Box>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
            Omzet
          </Typography>
          <Typography variant="body1">
            {formatRevenue(account.revenue_cents)}
          </Typography>
        </Box>
        <Box>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
            Opdrachten
          </Typography>
          <Typography variant="body1">
            {totalAssignments} ({activeAssignments})
          </Typography>
        </Box>
      </Stack>

      {onDelete && (
        <Tooltip title="Klant verwijderen">
          <span>
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              disabled={isDeleting}
              color="error"
              aria-label="Klant verwijderen"
            >
              <DeleteOutlineIcon />
            </IconButton>
          </span>
        </Tooltip>
      )}
    </Paper>
  );
}

