"use client";

type Decision = "like" | "pass";
export type MatchSummary = {
  matchId: string;
  otherUserId: string;
  createdAt: number;
};

export type ChatMessage = {
  id: string;
  fromUserId: string;
  text: string;
  ts: number;
};

const KEY_PREFIX = "ff_";
const NEW_MATCH_KEY = (uid: string) => `${KEY_PREFIX}newmatches:${uid}`; // JSON string[]
const UNREAD_KEY = (uid: string) => `${KEY_PREFIX}unread:${uid}`; // JSON Record<chatId, number>
const MATCH_KEY = (matchId: string) => `${KEY_PREFIX}match:${matchId}`; // JSON {a,b,createdAt}
const CHAT_KEY = (matchId: string) => `${KEY_PREFIX}chat:${matchId}`; // JSON ChatMessage[]
const LIKE_KEY = (fromUid: string, toUid: string) => `${KEY_PREFIX}like:${fromUid}:${toUid}`; // "1"
const PROFILE_KEY = (uid: string) => `${KEY_PREFIX}profile:${uid}`; // JSON partial profile overrides (headline/about/zip)

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function uidFromToken(token: string | null | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(b64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(json) as any;
    return (
      payload?.uid ||
      payload?.user_id ||
      payload?.sub ||
      payload?.id ||
      payload?.firebase?.identities?.email?.[0] ||
      null
    );
  } catch {
    return null;
  }
}

function matchIdFor(a: string, b: string): string {
  return [a, b].sort().join("__");
}

export function recordDecisionLocal(fromUid: string, toUid: string, decision: Decision) {
  if (!fromUid || !toUid) return { matched: false as const, matchId: null as string | null };

  if (decision === "like") {
    localStorage.setItem(LIKE_KEY(fromUid, toUid), "1");

    // Mutual like?
    const mutual = localStorage.getItem(LIKE_KEY(toUid, fromUid)) === "1";
    if (mutual) {
      const matchId = matchIdFor(fromUid, toUid);
      const existing = localStorage.getItem(MATCH_KEY(matchId));
      if (!existing) {
        localStorage.setItem(
          MATCH_KEY(matchId),
          JSON.stringify({ a: fromUid, b: toUid, createdAt: Date.now() })
        );
        // mark as "new match" for both users
        addNewMatchFor(fromUid, matchId);
        addNewMatchFor(toUid, matchId);
      }
      return { matched: true as const, matchId };
    }
  }

  // pass: no-op locally
  return { matched: false as const, matchId: null };
}

function addNewMatchFor(uid: string, matchId: string) {
  const list = safeJsonParse<string[]>(localStorage.getItem(NEW_MATCH_KEY(uid)), []);
  if (!list.includes(matchId)) {
    list.unshift(matchId);
    localStorage.setItem(NEW_MATCH_KEY(uid), JSON.stringify(list));
  }
}

export function consumeNewMatches(uid: string): string[] {
  const list = safeJsonParse<string[]>(localStorage.getItem(NEW_MATCH_KEY(uid)), []);
  localStorage.setItem(NEW_MATCH_KEY(uid), JSON.stringify([]));
  return list;
}

export function getUnreadMap(uid: string): Record<string, number> {
  return safeJsonParse<Record<string, number>>(localStorage.getItem(UNREAD_KEY(uid)), {});
}

export function setUnreadCount(uid: string, matchId: string, count: number) {
  const map = getUnreadMap(uid);
  if (count <= 0) delete map[matchId];
  else map[matchId] = count;
  localStorage.setItem(UNREAD_KEY(uid), JSON.stringify(map));
}

export function incrementUnread(uid: string, matchId: string, delta: number) {
  const map = getUnreadMap(uid);
  const next = (map[matchId] || 0) + delta;
  if (next <= 0) delete map[matchId];
  else map[matchId] = next;
  localStorage.setItem(UNREAD_KEY(uid), JSON.stringify(map));
}

export function badgeCounts(uid: string) {
  const newMatches = safeJsonParse<string[]>(localStorage.getItem(NEW_MATCH_KEY(uid)), []).length;
  const unread = Object.values(getUnreadMap(uid)).reduce((a, b) => a + b, 0);
  return { newMatches, unreadMessages: unread };
}

export function listMatchesFor(uid: string): MatchSummary[] {
  const out: MatchSummary[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(`${KEY_PREFIX}match:`)) continue;
    const matchId = k.substring(`${KEY_PREFIX}match:`.length);
    const raw = localStorage.getItem(k);
    const m = safeJsonParse<any>(raw, null);
    if (!m) continue;
    if (m.a === uid || m.b === uid) {
      const other = m.a === uid ? m.b : m.a;
      out.push({ matchId, otherUserId: other, createdAt: m.createdAt || 0 });
    }
  }
  out.sort((a, b) => b.createdAt - a.createdAt);
  return out;
}

export function getChat(matchId: string): ChatMessage[] {
  return safeJsonParse<ChatMessage[]>(localStorage.getItem(CHAT_KEY(matchId)), []);
}

export function addChatMessage(matchId: string, msg: Omit<ChatMessage, "id" | "ts">) {
  const list = getChat(matchId);
  const next: ChatMessage = { id: crypto.randomUUID(), ts: Date.now(), ...msg };
  list.push(next);
  localStorage.setItem(CHAT_KEY(matchId), JSON.stringify(list));
  return next;
}

export function clearUnreadForChat(uid: string, matchId: string) {
  setUnreadCount(uid, matchId, 0);
}

export function getProfileExtras(uid: string): { headline?: string; about?: string; zip?: string } {
  return safeJsonParse<any>(localStorage.getItem(PROFILE_KEY(uid)), {});
}

export function setProfileExtras(uid: string, extras: { headline?: string; about?: string; zip?: string }) {
  const cur = getProfileExtras(uid);
  const next = { ...cur, ...extras };
  localStorage.setItem(PROFILE_KEY(uid), JSON.stringify(next));
}


const USER_PROFILE_KEY = (uid: string) => `${KEY_PREFIX}userprofile:${uid}`; // JSON snapshot

export function saveUserProfileSnapshot(uid: string, profile: any) {
  if (!uid) return;
  try {
    localStorage.setItem(USER_PROFILE_KEY(uid), JSON.stringify(profile));
  } catch {}
}

export function loadUserProfileSnapshot(uid: string): any | null {
  return safeJsonParse<any>(localStorage.getItem(USER_PROFILE_KEY(uid)), null);
}
