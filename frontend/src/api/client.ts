import axios, { type AxiosRequestConfig } from "axios";

const getBaseUrl = (): string => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".lvh.me")
  ) {
    return `${protocol}//${hostname}:8080/api/v1`;
  }

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
    if (error.response) {
      const status = error.response.status;
      const isAuthError = status === 401;

      if (isAuthError) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("current_user");

        const currentPath = window.location.pathname;
        if (currentPath !== "/" && currentPath !== "/register") {
          setTimeout(() => {
            window.location.replace("/");
          }, 100);
        }
      }
    } else if (error.request) {
      console.error("Network error:", error.request);
    }

    return Promise.reject(error);
  }
);

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
