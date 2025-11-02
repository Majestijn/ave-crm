import {
  Card,
  CardContent,
  CardActions,
  TextField,
  Button,
  Typography,
  Stack,
  Link,
} from "@mui/material";
import Fade from "@mui/material/Fade";
import React from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { json, z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import API from "../../../axios-client";
import type { User } from "../../types/users";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

type LoginForm = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(LoginSchema),
    mode: "onBlur",
  });

  const [transitioning, setTransitioning] = useState(false);

  const onSubmit = async (data: LoginForm) => {
    const payload = {
      email: data.email,
      password: data.password,
    };

    try {
      type AuthResponse = { token: string; user: User };
      const res = (await API.post("/auth/login", payload)) as AuthResponse;
      console.log("Login: Full response:", res);
      console.log("Login: User object:", res.user);
      console.log("Login: User name:", res.user?.name);
      if (res.token) {
        localStorage.setItem("auth_token", res.token);
        localStorage.setItem("current_user", JSON.stringify(res.user));
        console.log("Login: Saved to localStorage:", res.user);
        setTransitioning(true);
      }
    } catch (e: any) {
      console.error("Login error:", e?.message, e);
    }

    // await API.post("/auth/login", payload)
    //   .then((response) => {
    //     const { token, user } = response.data.data;
    //     if (token) {
    //       localStorage.setItem("auth_token", token);
    //       localStorage.setItem("current_user", JSON.stringify(user));
    //       setTransitioning(true);
    //       console.log(transitioning);
    //     }
    //   })
    //   .catch((error) => {
    //     if (error.response?.status === 422) {
    //       const errors = error.response.data.errors;

    //       Object.entries(errors).forEach(([field, messages]) => {
    //         setError(field as keyof LoginForm, {
    //           type: "server",
    //           message: (messages as string[])[0],
    //         });
    //       });
    //     } else {
    //       setError("root", {
    //         type: "server",
    //         message: "Er is iets misgegaan. Probeer het opnieuw.",
    //       });
    //     }
    //   });
  };

  return (
    <Fade
      in={!transitioning}
      timeout={250}
      onExited={() => navigate("/dashboard", { replace: true })}
    >
      <Card variant="outlined" sx={{ width: "100%", maxWidth: 420 }}>
        <CardContent sx={{ p: 3 }}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack spacing={2}>
              <Typography variant="h5" component="h1">
                Inloggen
              </Typography>

              <TextField
                label="E-mailadres"
                type="text"
                fullWidth
                required
                error={!!errors.email}
                helperText={errors.email?.message ?? " "}
                {...register("email")}
                disabled={transitioning}
              />

              <TextField
                label="Wachtwoord"
                type="password"
                fullWidth
                required
                error={!!errors.password}
                helperText={errors.password?.message ?? ""}
                {...register("password")}
                disabled={transitioning}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={transitioning}
              >
                Log in
              </Button>

              <Typography variant="body2" sx={{ textAlign: "center" }}>
                Nog geen account?{" "}
                <Link component={RouterLink} to="/register">
                  Registreer
                </Link>
              </Typography>
            </Stack>
          </form>
        </CardContent>

        <CardActions sx={{ justifyContent: "center", pb: 2 }}>
          <Link component={RouterLink} to="/forgot-password" underline="hover">
            Wachtwoord vergeten?
          </Link>
        </CardActions>
      </Card>
    </Fade>
  );
}
