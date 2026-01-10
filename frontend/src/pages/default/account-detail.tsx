import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Grid, Stack, Button, Paper, Typography } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useAccount } from "../../api/queries/accounts";
import { useContacts } from "../../api/queries/contacts";
import { useAccountAssignments } from "../../api/queries/assignments";
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

export default function AccountDetailPage() {
  const { uid } = useParams<{ uid: string }>();

  // TanStack Query hooks
  const {
    data: account,
    isLoading: loading,
    error: accountError,
  } = useAccount(uid);
  const { data: assignments = [] } = useAccountAssignments(uid);
  const { data: contacts = [] } = useContacts();

  const [selectedAssignment, setSelectedAssignment] = useState<string>("");

  // Activities query (depends on selectedAssignment)
  const { data: activitiesData = [], isLoading: activitiesLoading } =
    useAssignmentActivities(selectedAssignment);

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
            mb={4}
          >
            <AssignmentSelector
              assignments={assignments}
              selectedAssignment={selectedAssignment}
              onSelect={setSelectedAssignment}
            />

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
          </Box>

          {/* Timeline */}
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
          ) : (
            <ActivityTimeline
              activities={activitiesData}
              isLoading={activitiesLoading}
            />
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
