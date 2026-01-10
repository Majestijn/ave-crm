import React from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import type { Account } from "../../types/accounts";
import { formatRevenueFullEuro } from "../../utils/formatters";

type Props = {
  account: Account;
};

export default function CompanyDetailsCard({ account }: Props) {
  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
        Bedrijfsdetails
      </Typography>
      <Stack spacing={2}>
        <Box display="flex" justifyContent="space-between">
          <Typography color="text.secondary">Bedrijfsnaam</Typography>
          <Typography fontWeight="bold">{account.name}</Typography>
        </Box>
        <Box display="flex" justifyContent="space-between">
          <Typography color="text.secondary">Locatie</Typography>
          <Typography fontWeight="bold">{account.location || "-"}</Typography>
        </Box>
        <Box display="flex" justifyContent="space-between">
          <Typography color="text.secondary">Website</Typography>
          <Typography fontWeight="bold">
            {account.website ? (
              <a
                href={account.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "inherit", textDecoration: "none" }}
              >
                {account.website.replace(/^https?:\/\//, "")}
              </a>
            ) : (
              "-"
            )}
          </Typography>
        </Box>
        <Box display="flex" justifyContent="space-between">
          <Typography color="text.secondary">Omzet</Typography>
          <Typography fontWeight="bold">
            {formatRevenueFullEuro(account.revenue_cents)}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

