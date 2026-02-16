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
import { useSearchParams, useNavigate, Link as RouterLink } from "react-router-dom";
import Link from "@mui/material/Link";

const ResetPasswordSchema = z
    .object({
        password: z.string().min(8, "Wachtwoord moet minimaal 8 tekens zijn"),
        password_confirmation: z.string(),
    })
    .refine((data) => data.password === data.password_confirmation, {
        message: "Wachtwoorden komen niet overeen",
        path: ["password_confirmation"],
    });

type ResetPasswordForm = z.infer<typeof ResetPasswordSchema>;

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const token = searchParams.get("token");
    const email = searchParams.get("email");

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<ResetPasswordForm>({
        resolver: zodResolver(ResetPasswordSchema),
    });

    const onSubmit = async (data: ResetPasswordForm) => {
        if (!token || !email) {
            setError("root", {
                type: "manual",
                message: "Ongeldige link. Probeer opnieuw een wachtwoordherstel aan te vragen.",
            });
            return;
        }

        setLoading(true);
        try {
            await API.post("/auth/reset-password", {
                token,
                email,
                password: data.password,
                password_confirmation: data.password_confirmation,
            });
            setSuccess(true);
            setTimeout(() => {
                navigate("/");
            }, 3000);
        } catch (error: any) {
            if (error.response?.status === 422) {
                const validationErrors = error.response.data.errors;
                if (validationErrors?.email) {
                    setError("root", {
                        type: "server",
                        message: validationErrors.email[0] // e.g. "We can't find a user with that email address." or "This password reset token is invalid."
                    });
                } else if (validationErrors?.password) {
                    setError("password", {
                        type: "server",
                        message: validationErrors.password[0]
                    });
                }
            } else {
                setError("root", {
                    type: "server",
                    message: "Er is iets misgegaan. Probeer het opnieuw.",
                });
            }
        } finally {
            setLoading(false);
        }
    };

    if (!token || !email) {
        return (
            <Fade in={true}>
                <Card variant="outlined" sx={{ width: "100%", maxWidth: 420 }}>
                    <CardContent sx={{ p: 3 }}>
                        <Alert severity="error">
                            Ongeldige link. Er ontbreken gegevens om uw wachtwoord te herstellen.
                        </Alert>
                        <Typography variant="body2" align="center" sx={{ mt: 2 }}>
                            <Link component={RouterLink} to="/forgot-password" underline="hover">
                                Nieuwe link aanvragen
                            </Link>
                        </Typography>
                    </CardContent>
                </Card>
            </Fade>
        )
    }

    return (
        <Fade in={true}>
            <Card variant="outlined" sx={{ width: "100%", maxWidth: 420 }}>
                <CardContent sx={{ p: 3 }}>
                    <Stack spacing={2}>
                        <Typography variant="h5" component="h1">
                            Wachtwoord herstellen
                        </Typography>

                        {success ? (
                            <Alert severity="success">
                                Uw wachtwoord is succesvol gewijzigd! U wordt doorgestuurd naar de inlogpagina...
                            </Alert>
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                Voer hieronder uw nieuwe wachtwoord in.
                            </Typography>
                        )}

                        {errors.root && <Alert severity="error">{errors.root.message}</Alert>}

                        {!success && (
                            <form onSubmit={handleSubmit(onSubmit)}>
                                <Stack spacing={2}>
                                    <TextField
                                        label="Nieuw wachtwoord"
                                        type="password"
                                        fullWidth
                                        required
                                        error={!!errors.password}
                                        helperText={errors.password?.message}
                                        {...register("password")}
                                        disabled={loading}
                                    />

                                    <TextField
                                        label="Bevestig wachtwoord"
                                        type="password"
                                        fullWidth
                                        required
                                        error={!!errors.password_confirmation}
                                        helperText={errors.password_confirmation?.message}
                                        {...register("password_confirmation")}
                                        disabled={loading}
                                    />

                                    <Button
                                        type="submit"
                                        variant="contained"
                                        fullWidth
                                        disabled={loading}
                                    >
                                        {loading ? "Wachtwoord wijzigen..." : "Wachtwoord wijzigen"}
                                    </Button>
                                </Stack>
                            </form>
                        )}
                    </Stack>
                </CardContent>
            </Card>
        </Fade>
    );
}
