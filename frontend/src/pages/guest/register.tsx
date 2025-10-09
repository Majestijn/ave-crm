import React, { useMemo, useState } from "react";
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

function isValidEmail(email: string): boolean {
  // Basic email regex for common cases
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isStrongPassword(password: string): boolean {
  // At least 8 chars, with at least one number and one special char
  const strongRegex = /^(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/;
  return strongRegex.test(password);
}

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailTaken, setEmailTaken] = useState(false);

  const [touched, setTouched] = useState({
    email: false,
    company: false,
    name: false,
    password: false,
    confirmPassword: false,
  });

  const [submitted, setSubmitted] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const emailError = (touched.email || submitted) && !isValidEmail(email);
  const companyError =
    (touched.company || submitted) && company.trim().length === 0;
  const nameError = (touched.name || submitted) && name.trim().length === 0;
  const passwordError =
    (touched.password || submitted) && !isStrongPassword(password);
  const confirmError =
    (touched.confirmPassword || submitted) &&
    (confirmPassword !== password || confirmPassword.length === 0);

  const formValid =
    isValidEmail(email) &&
    company.trim().length > 0 &&
    name.trim().length > 0 &&
    isStrongPassword(password) &&
    confirmPassword === password;

  const passwordChecklist = useMemo(() => {
    const hasMinLength = password.length >= 8;
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    return { hasMinLength, hasNumber, hasSpecial };
  }, [password]);

  function handleBlur(field: keyof typeof touched) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setEmailTaken(false);
    if (!formValid) return;
    try {
      const raw = localStorage.getItem("registered_users");
      const users: Array<{
        email: string;
        password: string;
        company: string;
        name: string;
      }> = raw ? JSON.parse(raw) : [];
      const exists = users.some(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );
      if (exists) {
        setEmailTaken(true);
        return;
      }
      const newUser = {
        email,
        password,
        company: company.trim(),
        name: name.trim(),
        role: "admin",
      };
      users.push(newUser);
      localStorage.setItem("registered_users", JSON.stringify(users));

      // Auto-login and redirect
      localStorage.setItem("auth_token", "dev-temp-token");
      localStorage.setItem(
        "current_user",
        JSON.stringify({
          email,
          name: name.trim(),
          company: company.trim(),
          role: "admin",
        })
      );
      setSuccessOpen(true);
      navigate("/dashboard", { replace: true });
    } catch (_) {
      setSuccessOpen(true);
    }
  }

  return (
    <Card variant="outlined" sx={{ width: "100%", maxWidth: 520 }}>
      <CardContent sx={{ p: 3 }}>
        <form onSubmit={handleSubmit} noValidate>
          <Stack spacing={2}>
            <Typography variant="h5" component="h1">
              Registreren
            </Typography>

            <TextField
              label="E-mailadres"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => handleBlur("email")}
              error={Boolean(emailError || emailTaken)}
              helperText={
                emailTaken
                  ? "Dit e-mailadres is al in gebruik"
                  : emailError
                  ? "Voer een geldig e-mailadres in"
                  : " "
              }
              autoComplete="email"
              required
              fullWidth
            />

            <TextField
              label="Bedrijfsnaam"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              onBlur={() => handleBlur("company")}
              error={Boolean(companyError)}
              helperText={companyError ? "Bedrijfsnaam is verplicht" : " "}
              autoComplete="organization"
              required
              fullWidth
            />

            <TextField
              label="Naam"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => handleBlur("name")}
              error={Boolean(nameError)}
              helperText={nameError ? "Naam is verplicht" : " "}
              autoComplete="name"
              required
              fullWidth
            />

            <TextField
              label="Wachtwoord"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => handleBlur("password")}
              error={Boolean(passwordError)}
              helperText={
                passwordError
                  ? "Min. 8 tekens, incl. 1 cijfer en 1 speciaal teken"
                  : "Min. 8 tekens, incl. 1 cijfer en 1 speciaal teken"
              }
              autoComplete="new-password"
              required
              fullWidth
            />

            {/* Live password checklist */}
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
              label="Wachtwoord herhalen"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => handleBlur("confirmPassword")}
              error={Boolean(confirmError)}
              helperText={
                confirmError ? "Wachtwoorden komen niet overeen" : " "
              }
              autoComplete="new-password"
              required
              fullWidth
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={!formValid && submitted}
            >
              Account aanmaken
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
        open={successOpen}
        autoHideDuration={3000}
        onClose={() => setSuccessOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSuccessOpen(false)}
          severity="success"
          sx={{ width: "100%" }}
        >
          Registratie geslaagd! Je kunt nu inloggen.
        </Alert>
      </Snackbar>
    </Card>
  );
}
