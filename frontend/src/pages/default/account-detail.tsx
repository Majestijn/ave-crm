import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogTitle,
  Grid,
  IconButton,
  Link,
  Paper,
  Tooltip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Typography,
} from "@mui/material";
import { Add as AddIcon, OpenInNew as OpenInNewIcon } from "@mui/icons-material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useAccount } from "../../api/queries/accounts";
import { useContacts } from "../../api/queries/contacts";
import {
  useAccountAssignments,
  useAssignmentCandidates,
  type CandidateAssignment,
} from "../../api/queries/assignments";
import { useAssignmentActivities, type Activity, type ActivityType } from "../../api/queries/activities";
import {
  useUpdateAssignmentActivity,
  useDeleteAssignmentActivity,
} from "../../api/mutations/activities";
import {
  AccountHeader,
  CompanyDetailsCard,
  AccountContactsCard,
  ActivityTimeline,
  AssignmentSelector,
  AddActivityDialog,
  AddContactDialog,
  disabledButtonSx,
} from "../../components/account";
import { useDeleteAccount } from "../../api/mutations/accounts";
import { useDisclosure } from "../../hooks/useDisclosure";

// Helper function for candidate status colors
const getCandidateStatusColor = (
  status: CandidateAssignment["status"]
): string => {
  switch (status) {
    case "hired":
      return "#2e7d32"; // Green
    case "rejected":
      return "#d32f2f"; // Red
    case "first_interview":
    case "second_interview":
      return "#1976d2"; // Blue
    case "proposed":
      return "#ed6c02"; // Orange
    case "called":
    default:
      return "#757575"; // Grey
  }
};

export default function AccountDetailPage() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();

  // TanStack Query hooks
  const {
    data: account,
    isLoading: loading,
    error: accountError,
  } = useAccount(uid);
  const { data: assignments = [] } = useAccountAssignments(uid);
  const { data: contacts = [] } = useContacts();

  const [selectedAssignment, setSelectedAssignment] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"events" | "candidates">("events");
  const [activityTypeFilter, setActivityTypeFilter] = useState<ActivityType | "all">("all");

  // Activities query (depends on selectedAssignment)
  const { data: activitiesData = [], isLoading: activitiesLoading } =
    useAssignmentActivities(selectedAssignment);

  // Filter activities by type
  const filteredActivities = React.useMemo(() => {
    if (activityTypeFilter === "all") {
      return activitiesData;
    }
    return activitiesData.filter((activity) => activity.type === activityTypeFilter);
  }, [activitiesData, activityTypeFilter]);

  // Activity mutations
  const updateActivityMutation = useUpdateAssignmentActivity(selectedAssignment);
  const deleteActivityMutation = useDeleteAssignmentActivity(selectedAssignment);
  const deleteAccountMutation = useDeleteAccount();
  const deleteAccountConfirm = useDisclosure();
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);

  // Candidates query (depends on selectedAssignment)
  const { data: candidatesData = [], isLoading: candidatesLoading } =
    useAssignmentCandidates(selectedAssignment);

  // Dialog state
  const [openActivityDialog, setOpenActivityDialog] = useState(false);
  const [openContactDialog, setOpenContactDialog] = useState(false);

  // Set first assignment as selected when assignments are loaded
  useEffect(() => {
    if (assignments.length > 0 && !selectedAssignment) {
      setSelectedAssignment(assignments[0].uid);
    }
  }, [assignments, selectedAssignment]);

  // Error handling
  const error = accountError
    ? (accountError as any)?.response?.data?.message ||
      "Fout bij laden van account"
    : null;

  if (loading) return <Box sx={{ p: 3 }}>Laden…</Box>;
  if (error || !account)
    return <Box sx={{ p: 3 }}>{error || "Account niet gevonden"}</Box>;

  const activeAssignments = assignments.filter((a) => a.status === "active");
  const selectedAssignmentData = assignments.find((a) => a.uid === selectedAssignment);
  const existingContactUids =
    (account.contacts
      ?.map((ac) => ac.contact?.uid)
      .filter(Boolean) as string[]) || [];

  const handleDeleteAccountClick = () => {
    setDeleteAccountError(null);
    deleteAccountConfirm.open();
  };

  const handleDeleteAccountConfirm = async () => {
    if (!uid) return;
    setDeleteAccountError(null);
    try {
      await deleteAccountMutation.mutateAsync(uid);
      deleteAccountConfirm.close();
      navigate("/accounts");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Fout bij verwijderen van klant";
      setDeleteAccountError(msg);
    }
  };

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
      <AccountHeader
        account={account}
        totalAssignments={assignments.length}
        activeAssignments={activeAssignments.length}
        onDelete={handleDeleteAccountClick}
        isDeleting={deleteAccountMutation.isPending}
      />

      <Grid container spacing={4}>
        {/* Left Column */}
        <Grid size={{ xs: 12, md: 4, lg: 3 }}>
          <Stack spacing={4}>
            <CompanyDetailsCard account={account} />
            <AccountContactsCard
              account={account}
              onAddContact={() => setOpenContactDialog(true)}
            />
          </Stack>
        </Grid>

        {/* Right Column */}
        <Grid size={{ xs: 12, md: 8, lg: 9 }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <AssignmentSelector
                assignments={assignments}
                selectedAssignment={selectedAssignment}
                onSelect={setSelectedAssignment}
              />
              {selectedAssignmentData?.recruiter?.name && (
                <Chip
                  size="small"
                  label={`Recruiter: ${selectedAssignmentData.recruiter.name}`}
                  variant="outlined"
                  sx={{ fontWeight: 500 }}
                />
              )}
              {selectedAssignment && (
                <Tooltip title="Ga naar opdracht">
                  <IconButton
                    color="primary"
                    onClick={() =>
                      navigate("/assignments", {
                        state: { assignmentUid: selectedAssignment },
                      })
                    }
                    aria-label="Ga naar opdracht"
                  >
                    <OpenInNewIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            {activeTab === "events" && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenActivityDialog(true)}
                disabled={!selectedAssignment}
                sx={{
                  ...disabledButtonSx,
                  textTransform: "none",
                  fontWeight: "bold",
                  px: 3,
                }}
              >
                Activiteit toevoegen
              </Button>
            )}
          </Box>

          {/* Tabs */}
          {assignments.length > 0 && (
            <Paper elevation={0} sx={{ borderRadius: 2, mb: 3 }}>
              <Tabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue)}
                sx={{
                  borderBottom: 1,
                  borderColor: "divider",
                  "& .MuiTab-root": {
                    textTransform: "none",
                    fontWeight: 500,
                  },
                }}
              >
                <Tab label="Events" value="events" />
                <Tab
                  label={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <span>Kandidatenlijst</span>
                      {candidatesData.length > 0 && (
                        <Chip
                          label={candidatesData.length}
                          size="small"
                          sx={{ height: 20, fontSize: "0.75rem" }}
                        />
                      )}
                    </Stack>
                  }
                  value="candidates"
                />
              </Tabs>
            </Paper>
          )}

          {/* Content based on active tab */}
          {assignments.length === 0 ? (
            <Paper
              elevation={0}
              sx={{ p: 4, borderRadius: 2, textAlign: "center" }}
            >
              <Typography color="text.secondary">
                Nog geen opdrachten voor deze klant. Maak eerst een opdracht aan
                via de Opdrachten pagina.
              </Typography>
            </Paper>
          ) : activeTab === "events" ? (
            <>
              {/* Activity Type Filter */}
              <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                    Filter:
                  </Typography>
                  <Chip
                    label="Alle"
                    size="small"
                    variant={activityTypeFilter === "all" ? "filled" : "outlined"}
                    color={activityTypeFilter === "all" ? "primary" : "default"}
                    onClick={() => setActivityTypeFilter("all")}
                  />
                  <Chip
                    label="Gebeld"
                    size="small"
                    variant={activityTypeFilter === "call" ? "filled" : "outlined"}
                    color={activityTypeFilter === "call" ? "primary" : "default"}
                    onClick={() => setActivityTypeFilter("call")}
                  />
                  <Chip
                    label="Voorgesteld"
                    size="small"
                    variant={activityTypeFilter === "proposal" ? "filled" : "outlined"}
                    color={activityTypeFilter === "proposal" ? "primary" : "default"}
                    onClick={() => setActivityTypeFilter("proposal")}
                  />
                  <Chip
                    label="Gesprek"
                    size="small"
                    variant={activityTypeFilter === "interview" ? "filled" : "outlined"}
                    color={activityTypeFilter === "interview" ? "primary" : "default"}
                    onClick={() => setActivityTypeFilter("interview")}
                  />
                  <Chip
                    label="Aangenomen"
                    size="small"
                    variant={activityTypeFilter === "hired" ? "filled" : "outlined"}
                    color={activityTypeFilter === "hired" ? "primary" : "default"}
                    onClick={() => setActivityTypeFilter("hired")}
                  />
                  <Chip
                    label="Afgewezen"
                    size="small"
                    variant={activityTypeFilter === "rejected" ? "filled" : "outlined"}
                    color={activityTypeFilter === "rejected" ? "primary" : "default"}
                    onClick={() => setActivityTypeFilter("rejected")}
                  />
                  <Chip
                    label="Persoonlijkheidstest"
                    size="small"
                    variant={activityTypeFilter === "personality_test" ? "filled" : "outlined"}
                    color={activityTypeFilter === "personality_test" ? "primary" : "default"}
                    onClick={() => setActivityTypeFilter("personality_test")}
                  />
                  <Chip
                    label="Test"
                    size="small"
                    variant={activityTypeFilter === "test" ? "filled" : "outlined"}
                    color={activityTypeFilter === "test" ? "primary" : "default"}
                    onClick={() => setActivityTypeFilter("test")}
                  />
                  <Chip
                    label="Sollicitatie training"
                    size="small"
                    variant={activityTypeFilter === "interview_training" ? "filled" : "outlined"}
                    color={activityTypeFilter === "interview_training" ? "primary" : "default"}
                    onClick={() => setActivityTypeFilter("interview_training")}
                  />
                </Stack>
              </Paper>
              <ActivityTimeline
                activities={filteredActivities}
                isLoading={activitiesLoading}
              onEdit={async (activity: Activity, data: { type: ActivityType; description: string; date: string }) => {
                await updateActivityMutation.mutateAsync({
                  activityId: activity.id,
                  data: {
                    type: data.type,
                    description: data.description,
                    date: data.date,
                  },
                });
              }}
              onDelete={async (activityId: number) => {
                await deleteActivityMutation.mutateAsync(activityId);
              }}
              isEditing={updateActivityMutation.isPending}
              isDeleting={deleteActivityMutation.isPending}
            />
            </>
          ) : (
            /* Candidates List */
            <Paper elevation={0} sx={{ borderRadius: 2 }}>
              {candidatesLoading ? (
                <Box sx={{ p: 3, textAlign: "center" }}>
                  <Typography color="text.secondary">
                    Kandidaten laden...
                  </Typography>
                </Box>
              ) : candidatesData.length === 0 ? (
                <Box sx={{ p: 4, textAlign: "center" }}>
                  <Typography color="text.secondary" gutterBottom>
                    Nog geen kandidaten gekoppeld aan deze opdracht.
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ga naar de Opdrachten pagina om kandidaten toe te voegen.
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Naam</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Functie</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Bedrijf</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Locatie</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {candidatesData.map((candidate) => (
                        <TableRow key={candidate.id} hover>
                          <TableCell>
                            <Link
                              component="button"
                              onClick={() =>
                                navigate(`/network?kandidaten=1`, {
                                  state: { contactUid: candidate.contact.uid },
                                })
                              }
                              sx={{
                                textDecoration: "underline",
                                color: "inherit",
                                cursor: "pointer",
                                fontWeight: 500,
                                "&:hover": {
                                  color: "primary.main",
                                },
                              }}
                            >
                              {`${candidate.contact.first_name} ${candidate.contact.last_name}`}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {candidate.contact.company_role || "-"}
                          </TableCell>
                          <TableCell>
                            {candidate.contact.current_company || "-"}
                          </TableCell>
                          <TableCell>
                            {candidate.contact.location || "-"}
                          </TableCell>
                          <TableCell>
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                            >
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  bgcolor: getCandidateStatusColor(
                                    candidate.status
                                  ),
                                }}
                              />
                              <Typography variant="body2">
                                {candidate.status_label}
                              </Typography>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Dialogs */}
      {uid && (
        <>
          <AddActivityDialog
            open={openActivityDialog}
            onClose={() => setOpenActivityDialog(false)}
            assignmentUid={selectedAssignment}
            contacts={contacts}
          />

          <AddContactDialog
            open={openContactDialog}
            onClose={() => setOpenContactDialog(false)}
            accountUid={uid}
            contacts={contacts}
            existingContactUids={existingContactUids}
          />

          {/* Delete Account Confirmation Dialog */}
          <Dialog
            open={deleteAccountConfirm.isOpen}
            onClose={() => {
              deleteAccountConfirm.close();
              setDeleteAccountError(null);
            }}
          >
            <DialogTitle>Klant verwijderen</DialogTitle>
            <Box sx={{ px: 3, pb: 1 }}>
              <Typography>
                Weet je zeker dat je {account.name} wilt verwijderen? Dit kan
                niet ongedaan worden gemaakt.
              </Typography>
              {deleteAccountError && (
                <Alert
                  severity="error"
                  onClose={() => setDeleteAccountError(null)}
                  sx={{ mt: 2 }}
                >
                  {deleteAccountError}
                </Alert>
              )}
            </Box>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button
                onClick={() => {
                  deleteAccountConfirm.close();
                  setDeleteAccountError(null);
                }}
                disabled={deleteAccountMutation.isPending}
              >
                Annuleren
              </Button>
              <Button
                color="error"
                variant="contained"
                startIcon={<DeleteOutlineIcon />}
                onClick={handleDeleteAccountConfirm}
                disabled={deleteAccountMutation.isPending}
              >
                {deleteAccountMutation.isPending ? "Bezig..." : "Verwijderen"}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );
}
