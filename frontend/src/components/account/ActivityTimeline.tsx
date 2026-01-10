import React, { useMemo } from "react";
import { Box, Stack, Avatar, Paper, Typography } from "@mui/material";
import {
  Phone as PhoneIcon,
  PersonAdd as PersonAddIcon,
  Event as EventIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import type { Activity, ActivityType } from "../../api/queries/activities";
import { formatContactName, formatDateNL, normalizeDate } from "../../utils/formatters";
import { getActivityColor } from "./styles";

type TimelineActivity = {
  id: number;
  type: ActivityType;
  description: string;
  date: string;
  candidate?: { uid: string; name: string };
  created_by?: string;
};

type Props = {
  activities: Activity[];
  isLoading?: boolean;
  onCandidateClick?: (uid: string) => void;
};

const getActivityIcon = (type: string) => {
  const iconProps = { sx: { color: "white", fontSize: 20 } };

  switch (type) {
    case "call":
      return <PhoneIcon {...iconProps} />;
    case "proposal":
      return <PersonAddIcon {...iconProps} />;
    case "interview":
      return <EventIcon {...iconProps} />;
    case "hired":
      return <CheckCircleIcon {...iconProps} />;
    case "rejected":
      return <CancelIcon {...iconProps} />;
    default:
      return <PhoneIcon {...iconProps} />;
  }
};

export default function ActivityTimeline({
  activities,
  isLoading,
  onCandidateClick,
}: Props) {
  // Map activities to timeline format with memoization
  const timeline = useMemo((): TimelineActivity[] => {
    return activities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      description: activity.description,
      date: normalizeDate(activity.date),
      candidate: activity.contact
        ? {
            uid: activity.contact.uid,
            name: formatContactName(activity.contact),
          }
        : undefined,
      created_by: activity.created_by,
    }));
  }, [activities]);

  // Sort by date descending
  const sortedTimeline = useMemo(() => {
    return [...timeline].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [timeline]);

  if (isLoading) {
    return (
      <Paper elevation={0} sx={{ p: 4, borderRadius: 2, textAlign: "center" }}>
        <Typography color="text.secondary">Activiteiten laden...</Typography>
      </Paper>
    );
  }

  if (timeline.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 4, borderRadius: 2, textAlign: "center" }}>
        <Typography color="text.secondary">
          Nog geen activiteiten voor deze opdracht. Voeg een activiteit toe om
          te beginnen.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ position: "relative", pl: 2, width: "100%" }}>
      {/* Vertical Dotted Line */}
      <Box
        sx={{
          position: "absolute",
          left: 35,
          top: 20,
          bottom: 20,
          width: 0,
          borderLeft: "2px dotted #e0e0e0",
          zIndex: 0,
        }}
      />

      <Stack spacing={4}>
        {sortedTimeline.map((activity) => (
          <Box
            key={activity.id}
            sx={{
              display: "flex",
              alignItems: "center",
              position: "relative",
              zIndex: 1,
              width: "100%",
            }}
          >
            {/* Icon */}
            <Avatar
              sx={{
                bgcolor: getActivityColor(activity.type),
                width: 40,
                height: 40,
                mr: 3,
              }}
            >
              {getActivityIcon(activity.type)}
            </Avatar>

            {/* Card */}
            <Paper
              elevation={0}
              sx={{
                flexGrow: 1,
                p: 2,
                px: 3,
                width: "100%",
                borderRadius: 2,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography
                sx={{
                  "& span": {
                    textDecoration: "underline",
                    cursor: "pointer",
                  },
                }}
              >
                {activity.description}
                {activity.candidate && (
                  <Typography
                    component="span"
                    sx={{
                      display: "block",
                      fontSize: "0.875rem",
                      color: "text.secondary",
                      mt: 0.5,
                    }}
                  >
                    met{" "}
                    <span
                      onClick={() => onCandidateClick?.(activity.candidate!.uid)}
                      style={{
                        textDecoration: "underline",
                        cursor: "pointer",
                      }}
                    >
                      {activity.candidate.name}
                    </span>
                  </Typography>
                )}
              </Typography>

              <Stack direction="row" spacing={1} alignItems="center">
                {activity.created_by && (
                  <>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontStyle: "italic" }}
                    >
                      {activity.created_by}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      •
                    </Typography>
                  </>
                )}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight="bold"
                >
                  {formatDateNL(activity.date)}
                </Typography>
              </Stack>
            </Paper>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

