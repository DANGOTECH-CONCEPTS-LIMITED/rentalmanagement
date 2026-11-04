import axios from "axios";

// Single shared axios instance: resolves the API base URL once and attaches the
// authenticated user's bearer token from storage on every request.
const baseURL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

export const api = axios.create({
  baseURL,
  headers: { accept: "*/*" },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const apiUrl = baseURL;

export interface StoredUser {
  id?: number;
  token?: string;
  [key: string]: unknown;
}

// Safely parses the authenticated user object from storage, returning null on
// any malformed input instead of throwing.
export function getUser(): StoredUser | null {
  try {
    const stored = localStorage.getItem("user");
    return stored ? (JSON.parse(stored) as StoredUser) : null;
  } catch {
    return null;
  }
}

export function getAuthToken(): string | null {
  return getUser()?.token ?? null;
}
