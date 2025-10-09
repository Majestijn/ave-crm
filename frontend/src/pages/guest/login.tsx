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
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useState } from "react";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [transitioning, setTransitioning] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    // Allow login with any saved registration or admin/admin fallback
    try {
      const raw = localStorage.getItem("registered_users");
      const users: Array<{
        email: string;
        password: string;
        name?: string;
        company?: string;
        role?: "admin" | "recruiter";
      }> = raw ? JSON.parse(raw) : [];
      const found = users.find(
        (u) => u.email === email && u.password === password
      );
      if (found) {
        localStorage.setItem("auth_token", "dev-temp-token");
        localStorage.setItem(
          "current_user",
          JSON.stringify({
            email: found.email,
            name: found.name ?? "",
            company: found.company ?? "",
            role: found.role ?? "recruiter",
          })
        );
        setTransitioning(true);
        return;
      }
      if (email === "admin" && password === "admin") {
        localStorage.setItem("auth_token", "dev-temp-token");
        localStorage.setItem(
          "current_user",
          JSON.stringify({
            email: "admin",
            name: "Admin",
            company: "",
            role: "admin",
          })
        );
        setTransitioning(true);
        return;
      }
    } catch (_) {
      // ignore parse errors
    }
    setError("Onjuiste inloggegevens");
  }

  return (
    <Fade
      in={!transitioning}
      timeout={250}
      onExited={() => navigate("/dashboard", { replace: true })}
    >
      <Card variant="outlined" sx={{ width: "100%", maxWidth: 420 }}>
        <CardContent sx={{ p: 3 }}>
          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <Typography variant="h5" component="h1">
                Inloggen
              </Typography>

              <TextField
                label="E-mailadres"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={transitioning}
                fullWidth
                required
                autoComplete="username"
              />

              <TextField
                label="Wachtwoord"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={transitioning}
                fullWidth
                required
                autoComplete="current-password"
              />

              {error && (
                <Typography color="error" variant="body2">
                  {error}
                </Typography>
              )}

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
