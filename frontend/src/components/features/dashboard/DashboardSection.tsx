import React from "react";
import {
  Box,
  Paper,
  Typography,
  Skeleton,
  alpha,
  useTheme,
} from "@mui/material";

type DashboardSectionProps = {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
};

export default function DashboardSection({
  title,
  subtitle,
  icon,
  action,
  isLoading,
  isEmpty,
  emptyMessage = "Geen gegevens",
  children,
}: DashboardSectionProps) {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        height: "100%",
        width: "100%",
        flex: 1,
        minHeight: DASHBOARD_WIDGET_MIN_HEIGHT,
        display: "flex",
        flexDirection: "column",
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
        bgcolor: "background.paper",
        boxShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.04)}`,
      }}
    >
      <Box
        sx={{
          px: 1.5,
          py: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          minHeight: 44,
          borderBottom: isLoading || isEmpty ? "none" : "1px solid",
          borderColor: "divider",
          bgcolor: alpha(theme.palette.primary.main, 0.02),
        }}
      >
        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "center",
            minWidth: 0,
            flex: 1,
          }}
        >
          {icon && (
            <Box
              sx={{
                color: "primary.main",
                display: "flex",
                alignItems: "center",
                "& .MuiSvgIcon-root": { fontSize: 18 },
              }}
            >
              {icon}
            </Box>
          )}
          <Box minWidth={0}>
            <Typography variant="body2" fontWeight={700} lineHeight={1.2} noWrap>
              {title}
            </Typography>
            {subtitle && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: "0.7rem", lineHeight: 1.2 }}
                noWrap
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
        {action}
      </Box>

      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          p: isLoading || isEmpty ? 1.5 : 0,
        }}
      >
        {isLoading ? (
          <StackSkeleton />
        ) : isEmpty ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              py: 1,
              display: "block",
              textAlign: "center",
              m: "auto",
            }}
          >
            {emptyMessage}
          </Typography>
        ) : (
          children
        )}
      </Box>
    </Paper>
  );
}

function StackSkeleton() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} variant="rounded" height={36} />
      ))}
    </Box>
  );
}

/** Vaste widgethoogte: header + 4 rijen + uitklap-knop */
export const DASHBOARD_WIDGET_MIN_HEIGHT = 232;

/** Shared compact row styles for dashboard list items */
export const dashboardRowSx = {
  px: 1.5,
  py: 0.75,
  minHeight: 0,
  borderBottom: "1px solid",
  borderColor: "divider",
  "&:last-child": { borderBottom: "none" },
} as const;
