import axios, { AxiosError, AxiosInstance } from "axios";
import { createClient } from "@/lib/supabase/client";

// Types
export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  preferred_name: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Call {
  id: string;
  user_id: string;
  twilio_call_sid: string;
  caller_phone: string;
  direction: 'inbound' | 'outbound';
  status: string;
  duration_seconds: number;
  cost_cents: number;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

export interface ConversationMessage {
  id: string;
  call_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  audio_url: string | null;
  timestamp_ms: number;
  created_at: string;
}

export interface Memory {
  id: string;
  user_id: string;
  call_id: string | null;
  content: string;
  category: 'preference' | 'fact' | 'task' | 'reminder' | 'relationship' | 'other';
  importance_score: number;
  is_active: boolean;
  created_at: string;
}

export interface ScheduledCall {
  id: string;
  user_id: string;
  phone_number: string;
  scheduled_at: string;
  purpose: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'canceled';
  call_id: string | null;
  created_at: string;
}

export interface UserBalance {
  balance_cents: number;
  total_spent_cents: number;
}

export interface Subscription {
  plan: 'free' | 'paid';
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  current_period_end: string | null;
  is_subscribed: boolean;
}

export interface BalanceTransaction {
  id: string;
  user_id: string;
  amount_cents: number;
  type: string;
  description: string | null;
  call_id: string | null;
  created_at: string;
}

export interface UserPhone {
  id: string;
  user_id: string;
  phone_number: string;
  is_verified: boolean;
  is_primary: boolean;
  created_at: string;
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

  update: (data: { email?: string; full_name?: string; preferred_name?: string; avatar_url?: string }) =>
    request<Profile>(() => api.patch("/profile", data)),
};

// Calls API
export const callsApi = {
  list: (params?: { limit?: number; offset?: number }) =>
    request<{ calls: Call[]; total: number }>(() => api.get("/calls", { params })),

  get: (id: string) =>
    request<{ call: Call; messages: ConversationMessage[] }>(() => api.get(`/calls/${id}`)),

  initiate: (phone_number: string) =>
    request<{ success: boolean; call_id: string; call_sid: string }>(() =>
      api.post("/calls/initiate", { phone_number })
    ),
};

// Memories API
export const memoriesApi = {
  list: (params?: { category?: string; search?: string; call_id?: string; limit?: number; offset?: number }) =>
    request<{ memories: Memory[]; total: number }>(() => api.get("/memories", { params })),

  search: (query: string, limit?: number) =>
    request<{ memories: Memory[] }>(() =>
      api.get("/memories/search", { params: { q: query, limit } })
    ),

  get: (id: string) =>
    request<{ memory: Memory }>(() => api.get(`/memories/${id}`)),

  delete: (id: string) =>
    request<{ success: boolean }>(() => api.delete(`/memories/${id}`)),
};

// Billing API
export const billingApi = {
  getBalance: () =>
    request<UserBalance>(() => api.get("/billing/balance")),

  getSubscription: () =>
    request<Subscription>(() => api.get("/billing/subscription")),

  getTransactions: () =>
    request<{ transactions: BalanceTransaction[] }>(() => api.get("/billing/transactions")),

  getSummary: () =>
    request<{
      balance: UserBalance;
      subscription: Subscription;
      recent_transactions: BalanceTransaction[];
    }>(() => api.get("/billing/summary")),

  createCheckout: (plan: string) =>
    request<{ url?: string; error?: string }>(() => api.post("/billing/checkout", { plan })),

  createTopUp: (amount_cents: number) =>
    request<{ url?: string; error?: string }>(() => api.post("/billing/top-up", { amount_cents })),
};

// User Phones API
export const userPhonesApi = {
  list: () =>
    request<{ phones: UserPhone[] }>(() => api.get("/user-phones")),

  add: (phone_number: string) =>
    request<{ success?: boolean; phone?: UserPhone; error?: string }>(() =>
      api.post("/user-phones", { phone_number })
    ),

  sendCode: (phoneId: string) =>
    request<{ success?: boolean; error?: string }>(() =>
      api.post(`/user-phones/${phoneId}/send-code`)
    ),

  verify: (phoneId: string, code: string) =>
    request<{ success?: boolean; error?: string }>(() =>
      api.post(`/user-phones/${phoneId}/verify`, { code })
    ),

  setPrimary: (phoneId: string) =>
    request<{ success?: boolean; error?: string }>(() =>
      api.post(`/user-phones/${phoneId}/set-primary`)
    ),

  delete: (phoneId: string) =>
    request<{ success?: boolean; error?: string }>(() =>
      api.delete(`/user-phones/${phoneId}`)
    ),
};

// Health API
export const healthApi = {
  check: () => request<{ status: string }>(() => api.get("/health")),
};

// Conversation API (ElevenLabs)
export const conversationApi = {
  getSignedUrl: () =>
    request<{ signed_url?: string; error?: string }>(() =>
      api.get("/conversation/signed-url")
    ),

  getToken: () =>
    request<{ token?: string; error?: string }>(() =>
      api.get("/conversation/token")
    ),

  start: () =>
    request<{
      token?: string;
      call_id?: string;
      agent_id?: string;
      context?: { user_name: string; memories: string };
      error?: string;
    }>(() => api.post("/conversation/start")),

  end: (callId: string, durationSeconds: number) =>
    request<{ success?: boolean; cost_cents?: number }>(() =>
      api.post("/conversation/end", {
        call_id: callId,
        duration_seconds: durationSeconds,
      })
    ),

  storeMessage: (callId: string, role: "user" | "assistant", content: string) =>
    request<{ success?: boolean; message_id?: string }>(() =>
      api.post("/conversation/message", { call_id: callId, role, content })
    ),

  linkConversation: (callId: string, conversationId: string) =>
    request<{ success?: boolean }>(() =>
      api.post("/conversation/link", { call_id: callId, conversation_id: conversationId })
    ),
};

// Export the axios instance for custom requests
export { api };
