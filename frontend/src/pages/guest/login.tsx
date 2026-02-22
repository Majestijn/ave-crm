import {
  Card,
  CardContent,
  CardActions,
  TextField,
  Button,
  Typography,
  Stack,
  Link,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import Fade from "@mui/material/Fade";
import React from "react";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { json, z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import API from "../../../axios-client";
import type { User } from "../../types/users";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().optional(),
});

type LoginForm = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false);
  const [findingTenant, setFindingTenant] = useState(false);

  // Get the base domain from environment or derive from hostname
  const getBaseDomain = (): string => {
    const envBaseDomain = import.meta.env.VITE_BASE_DOMAIN;
    if (envBaseDomain) {
      return envBaseDomain;
    }
    
    const hostname = window.location.hostname;
    const parts = hostname.split(".");
    
    // localhost → localhost
    if (parts.length === 1) {
      return hostname;
    }
    
    // tenant1.localhost → localhost
    if (parts.length === 2 && parts[1] === "localhost") {
      return "localhost";
    }
    
    // tenant1.ave-crm.nl → ave-crm.nl
    if (parts.length >= 2) {
      return parts.slice(-2).join(".");
    }
    
    return hostname;
  };

  // Check if we're on a tenant subdomain vs the base domain
  // Base domain: ave-crm.nl, localhost
  // Tenant domain: tenant1.ave-crm.nl, tenant1.localhost
  const isTenantDomain = (): boolean => {
    const hostname = window.location.hostname;
    const baseDomain = getBaseDomain();
    
    // If hostname equals base domain, we're on the base domain (not a tenant)
    if (hostname === baseDomain) {
      return false;
    }
    
    // If hostname ends with base domain, we're on a tenant subdomain
    if (hostname.endsWith(`.${baseDomain}`)) {
      return true;
    }
    
    // Fallback: check hostname structure
    const parts = hostname.split(".");
    
    // Single part = base domain
    if (parts.length === 1) {
      return false;
    }
    
    // tenant1.localhost = tenant domain
    if (parts.length === 2 && parts[1] === "localhost") {
      return true;
    }
    
    // 3+ parts like tenant1.ave-crm.nl = tenant domain
    if (parts.length > 2) {
      return true;
    }
    
    return false;
  };

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(LoginSchema),
    mode: "onBlur",
  });

  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    // Clear any stale tokens from base domain localStorage
    // This prevents issues where registration saved a token to base domain
    if (!isTenantDomain()) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("current_user");
    }

    // Check for auth token in URL hash (from registration auto-login)
    // This happens when user registers on base domain and gets redirected to tenant domain
    if (isTenantDomain()) {
      const hash = window.location.hash;
      const hashParams = new URLSearchParams(hash.substring(1)); // Remove '#'
      const tokenFromHash = hashParams.get("token");
      const userFromHash = hashParams.get("user");
      
      if (tokenFromHash && userFromHash) {
        try {
          // Decode and save to localStorage
          const token = decodeURIComponent(tokenFromHash);
          const user = JSON.parse(decodeURIComponent(userFromHash));
          
          localStorage.setItem("auth_token", token);
          localStorage.setItem("current_user", JSON.stringify(user));
          
          // Clear hash from URL
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
          
          // Redirect to opdrachten (auto-login)
          navigate("/assignments", { replace: true });
          return;
        } catch (error) {
          console.error("Error processing auth from hash:", error);
          // Clear invalid hash
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
      }
    }

    // Check if we're coming from successful registration
    if (searchParams.get("registered") === "true") {
      setShowRegistrationSuccess(true);
      // Remove the query parameter from URL
      setSearchParams({}, { replace: true });
    }

    // Pre-fill email if coming from base domain redirect
    const emailParam = searchParams.get("email");
    if (emailParam && isTenantDomain()) {
      setValue("email", emailParam);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, setValue, navigate]);

  const handleEmailBlur = async (email: string) => {
    // Only check tenant if on base domain and email is valid
    if (!isTenantDomain() && email && email.includes("@")) {
      setFindingTenant(true);
      try {
        const response = (await API.post("/auth/find-tenant", { email })) as { domain: string };
        if (response.domain) {
          // Redirect to tenant domain
          const protocol = window.location.protocol;
          const port = window.location.port ? `:${window.location.port}` : "";
          // Preserve email in URL params so it can be pre-filled on tenant domain
          window.location.href = `${protocol}//${response.domain}${port}/?email=${encodeURIComponent(email)}`;
        }
      } catch (error: any) {
        // If tenant not found, show error
        if (error.response?.status === 422) {
          setError("email", {
            type: "server",
            message: error.response.data?.message || "Geen account gevonden met dit e-mailadres.",
          });
        }
      } finally {
        setFindingTenant(false);
      }
    }
  };

  const onSubmit = async (data: LoginForm) => {
    // If on base domain, find tenant first
    if (!isTenantDomain()) {
      await handleEmailBlur(data.email);
      return;
    }

    // On tenant domain, password is required
    if (!data.password) {
      setError("password", {
        type: "required",
        message: "Wachtwoord is verplicht",
      });
      return;
    }

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
      if (e.response?.status === 422) {
        const errors = e.response.data?.errors || {};
        Object.entries(errors).forEach(([field, messages]: [string, any]) => {
          setError(field as keyof LoginForm, {
            type: "server",
            message: Array.isArray(messages) ? messages[0] : messages,
          });
        });
      } else {
        setError("root", {
          type: "server",
          message: "Er is iets misgegaan. Probeer het opnieuw.",
        });
      }
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
    <>
      <Fade
        in={!transitioning}
        timeout={250}
        onExited={() => navigate("/assignments", { replace: true })}
      >
        <Card variant="outlined" sx={{ width: "100%", maxWidth: 420 }}>
          <CardContent sx={{ p: 3 }}>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <Stack spacing={2}>
                <Typography variant="h5" component="h1">
                  Inloggen
                </Typography>

                {!isTenantDomain() && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Voer uw e-mailadres in om naar uw organisatie te worden doorgestuurd.
                  </Typography>
                )}

                <TextField
                  label="E-mailadres"
                  type="text"
                  fullWidth
                  required
                  error={!!errors.email}
                  helperText={errors.email?.message ?? " "}
                  {...register("email", {
                    onBlur: (e) => {
                      if (!isTenantDomain() && e.target.value) {
                        handleEmailBlur(e.target.value);
                      }
                    },
                  })}
                  disabled={transitioning || findingTenant}
                  InputProps={{
                    endAdornment: findingTenant ? (
                      <CircularProgress size={20} />
                    ) : null,
                  }}
                />

                {isTenantDomain() && (
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
                )}

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={transitioning || findingTenant}
                >
                  {findingTenant ? "Zoeken..." : !isTenantDomain() ? "Zoek organisatie" : "Log in"}
                </Button>

                <Button
                  type="button"
                  variant="outlined"
                  fullWidth
                  disabled={transitioning}
                  onClick={() => {
                    setValue("email", "admin@aveconsult.nl");
                    setValue("password", "Aveconsult1!");
                  }}
                  sx={{ 
                    mt: 1,
                    borderColor: "warning.main",
                    color: "warning.main",
                    "&:hover": {
                      borderColor: "warning.dark",
                      backgroundColor: "warning.light",
                    }
                  }}
                >
                  🐛 Debug: Vul test credentials in
                </Button>

                <Typography variant="body2" sx={{ textAlign: "center" }}>
                  Nog geen account?{" "}
                  {isTenantDomain() ? (
                    <Link
                      component="button"
                      onClick={(e) => {
                        e.preventDefault();
                        const protocol = window.location.protocol;
                        const port = window.location.port ? `:${window.location.port}` : "";
                        window.location.href = `${protocol}//${getBaseDomain()}${port}/register`;
                      }}
                      sx={{ cursor: "pointer" }}
                    >
                      Registreer nieuw account
                    </Link>
                  ) : (
                    <Link component={RouterLink} to="/register">
                      Registreer
                    </Link>
                  )}
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

      <Snackbar
        open={showRegistrationSuccess}
        autoHideDuration={5000}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        onClose={() => setShowRegistrationSuccess(false)}
      >
        <Alert severity="success" sx={{ width: "100%" }}>
          Registratie geslaagd! Je kunt nu inloggen.
        </Alert>
      </Snackbar>
    </>
  );
}
