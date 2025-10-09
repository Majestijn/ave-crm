import React, { useMemo, useState } from "react";
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
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isStrongPassword(password: string): boolean {
  const strongRegex = /^(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/;
  return strongRegex.test(password);
}

type Role = "admin" | "recruiter";

function a11yProps(index: number) {
  return {
    id: `settings-tab-${index}`,
    "aria-controls": `settings-tabpanel-${index}`,
  };
}

function TabPanel(props: {
  children?: React.ReactNode;
  index: number;
  value: number;
}) {
  const { children, value, index, ...other } = props;
  return (
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
}

export default function SettingsPage() {
  const [tab, setTab] = useState(0);
  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("current_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const isAdmin = ((): boolean => {
    try {
      const email: string | undefined = currentUser?.email;
      if (!email) return false;
      const raw = localStorage.getItem("registered_users");
      const users: Array<{ email: string; role?: Role }> = raw
        ? JSON.parse(raw)
        : [];
      const u = users.find((x) => x.email === email);
      return (u?.role ?? "recruiter") === "admin" || email === "admin";
    } catch {
      return false;
    }
  })();

  return (
    <Box>
      <Typography variant="h5" component="h1" sx={{ mb: 2 }}>
        Instellingen
      </Typography>

      <Paper sx={{ width: "100%" }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          aria-label="settings tabs"
        >
          <Tab label="Overzicht" {...a11yProps(0)} />
          <Tab label="Notificaties" {...a11yProps(1)} />
          <Tab label="Gebruikers" {...a11yProps(2)} />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Typography variant="body1">Placeholder submenu 1</Typography>
        </TabPanel>
        <TabPanel value={tab} index={1}>
          <Typography variant="body1">Placeholder submenu 2</Typography>
        </TabPanel>
        <TabPanel value={tab} index={2}>
          <UsersTab isAdmin={isAdmin} />
        </TabPanel>
      </Paper>
    </Box>
  );
}

function UsersTab({ isAdmin }: { isAdmin: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("recruiter");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [refreshKey, setRefreshKey] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  const emailInvalid = (touched.email || false) && !isValidEmail(email);
  const passwordInvalid =
    (touched.password || false) && !isStrongPassword(password);
  const formValid = isValidEmail(email) && isStrongPassword(password);

  const passwordChecklist = React.useMemo(() => {
    const hasMinLength = password.length >= 8;
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    return { hasMinLength, hasNumber, hasSpecial };
  }, [password]);

  function resetForm() {
    setEmail("");
    setPassword("");
    setRole("recruiter");
    setError("");
  }

  function handleOpen() {
    resetForm();
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
  }

  function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!isAdmin) {
      setError("Alleen admins kunnen gebruikers toevoegen");
      return;
    }
    if (!isValidEmail(email)) {
      setTouched((t) => ({ ...t, email: true }));
      setError("Voer een geldig e-mailadres in");
      return;
    }
    if (!isStrongPassword(password)) {
      setTouched((t) => ({ ...t, password: true }));
      setError("Wachtwoord voldoet niet aan de eisen");
      return;
    }
    try {
      const raw = localStorage.getItem("registered_users");
      const users: Array<{ email: string; password: string; role?: Role }> = raw
        ? JSON.parse(raw)
        : [];
      if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        setError("E-mailadres bestaat al");
        return;
      }
      users.push({ email, password, role });
      localStorage.setItem("registered_users", JSON.stringify(users));
      setSuccess("Gebruiker toegevoegd");
      setEmail("");
      setPassword("");
      setRole("recruiter");
      setRefreshKey((k) => k + 1);
    } catch {
      setError("Opslaan mislukt");
    }
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Gebruikers
      </Typography>

      {!isAdmin && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Recruiters kunnen geen gebruikers toevoegen.
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {error && !open && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpen}
          disabled={!isAdmin}
        >
          Gebruiker toevoegen
        </Button>
      </Box>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>Nieuwe gebruiker</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="E-mailadres"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              type="email"
              required
              autoFocus
              error={Boolean(emailInvalid)}
              helperText={emailInvalid ? "Voer een geldig e-mailadres in" : " "}
            />
            <TextField
              label="Wachtwoord"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              type={showPassword ? "text" : "password"}
              required
              error={Boolean(passwordInvalid)}
              helperText={
                passwordInvalid
                  ? "Min. 8 tekens, incl. 1 cijfer en 1 speciaal teken"
                  : "Min. 8 tekens, incl. 1 cijfer en 1 speciaal teken"
              }
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={
                        showPassword ? "Verberg wachtwoord" : "Toon wachtwoord"
                      }
                      onClick={() => setShowPassword((v) => !v)}
                      onMouseDown={(e) => e.preventDefault()}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
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
                    bgcolor: passwordChecklist.hasMinLength
                      ? "success.main"
                      : "text.disabled",
                    transform: passwordChecklist.hasMinLength
                      ? "scale(1.1)"
                      : "scale(1)",
                    transition:
                      "background-color 180ms ease, transform 140ms ease",
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
                    bgcolor: passwordChecklist.hasNumber
                      ? "success.main"
                      : "text.disabled",
                    transform: passwordChecklist.hasNumber
                      ? "scale(1.1)"
                      : "scale(1)",
                    transition:
                      "background-color 180ms ease, transform 140ms ease",
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
                    bgcolor: passwordChecklist.hasSpecial
                      ? "success.main"
                      : "text.disabled",
                    transform: passwordChecklist.hasSpecial
                      ? "scale(1.1)"
                      : "scale(1)",
                    transition:
                      "background-color 180ms ease, transform 140ms ease",
                  }}
                />
                Minstens 1 speciaal teken
              </Box>
            </Box>
            <TextField
              select
              label="Rol"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="recruiter">Recruiter</MenuItem>
            </TextField>
            {error && (
              <Alert severity="error" onClose={() => setError("")}>
                {error}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Annuleren</Button>
          <Button
            onClick={(e) => {
              handleAddUser(e as unknown as React.FormEvent);
              if (!error && formValid) {
                setOpen(false);
              }
            }}
            variant="contained"
            disabled={!isAdmin || !formValid}
          >
            Opslaan
          </Button>
        </DialogActions>
      </Dialog>

      <ExistingUsersList refreshKey={refreshKey} />
    </Box>
  );
}

function ExistingUsersList({ refreshKey }: { refreshKey: number }) {
  const [tick, setTick] = useState(0);
  React.useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "registered_users") setTick((t) => t + 1);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const users = useMemo(() => {
    try {
      const raw = localStorage.getItem("registered_users");
      const list: Array<{ email: string; role?: Role }> = raw
        ? JSON.parse(raw)
        : [];
      return list;
    } catch {
      return [] as Array<{ email: string; role?: Role }>;
    }
  }, [refreshKey, tick]);

  if (users.length === 0) return null;

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Bestaande gebruikers
      </Typography>
      <Stack spacing={1}>
        {users.map((u) => (
          <UserRow key={u.email} user={u} />
        ))}
      </Stack>
    </Paper>
  );
}

function UserRow({ user }: { user: { email: string; role?: Role } }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [removing, setRemoving] = useState(false);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("current_user");
      const cu = raw ? JSON.parse(raw) : null;
      const mail: string | undefined = cu?.email;
      if (!mail) return;
      const rawUsers = localStorage.getItem("registered_users");
      const list: Array<{ email: string; role?: Role }> = rawUsers
        ? JSON.parse(rawUsers)
        : [];
      const me = list.find((x) => x.email === mail);
      setIsAdmin((me?.role ?? "recruiter") === "admin" || mail === "admin");
    } catch {
      setIsAdmin(false);
    }
  }, []);

  function performDelete() {
    try {
      const raw = localStorage.getItem("registered_users");
      const list: Array<{ email: string; role?: Role; password?: string }> = raw
        ? JSON.parse(raw)
        : [];
      const updated = list.filter((u) => u.email !== user.email);
      localStorage.setItem("registered_users", JSON.stringify(updated));
      // Trigger UI refresh for parent by dispatching storage event
      window.dispatchEvent(
        new StorageEvent("storage", { key: "registered_users" })
      );
      setConfirmOpen(false);
    } catch {
      setConfirmOpen(false);
    }
  }

  return (
    <>
      <Collapse in={!removing} timeout={200} onExited={performDelete}>
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
            onClick={() => setConfirmOpen(true)}
            disabled={!isAdmin}
          >
            Verwijderen
          </Button>
        </Box>
      </Collapse>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Gebruiker verwijderen</DialogTitle>
        <DialogContent>
          Weet je zeker dat je {user.email} wilt verwijderen?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Annuleren</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              setConfirmOpen(false);
              setRemoving(true);
            }}
          >
            Verwijderen
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
