
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  image?: string;
  channelname?: string;
  description?: string;
  plan?: "Free" | "Bronze" | "Silver" | "Gold";
  subscriptionStatus?: "free" | "active" | "canceled" | "expired";
  subscriptionExpiresAt?: string | null;
  themePreference?: "auto" | "light" | "dark";
  lastLoginTheme?: "light" | "dark";
  role?: "user" | "staff";
};

type AuthResponse = {
  message?: string;
  user?: AuthUser;
  requiresOtp?: boolean;
  challengeId?: string;
  maskedEmail?: string;
};

async function authRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Authentication failed.");
  }

  return data;
}

export async function registerUser(
  name: string,
  email: string,
  password: string
) {
  return authRequest("register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export async function loginUser(
  email: string,
  password: string
) {
  return authRequest("login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function googleLoginUser(credential: string) {
  return authRequest("google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
}

export async function getCurrentUser() {
  return authRequest("me", {
    method: "GET",
  });
}

export async function logoutUser() {
  return authRequest("logout", {
    method: "POST",
  });
}

export async function verifyEmailOtp(challengeId: string, otp: string) {
  return authRequest("otp/verify", {
    method: "POST",
    body: JSON.stringify({ challengeId, otp }),
  });
}

export async function resendEmailOtp(challengeId: string) {
  return authRequest("otp/resend", {
    method: "POST",
    body: JSON.stringify({ challengeId }),
  });
}
