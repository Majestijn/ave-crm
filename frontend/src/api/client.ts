// Axios client instance - moved from axios-client.ts for better organization
import axios, { type AxiosRequestConfig } from "axios";

/**
 * Determine the API base URL based on the current environment
 * - Development (localhost): uses port 8080
 * - Production: same domain, no port
 */
const getBaseUrl = (): string => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  // Development: localhost with port 8080 for backend
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".lvh.me")
  ) {
    return `${protocol}//${hostname}:8080/api/v1`;
  }

  // Production: same domain, no port (Nginx handles routing)
  return `${protocol}//${hostname}/api/v1`;
};

const axiosInstance = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // If sending FormData, remove Content-Type header so Axios can set it
    // automatically with the correct boundary for multipart/form-data
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
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

        // Get base domain for redirect
        const hostname = window.location.hostname;
        const parts = hostname.split(".");
        let baseDomain = hostname;

        //switch (enumerator)
        if (parts.length === 1) {
          baseDomain = hostname;
        } else if (parts.length === 2 && parts[1] === "localhost") {
          baseDomain = "localhost";
        } else if (parts.length > 2) {
          baseDomain = parts.slice(1).join(".");
        } else if (parts.length === 2) {
          baseDomain = parts[1];
        }

        // Redirect to base domain login page if not already there
        const currentPath = window.location.pathname;
        if (currentPath !== "/" && currentPath !== "/register") {
          const protocol = window.location.protocol;
          const port = window.location.port ? `:${window.location.port}` : "";
          // Use setTimeout to avoid redirect during render
          setTimeout(() => {
            window.location.replace(`${protocol}//${baseDomain}${port}/`);
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

// Typed API client that returns data directly (not AxiosResponse)
const API = {
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    axiosInstance.get(url, config) as Promise<T>,
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    axiosInstance.post(url, data, config) as Promise<T>,
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    axiosInstance.put(url, data, config) as Promise<T>,
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    axiosInstance.patch(url, data, config) as Promise<T>,
  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    axiosInstance.delete(url, config) as Promise<T>,
};

export default API;
