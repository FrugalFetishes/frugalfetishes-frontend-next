import { apiPost } from "./api";
import { saveSession } from "./session";

export async function startOTP(email: string) {
  return apiPost("/api/auth/start", { email });
}

export async function verifyOTP(email: string, code: string) {
  const res = await apiPost("/api/auth/verify", { email, code });
  if (res?.token) saveSession(res.token);
  return res;
}
