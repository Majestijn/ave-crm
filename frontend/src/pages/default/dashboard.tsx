import React, { useEffect, useMemo, useState } from "react";
import { Typography, Box } from "@mui/material";
import Fade from "@mui/material/Fade";

const Dashboard = () => {
  const [mounted, setMounted] = useState(false);
  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("current_user");
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }, []);

  const name = currentUser?.name || "";

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Fade in={mounted} timeout={300}>
      <Box>
        <Typography variant="h5" component="h1">
          {name ? `Hallo ${name}` : "Dashboard"}
        </Typography>
      </Box>
    </Fade>
  );
};

export default Dashboard;
