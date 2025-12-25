import { apiPost } from "./api";
import { saveSession } from "./session";

export async function startOTP(email: string) {
  // Backend expects: { email }
  return apiPost("/api/auth/start", { email });
}

export async function verifyOTP(email: string, otp: string) {
  // Backend accepts otp via `otp` OR `code`
  const res = await apiPost("/api/auth/verify", { email, otp });

  if (res?.ok) {
    const token = res?.idToken || res?.token || res?.customToken;
    if (token) saveSession(String(token));
  }

  return res;
}
