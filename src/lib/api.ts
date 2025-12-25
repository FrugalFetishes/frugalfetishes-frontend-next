import { loadSession } from "./session";

export const API_BASE = "https://express-js-on-vercel-rosy-one.vercel.app";

export async function apiGet(path: string) {
  const token = loadSession();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { ok: false, error: text }; }

  if (!res.ok) return { ok: false, status: res.status, error: json?.error || text || `HTTP ${res.status}` };
  return json;
}

export async function apiPost(path: string, body: any) {
  const token = loadSession();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body ?? {})
  });

  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { ok: false, error: text }; }

  if (!res.ok) return { ok: false, status: res.status, error: json?.error || text || `HTTP ${res.status}` };
  return json;
}
