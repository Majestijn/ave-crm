import axios from "axios";

const API = axios.create({
  baseURL: `${window.location.protocol}//${window.location.hostname}:8080/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
});

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

API.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Handle authentication errors (401 Unauthorized, 403 Forbidden)
    if (error.response) {
      const status = error.response.status;
      const errorMessage = error.response.data?.message || "";

      const isAuthError = status === 401; // Only logout on 401, not 403 (permission denied)
      const isDatabaseError =
        status === 500 &&
        (errorMessage.includes("database") ||
          errorMessage.includes("does not exist") ||
          errorMessage.includes("connection"));

      if (isAuthError) {
        // Clear authentication data
        localStorage.removeItem("auth_token");
        localStorage.removeItem("current_user");

        // Redirect to login page if not already there
        // Use a small delay to avoid redirect loops
        const currentPath = window.location.pathname;
        if (currentPath !== "/" && currentPath !== "/register") {
          // Use setTimeout to avoid redirect during render
          setTimeout(() => {
            window.location.href = "/";
          }, 100);
        }
      }
    } else if (error.request) {
      // Network error - request was made but no response received
      // Could be database connection issue
      console.error("Network error:", error.request);
    }

    // Re-throw the error so components can handle it if needed
    return Promise.reject(error);
  }
);

export default API;
