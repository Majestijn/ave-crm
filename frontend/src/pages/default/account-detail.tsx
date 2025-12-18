import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Stack,
  Button,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputLabel,
  Autocomplete,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Phone as PhoneIcon,
  PersonAdd as PersonAddIcon,
  Assignment as AssignmentIcon,
  Event as EventIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import API from "../../../axios-client";
import type { Account, Assignment } from "../../types/accounts";
import { useContacts } from "../../hooks/useContacts";
import type { Contact } from "../../types/contacts";

// Helper function to format revenue
const formatRevenue = (revenueCents?: number): string => {
  if (!revenueCents) return "-";

  const millions = revenueCents / 1000000;
  const billions = revenueCents / 1000000000;

  if (billions >= 1) {
    return `${billions.toFixed(0)} mld`;
  } else if (millions >= 1) {
    return `${millions.toFixed(0)} mln`;
  } else {
    return `${(revenueCents / 1000).toFixed(0)} k`;
  }
};

// Dummy assignments data
const dummyAssignments: Assignment[] = [
  {
    id: 1,
    account_id: 1,
    title: "Category Manager (Pet Food)",
    description: "Zoeken naar een ervaren Category Manager",
    status: "active",
  },
];

// Dummy timeline activities
type TimelineActivity = {
  id: number;
  type: "call" | "proposal" | "interview" | "hired" | "rejected";
  description: string;
  subtext?: string;
  date: string;
  candidate?: { uid: string; name: string };
};

const dummyTimeline: TimelineActivity[] = [
  {
    id: 1,
    type: "call",
    description: "Gebeld met John Doe",
    date: "2025-11-12",
  },
  {
    id: 2,
    type: "proposal",
    description: "Peter voorgesteld",
    date: "2025-11-24",
  },
  {
    id: 3,
    type: "call",
    description: "Gebeld met John Doe",
    date: "2025-12-24",
  },
];

const getActivityIcon = (type: string) => {
  switch (type) {
    case "call":
      return <PhoneIcon sx={{ color: "white", fontSize: 20 }} />;
    case "proposal":
      return <PersonAddIcon sx={{ color: "white", fontSize: 20 }} />;
    case "interview":
      return <EventIcon sx={{ color: "white", fontSize: 20 }} />;
    case "hired":
      return <CheckCircleIcon sx={{ color: "white", fontSize: 20 }} />;
    case "rejected":
      return <CancelIcon sx={{ color: "white", fontSize: 20 }} />;
    default:
      return <PhoneIcon sx={{ color: "white", fontSize: 20 }} />;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case "call":
      return "#590d0d"; // Dark red
    case "proposal":
      return "#1976d2"; // Blue
    case "interview":
      return "#ed6c02"; // Orange
    case "hired":
      return "#2e7d32"; // Green
    case "rejected":
      return "#d32f2f"; // Red
    default:
      return "#590d0d";
  }
};

export default function AccountDetailPage() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<number | "">(
    dummyAssignments[0]?.id || ""
  );

  // Activity State
  const [timeline, setTimeline] = useState<TimelineActivity[]>([]);
  const [openActivityDialog, setOpenActivityDialog] = useState(false);
  const [newActivityType, setNewActivityType] =
    useState<TimelineActivity["type"]>("call");
  const [newActivityDesc, setNewActivityDesc] = useState("");
  const [newActivityDate, setNewActivityDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedCandidate, setSelectedCandidate] = useState<
    Contact | null | undefined
  >(null);
  const { contacts, refresh: refreshContacts } = useContacts();

  const fetchActivities = async () => {
    if (!uid) {
      return;
    }

    try {
      const response = (await API.get(`/accounts/${uid}/activities`)) as any[];
      const mappedActivities: TimelineActivity[] = response.map(
        (activity: any) => ({
          id: activity.id,
          type: activity.type,
          description: activity.description,
          date: activity.date.split("T")[0], // Handle ISO string if needed
          candidate: activity.candidate
            ? {
                uid: activity.candidate.uid,
                name: `${activity.candidate.first_name} ${activity.candidate.last_name}`,
              }
            : undefined,
        })
      );
      setTimeline(mappedActivities);
    } catch (err) {
      console.error("Error fetching activities:", err);
    }
  };

  useEffect(() => {
    refreshContacts();
  }, [refreshContacts]);

  useEffect(() => {
    if (uid) {
      fetchActivities();
    }
  }, [uid]);

  // Auto-fill description based on type and candidate
  useEffect(() => {
    if (!selectedCandidate) return;

    const candidateName = `${selectedCandidate.first_name} ${selectedCandidate.last_name}`;
    let template = "";

    switch (newActivityType) {
      case "call":
        template = `Gebeld met ${candidateName}`;
        break;
      case "proposal":
        template = `${candidateName} voorgesteld`;
        break;
      case "interview":
        template = `Gesprek met ${candidateName}`;
        break;
      case "hired":
        template = `${candidateName} aangenomen`;
        break;
      case "rejected":
        template = `${candidateName} afgewezen`;
        break;
      default:
        template = "";
    }

    setNewActivityDesc(template);
  }, [newActivityType, selectedCandidate]);

  const handleAddActivity = async () => {
    if (!uid) return;

    try {
      const payload = {
        type: newActivityType,
        description: newActivityDesc,
        date: newActivityDate,
        candidate_uid: selectedCandidate?.uid,
      };

      const response = (await API.post(
        `/accounts/${uid}/activities`,
        payload
      )) as any;

      const newActivity: TimelineActivity = {
        id: response.id,
        type: response.type,
        description: response.description,
        date: response.date.split("T")[0],
        candidate: response.candidate
          ? {
              uid: response.candidate.uid,
              name: `${response.candidate.first_name} ${response.candidate.last_name}`,
            }
          : undefined,
      };

      setTimeline([newActivity, ...timeline]);
      setOpenActivityDialog(false);
      setNewActivityDesc("");
      setNewActivityType("call");
      setNewActivityDate(new Date().toISOString().split("T")[0]);
      setSelectedCandidate(null);
    } catch (err) {
      console.error("Error saving activity:", err);
    }
  };

  useEffect(() => {
    if (!uid) {
      setError("Geen account ID opgegeven");
      setLoading(false);
      return;
    }

    const fetchAccount = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = (await API.get<Account>(
          `/accounts/${uid}`
        )) as unknown as Account;
        setAccount(response);
      } catch (err: any) {
        console.error("Error fetching account:", err);
        setError(err?.response?.data?.message || "Fout bij laden van account");
      } finally {
        setLoading(false);
      }
    };

    fetchAccount();
  }, [uid]);

  if (loading) return <Box sx={{ p: 3 }}>Laden…</Box>;
  if (error || !account)
    return <Box sx={{ p: 3 }}>{error || "Account niet gevonden"}</Box>;

  const activeAssignments = dummyAssignments.filter(
    (a) => a.status === "active"
  );
  const totalAssignments = dummyAssignments.length;

  return (
    <Box
      sx={{
        p: 3,
        maxWidth: 1600,
        margin: "0 auto",
        bgcolor: "#f8f9fa",
        minHeight: "100vh",
      }}
    >
      {/* Header Section */}
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
              {totalAssignments} ({activeAssignments.length})
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Grid container spacing={4}>
        {/* Left Column */}
        <Grid size={{ xs: 12, md: 4, lg: 3 }}>
          <Stack spacing={4}>
            {/* Company Details Card */}
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
                  <Typography fontWeight="bold">
                    {account.location || "-"}
                  </Typography>
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
                    {account.revenue_cents
                      ? `€${(account.revenue_cents / 100).toLocaleString(
                          "nl-NL",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )},-`
                      : "-"}
                  </Typography>
                </Box>
              </Stack>
            </Paper>

            {/* Contacts Card */}
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
                  account.contacts.map((contact) => (
                    <Box
                      key={contact.id}
                      sx={{
                        borderLeft: "3px solid",
                        borderColor: "error.main",
                        pl: 2,
                      }}
                    >
                      <Typography fontWeight="bold">{contact.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {contact.phone || "-"}
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
          </Stack>
        </Grid>

        {/* Right Column */}
        <Grid size={{ xs: 12, md: 8, lg: 9 }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={4}
          >
            {/* Assignment Selector */}
            <Paper
              elevation={0}
              sx={{
                p: 1,
                borderRadius: 2,
                display: "inline-flex",
                alignItems: "center",
                minWidth: 300,
              }}
            >
              <AssignmentIcon sx={{ ml: 2, mr: 1, color: "text.primary" }} />
              <FormControl variant="standard" sx={{ minWidth: 200 }}>
                <Select
                  value={selectedAssignment}
                  onChange={(e) =>
                    setSelectedAssignment(e.target.value as number)
                  }
                  disableUnderline
                  displayEmpty
                  sx={{ fontWeight: 600 }}
                >
                  {dummyAssignments.map((assignment) => (
                    <MenuItem key={assignment.id} value={assignment.id}>
                      {assignment.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Paper>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenActivityDialog(true)}
              sx={{
                bgcolor: "#590d0d",
                "&:hover": { bgcolor: "#3d0909" },
                textTransform: "none",
                fontWeight: "bold",
                px: 3,
              }}
            >
              Activiteit toevoegen
            </Button>
          </Box>

          {/* Timeline */}
          <Box sx={{ position: "relative", pl: 2, width: "100%" }}>
            {/* Vertical Dotted Line */}
            <Box
              sx={{
                position: "absolute",
                left: 35, // Center of the avatar (16px padding + 20px half-width - 1px half-border)
                top: 20,
                bottom: 20,
                width: 0,
                borderLeft: "2px dotted #e0e0e0",
                zIndex: 0,
              }}
            />

            <Stack spacing={4}>
              {[...timeline]
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                )
                .map((activity) => (
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
                        {/* Simple parsing for "John Doe" or "Peter" to underline? 
                          For now just rendering description. 
                          In a real app, we'd parse links. */}
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
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight="bold"
                      >
                        {new Date(activity.date).toLocaleDateString("nl-NL", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </Typography>
                    </Paper>
                  </Box>
                ))}
            </Stack>
          </Box>
        </Grid>
      </Grid>

      {/* Add Activity Dialog */}
      <Dialog
        open={openActivityDialog}
        onClose={() => setOpenActivityDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Nieuwe activiteit toevoegen</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Type activiteit</InputLabel>
              <Select
                value={newActivityType}
                label="Type activiteit"
                onChange={(e) =>
                  setNewActivityType(e.target.value as TimelineActivity["type"])
                }
              >
                <MenuItem value="call">Gebeld</MenuItem>
                <MenuItem value="proposal">Voorgesteld</MenuItem>
                <MenuItem value="interview">Gesprek</MenuItem>
                <MenuItem value="hired">Aangenomen</MenuItem>
                <MenuItem value="rejected">Afgewezen</MenuItem>
              </Select>
            </FormControl>

            <Autocomplete
              options={contacts}
              getOptionLabel={(option) =>
                `${option.first_name} ${option.last_name}`
              }
              value={selectedCandidate}
              onChange={(_, newValue) => setSelectedCandidate(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="Kandidaat (optioneel)" />
              )}
            />

            <TextField
              fullWidth
              label="Datum"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={newActivityDate}
              onChange={(e) => setNewActivityDate(e.target.value)}
            />
            <TextField
              fullWidth
              label="Omschrijving"
              multiline
              rows={3}
              value={newActivityDesc}
              onChange={(e) => setNewActivityDesc(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenActivityDialog(false)}>
            Annuleren
          </Button>
          <Button
            variant="contained"
            onClick={handleAddActivity}
            disabled={!newActivityDesc}
            sx={{ bgcolor: "#590d0d", "&:hover": { bgcolor: "#3d0909" } }}
          >
            Toevoegen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
