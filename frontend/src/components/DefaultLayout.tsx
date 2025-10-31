import { Outlet, Navigate } from "react-router-dom";
import { Box } from "@mui/material";
import AppSidebar from "./AppSidebar";

export default function DefaultLayout() {
  const authed = Boolean(localStorage.getItem("auth_token"));

  if (!authed) return <Navigate to="/" replace />;

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
