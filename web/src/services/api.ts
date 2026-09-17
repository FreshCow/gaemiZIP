import axios from "axios";
import { getToken } from "@/lib/authStorage";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api",
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token && !config.headers.has("Authorization")) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
