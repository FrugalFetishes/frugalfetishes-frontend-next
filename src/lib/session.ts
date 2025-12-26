// src/lib/session.ts
"use client";

// Minimal session utilities for client-side auth token storage.
// This file provides COMPAT exports for older imports (readSession, requireSession).

const KEY = "ff_session_token_v1";

export function saveSession(token: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, token);
  } catch {}
}

export function loadSession(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
}

// ---- COMPAT EXPORTS ----

// Some pages import readSession()
export function readSession(): string | null {
  return loadSession();
}

// Some pages import requireSession() which should redirect in the caller.
// We return token or null; caller decides redirect.
export function requireSession(): string | null {
  return loadSession();
}
