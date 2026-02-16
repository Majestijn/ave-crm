import {
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Stack,
  Alert,
  Fade,
} from "@mui/material";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import API from "../../../axios-client";
import { Link as RouterLink } from "react-router-dom";
import Link from "@mui/material/Link";

const ForgotPasswordSchema = z.object({
  email: z.string().email("Voer een geldig e-mailadres in"),
});

type ForgotPasswordForm = z.infer<typeof ForgotPasswordSchema>;

export default function ForgotPassword() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(ForgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setLoading(true);
    setStatus(null);
    try {
      const response = await API.post<{ status?: string }>(
        "/auth/forgot-password",
        { email: data.email }
      );
      setStatus(response.status ?? "We hebben de herstellink verstuurd.");
    } catch (error: any) {
      if (error.response?.status === 422) {
        // Validation error (e.g. email not found, though often throttled/hidden for security)
        const validationErrors = error.response.data.errors;
        if (validationErrors?.email) {
            setError("email", { 
                type: "server", 
                message: validationErrors.email[0] 
            });
        }
      } else {
        setError("root", {
          type: "server",
          message: "Er is iets misgegaan. Probeer het later opnieuw.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Fade in={true}>
      <Card variant="outlined" sx={{ width: "100%", maxWidth: 420 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h5" component="h1">
              Wachtwoord vergeten
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Vul uw e-mailadres in en we sturen u een link om uw wachtwoord te herstellen.
            </Typography>

            {status && <Alert severity="success">{status}</Alert>}
            {errors.root && <Alert severity="error">{errors.root.message}</Alert>}

            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing={2}>
                <TextField
                  label="E-mailadres"
                  type="email"
                  fullWidth
                  required
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  {...register("email")}
                  disabled={loading || !!status}
                />

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={loading || !!status}
                >
                  {loading ? "Verzenden..." : "Link versturen"}
                </Button>

                <Typography variant="body2" align="center">
                  <Link component={RouterLink} to="/" underline="hover">
                    Terug naar inloggen
                  </Link>
                </Typography>
              </Stack>
            </form>
          </Stack>
        </CardContent>
      </Card>
    </Fade>
  );
}
