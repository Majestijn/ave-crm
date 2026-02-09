import {
  Card,
  CardContent,
  Stack,
  Typography,
  TextField,
  Button,
  Link,
  IconButton,
  InputAdornment,
} from "@mui/material";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Visibility from "@mui/icons-material/Visibility";
import React, { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef } from "react";
import API from "../../../axios-client";
import type { User } from "../../types/users";

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

type Tenant = {
  uid: string;
  name: string;
  slug: string;
  domain: string;
};

type RegisterResponse = {
  token: string;
  user: User;
  tenant: Tenant;
};

export default function Register() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const companyRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset,
    setValue,
  } = useForm<TenantForm>({
    resolver: zodResolver(TenantSchema),
    mode: "onBlur",
  });

  const password = watch("password") ?? "";
  const email = watch("email") ?? "";
  const company = watch("company") ?? "";
  const name = watch("name") ?? "";
  const confirmPassword = watch("confirmPassword") ?? "";
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

    try {
      const { token, user, tenant } = (await API.post(
        "/auth/register-tenant",
        payload
      )) as RegisterResponse;

      // Clear any stale tokens from base domain
      localStorage.removeItem("auth_token");
      localStorage.removeItem("current_user");

      // Redirect to tenant subdomain with auth token in hash
      const protocol = window.location.protocol;
      const port = window.location.port ? `:${window.location.port}` : "";
      const tokenHash = encodeURIComponent(token);
      const userHash = encodeURIComponent(JSON.stringify(user));

      window.location.href = `${protocol}//${tenant.domain}${port}/#token=${tokenHash}&user=${userHash}`;
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <Card variant="outlined" sx={{ width: "100%", maxWidth: 520 }}>
      <CardContent sx={{ p: 3 }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack spacing={2}>
            <Typography variant="h5" component="h1">
              Registreren
            </Typography>

            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  inputRef={(e) => {
                    field.ref(e);
                    emailRef.current = e;
                  }}
                  label="E-mailadres"
                  type="email"
                  autoComplete="email"
                  fullWidth
                  required
                  error={!!errors.email}
                  helperText={errors.email?.message ?? " "}
                  InputLabelProps={{ shrink: !!email }}
                />
              )}
            />

            <Controller
              name="company"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  inputRef={(e) => {
                    field.ref(e);
                    companyRef.current = e;
                  }}
                  label="Bedrijfsnaam"
                  autoComplete="organization"
                  fullWidth
                  required
                  error={!!errors.company}
                  helperText={errors.company?.message ?? " "}
                  InputLabelProps={{ shrink: !!company }}
                />
              )}
            />

            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  inputRef={(e) => {
                    field.ref(e);
                    nameRef.current = e;
                  }}
                  label="Naam"
                  autoComplete="name"
                  fullWidth
                  required
                  error={!!errors.name}
                  helperText={errors.name?.message ?? " "}
                  InputLabelProps={{ shrink: !!name }}
                />
              )}
            />

            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  inputRef={(e) => {
                    field.ref(e);
                    passwordRef.current = e;
                  }}
                  label="Wachtwoord"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  fullWidth
                  required
                  error={!!errors.password}
                  helperText={errors.password?.message ?? " "}
                  InputLabelProps={{ shrink: !!password }}
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
              )}
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

            <Controller
              name="confirmPassword"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  inputRef={(e) => {
                    field.ref(e);
                    confirmPasswordRef.current = e;
                  }}
                  label="Wachtwoord herhalen"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  fullWidth
                  required
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword?.message ?? " "}
                  InputLabelProps={{ shrink: !!confirmPassword }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          aria-label="Toon/Verberg wachtwoord"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            <Button
              type="button"
              variant="outlined"
              fullWidth
              onClick={() => {
                const debugValues = {
                  email: "admin@aveconsult.nl",
                  company: "Ave Consult B.V.",
                  name: "Adriaan van Essen",
                  password: "Aveconsult1!",
                  confirmPassword: "Aveconsult1!",
                };
                // Set values and trigger focus/blur to animate Material UI labels
                setValue("email", debugValues.email, {
                  shouldTouch: true,
                  shouldDirty: true,
                  shouldValidate: true,
                });
                setValue("company", debugValues.company, {
                  shouldTouch: true,
                  shouldDirty: true,
                  shouldValidate: true,
                });
                setValue("name", debugValues.name, {
                  shouldTouch: true,
                  shouldDirty: true,
                  shouldValidate: true,
                });
                setValue("password", debugValues.password, {
                  shouldTouch: true,
                  shouldDirty: true,
                  shouldValidate: true,
                });
                setValue("confirmPassword", debugValues.confirmPassword, {
                  shouldTouch: true,
                  shouldDirty: true,
                  shouldValidate: true,
                });

                // Trigger focus and blur on each field to animate Material UI labels
                setTimeout(() => {
                  emailRef.current?.focus();
                  emailRef.current?.blur();
                  companyRef.current?.focus();
                  companyRef.current?.blur();
                  nameRef.current?.focus();
                  nameRef.current?.blur();
                  passwordRef.current?.focus();
                  passwordRef.current?.blur();
                  confirmPasswordRef.current?.focus();
                  confirmPasswordRef.current?.blur();
                }, 0);
              }}
              sx={{ mb: 1 }}
            >
              Debug: Vul formulier in
            </Button>

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
