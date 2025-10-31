import {
  Drawer,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
} from "@mui/material";
import { NavLink, useNavigate } from "react-router-dom";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import API from "../../axios-client";

const drawerWidth = 260;

const navItems = [
  { label: "Kandidaten", to: "/candidates", icon: <PeopleOutlineIcon /> },
  {
    label: "Opdrachten",
    to: "/assignments",
    icon: <AssignmentTurnedInOutlinedIcon />,
  },
  { label: "Klanten", to: "/clients", icon: <BusinessOutlinedIcon /> },
  { label: "Agenda", to: "/agenda", icon: <CalendarMonthOutlinedIcon /> },
];

const bottomItems = [
  { label: "Instellingen", to: "/settings", icon: <SettingsOutlinedIcon /> },
];

export default function AppSidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await API.post("/auth/logout")
      .then(() => {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("current_user");
        navigate("/", { replace: true });
      })
      .catch((error) => console.log(error));
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          borderRight: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        },
      }}
    >
      {/* Brand / Logo */}
      <Box sx={{ px: 2, py: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          AVE Consultancy
        </Typography>
      </Box>

      <Divider />

      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* TOP NAV — center the entire list group vertically */}
        <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}>
          <List sx={{ px: 1.5, pt: 0, width: "100%" }}>
            {navItems.map((item) => (
              <ListItem key={item.to} disablePadding sx={{ mb: 0.5 }}>
                <NavLink
                  to={item.to}
                  style={{ textDecoration: "none", width: "100%" }}
                >
                  {({ isActive }) => (
                    <ListItemButton
                      selected={isActive}
                      sx={{
                        borderRadius: 1.5,
                        px: 1.5,
                        "& .MuiListItemIcon-root": { color: "text.secondary" },
                        "&.Mui-selected": {
                          bgcolor: "primary.main",
                          color: "primary.contrastText",
                          "& .MuiListItemIcon-root": {
                            color: "primary.contrastText",
                          },
                          "&:hover": { bgcolor: "primary.dark" },
                        },
                        "&:hover": { bgcolor: "action.hover" },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText primary={item.label} />
                    </ListItemButton>
                  )}
                </NavLink>
              </ListItem>
            ))}
          </List>
        </Box>

        {/* BOTTOM (anchored) */}
        <List sx={{ px: 1.5, pb: 1.5 }}>
          {bottomItems.map((item) => (
            <ListItem key={item.to} disablePadding sx={{ mb: 0.5 }}>
              <NavLink
                to={item.to}
                style={{ textDecoration: "none", width: "100%" }}
              >
                {({ isActive }) => (
                  <ListItemButton
                    selected={isActive}
                    sx={{
                      borderRadius: 1.5,
                      px: 1.5,
                      "& .MuiListItemIcon-root": { color: "text.secondary" },
                      "&.Mui-selected": {
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                        "& .MuiListItemIcon-root": {
                          color: "primary.contrastText",
                        },
                        "&:hover": { bgcolor: "primary.dark" },
                      },
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                )}
              </NavLink>
            </ListItem>
          ))}

          {/* Logout */}
          <ListItem disablePadding>
            <ListItemButton
              onClick={handleLogout}
              sx={{
                borderRadius: 1.5,
                px: 1.5,
                "& .MuiListItemIcon-root": { color: "text.secondary" },
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <LogoutOutlinedIcon />
              </ListItemIcon>
              <ListItemText primary="Uitloggen" />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );
}
