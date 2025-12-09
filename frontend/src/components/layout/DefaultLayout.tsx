import React from "react";
import { useEffect, useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { Box } from "@mui/material";
import AppSidebar from "./AppSidebar";
import API from "../../../axios-client";

export default function DefaultLayout() {
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        setIsAuthenticated(false);
        setIsValidating(false);
        return;
      }

      try {
        // Validate token by calling /auth/me endpoint
        await API.get("/auth/me");
        setIsAuthenticated(true);
      } catch (error: any) {
        // Token is invalid or expired
        console.error("Token validation failed:", error);
        localStorage.removeItem("auth_token");
        localStorage.removeItem("current_user");
        setIsAuthenticated(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, []);

  // Show nothing while validating (prevents flash of content)
  if (isValidating) {
    return null;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppSidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          bgcolor: "background.default",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
