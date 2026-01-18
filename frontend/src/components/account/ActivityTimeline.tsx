import React, { useMemo, useState } from "react";
import {
  Box,
  Stack,
  Avatar,
  Paper,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from "@mui/material";
import {
  Phone as PhoneIcon,
  PersonAdd as PersonAddIcon,
  Event as EventIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import type { Activity, ActivityType } from "../../api/queries/activities";
import { formatContactName, formatDateNL, normalizeDate } from "../../utils/formatters";
import { getActivityColor, primaryButtonSx } from "./styles";

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
  onEdit?: (activity: Activity, data: { type: ActivityType; description: string; date: string }) => Promise<void>;
  onDelete?: (activityId: number) => Promise<void>;
  isEditing?: boolean;
  isDeleting?: boolean;
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
  onEdit,
  onDelete,
  isEditing,
  isDeleting,
}: Props) {
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deleteActivityId, setDeleteActivityId] = useState<number | null>(null);
  const [editType, setEditType] = useState<ActivityType>("call");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

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

  const handleOpenEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setEditType(activity.type);
    setEditDescription(activity.description);
    setEditDate(normalizeDate(activity.date));
    setEditError(null);
  };

  const handleCloseEdit = () => {
    setEditingActivity(null);
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingActivity || !onEdit) return;
    
    try {
      await onEdit(editingActivity, {
        type: editType,
        description: editDescription,
        date: editDate,
      });
      handleCloseEdit();
    } catch (err: any) {
      setEditError(err?.response?.data?.message || "Er is iets misgegaan");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteActivityId || !onDelete) return;
    
    try {
      await onDelete(deleteActivityId);
      setDeleteActivityId(null);
    } catch (err) {
      console.error("Error deleting activity:", err);
    }
  };

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
                {(onEdit || onDelete) && (
                  <Stack direction="row" spacing={0.5} sx={{ ml: 1 }}>
                    {onEdit && (
                      <IconButton
                        size="small"
                        onClick={() => {
                          const originalActivity = activities.find(
                            (a) => a.id === activity.id
                          );
                          if (originalActivity) handleOpenEdit(originalActivity);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    )}
                    {onDelete && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteActivityId(activity.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                )}
              </Stack>
            </Paper>
          </Box>
        ))}
      </Stack>

      {/* Edit Dialog */}
      <Dialog open={!!editingActivity} onClose={handleCloseEdit} maxWidth="sm" fullWidth>
        <DialogTitle>Activiteit bewerken</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Type activiteit</InputLabel>
              <Select
                value={editType}
                label="Type activiteit"
                onChange={(e) => setEditType(e.target.value as ActivityType)}
              >
                <MenuItem value="call">Gebeld</MenuItem>
                <MenuItem value="proposal">Voorgesteld</MenuItem>
                <MenuItem value="interview">Gesprek</MenuItem>
                <MenuItem value="hired">Aangenomen</MenuItem>
                <MenuItem value="rejected">Afgewezen</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Datum"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
            />

            <TextField
              fullWidth
              label="Omschrijving"
              multiline
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />

            {editError && (
              <Alert severity="error" onClose={() => setEditError(null)}>
                {editError}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseEdit} disabled={isEditing}>
            Annuleren
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEdit}
            disabled={!editDescription || isEditing}
            sx={primaryButtonSx}
          >
            {isEditing ? "Bezig..." : "Opslaan"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteActivityId} onClose={() => setDeleteActivityId(null)}>
        <DialogTitle>Activiteit verwijderen</DialogTitle>
        <DialogContent>
          <Typography>
            Weet je zeker dat je deze activiteit wilt verwijderen?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteActivityId(null)} disabled={isDeleting}>
            Annuleren
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Bezig..." : "Verwijderen"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

