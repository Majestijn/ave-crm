import { createBrowserRouter } from "react-router-dom";
import LoginPage from "./pages/guest/login";
import DefaultLayout from "./components/DefaultLayout";
import Dashboard from "./pages/default/dashboard";
import GuestLayout from "./components/GuestLayout";
import Register from "./pages/guest/register";
import Candidates from "./pages/default/candidates";
import SettingsPage from "./pages/default/settings.tsx";
import NotFound from "./pages/not-found";

const router = createBrowserRouter([
  {
    element: <GuestLayout />,
    children: [
      { path: "/", element: <LoginPage /> },
      { path: "/register", element: <Register /> },
    ],
  },
  {
    element: <DefaultLayout />,
    children: [
      { path: "/dashboard", element: <Dashboard /> },
      { path: "/candidates", element: <Candidates /> },
      { path: "/settings", element: <SettingsPage /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);

export default router;
