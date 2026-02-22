import Box from "@mui/material/Box";
import { Navigate, Outlet } from "react-router-dom";

const GuestLayout = () => {
  const authed = Boolean(localStorage.getItem("auth_token"));
  if (authed) return <Navigate to="/assignments" replace />;
  return (
    <Box
      component="main"
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        p: 2,
      }}
    >
      <Outlet />
    </Box>
  );
};
export default GuestLayout;
