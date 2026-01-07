import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  MenuItem,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  InputBase,
} from "@mui/material";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, DateSelectArg, EventDropArg } from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import SyncIcon from "@mui/icons-material/Sync";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import RefreshIcon from "@mui/icons-material/Refresh";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SearchIcon from "@mui/icons-material/Search";
import API from "../../../axios-client";

// Custom calendar styles
const calendarStyles = {
  "& .fc": {
    fontFamily: "inherit",
  },
  "& .fc-theme-standard td, & .fc-theme-standard th": {
    borderColor: "#e5e7eb",
  },
  "& .fc-theme-standard .fc-scrollgrid": {
    borderColor: "#e5e7eb",
  },
  "& .fc-col-header-cell": {
    backgroundColor: "#fff",
    borderBottom: "1px solid #e5e7eb",
    padding: "12px 0",
  },
  "& .fc-col-header-cell-cushion": {
    color: "#6b7280",
    fontWeight: 500,
    fontSize: "0.75rem",
    textTransform: "uppercase",
    textDecoration: "none",
  },
  "& .fc-daygrid-day-number, & .fc-timegrid-slot-label": {
    color: "#374151",
    fontSize: "0.875rem",
  },
  "& .fc-day-today": {
    backgroundColor: "#fef3f2 !important",
  },
  "& .fc-timegrid-slot": {
    height: "3rem",
  },
  "& .fc-timegrid-slot-label": {
    fontSize: "0.75rem",
    color: "#9ca3af",
  },
  "& .fc-event": {
    borderRadius: "6px",
    border: "none",
    padding: "2px 6px",
    fontSize: "0.8rem",
    fontWeight: 500,
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  },
  "& .fc-event-main": {
    padding: "2px 4px",
  },
  "& .fc-event-time": {
    fontSize: "0.7rem",
    fontWeight: 600,
  },
  "& .fc-event-title": {
    fontSize: "0.75rem",
    fontWeight: 500,
  },
  "& .fc-timegrid-event": {
    borderRadius: "6px",
  },
  "& .fc-toolbar": {
    display: "none !important",
  },
  "& .fc-scrollgrid-section-header": {
    "& > td": {
      borderRight: "none",
    },
  },
  "& .fc-timegrid-axis": {
    width: "60px",
  },
  "& .fc-timegrid-slot-label-frame": {
    textAlign: "right",
    paddingRight: "12px",
  },
  "& .fc-now-indicator-line": {
    borderColor: "#ef4444",
  },
  "& .fc-now-indicator-arrow": {
    borderColor: "#ef4444",
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
  },
};

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps?: {
    description?: string;
    location?: string;
    event_type?: string;
    user_id?: number;
    user_name?: string;
    account_uid?: string;
    account_name?: string;
    contact_uid?: string;
    contact_name?: string;
  };
}

interface EventFormData {
  title: string;
  description: string;
  location: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  event_type: string;
  color: string;
}

const eventTypeOptions = [
  { value: "meeting", label: "Afspraak", color: "#818cf8", bgColor: "#eef2ff" },  // Indigo/purple
  { value: "call", label: "Bellen", color: "#38bdf8", bgColor: "#e0f2fe" },       // Sky blue
  { value: "interview", label: "Interview", color: "#a78bfa", bgColor: "#f3e8ff" }, // Violet
  { value: "reminder", label: "Herinnering", color: "#fb923c", bgColor: "#fff7ed" }, // Orange
  { value: "other", label: "Anders", color: "#94a3b8", bgColor: "#f1f5f9" },       // Slate
];

const formatDateTimeLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function AgendaPage() {
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | "view">("create");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    description: "",
    location: "",
    start_at: "",
    end_at: "",
    all_day: false,
    event_type: "meeting",
    color: "",
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync/iCal dialog
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [icalUrl, setIcalUrl] = useState<string | null>(null);
  const [icalLoading, setIcalLoading] = useState(false);
  const [icalCopied, setIcalCopied] = useState(false);
  const [syncInstructions, setSyncInstructions] = useState<Record<string, string>>({});

  // View and navigation state
  const [currentView, setCurrentView] = useState<string>("timeGridWeek");
  const [currentTitle, setCurrentTitle] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fetchEvents = useCallback(async (start: Date, end: Date) => {
    setLoading(true);
    setError(null);
    try {
      const data = await API.get("/calendar-events", {
        params: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      });
      setEvents(data as CalendarEvent[]);
    } catch (err: any) {
      console.error("Error fetching events:", err);
      setError("Fout bij laden van agenda");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDatesSet = useCallback(
    (dateInfo: { start: Date; end: Date; view: { title: string; type: string } }) => {
      fetchEvents(dateInfo.start, dateInfo.end);
      setCurrentTitle(dateInfo.view.title);
      setCurrentView(dateInfo.view.type);
    },
    [fetchEvents]
  );

  const handleViewChange = (
    _: React.MouseEvent<HTMLElement>,
    newView: string | null
  ) => {
    if (newView && calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.changeView(newView);
      setCurrentView(newView);
    }
  };

  const handlePrev = () => {
    if (calendarRef.current) {
      calendarRef.current.getApi().prev();
    }
  };

  const handleNext = () => {
    if (calendarRef.current) {
      calendarRef.current.getApi().next();
    }
  };

  const handleToday = () => {
    if (calendarRef.current) {
      calendarRef.current.getApi().today();
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      location: "",
      start_at: "",
      end_at: "",
      all_day: false,
      event_type: "meeting",
      color: "",
    });
    setSubmitError(null);
    setSelectedEvent(null);
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const start = selectInfo.start;
    const end = selectInfo.end;

    setFormData({
      title: "",
      description: "",
      location: "",
      start_at: formatDateTimeLocal(start),
      end_at: formatDateTimeLocal(end),
      all_day: selectInfo.allDay,
      event_type: "meeting",
      color: "",
    });
    setDialogMode("create");
    setOpenDialog(true);
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event;
    setSelectedEvent({
      id: event.id,
      title: event.title,
      start: event.startStr,
      end: event.endStr,
      allDay: event.allDay,
      backgroundColor: event.backgroundColor,
      extendedProps: event.extendedProps as CalendarEvent["extendedProps"],
    });

    setFormData({
      title: event.title,
      description: event.extendedProps?.description || "",
      location: event.extendedProps?.location || "",
      start_at: formatDateTimeLocal(event.start!),
      end_at: formatDateTimeLocal(event.end || event.start!),
      all_day: event.allDay,
      event_type: event.extendedProps?.event_type || "meeting",
      color: event.backgroundColor || "",
    });

    setDialogMode("view");
    setOpenDialog(true);
  };

  const handleEventDrop = async (dropInfo: EventDropArg) => {
    const event = dropInfo.event;
    try {
      await API.put(`/calendar-events/${event.id}`, {
        start_at: event.start?.toISOString(),
        end_at: event.end?.toISOString() || event.start?.toISOString(),
      });
    } catch (err: any) {
      console.error("Error updating event:", err);
      dropInfo.revert();
    }
  };

  const handleEventResize = async (resizeInfo: EventResizeDoneArg) => {
    const event = resizeInfo.event;
    try {
      await API.put(`/calendar-events/${event.id}`, {
        start_at: event.start?.toISOString(),
        end_at: event.end?.toISOString(),
      });
    } catch (err: any) {
      console.error("Error resizing event:", err);
      resizeInfo.revert();
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      setSubmitError("Titel is verplicht");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        title: formData.title,
        description: formData.description || null,
        location: formData.location || null,
        start_at: new Date(formData.start_at).toISOString(),
        end_at: new Date(formData.end_at).toISOString(),
        all_day: formData.all_day,
        event_type: formData.event_type,
        color: formData.color || null,
      };

      if (dialogMode === "create") {
        const newEvent = await API.post("/calendar-events", payload);
        setEvents((prev) => [...prev, newEvent as CalendarEvent]);
      } else if (dialogMode === "edit" && selectedEvent) {
        const updatedEvent = await API.put(`/calendar-events/${selectedEvent.id}`, payload);
        setEvents((prev) =>
          prev.map((e) => (e.id === selectedEvent.id ? (updatedEvent as CalendarEvent) : e))
        );
      }

      setOpenDialog(false);
      resetForm();
    } catch (err: any) {
      console.error("Error saving event:", err);
      setSubmitError(err?.response?.data?.message || "Fout bij opslaan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;

    setIsDeleting(true);
    try {
      await API.delete(`/calendar-events/${selectedEvent.id}`);
      setEvents((prev) => prev.filter((e) => e.id !== selectedEvent.id));
      setDeleteDialogOpen(false);
      setOpenDialog(false);
      resetForm();
    } catch (err: any) {
      console.error("Error deleting event:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddEvent = () => {
    const now = new Date();
    const start = new Date(now);
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() + 1);

    const end = new Date(start);
    end.setHours(end.getHours() + 1);

    setFormData({
      title: "",
      description: "",
      location: "",
      start_at: formatDateTimeLocal(start),
      end_at: formatDateTimeLocal(end),
      all_day: false,
      event_type: "meeting",
      color: "",
    });
    setDialogMode("create");
    setOpenDialog(true);
  };

  const handleOpenSyncDialog = async () => {
    setSyncDialogOpen(true);
    setIcalLoading(true);
    setIcalCopied(false);

    try {
      const data = (await API.get("/calendar-feed/url")) as {
        url: string;
        instructions?: Record<string, string>;
      };
      setIcalUrl(data.url);
      setSyncInstructions(data.instructions || {});
    } catch (err: any) {
      console.error("Error fetching iCal URL:", err);
      setError("Fout bij ophalen van synchronisatie URL");
    } finally {
      setIcalLoading(false);
    }
  };

  const handleRegenerateUrl = async () => {
    setIcalLoading(true);
    try {
      const data = (await API.post("/calendar-feed/regenerate")) as { url: string };
      setIcalUrl(data.url);
      setIcalCopied(false);
    } catch (err: any) {
      console.error("Error regenerating URL:", err);
    } finally {
      setIcalLoading(false);
    }
  };

  const handleCopyUrl = () => {
    if (icalUrl) {
      navigator.clipboard.writeText(icalUrl);
      setIcalCopied(true);
      setTimeout(() => setIcalCopied(false), 2000);
    }
  };

  return (
    <Box sx={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column", bgcolor: "#fff" }}>
      {/* Custom Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 3,
          py: 2,
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        {/* Left: Navigation */}
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton onClick={handlePrev} size="small" sx={{ color: "#6b7280" }}>
            <ChevronLeftIcon />
          </IconButton>
          <Button
            onClick={handleToday}
            variant="outlined"
            size="small"
            sx={{
              textTransform: "none",
              borderColor: "#e5e7eb",
              color: "#374151",
              fontWeight: 500,
              "&:hover": { borderColor: "#d1d5db", bgcolor: "#f9fafb" },
            }}
          >
            Today
          </Button>
          <IconButton onClick={handleNext} size="small" sx={{ color: "#6b7280" }}>
            <ChevronRightIcon />
          </IconButton>

          {/* Title */}
          <Typography
            variant="h6"
            sx={{ ml: 2, fontWeight: 500, color: "#111827", minWidth: 280 }}
          >
            {currentTitle}
          </Typography>
        </Stack>

        {/* Center: View Toggle */}
        <ToggleButtonGroup
          value={currentView}
          exclusive
          onChange={handleViewChange}
          size="small"
          sx={{
            "& .MuiToggleButton-root": {
              textTransform: "none",
              px: 2,
              py: 0.5,
              border: "1px solid #e5e7eb",
              color: "#6b7280",
              fontWeight: 500,
              "&.Mui-selected": {
                bgcolor: "#590d0d",
                color: "#fff",
                "&:hover": { bgcolor: "#3d0909" },
              },
              "&:hover": { bgcolor: "#f9fafb" },
            },
          }}
        >
          <ToggleButton value="timeGridDay">Dag</ToggleButton>
          <ToggleButton value="timeGridWeek">Week</ToggleButton>
          <ToggleButton value="dayGridMonth">Maand</ToggleButton>
        </ToggleButtonGroup>

        {/* Right: Actions */}
        <Stack direction="row" spacing={2} alignItems="center">
          {/* Search */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              bgcolor: "#f9fafb",
              borderRadius: 1,
              px: 1.5,
              py: 0.5,
              border: "1px solid #e5e7eb",
            }}
          >
            <SearchIcon sx={{ color: "#9ca3af", fontSize: 20, mr: 1 }} />
            <InputBase
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ fontSize: "0.875rem", width: 120 }}
            />
          </Box>

          <Tooltip title="Synchroniseer met Outlook">
            <IconButton onClick={handleOpenSyncDialog} sx={{ color: "#6b7280" }}>
              <SyncIcon />
            </IconButton>
          </Tooltip>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddEvent}
            size="small"
            sx={{
              bgcolor: "#590d0d",
              textTransform: "none",
              fontWeight: 500,
              "&:hover": { bgcolor: "#3d0909" },
            }}
          >
            Afspraak
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mx: 3, mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Calendar */}
      <Box sx={{ flex: 1, overflow: "hidden", ...calendarStyles }}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={false}
          locale="nl"
          firstDay={1}
          slotMinTime="07:00:00"
          slotMaxTime="21:00:00"
          allDaySlot={true}
          allDayText=""
          nowIndicator={true}
          events={events}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          datesSet={handleDatesSet}
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          height="100%"
          dayHeaderFormat={{ weekday: "short", day: "numeric" }}
          eventTimeFormat={{
            hour: "numeric",
            minute: "2-digit",
            meridiem: false,
          }}
          slotLabelFormat={{
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }}
          slotLabelInterval={{ hours: 1 }}
        />
      </Box>

      {/* Event Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          resetForm();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === "create"
            ? "Nieuwe afspraak"
            : dialogMode === "edit"
            ? "Afspraak bewerken"
            : "Afspraak details"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Titel"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
              required
              disabled={dialogMode === "view"}
            />

            <TextField
              select
              label="Type"
              value={formData.event_type}
              onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
              fullWidth
              disabled={dialogMode === "view"}
            >
              {eventTypeOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        bgcolor: option.color,
                      }}
                    />
                    {option.label}
                  </Box>
                </MenuItem>
              ))}
            </TextField>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Start"
                type="datetime-local"
                value={formData.start_at}
                onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                fullWidth
                disabled={dialogMode === "view"}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Eind"
                type="datetime-local"
                value={formData.end_at}
                onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                fullWidth
                disabled={dialogMode === "view"}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>

            <TextField
              label="Locatie"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              fullWidth
              disabled={dialogMode === "view"}
            />

            <TextField
              label="Beschrijving"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
              disabled={dialogMode === "view"}
            />

            {dialogMode === "view" && selectedEvent?.extendedProps && (
              <Box>
                {selectedEvent.extendedProps.account_name && (
                  <Chip
                    label={`Klant: ${selectedEvent.extendedProps.account_name}`}
                    size="small"
                    sx={{ mr: 1, mb: 1 }}
                  />
                )}
                {selectedEvent.extendedProps.contact_name && (
                  <Chip
                    label={`Contact: ${selectedEvent.extendedProps.contact_name}`}
                    size="small"
                    sx={{ mr: 1, mb: 1 }}
                  />
                )}
                {selectedEvent.extendedProps.user_name && (
                  <Chip
                    label={`Door: ${selectedEvent.extendedProps.user_name}`}
                    size="small"
                    color="primary"
                    sx={{ mb: 1 }}
                  />
                )}
              </Box>
            )}

            {submitError && (
              <Alert severity="error" onClose={() => setSubmitError(null)}>
                {submitError}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {dialogMode === "view" ? (
            <>
              <Button
                startIcon={<DeleteOutlineIcon />}
                color="error"
                onClick={() => setDeleteDialogOpen(true)}
              >
                Verwijderen
              </Button>
              <Box sx={{ flex: 1 }} />
              <Button onClick={() => setOpenDialog(false)}>Sluiten</Button>
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => setDialogMode("edit")}
                sx={{ bgcolor: "#590d0d", "&:hover": { bgcolor: "#3d0909" } }}
              >
                Bewerken
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => {
                  if (dialogMode === "edit") {
                    setDialogMode("view");
                  } else {
                    setOpenDialog(false);
                    resetForm();
                  }
                }}
                disabled={isSubmitting}
              >
                Annuleren
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={isSubmitting}
                sx={{ bgcolor: "#590d0d", "&:hover": { bgcolor: "#3d0909" } }}
              >
                {isSubmitting ? "Bezig..." : "Opslaan"}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Afspraak verwijderen</DialogTitle>
        <DialogContent>
          <Typography>
            Weet je zeker dat je <strong>{selectedEvent?.title}</strong> wilt
            verwijderen?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
            Annuleren
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Bezig..." : "Verwijderen"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sync/iCal Dialog */}
      <Dialog
        open={syncDialogOpen}
        onClose={() => setSyncDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Agenda synchroniseren</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Kopieer de onderstaande URL om je AVE agenda te synchroniseren met
              Outlook, Google Calendar, Apple Calendar of andere agenda-apps.
            </Typography>

            {icalLoading ? (
              <Typography variant="body2">Laden...</Typography>
            ) : icalUrl ? (
              <>
                <TextField
                  fullWidth
                  value={icalUrl}
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title={icalCopied ? "Gekopieerd!" : "Kopieer URL"}>
                          <IconButton onClick={handleCopyUrl} edge="end">
                            <ContentCopyIcon
                              color={icalCopied ? "success" : "inherit"}
                            />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                  size="small"
                />

                {icalCopied && (
                  <Alert severity="success" sx={{ py: 0.5 }}>
                    URL gekopieerd naar klembord!
                  </Alert>
                )}

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Instructies:
                  </Typography>
                  <Stack spacing={1}>
                    <Typography variant="body2">
                      <strong>Outlook:</strong>{" "}
                      {syncInstructions.outlook ||
                        "Agenda → Agenda toevoegen → Van internet → Plak URL"}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Google Calendar:</strong>{" "}
                      {syncInstructions.google ||
                        "Andere agenda's → Via URL → Plak URL"}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Apple Calendar:</strong>{" "}
                      {syncInstructions.apple ||
                        "Archief → Nieuw agenda-abonnement → Plak URL"}
                    </Typography>
                  </Stack>
                </Box>

                <Alert severity="warning" sx={{ py: 0.5 }}>
                  <Typography variant="body2">
                    <strong>Let op:</strong> Deel deze URL niet met anderen. Iedereen
                    met deze URL kan je agenda bekijken.
                  </Typography>
                </Alert>
              </>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            startIcon={<RefreshIcon />}
            onClick={handleRegenerateUrl}
            disabled={icalLoading}
            color="warning"
          >
            Nieuwe URL genereren
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setSyncDialogOpen(false)}>Sluiten</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
