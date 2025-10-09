export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

function getToken(): string | null {
  return localStorage.getItem("auth_token"); // optional (voor later auth)
}

export async function httpGET<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    credentials: "omit",
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function httpPOST<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    credentials: "omit",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}
