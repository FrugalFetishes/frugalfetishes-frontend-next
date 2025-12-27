'use client';

type ProfileSnapshot = {
  id: string;
  displayName?: string;
  fullName?: string;
  email?: string;
  photoUrl?: string;
  updatedAt?: number;
};

export type Match = {
  id: string;
  a: string; // uid A
  b: string; // uid B
  createdAt: number;
};

export type Message = {
  id: string;
  fromUserId: string;
  toUserId?: string;
  text: string;
  createdAt: number;
};

type Store = {
  version: number;
  profilesById: Record<string, ProfileSnapshot>;
  likesByUser: Record<string, Record<string, number>>; // fromUid -> toUid -> ts
  matchesByUser: Record<string, Record<string, Match>>; // uid -> matchId -> Match
  chatsByMatch: Record<string, Message[]>;
  unreadByUser: Record<string, Record<string, number>>; // uid -> matchId -> unread count
  clickedMatchesByUser: Record<string, Record<string, boolean>>; // uid -> matchId -> clicked
  extrasByUser: Record<string, any>;
};

const STORE_KEY = 'ff_social_store_v3';

function isBrowser() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function blankStore(): Store {
  return {
    version: 3,
    profilesById: {},
    likesByUser: {},
    matchesByUser: {},
    chatsByMatch: {},
    unreadByUser: {},
    clickedMatchesByUser: {},
    extrasByUser: {},
  };
}

function load(): Store {
  if (!isBrowser()) return blankStore();
  return safeJsonParse<Store>(localStorage.getItem(STORE_KEY), blankStore());
}

function save(s: Store) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {}
}

function now() {
  return Date.now();
}

function clamp(n: any): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.floor(x));
}

function ensureMap<T extends Record<string, any>>(obj: Record<string, T>, key: string, init: () => T): T {
  if (!obj[key]) obj[key] = init();
  return obj[key];
}

function matchIdFor(a: string, b: string) {
  const x = String(a || '').trim();
  const y = String(b || '').trim();
  const [u1, u2] = x < y ? [x, y] : [y, x];
  return `m_${u1}__${u2}`;
}

function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1];
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    const json = atob(b64 + pad);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Return a stable user identifier for a session token.
 * - If token looks like a JWT, prefer payload.sub / uid / user_id / email.
 * - If token is a plain string (like an email), use it directly.
 * - If token is missing, fall back to "anon".
 *
 * IMPORTANT: This function intentionally NEVER returns null to avoid
 * Next.js/TS "string | null" build errors across pages.
 */
export function uidFromToken(token: string | null | undefined): string {
  const t = String(token || '').trim();
  if (!t) return 'anon';

  // JWT
  if (t.includes('.') && t.split('.').length >= 2) {
    const p = decodeJwtPayload(t);
    const cand = String(p?.sub || p?.uid || p?.user_id || p?.userId || p?.email || '').trim();
    return cand || t;
  }

  // Non-JWT token (often an email in this project)
  return t;
}

export function upsertUserProfileSnapshot(uid: string, patch: Partial<ProfileSnapshot>) {
  if (!isBrowser()) return;
  const id = String(uid || '').trim();
  if (!id) return;

  const s = load();
  const prev = s.profilesById[id] || { id };
  s.profilesById[id] = {
    ...prev,
    ...patch,
    id,
    updatedAt: now(),
  };
  save(s);
}

export function loadUserProfileSnapshot(uid: string): ProfileSnapshot | null {
  const id = String(uid || '').trim();
  if (!id) return null;
  const s = load();
  return s.profilesById[id] || null;
}

/**
 * Record a "like" from fromUid -> toUid. If reciprocal like exists, creates a match.
 * Returns the matchId if a new match was created; otherwise null.
 */
export function likeUser(fromUid: string, toUid: string): string | null {
  const from = String(fromUid || '').trim();
  const to = String(toUid || '').trim();
  if (!from || !to || from === 'anon' || to === 'anon' || from === to) return null;

  const s = load();
  const likesFrom = ensureMap(s.likesByUser, from, () => ({} as Record<string, number>));
  likesFrom[to] = now();

  const likesTo = ensureMap(s.likesByUser, to, () => ({} as Record<string, number>));
  const isReciprocal = Boolean(likesTo[from]);

  if (!isReciprocal) {
    save(s);
    return null;
  }

  const mid = matchIdFor(from, to);
  const match: Match = { id: mid, a: from < to ? from : to, b: from < to ? to : from, createdAt: now() };

  const mFrom = ensureMap(s.matchesByUser, from, () => ({} as Record<string, Match>));
  const mTo = ensureMap(s.matchesByUser, to, () => ({} as Record<string, Match>));

  // Only create once
  if (!mFrom[mid] && !mTo[mid]) {
    mFrom[mid] = match;
    mTo[mid] = match;
  }

  save(s);
  return mid;
}

export function getMatchesFor(uid: string): Match[] {
  const u = String(uid || '').trim();
  if (!u) return [];
  const s = load();
  const m = s.matchesByUser[u] || {};
  return Object.values(m).sort((a, b) => b.createdAt - a.createdAt);
}

export function markMatchClicked(uid: string, matchId: string) {
  const u = String(uid || '').trim();
  const mid = String(matchId || '').trim();
  if (!u || !mid) return;
  const s = load();
  const map = ensureMap(s.clickedMatchesByUser, u, () => ({} as Record<string, boolean>));
  map[mid] = true;
  save(s);
}

export function unreadCountForMatch(uid: string, matchId: string): number {
  const u = String(uid || '').trim();
  const mid = String(matchId || '').trim();
  if (!u || !mid) return 0;
  const s = load();
  return clamp(s.unreadByUser?.[u]?.[mid] || 0);
}

export function incrementUnread(uid: string, matchId: string, amount: number = 1) {
  const u = String(uid || '').trim();
  const mid = String(matchId || '').trim();
  if (!u || !mid) return;
  const s = load();
  const map = ensureMap(s.unreadByUser, u, () => ({} as Record<string, number>));
  map[mid] = clamp(map[mid] || 0) + clamp(amount);
  save(s);
}

export function clearUnreadForChat(uid: string, matchId: string) {
  const u = String(uid || '').trim();
  const mid = String(matchId || '').trim();
  if (!u || !mid) return;
  const s = load();
  const map = ensureMap(s.unreadByUser, u, () => ({} as Record<string, number>));
  map[mid] = 0;
  save(s);
}

export function getChat(matchId: string): Message[] {
  const mid = String(matchId || '').trim();
  if (!mid) return [];
  const s = load();
  return (s.chatsByMatch[mid] || []).slice().sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * addChatMessage supports two call patterns used during earlier iterations:
 *  1) addChatMessage(matchId, { fromUserId, toUserId?, text })
 *  2) addChatMessage(matchId, fromUid, toUid, text)
 */
export function addChatMessage(matchId: string, a: any, b?: any, c?: any) {
  const mid = String(matchId || '').trim();
  if (!mid) return;

  let fromUserId = '';
  let toUserId: string | undefined = undefined;
  let text = '';

  if (typeof a === 'object' && a) {
    fromUserId = String(a.fromUserId || a.from || a.fromUid || a.fromUser || a.fromUserID || '').trim();
    toUserId = a.toUserId ? String(a.toUserId).trim() : undefined;
    text = String(a.text || '').trim();
  } else {
    fromUserId = String(a || '').trim();
    toUserId = b != null ? String(b).trim() : undefined;
    text = String(c || '').trim();
  }

  if (!fromUserId || !text) return;

  const s = load();
  const arr = ensureMap(s.chatsByMatch, mid, () => []);
  const msg: Message = {
    id: `msg_${now()}_${Math.random().toString(36).slice(2, 8)}`,
    fromUserId,
    toUserId,
    text,
    createdAt: now(),
  };
  arr.push(msg);
  save(s);
}

export function badgeCounts(uid: string): { total: number; matches: number; messages: number } {
  const u = String(uid || '').trim();
  if (!u) return { total: 0, matches: 0, messages: 0 };
  const s = load();

  // New matches = matches that exist but not clicked yet
  const clicked = s.clickedMatchesByUser?.[u] || {};
  const matches = getMatchesFor(u);
  const newMatches = matches.filter((m) => !clicked[m.id]).length;

  // Unread messages sum
  const unreadMap = s.unreadByUser?.[u] || {};
  const unread = Object.values(unreadMap).reduce((acc, n) => acc + clamp(n), 0);

  return { total: clamp(newMatches + unread), matches: clamp(newMatches), messages: clamp(unread) };
}

export function getProfileExtras(uid: string): any {
  const u = String(uid || '').trim();
  if (!u) return {};
  const s = load();
  return s.extrasByUser[u] || {};
}

export function setProfileExtras(uid: string, patch: any) {
  const u = String(uid || '').trim();
  if (!u) return;
  const s = load();
  const prev = s.extrasByUser[u] || {};
  s.extrasByUser[u] = { ...prev, ...(patch || {}) };
  save(s);
}

// ---- Compatibility aliases (older imports) ----
export const getMatchesForUser = getMatchesFor;
