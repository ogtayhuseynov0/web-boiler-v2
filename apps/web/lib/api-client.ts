import axios, { AxiosError, AxiosInstance } from "axios";
import { createClient } from "@/lib/supabase/client";

// Types
export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// API Response wrapper
interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

// Create axios instance
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const api: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  async (config) => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; error?: string }>) => {
    if (error.response?.status === 401) {
      console.error("Unauthorized - redirecting to login");
    }
    return Promise.reject(error);
  }
);

// Helper function to wrap API calls
async function request<T>(
  fn: () => Promise<{ data: T }>
): Promise<ApiResponse<T>> {
  try {
    const response = await fn();
    return { data: response.data, error: null };
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;
    const errorMessage =
      axiosError.response?.data?.message ||
      axiosError.response?.data?.error ||
      axiosError.message ||
      "Request failed";
    return { data: null, error: errorMessage };
  }
}

// Profile API
export const profileApi = {
  get: () => request<Profile>(() => api.get("/profile")),

  update: (data: { email?: string; full_name?: string; avatar_url?: string }) =>
    request<Profile>(() => api.patch("/profile", data)),
};

// Health API
export const healthApi = {
  check: () => request<{ status: string }>(() => api.get("/health")),
};

// Export the axios instance for custom requests
export { api };
