import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 1500000, // 5 minutes timeout to allow for AGI agent requests that may take longer
});

export interface AgentResponse {
  action: string;
  summary: string;
  details: any;
  originalInput?: string;
  routedAgent?: string;
  intent?: string;
  confidence?: number;
  status?: string;
  sessionId?: string;
  task?: string;
  product?: string;
  retailers?: string[];
  productName?: string;
}

export interface Dentist {
  id: number;
  name: string;
  practice: string;
  phone: string;
  address: string;
  availability: string[];
}

export interface Subscription {
  id: number;
  name: string;
  amount: number;
  frequency: string;
  nextBillingDate: string;
  status: string;
}

export interface Transaction {
  id: number;
  date: string;
  merchant: string;
  amount: number;
  category: string;
  status: string;
  suspicious: boolean;
}

// Unified Agent endpoint - routes to appropriate agent automatically
export const sendAgentRequest = async (
  input: string,
  userId?: string,
  pollInterval?: number,
  maxWaitTime?: number,
  conversationHistory?: Array<{ role: string; content: string }>
): Promise<AgentResponse> => {
  try {
    const response = await api.post("/api/agent", {
      input,
      userId,
      pollInterval,
      maxWaitTime,
      conversationHistory,
    });
    return response.data;
  } catch (error: any) {
    // Handle network/connection errors
    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      throw new Error(
        "Unable to connect to the server. Please make sure the backend is running."
      );
    }
    // Handle timeout errors more gracefully
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      throw new Error(
        "The request is taking longer than expected. The server is still processing your request. Please wait or try again."
      );
    }
    // If the backend returned an error response, preserve it
    if (error.response?.data) {
      // The backend already formatted the error, so we can throw it as-is
      // This will be caught by the frontend error handler
      throw error;
    }
    // Re-throw other errors
    throw error;
  }
};

// Legacy agent endpoint (kept for backward compatibility)
export const sendLegacyAgentRequest = async (
  input: string
): Promise<AgentResponse> => {
  const response = await api.post("/agent", { input });
  return response.data;
};

// Schedule dentist
export const scheduleDentist = async (data: {
  preferredDate?: string;
  preferredTime?: string;
  reason: string;
}) => {
  const response = await api.post("/api/schedule-dentist", data);
  return response.data;
};

// Cancel subscription
export const cancelSubscription = async (data: {
  subscriptionName: string;
  reason?: string;
}) => {
  const response = await api.post("/api/cancel-subscription", data);
  return response.data;
};

// Dispute charge
export const disputeCharge = async (data: {
  transactionId: string;
  amount: number;
  reason: string;
}) => {
  const response = await api.post("/api/dispute-charge", data);
  return response.data;
};

// Get data
export const getDentists = async (): Promise<Dentist[]> => {
  const response = await api.get("/api/dentists");
  return response.data;
};

export const getSubscriptions = async (): Promise<Subscription[]> => {
  const response = await api.get("/api/subscriptions");
  return response.data;
};

export const getTransactions = async (): Promise<Transaction[]> => {
  const response = await api.get("/api/transactions");
  return response.data;
};

// ============= NEW ENHANCED API METHODS =============

// User Management
export interface User {
  id: string;
  email: string;
  phone?: string;
  name: string;
  preferences: {
    timezone: string;
    notificationEmail: boolean;
    notificationSMS: boolean;
    autoApproveAfterTraining: boolean;
    trainingRounds: number;
  };
  trustLevel: "new" | "training" | "trusted" | "autonomous";
  linkedAccounts: {
    email: { linked: boolean; provider: string | null };
    phone: { linked: boolean; verified: boolean };
    calendar: { linked: boolean; provider: string | null };
  };
  createdAt: string;
  lastActive: string;
}

export const createUser = async (data: {
  email: string;
  phone?: string;
  name: string;
}): Promise<{ user: User; message: string }> => {
  const response = await api.post("/api/users", data);
  return response.data;
};

export const getUser = async (userId: string): Promise<User> => {
  const response = await api.get(`/api/users/${userId}`);
  return response.data;
};

export const updateUser = async (
  userId: string,
  updates: Partial<User>
): Promise<{ user: User; message: string }> => {
  const response = await api.put(`/api/users/${userId}`, updates);
  return response.data;
};

// Action Management with Confirmation Flow
export interface ActionPlan {
  actionId: string;
  requiresApproval: boolean;
  plan: {
    summary: string;
    steps: Array<{ number: number; description: string; details: string }>;
    assumptions: string[];
    estimatedTime: string;
    confidence: number;
  };
  trustLevel: string;
  message: string;
}

export interface ActionStatus {
  actionId: string;
  status:
    | "pending_approval"
    | "approved"
    | "executing"
    | "completed"
    | "failed"
    | "cancelled";
  type: string;
  plan: any[];
  executedSteps: any[];
  result: any;
  createdAt: string;
  completedAt: string | null;
  feedback: any;
}

export const createActionPlan = async (
  userId: string,
  actionType: string,
  input: string
): Promise<ActionPlan> => {
  const response = await api.post("/api/agent", { userId, actionType, input });
  return response.data;
};

export const approveAction = async (
  actionId: string,
  userId: string,
  modifications?: any
) => {
  const response = await api.post(`/api/actions/${actionId}/approve`, {
    userId,
    modifications,
  });
  return response.data;
};

export const rejectAction = async (
  actionId: string,
  userId: string,
  reason: string
) => {
  const response = await api.post(`/api/actions/${actionId}/reject`, {
    userId,
    reason,
  });
  return response.data;
};

export const executeAction = async (actionId: string) => {
  const response = await api.post(`/api/actions/${actionId}/execute`);
  return response.data;
};

export const getActionStatus = async (
  actionId: string,
  userId: string
): Promise<ActionStatus> => {
  const response = await api.get(`/api/actions/${actionId}?userId=${userId}`);
  return response.data;
};

export const getUserActions = async (userId: string) => {
  const response = await api.get(`/api/users/${userId}/actions`);
  return response.data;
};

// Feedback System
export const submitFeedback = async (data: {
  userId: string;
  actionId: string;
  rating: number;
  wasCorrect: boolean;
  comment?: string;
  corrections?: any;
  mistakeType?: string;
}) => {
  const response = await api.post("/api/feedback", data);
  return response.data;
};

export const getUserPreferences = async (userId: string) => {
  const response = await api.get(`/api/users/${userId}/preferences`);
  return response.data;
};

export const getMistakeAnalysis = async (userId: string) => {
  const response = await api.get(`/api/users/${userId}/mistake-analysis`);
  return response.data;
};

export const getFeedbackSummary = async (userId: string) => {
  const response = await api.get(`/api/users/${userId}/feedback-summary`);
  return response.data;
};

// Memory & Reminders
export const analyzePatterns = async (userId: string) => {
  const response = await api.post(`/api/users/${userId}/analyze-patterns`);
  return response.data;
};

export const getUpcomingReminders = async (userId: string, daysAhead = 30) => {
  const response = await api.get(
    `/api/users/${userId}/reminders?daysAhead=${daysAhead}`
  );
  return response.data;
};

export const getProactiveSuggestions = async (userId: string) => {
  const response = await api.get(`/api/users/${userId}/proactive-suggestions`);
  return response.data;
};

export const createMemory = async (data: {
  userId: string;
  type: string;
  category: string;
  title: string;
  description: string;
  pattern?: any;
  nextTrigger?: string;
  metadata?: any;
}) => {
  const response = await api.post("/api/memories", data);
  return response.data;
};

export const getUserMemories = async (userId: string) => {
  const response = await api.get(`/api/users/${userId}/memories`);
  return response.data;
};

export const updateMemory = async (
  memoryId: string,
  userId: string,
  updates: any
) => {
  const response = await api.put(`/api/memories/${memoryId}`, {
    userId,
    ...updates,
  });
  return response.data;
};

// Integration
export const linkEmail = async (
  userId: string,
  email: string,
  provider: string
) => {
  const response = await api.post(`/api/users/${userId}/link-email`, {
    email,
    provider,
  });
  return response.data;
};

export const linkPhone = async (userId: string, phone: string) => {
  const response = await api.post(`/api/users/${userId}/link-phone`, { phone });
  return response.data;
};

export const verifyPhone = async (userId: string, code: string) => {
  const response = await api.post(`/api/users/${userId}/verify-phone`, {
    code,
  });
  return response.data;
};
