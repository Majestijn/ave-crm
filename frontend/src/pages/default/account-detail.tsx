import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Grid,
  Stack,
  Button,
  Paper,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Link,
  Chip,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useAccount } from "../../api/queries/accounts";
import { useContacts } from "../../api/queries/contacts";
import {
  useAccountAssignments,
  useAssignmentCandidates,
  type CandidateAssignment,
} from "../../api/queries/assignments";
import { useAssignmentActivities } from "../../api/queries/activities";
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

  // Activities query (depends on selectedAssignment)
  const { data: activitiesData = [], isLoading: activitiesLoading } =
    useAssignmentActivities(selectedAssignment);

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
  const existingContactUids =
    (account.contacts
      ?.map((ac) => ac.contact?.uid)
      .filter(Boolean) as string[]) || [];

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
            <AssignmentSelector
              assignments={assignments}
              selectedAssignment={selectedAssignment}
              onSelect={setSelectedAssignment}
            />

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
            <ActivityTimeline
              activities={activitiesData}
              isLoading={activitiesLoading}
            />
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
                                navigate(`/candidates`, {
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
        </>
      )}
    </Box>
  );
}
