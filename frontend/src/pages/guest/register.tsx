import {
  Card,
  CardContent,
  Stack,
  Typography,
  TextField,
  Button,
  Link,
  Snackbar,
  Alert,
} from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import API from "../../../axios-client";

const TenantSchema = z
  .object({
    email: z.email(),
    company: z.string(),
    name: z.string(),
    password: z.string(),
    confirmPassword: z
      .string()
      .min(8)
      .regex(/[0-9]/)
      .regex(/[^A-Za-z0-9]/),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    error: "Passwords do not match",
  });

type TenantForm = z.infer<typeof TenantSchema>;

export default function Register() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
    watch,
    reset,
  } = useForm<TenantForm>({
    resolver: zodResolver(TenantSchema),
    mode: "onBlur",
  });

  const password = watch("password") ?? "";
  const passwordChecklist = {
    hasMinLength: password.length >= 8,
    hasNumber: /\d/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  const onSubmit = async (data: TenantForm) => {
    const payload = {
      email: data.email,
      company: data.company,
      name: data.name,
      password: data.password,
      password_confirmation: data.confirmPassword,
    };

    await API.post("/auth/register-tenant", payload)
      .then((response) => console.log(response.data))
      .catch((error) => console.log(error));
  };

  return (
    <Card variant="outlined" sx={{ width: "100%", maxWidth: 520 }}>
      <CardContent sx={{ p: 3 }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack spacing={2}>
            <Typography variant="h5" component="h1">
              Registreren
            </Typography>

            <TextField
              label="E-mailadres"
              type="email"
              autoComplete="email"
              fullWidth
              required
              error={!!errors.email}
              helperText={errors.email?.message ?? " "}
              {...register("email")}
            />

            <TextField
              label="Bedrijfsnaam"
              autoComplete="organization"
              fullWidth
              required
              error={!!errors.company}
              helperText={errors.company?.message ?? " "}
              {...register("company")}
            />

            <TextField
              label="Naam"
              autoComplete="name"
              fullWidth
              required
              error={!!errors.name}
              helperText={errors.name?.message ?? " "}
              {...register("name")}
            />

            <TextField
              label="Wachtwoord"
              type="password"
              autoComplete="new-password"
              fullWidth
              required
              error={!!errors.password}
              helperText={errors.password?.message ?? " "}
              {...register("password")}
            />

            {/* Live password checklist */}
            <ChecklistRow ok={passwordChecklist.hasMinLength}>
              Minimaal 8 tekens
            </ChecklistRow>
            <ChecklistRow ok={passwordChecklist.hasNumber}>
              Minstens 1 cijfer
            </ChecklistRow>
            <ChecklistRow ok={passwordChecklist.hasSpecial}>
              Minstens 1 speciaal teken
            </ChecklistRow>

            <TextField
              label="Wachtwoord herhalen"
              type="password"
              autoComplete="new-password"
              fullWidth
              required
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message ?? " "}
              {...register("confirmPassword")}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={isSubmitting}
            >
              {isSubmitting ? "Bezig..." : "Account aanmaken"}
            </Button>

            <Typography variant="body2" sx={{ textAlign: "center" }}>
              Al een account?{" "}
              <Link component={RouterLink} to="/">
                Inloggen
              </Link>
            </Typography>
          </Stack>
        </form>
      </CardContent>

      <Snackbar
        open={isSubmitSuccessful}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" sx={{ width: "100%" }}>
          Registratie geslaagd! Je kunt nu inloggen.
        </Alert>
      </Snackbar>
    </Card>
  );
}

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
