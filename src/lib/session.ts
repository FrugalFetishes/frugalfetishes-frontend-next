const KEY = "ff_session";

export function saveSession(token: string) {
  localStorage.setItem(KEY, token);
}

export function loadSession(): string | null {
  return localStorage.getItem(KEY);
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

/**
 * Client-side auth guard.
 * Returns the stored token (string) or redirects to /login and returns null.
 *
 * Use inside client components:
 *   const token = requireSession();
 *   if (!token) return null;
 */
export function requireSession(): string | null {
  // localStorage only exists in the browser
  if (typeof window === "undefined") return null;

  const token = loadSession();
  if (!token) {
    window.location.href = "/login";
    return null;
  }
  return token;
}
