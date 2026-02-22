import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import LoginPage from "./pages/guest/login";
import DefaultLayout from "./components/layout/DefaultLayout";
import Dashboard from "./pages/default/dashboard";
import GuestLayout from "./components/layout/GuestLayout";
import Register from "./pages/guest/register";
import Accounts from "./pages/default/accounts";
import AccountDetail from "./pages/default/account-detail";
import Assignments from "./pages/default/assignments";
import Agenda from "./pages/default/agenda";
import SettingsPage from "./pages/default/settings.tsx";
import Network from "./pages/default/network";
import NotFound from "./pages/not-found";

import ForgotPassword from "./pages/guest/forgot-password";
import ResetPassword from "./pages/guest/reset-password";

const router = createBrowserRouter([
  {
    element: <GuestLayout />,
    children: [
      { path: "/", element: <LoginPage /> },
      { path: "/register", element: <Register /> },
      { path: "/forgot-password", element: <ForgotPassword /> },
      { path: "/reset-password", element: <ResetPassword /> },
    ],
  },
  {
    element: <DefaultLayout />,
    children: [
      { path: "/dashboard", element: <Dashboard /> },
      { path: "/candidates", element: <Navigate to="/network?kandidaten=1" replace /> },
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
