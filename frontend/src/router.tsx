import React from "react";
import { createBrowserRouter } from "react-router-dom";
import LoginPage from "./pages/guest/login";
import DefaultLayout from "./components/layout/DefaultLayout";
import Dashboard from "./pages/default/dashboard";
import GuestLayout from "./components/layout/GuestLayout";
import Register from "./pages/guest/register";
import Candidates from "./pages/default/candidates";
import Accounts from "./pages/default/accounts";
import AccountDetail from "./pages/default/account-detail";
import Assignments from "./pages/default/assignments";
import Agenda from "./pages/default/agenda";
import SettingsPage from "./pages/default/settings.tsx";
import Network from "./pages/default/network";
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
      { path: "/accounts", element: <Accounts /> },
      { path: "/accounts/:uid", element: <AccountDetail /> },
      { path: "/assignments", element: <Assignments /> },
      { path: "/agenda", element: <Agenda /> },
      { path: "/network", element: <Network /> },
      { path: "/settings", element: <SettingsPage /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);

export default router;
