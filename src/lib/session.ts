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
