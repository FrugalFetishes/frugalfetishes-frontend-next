import { loadSession } from "./session";

/**
 * Frontend API helper used by pages (discover/matches/messages/etc).
 * Keeps behavior consistent:
 * - Adds Bearer token when present
 * - Parses JSON when possible (falls back to raw text)
 * - Returns a normalized error object when HTTP fails
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://express-js-on-vercel-rosy-one.vercel.app";

type ApiError = { ok: false; status?: number; error: string; raw?: any };

function safeParse(text: string): any {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return null;
  }
}

function normalizeError(res: Response, text: string, json: any): ApiError {
  const msg =
    (json && (json.error || json.message)) ||
    (typeof text === "string" && text.trim()) ||
    `HTTP ${res.status}`;
  return { ok: false, status: res.status, error: String(msg), raw: json ?? text };
}

export async function apiGet(path: string) {
  const token = loadSession();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    // Never cache authenticated reads
    cache: "no-store",
  });

  const text = await res.text();
  const json = safeParse(text);

  if (!res.ok) return normalizeError(res, text, json);
  return json ?? { ok: true };
}

export async function apiPost(path: string, body?: any) {
  const token = loadSession();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
  });

  const text = await res.text();
  const json = safeParse(text);

  if (!res.ok) return normalizeError(res, text, json);
  return json ?? { ok: true };
}
