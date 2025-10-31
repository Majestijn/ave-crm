import React, { useEffect, useState } from "react";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
  TextField,
  Button,
  MenuItem,
  Alert,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  InputAdornment,
  Collapse,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useDisclosure } from "../../hooks/useDisclosure";
import { useUsers } from "../../hooks/useUsers";
import z from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import API from "../../../axios-client";
import type { Paginated, User } from "../../types/users";

const a11yProps = (index: number) => ({
  id: `settings-tab-${index}`,
  "aria-controls": `settings-tabpanel-${index}`,
});

const TabPanel = ({
  children,
  value,
  index,
  ...other
}: {
  children?: React.ReactNode;
  value: number;
  index: number;
}) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`settings-tabpanel-${index}`}
    aria-labelledby={`settings-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
  </div>
);

const NewUserSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  password: z
    .string()
    .min(8, "Minimaal 8 tekens")
    .regex(/\d/, "Minstens 1 cijfer")
    .regex(/[^A-Za-z0-9]/, "Minstens 1 speciaal teken"),
  role: z.enum(["admin", "recruiter", "viewer"]),
});

type NewUserForm = z.infer<typeof NewUserSchema>;

const SettingsPage = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("current_user");
    if (stored) {
      try {
        const parsed: User = JSON.parse(stored);
        setCurrentUser(parsed);
      } catch {
        console.error("Invalid user JSON in localStorage");
        setCurrentUser(null);
      }
    } else {
      setCurrentUser(null);
    }
  }, []);

  return (
    <Box>
      <Typography variant="h5" component="h1" sx={{ mb: 2 }}>
        Instellingen
      </Typography>

      <Paper sx={{ width: "100%" }}>
        <Tabs
          value={currentTab}
          onChange={(_, v) => setCurrentTab(v)}
          aria-label="settings tabs"
        >
          <Tab label="Overzicht" {...a11yProps(0)} />
          <Tab label="Notificaties" {...a11yProps(1)} />
          <Tab label="Gebruikers" {...a11yProps(2)} />
        </Tabs>

        <TabPanel value={currentTab} index={0}>
          <Typography variant="body1">Placeholder submenu 1</Typography>
        </TabPanel>
        <TabPanel value={currentTab} index={1}>
          <Typography variant="body1">Placeholder submenu 2</Typography>
        </TabPanel>
        <TabPanel value={currentTab} index={2}>
          <UsersTab currentUser={currentUser} />
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default SettingsPage;

const UsersTab = ({ currentUser }: { currentUser: User | null }) => {
  const addUser = useDisclosure();
  const { users, loading, error, refresh } = useUsers();

  useEffect(() => {
    refresh();
  }, [refresh]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
    reset,
    control,
  } = useForm<NewUserForm>({
    resolver: zodResolver(NewUserSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "recruiter",
    },
  });

  const onSubmit = async (data: NewUserForm) => {
    try {
      await API.post("/users", data);
      addUser.close();
      reset();
      await refresh(); // re-fetch
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Gebruikers
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={addUser.open}
        >
          Gebruiker toevoegen
        </Button>
      </Box>

      {/* Dialoog zonder functionaliteit; standaard gesloten */}
      <Dialog open={addUser.isOpen} fullWidth maxWidth="sm">
        <DialogTitle>Nieuwe gebruiker</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="E-mailadres"
              type="email"
              required
              error={!!errors.email}
              {...register("email")}
              helperText={errors.email?.message ?? " "}
            />
            <TextField
              label="Name"
              required
              error={!!errors.name}
              {...register("name")}
              helperText={errors.name?.message ?? " "}
            />
            <TextField
              label="Wachtwoord"
              type="password"
              required
              error={!!errors.password}
              helperText={errors.password?.message ?? " "}
              {...register("password")}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton edge="end" aria-label="Toon/Verberg wachtwoord">
                      <VisibilityOff />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Box
              sx={{
                display: "grid",
                gap: 0.5,
                color: "text.secondary",
                fontSize: 13,
                pl: 1.75,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box
                  component="span"
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    display: "inline-block",
                    bgcolor: "text.disabled",
                  }}
                />
                Minimaal 8 tekens
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box
                  component="span"
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    display: "inline-block",
                    bgcolor: "text.disabled",
                  }}
                />
                Minstens 1 cijfer
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box
                  component="span"
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    display: "inline-block",
                    bgcolor: "text.disabled",
                  }}
                />
                Minstens 1 speciaal teken
              </Box>
            </Box>
            <Controller
              name="role"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  select
                  label="Rol"
                  fullWidth
                  {...field} // bevat value, onChange, onBlur, name, ref
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message ?? " "}
                >
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="recruiter">Recruiter</MenuItem>
                  <MenuItem value="viewer">Viewer</MenuItem>
                </TextField>
              )}
            />
            <Alert severity="error">Voorbeeld foutmelding in dialoog</Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={addUser.close}>Annuleren</Button>
          <Button
            variant="contained"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            Opslaan
          </Button>
        </DialogActions>
      </Dialog>

      <ExistingUsersList
        currentUser={currentUser}
        users={users}
        loading={loading}
        error={error}
      />
    </Box>
  );
};

const ExistingUsersList = ({
  currentUser,
  users = [],
  loading,
  error,
}: {
  currentUser: User | null;
  users?: User[];
  loading: boolean;
  error: string | null;
}) => {
  useEffect(() => {
    console.log("ExistingUsersList users:", users);
  }, [users]);

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Bestaande gebruikers
      </Typography>

      {loading && <Typography variant="body2">Laden…</Typography>}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && users.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          Geen gebruikers gevonden.
        </Typography>
      )}

      {!loading && !error && users.length > 0 && (
        <Stack spacing={1}>
          {users.map((u) => (
            <UserRow
              key={u.uid ?? u.email}
              user={{ email: u.email, role: u.role }}
            />
          ))}
        </Stack>
      )}
    </Paper>
  );
};

const UserRow = ({ user }: { user: { email: string; role?: string } }) => {
  return (
    <>
      {/* Altijd zichtbaar; geen delete-actie */}
      <Collapse in timeout={0}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Typography sx={{ flex: 1 }}>{user.email}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
            {user.role ?? "recruiter"}
          </Typography>
          <Button
            size="small"
            color="error"
            variant="text"
            startIcon={<DeleteOutlineIcon />}
          >
            Verwijderen
          </Button>
        </Box>
      </Collapse>

      {/* Bevestigingsdialoog markup, standaard gesloten */}
      <Dialog open={false}>
        <DialogTitle>Gebruiker verwijderen</DialogTitle>
        <DialogContent>
          Weet je zeker dat je {user.email} wilt verwijderen?
        </DialogContent>
        <DialogActions>
          <Button>Annuleren</Button>
          <Button color="error" variant="contained">
            Verwijderen
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
