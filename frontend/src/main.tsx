import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import router from "./router.tsx";

const theme = createTheme({
  palette: {
    primary: { main: "#800400" },
  },
  typography: {
    fontFamily:
      'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>
);
