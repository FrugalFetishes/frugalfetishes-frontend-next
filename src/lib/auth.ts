import { apiPost } from "./api";
import { saveSession } from "./session";

export async function startOTP(email: string) {
  return apiPost("/api/auth/start", { email });
}

export async function verifyOTP(email: string, otp: string) {
  const res = await apiPost("/api/auth/verify", { email, otp });

  if (res?.ok) {
    const token = res?.idToken || res?.token || res?.customToken;
    if (token) saveSession(String(token));
  }

  return res;
}
