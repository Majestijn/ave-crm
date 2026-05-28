import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Chip,
  Stack,
  ListItemButton,
  ListItemText,
  Avatar,
  alpha,
  useTheme,
  IconButton,
  Tooltip,
} from "@mui/material";
import Fade from "@mui/material/Fade";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import type { User } from "../../types/users";
import { useDashboard } from "../../api/queries/dashboard";
import DashboardSection, {
  dashboardRowSx,
} from "../../components/features/dashboard/DashboardSection";
import DashboardCompactList from "../../components/features/dashboard/DashboardCompactList";
import { candidateStatusOptions } from "../../components/features/assignments/types";

const statusLabelMap = Object.fromEntries(
  candidateStatusOptions.map((o) => [o.value, o.label])
);

const PREVIEW_COUNT = 4;

function formatDateNl(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso + (iso.length === 10 ? "T12:00:00" : "")).toLocaleDateString(
    "nl-NL",
    { day: "numeric", month: "short" }
  );
}

function formatTimeNl(iso: string): string {
  return new Date(iso).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function daysAgoLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "vandaag";
  if (diff === 1) return "gisteren";
  if (diff > 1) return `${diff}d geleden`;
  return `over ${Math.abs(diff)}d`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const compactChipSx = {
  height: 20,
  fontSize: "0.65rem",
  "& .MuiChip-label": { px: 0.75 },
} as const;

function DashboardWidget({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: "flex", minHeight: 0, height: "100%" }}>
      <Box sx={{ flex: 1, minWidth: 0, display: "flex" }}>{children}</Box>
    </Box>
  );
}

const Dashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const { data, isLoading, isError } = useDashboard();

  useEffect(() => {
    try {
      const raw = localStorage.getItem("current_user");
      if (raw) setCurrentUser(JSON.parse(raw) as User);
    } catch {
      setCurrentUser(null);
    }
    setMounted(true);
  }, []);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("nl-NL", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
    []
  );

  const name = currentUser?.name?.trim() || "";
  const greeting = name ? `Hallo, ${name.split(" ")[0]}` : "Dashboard";

  const interim = data?.interim_assignments ?? [];
  const ongoing = data?.ongoing_assignments ?? [];
  const candidates = data?.active_candidates ?? [];
  const events = data?.today_events ?? [];

  return (
    <Fade in={mounted} timeout={300}>
      <Box sx={{ maxWidth: 1200 }}>
        <Box
          sx={{
            mb: 2,
            px: 2,
            py: 1.5,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 70%)`,
            border: "1px solid",
            borderColor: alpha(theme.palette.primary.main, 0.12),
          }}
        >
          <Typography variant="h6" fontWeight={700} lineHeight={1.3}>
            {greeting}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {todayLabel} · overzicht voor vandaag
          </Typography>
        </Box>

        {isError && (
          <Typography variant="caption" color="error" sx={{ mb: 1.5, display: "block" }}>
            Kon dashboardgegevens niet laden. Ververs de pagina.
          </Typography>
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gridAutoRows: "1fr",
            gap: 1.5,
            alignItems: "stretch",
          }}
        >
          <DashboardWidget>
          <DashboardSection
            title="Interim opdrachten"
            subtitle="Looptijd / einddatum"
            icon={<AccessTimeIcon />}
            action={
              <Chip size="small" label={interim.length} sx={{ ...compactChipSx, fontWeight: 600 }} />
            }
            isLoading={isLoading}
            isEmpty={!isLoading && interim.length === 0}
            emptyMessage="Geen interim opdrachten"
          >
            <DashboardCompactList
              items={interim}
              previewCount={PREVIEW_COUNT}
              getKey={(item) => item.uid}
              renderItem={(item) => (
                <ListItemButton
                  onClick={() => navigate("/assignments")}
                  sx={dashboardRowSx}
                >
                  <ListItemText
                    disableTypography
                    primary={
                      <Stack direction="row" alignItems="center" gap={0.5} minWidth={0}>
                        <Typography variant="caption" fontWeight={600} noWrap sx={{ flex: 1 }}>
                          {item.title}
                        </Typography>
                        {item.is_overdue && (
                          <Chip label="Verlopen" size="small" color="error" sx={compactChipSx} />
                        )}
                        {item.is_ending_soon && !item.is_overdue && (
                          <Chip label="Binnenkort" size="small" color="warning" sx={compactChipSx} />
                        )}
                      </Stack>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary" noWrap component="div">
                        {item.account?.name}
                        {" · "}
                        {item.end_date
                          ? `tot ${formatDateNl(item.end_date)}`
                          : item.start_date
                            ? `vanaf ${formatDateNl(item.start_date)}`
                            : "geen einddatum"}
                        {item.days_remaining != null &&
                          !item.is_overdue &&
                          ` · ${item.days_remaining}d`}
                      </Typography>
                    }
                  />
                </ListItemButton>
              )}
            />
          </DashboardSection>
          </DashboardWidget>

          <DashboardWidget>
          <DashboardSection
            title="Agenda vandaag"
            subtitle={todayLabel}
            icon={<EventOutlinedIcon />}
            action={
              <Tooltip title="Agenda">
                <IconButton
                  size="small"
                  component={RouterLink}
                  to="/agenda"
                  sx={{ p: 0.25 }}
                >
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            }
            isLoading={isLoading}
            isEmpty={!isLoading && events.length === 0}
            emptyMessage="Geen afspraken"
          >
            <DashboardCompactList
              items={events}
              previewCount={PREVIEW_COUNT}
              getKey={(e) => e.uid}
              renderItem={(event) => (
                <ListItemButton
                  component={RouterLink}
                  to="/agenda"
                  sx={{
                    ...dashboardRowSx,
                    borderLeft: "3px solid",
                    borderLeftColor: event.color ?? theme.palette.primary.main,
                  }}
                >
                  <ListItemText
                    disableTypography
                    primary={
                      <Typography variant="caption" fontWeight={600} noWrap>
                        {event.title}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary" noWrap component="div">
                        {event.all_day
                          ? "Hele dag"
                          : `${formatTimeNl(event.start_at)}–${formatTimeNl(event.end_at)}`}
                        {[event.account_name, event.contact_name].filter(Boolean).length > 0 &&
                          ` · ${[event.account_name, event.contact_name].filter(Boolean).join(" · ")}`}
                      </Typography>
                    }
                  />
                </ListItemButton>
              )}
            />
          </DashboardSection>
          </DashboardWidget>

          <DashboardWidget>
          <DashboardSection
            title="Lopende opdrachten"
            subtitle="Laatste contact"
            icon={<WorkOutlineIcon />}
            action={
              <Chip size="small" label={ongoing.length} sx={{ ...compactChipSx, fontWeight: 600 }} />
            }
            isLoading={isLoading}
            isEmpty={!isLoading && ongoing.length === 0}
            emptyMessage="Geen lopende opdrachten"
          >
            <DashboardCompactList
              items={ongoing}
              previewCount={PREVIEW_COUNT}
              getKey={(item) => item.uid}
              renderItem={(item) => (
                <ListItemButton
                  onClick={() => navigate("/assignments")}
                  sx={dashboardRowSx}
                >
                  <ListItemText
                    disableTypography
                    primary={
                      <Stack direction="row" alignItems="center" gap={0.5}>
                        <Typography variant="caption" fontWeight={600} noWrap sx={{ flex: 1 }}>
                          {item.title}
                        </Typography>
                        {item.active_candidates_count > 0 && (
                          <Chip
                            size="small"
                            label={item.active_candidates_count}
                            sx={compactChipSx}
                          />
                        )}
                      </Stack>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary" noWrap component="div">
                        {item.account?.name ?? "—"}
                        {item.last_contact
                          ? ` · contact ${daysAgoLabel(item.last_contact.date)}`
                          : " · geen contact"}
                      </Typography>
                    }
                  />
                </ListItemButton>
              )}
            />
          </DashboardSection>
          </DashboardWidget>

          <DashboardWidget>
          <DashboardSection
            title="Kandidaten in proces"
            subtitle="Op opdracht"
            icon={<PeopleOutlineIcon />}
            action={
              <Chip
                size="small"
                label={candidates.length}
                sx={{ ...compactChipSx, fontWeight: 600 }}
              />
            }
            isLoading={isLoading}
            isEmpty={!isLoading && candidates.length === 0}
            emptyMessage="Geen kandidaten in proces"
          >
            <DashboardCompactList
              items={candidates}
              previewCount={PREVIEW_COUNT}
              getKey={(item) => `${item.assignment.uid}-${item.contact.uid}`}
              renderItem={(item) => (
                <ListItemButton
                  onClick={() => navigate("/assignments")}
                  sx={{ ...dashboardRowSx, py: 0.5 }}
                >
                  <Avatar
                    sx={{
                      width: 26,
                      height: 26,
                      mr: 1,
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: "primary.main",
                    }}
                  >
                    {initials(item.contact.name)}
                  </Avatar>
                  <ListItemText
                    disableTypography
                    sx={{ mr: 0.5 }}
                    primary={
                      <Typography variant="caption" fontWeight={600} noWrap>
                        {item.contact.name}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary" noWrap component="div">
                        {item.assignment.title} · {item.account.name}
                      </Typography>
                    }
                  />
                  <Chip
                    size="small"
                    label={statusLabelMap[item.status] ?? item.status}
                    variant="outlined"
                    color="primary"
                    sx={{ ...compactChipSx, maxWidth: 88, flexShrink: 0 }}
                  />
                </ListItemButton>
              )}
            />
          </DashboardSection>
          </DashboardWidget>
        </Box>
      </Box>
    </Fade>
  );
};

export default Dashboard;
