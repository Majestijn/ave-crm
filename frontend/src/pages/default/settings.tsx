import React, { useEffect, useState, useMemo } from "react";
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
import EditIcon from "@mui/icons-material/Edit";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Visibility from "@mui/icons-material/Visibility";
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
  role: z.enum(["admin", "recruiter", "viewer", "owner", "management"]),
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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    control,
    setError,
    watch,
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
  
  const password = watch("password") ?? "";
  const passwordChecklist = {
    hasMinLength: password.length >= 8,
    hasNumber: /\d/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  const onSubmit = async (data: NewUserForm) => {
    setSubmitError(null);
    try {
      await API.post("/users", data);
      addUser.close();
      reset();
      setShowPassword(false);
      await refresh(); // re-fetch
    } catch (err: any) {
      console.error(err);
      if (err?.response?.data?.message) {
        setSubmitError(err.response.data.message);
      } else if (err?.response?.data?.errors) {
        // Handle validation errors
        const errors = err.response.data.errors;
        Object.keys(errors).forEach((key) => {
          if (key in data) {
            setError(key as keyof NewUserForm, {
              type: "server",
              message: Array.isArray(errors[key]) ? errors[key][0] : errors[key],
            });
          }
        });
      } else {
        setSubmitError("Er is iets misgegaan. Probeer het opnieuw.");
      }
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Gebruikers
      </Typography>

      {(currentUser?.role === 'owner' || currentUser?.role === 'admin' || currentUser?.role === 'management') && (
        <Box sx={{ mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={addUser.open}
          >
            Gebruiker toevoegen
          </Button>
        </Box>
      )}

      <Dialog 
        open={addUser.isOpen} 
        fullWidth 
        maxWidth="sm"
        onClose={() => {
          addUser.close();
          setSubmitError(null);
          setShowPassword(false);
        }}
      >
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
              type={showPassword ? "text" : "password"}
              required
              error={!!errors.password}
              helperText={errors.password?.message ?? " "}
              {...register("password")}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      edge="end"
                      aria-label="Toon/Verberg wachtwoord"
                      onClick={() => setShowPassword(!showPassword)}
                      onMouseDown={(e) => e.preventDefault()}
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
              <ChecklistRow ok={passwordChecklist.hasMinLength}>
                Minimaal 8 tekens
              </ChecklistRow>
              <ChecklistRow ok={passwordChecklist.hasNumber}>
                Minstens 1 cijfer
              </ChecklistRow>
              <ChecklistRow ok={passwordChecklist.hasSpecial}>
                Minstens 1 speciaal teken
              </ChecklistRow>
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
                  <MenuItem value="owner">Owner</MenuItem>
                  <MenuItem value="management">Management</MenuItem>
                </TextField>
              )}
            />
            {submitError && (
              <Alert severity="error" onClose={() => setSubmitError(null)}>
                {submitError}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            addUser.close();
            setSubmitError(null);
            setShowPassword(false);
          }}>Annuleren</Button>
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
        refresh={refresh}
      />
    </Box>
  );
};

const ExistingUsersList = ({
  currentUser,
  users = [],
  loading,
  error,
  refresh,
}: {
  currentUser: User | null;
  users?: User[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}) => {
  useEffect(() => {
    console.log("ExistingUsersList users:", users);
  }, [users]);

  const combinedUsers = useMemo(() => {
    const list = [...users];
    if (currentUser) {
      const exists = list.some((u) =>
        u.uid && currentUser.uid ? u.uid === currentUser.uid : u.email === currentUser.email
      );
      if (!exists) list.unshift(currentUser);
    }
    return list;
  }, [users, currentUser]);

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Bestaande gebruikers
      </Typography>

      {loading && <Typography variant="body2">Laden…</Typography>}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && combinedUsers.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          Geen gebruikers gevonden.
        </Typography>
      )}

      {!loading && !error && combinedUsers.length > 0 && (
        <Stack spacing={1}>
          {combinedUsers.map((u) => (
            <UserRow
              key={u.uid ?? u.email}
              user={{ uid: u.uid, name: u.name, email: u.email, role: u.role }}
              currentUser={currentUser}
              onDelete={refresh}
              onUpdate={refresh}
            />
          ))}
        </Stack>
      )}
    </Paper>
  );
};

const EditUserSchema = z.object({
  name: z.string().min(1, "Naam is verplicht"),
  email: z.string().email("Ongeldig e-mailadres"),
  role: z.enum(["admin", "recruiter", "viewer", "owner", "management"]),
  password: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.length >= 8,
      "Minimaal 8 tekens"
    )
    .refine(
      (val) => !val || /\d/.test(val),
      "Minstens 1 cijfer"
    )
    .refine(
      (val) => !val || /[^A-Za-z0-9]/.test(val),
      "Minstens 1 speciaal teken"
    ),
});

type EditUserForm = z.infer<typeof EditUserSchema>;

const UserRow = ({ 
  user, 
  currentUser, 
  onDelete,
  onUpdate,
}: { 
  user: { uid?: string; name?: string; email: string; role?: string };
  currentUser: User | null;
  onDelete: () => Promise<void>;
  onUpdate: () => Promise<void>;
}) => {
  const deleteDialog = useDisclosure();
  const editDialog = useDisclosure();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    watch,
    setError,
  } = useForm<EditUserForm>({
    resolver: zodResolver(EditUserSchema),
    mode: "onBlur",
    defaultValues: {
      name: user.name || "",
      email: user.email,
      role: (user.role as "admin" | "recruiter" | "viewer" | "owner" | "management") || "recruiter",
      password: "",
    },
  });

  const password = watch("password") ?? "";
  const passwordChecklist = {
    hasMinLength: password.length >= 8,
    hasNumber: /\d/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  // Check if user can be edited
  const canEdit = useMemo(() => {
    if (!currentUser) return false;
    
    // Can't edit yourself (use profile settings for that)
    const isSelf = (user.uid && currentUser.uid && user.uid === currentUser.uid) || 
                   user.email === currentUser.email;
    if (isSelf) return false;
    
    // Admins and management cannot edit owners
    if ((currentUser.role === 'admin' || currentUser.role === 'management') && user.role === 'owner') {
      return false;
    }
    
    // Only owners, admins, and management can edit users
    return currentUser.role === 'owner' || currentUser.role === 'admin' || currentUser.role === 'management';
  }, [user, currentUser]);

  // Check if user can be deleted
  const canDelete = useMemo(() => {
    if (!currentUser) return false;
    
    // Can't delete yourself
    const isSelf = (user.uid && currentUser.uid && user.uid === currentUser.uid) || 
                   user.email === currentUser.email;
    if (isSelf) return false;
    
    // Admins and management cannot delete owners
    if ((currentUser.role === 'admin' || currentUser.role === 'management') && user.role === 'owner') {
      return false;
    }
    
    // Only owners, admins, and management can delete users
    return currentUser.role === 'owner' || currentUser.role === 'admin' || currentUser.role === 'management';
  }, [user, currentUser]);

  const handleOpenEdit = () => {
    reset({
      name: user.name || "",
      email: user.email,
      role: (user.role as "admin" | "recruiter" | "viewer" | "owner" | "management") || "recruiter",
      password: "",
    });
    setEditError(null);
    setShowPassword(false);
    editDialog.open();
  };

  const handleCloseEdit = () => {
    editDialog.close();
    setEditError(null);
    setShowPassword(false);
  };

  const handleUpdate = async (data: EditUserForm) => {
    if (!user.uid) return;
    
    setIsUpdating(true);
    setEditError(null);
    
    try {
      const updateData: Record<string, string> = {
        name: data.name,
        email: data.email,
        role: data.role,
      };
      
      // Only include password if it was changed
      if (data.password && data.password.length > 0) {
        updateData.password = data.password;
      }
      
      await API.put(`/users/${user.uid}`, updateData);
      handleCloseEdit();
      await onUpdate();
    } catch (err: any) {
      console.error('Error updating user:', err);
      if (err?.response?.data?.message) {
        setEditError(err.response.data.message);
      } else if (err?.response?.data?.errors) {
        const errors = err.response.data.errors;
        Object.keys(errors).forEach((key) => {
          if (key in data) {
            setError(key as keyof EditUserForm, {
              type: "server",
              message: Array.isArray(errors[key]) ? errors[key][0] : errors[key],
            });
          }
        });
      } else {
        setEditError("Er is iets misgegaan. Probeer het opnieuw.");
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!user.uid) return;
    
    setIsDeleting(true);
    try {
      await API.delete(`/users/${user.uid}`);
      deleteDialog.close();
      await onDelete();
    } catch (err: any) {
      console.error('Error deleting user:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <Box sx={{ flex: 1 }}>
          {user.name && (
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {user.name}
            </Typography>
          )}
          <Typography variant={user.name ? "body2" : "body1"} color={user.name ? "text.secondary" : "text.primary"}>
            {user.email}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
          {user.role ?? "recruiter"}
        </Typography>
        {canEdit && (
          <Button
            size="small"
            variant="text"
            startIcon={<EditIcon />}
            onClick={handleOpenEdit}
          >
            Bewerken
          </Button>
        )}
        {canDelete && (
          <Button
            size="small"
            color="error"
            variant="text"
            startIcon={<DeleteOutlineIcon />}
            onClick={deleteDialog.open}
            disabled={isDeleting}
          >
            Verwijderen
          </Button>
        )}
      </Box>

      {/* Edit Dialog */}
      <Dialog 
        open={editDialog.isOpen} 
        onClose={handleCloseEdit}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Gebruiker bewerken</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Naam"
              required
              error={!!errors.name}
              {...register("name")}
              helperText={errors.name?.message ?? " "}
            />
            <TextField
              label="E-mailadres"
              type="email"
              required
              error={!!errors.email}
              {...register("email")}
              helperText={errors.email?.message ?? " "}
            />
            <Controller
              name="role"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  select
                  label="Rol"
                  fullWidth
                  {...field}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message ?? " "}
                >
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="recruiter">Recruiter</MenuItem>
                  <MenuItem value="viewer">Viewer</MenuItem>
                  <MenuItem value="owner">Owner</MenuItem>
                  <MenuItem value="management">Management</MenuItem>
                </TextField>
              )}
            />
            <TextField
              label="Nieuw wachtwoord (optioneel)"
              type={showPassword ? "text" : "password"}
              error={!!errors.password}
              helperText={errors.password?.message ?? "Laat leeg om wachtwoord niet te wijzigen"}
              {...register("password")}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      edge="end"
                      aria-label="Toon/Verberg wachtwoord"
                      onClick={() => setShowPassword(!showPassword)}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            {password.length > 0 && (
              <Box
                sx={{
                  display: "grid",
                  gap: 0.5,
                  color: "text.secondary",
                  fontSize: 13,
                  pl: 1.75,
                }}
              >
                <ChecklistRow ok={passwordChecklist.hasMinLength}>
                  Minimaal 8 tekens
                </ChecklistRow>
                <ChecklistRow ok={passwordChecklist.hasNumber}>
                  Minstens 1 cijfer
                </ChecklistRow>
                <ChecklistRow ok={passwordChecklist.hasSpecial}>
                  Minstens 1 speciaal teken
                </ChecklistRow>
              </Box>
            )}
            {editError && (
              <Alert severity="error" onClose={() => setEditError(null)}>
                {editError}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEdit} disabled={isUpdating}>
            Annuleren
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit(handleUpdate)}
            disabled={isUpdating}
          >
            {isUpdating ? "Bezig..." : "Opslaan"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.isOpen} onClose={deleteDialog.close}>
        <DialogTitle>Gebruiker verwijderen</DialogTitle>
        <DialogContent>
          Weet je zeker dat je {user.email} wilt verwijderen?
        </DialogContent>
        <DialogActions>
          <Button onClick={deleteDialog.close} disabled={isDeleting}>
            Annuleren
          </Button>
          <Button 
            color="error" 
            variant="contained" 
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Bezig..." : "Verwijderen"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

function ChecklistRow({
  ok,
  children,
}: {
  ok: boolean;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Box
        component="span"
        sx={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          display: "inline-block",
          bgcolor: ok ? "success.main" : "text.disabled",
          transform: ok ? "scale(1.1)" : "scale(1)",
          transition: "background-color 180ms ease, transform 140ms ease",
        }}
      />
      {children}
    </Box>
  );
}
