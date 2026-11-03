import axios from "axios";

// Single shared axios instance: resolves the API base URL once and attaches the
// authenticated user's bearer token from storage on every request.
const baseURL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

export const api = axios.create({
  baseURL,
  headers: { accept: "*/*" },
});

api.interceptors.request.use((config) => {
  try {
    const storedUser = localStorage.getItem("user");
    const token = storedUser ? JSON.parse(storedUser).token : null;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {
    // Ignore malformed storage; requests proceed unauthenticated and the 401
    // interceptor in AuthContext will redirect to sign-in.
  }
  return config;
});

export const apiUrl = baseURL;
