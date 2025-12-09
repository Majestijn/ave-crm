import React, { useEffect, useState } from "react";
import { Typography, Box } from "@mui/material";
import Fade from "@mui/material/Fade";
import type { User } from "../../types/users";

const Dashboard = () => {
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("current_user");
      if (raw) {
        const parsed = JSON.parse(raw) as User;
        console.log("Dashboard: Loaded user from localStorage:", parsed);
        setCurrentUser(parsed);
      } else {
        console.log("Dashboard: No user found in localStorage");
      }
    } catch (error) {
      console.error("Dashboard: Error parsing user from localStorage:", error);
      setCurrentUser(null);
    }
    setMounted(true);
  }, []);

  const name = currentUser?.name?.trim() || "";
  const displayName = name || currentUser?.email || "";

  return (
    <Fade in={mounted} timeout={300}>
      <Box>
        <Typography variant="h5" component="h1">
          {displayName ? `Hallo ${displayName}` : "Dashboard"}
        </Typography>
      </Box>
    </Fade>
  );
};

export default Dashboard;
