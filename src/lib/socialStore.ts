// src/lib/socialStore.ts
// Local-first social persistence (likes, matches, messages, notifications)
// SSR-safe: never touches localStorage unless in browser.
//
// IMPORTANT BEHAVIOR (for dev right now):
// - A "match" exists ONLY when two users have liked each other (A->B and B->A).
// - Likes/matches are stored in localStorage so you can test by logging into multiple accounts
//   on the same device without Firebase yet.

export type Match = {
  id: string;              // matchId "a__b" (sorted)
  a: string;               // uid A
  b: string;               // uid B
  createdAt: number;       // ms epoch (time of reciprocal match)
  lastMessageAt?: number;  // ms epoch
  lastMessageText?: string;
};

export type Message = {
  id: string;
  matchId: string;
  fromUserId: string;
  text: string;
  createdAt: number;
  readBy?: Record<string, boolean>;
};

export type UserProfileSnapshot = {
  uid: string;
  id?: string;
  name?: string;
  age?: number;
  city?: string;
  bio?: string;
  photoUrl?: string;
  profilePhotoUrl?: string;
  primaryPhotoUrl?: string;
  mainPhotoUrl?: string;
  imageUrl?: string;
  avatarUrl?: string;
};

type SocialState = {
  // messagesByMatchId[matchId] = Message[]
  messagesByMatchId: Record<string, Message[]>;
  // unreadByUid[uid][matchId] = number
  unreadByUid: Record<string, Record<string, number>>;
};

const SOCIAL_KEY = "ff_social_v1";
const LIKES_KEY = "ff_likes_v1";              // Record<fromUid, Record<toUid, LikeRecord>>
const PROFILES_KEY = "ff_profiles_v1";        // Record<uid, UserProfileSnapshot>
const SEEN_MATCHES_PREFIX = "ff_seen_matches_v1_"; // + uid

type LikeRecord = { at: number; snapshot?: UserProfileSnapshot | null };

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function loadLS<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  return safeJsonParse<T>(localStorage.getItem(key), fallback);
}

function saveLS(key: string, value: any) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function now() {
  return Date.now();
}

function stableMatchId(a: string, b: string) {
  const x = String(a || "");
  const y = String(b || "");
  return x < y ? `${x}__${y}` : `${y}__${x}`;
}

// --- UID helpers ---

export function uidFromToken(token: string | null | undefined): string | null {
  try {
    const t = String(token || "");
    const parts = t.split(".");
    if (parts.length < 2) return null;

    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(b64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(json) as any;
    const uid = payload?.uid || payload?.user_id || payload?.sub || payload?.id || null;
    return uid ? String(uid) : null;
  } catch {
    return null;
  }
}

// --- Profile snapshots (for showing names/photos in matches) ---

export function saveUserProfileSnapshot(p: UserProfileSnapshot | null | undefined) {
  if (!p?.uid) return;
  const all = loadLS<Record<string, UserProfileSnapshot>>(PROFILES_KEY, {});
  all[p.uid] = { ...all[p.uid], ...p };
  saveLS(PROFILES_KEY, all);
}

export function loadUserProfileSnapshot(uid: string): UserProfileSnapshot | null {
  if (!uid) return null;
  const all = loadLS<Record<string, UserProfileSnapshot>>(PROFILES_KEY, {});
  return all[uid] || null;
}

// --- Likes + matches (local-first true reciprocity) ---

export function recordLike(fromUid: string, toUid: string, toSnapshot?: UserProfileSnapshot | null): { isMatch: boolean; matchId?: string } {
  if (!fromUid || !toUid) return { isMatch: false };

  // Save the target profile snapshot so Matches can show name/photo.
  if (toSnapshot?.uid) saveUserProfileSnapshot(toSnapshot);

  const likes = loadLS<Record<string, Record<string, LikeRecord>>>(LIKES_KEY, {});
  likes[fromUid] = likes[fromUid] || {};
  if (!likes[fromUid][toUid]) {
    likes[fromUid][toUid] = { at: now(), snapshot: toSnapshot || null };
    saveLS(LIKES_KEY, likes);
  }

  const reciprocal = Boolean(likes[toUid] && likes[toUid][fromUid]);
  if (reciprocal) {
    const matchId = stableMatchId(fromUid, toUid);

    // Mark as "unseen" for both sides until they visit /matches.
    // We do this by NOT adding it to seen list here.
    return { isMatch: true, matchId };
  }
  return { isMatch: false };
}

export function listMatchesForUid(uid: string): Match[] {
  if (!uid) return [];
  const likes = loadLS<Record<string, Record<string, LikeRecord>>>(LIKES_KEY, {});
  const mine = likes[uid] || {};
  const matches: Match[] = [];

  for (const otherUid of Object.keys(mine)) {
    if (!otherUid) continue;
    if (likes[otherUid] && likes[otherUid][uid]) {
      const a = uid;
      const b = otherUid;
      const id = stableMatchId(a, b);

      const createdAt = Math.max(mine[otherUid]?.at || 0, likes[otherUid][uid]?.at || 0) || now();
      matches.push({ id, a: id.split("__")[0], b: id.split("__")[1], createdAt });
    }
  }

  // newest first
  matches.sort((m1, m2) => (m2.lastMessageAt || m2.createdAt) - (m1.lastMessageAt || m1.createdAt));
  return matches;
}

function seenKey(uid: string) {
  return `${SEEN_MATCHES_PREFIX}${uid}`;
}

export function markAllMatchesSeen(uid: string) {
  const matches = listMatchesForUid(uid);
  const seen = new Set(matches.map((m) => m.id));
  saveLS(seenKey(uid), Array.from(seen));
}

export function getUnseenMatchCount(uid: string): number {
  const matches = listMatchesForUid(uid);
  const seenArr = loadLS<string[]>(seenKey(uid), []);
  const seen = new Set(seenArr);
  let c = 0;
  for (const m of matches) if (!seen.has(m.id)) c++;
  return c;
}

// --- Messages + unread (kept from earlier local store, but keyed by uid + matchId) ---

function loadSocial(): SocialState {
  return loadLS<SocialState>(SOCIAL_KEY, { messagesByMatchId: {}, unreadByUid: {} });
}

function saveSocial(s: SocialState) {
  saveLS(SOCIAL_KEY, s);
}

export function getChat(matchId: string): Message[] {
  const s = loadSocial();
  return Array.isArray(s.messagesByMatchId?.[matchId]) ? s.messagesByMatchId[matchId] : [];
}

// Supports BOTH call styles used in the repo:
//   addChatMessage(matchId, { fromUserId, text })
//   addChatMessage(uid, matchId, { fromUserId, text })
export function addChatMessage(a: any, b: any, c?: any) {
  let uid: string | null = null;
  let matchId: string;
  let msg: { fromUserId: string; text: string };

  if (typeof a === "string" && typeof b === "object" && b) {
    // (matchId, msg)
    matchId = a;
    msg = b;
  } else {
    // (uid, matchId, msg)
    uid = typeof a === "string" ? a : null;
    matchId = String(b || "");
    msg = c;
  }

  if (!matchId || !msg?.fromUserId || !String(msg.text || "").trim()) return;

  const s = loadSocial();
  const list = Array.isArray(s.messagesByMatchId[matchId]) ? s.messagesByMatchId[matchId] : [];
  const m: Message = {
    id: `msg_${now()}_${Math.random().toString(16).slice(2)}`,
    matchId,
    fromUserId: String(msg.fromUserId),
    text: String(msg.text),
    createdAt: now(),
    readBy: { [String(msg.fromUserId)]: true },
  };
  list.push(m);
  s.messagesByMatchId[matchId] = list;

  // bump unread for the other participant if we know uid
  if (uid) {
    const parts = matchId.split("__");
    if (parts.length === 2) {
      const other = parts[0] === uid ? parts[1] : parts[0];
      incrementUnread(other, matchId);
    }
  }

  saveSocial(s);
}

export function incrementUnread(uid: string, matchId: string) {
  if (!uid || !matchId) return;
  const s = loadSocial();
  s.unreadByUid[uid] = s.unreadByUid[uid] || {};
  s.unreadByUid[uid][matchId] = (s.unreadByUid[uid][matchId] || 0) + 1;
  saveSocial(s);
}

export function clearUnreadForMatch(uid: string, matchId: string) {
  if (!uid || !matchId) return;
  const s = loadSocial();
  if (s.unreadByUid[uid]) {
    delete s.unreadByUid[uid][matchId];
    saveSocial(s);
  }
}

export function clearUnreadForChat(uid: string, matchId: string) {
  return clearUnreadForMatch(uid, matchId);
}

// --- Extras (editable fields on match profile page) ---

const EXTRAS_KEY = "ff_profile_extras_v1"; // Record<uid, { headline, about, zip, ... }>

export function getProfileExtras(uid: string): Record<string, any> {
  const all = loadLS<Record<string, any>>(EXTRAS_KEY, {});
  return all[uid] || {};
}

export function setProfileExtras(uid: string, extras: Record<string, any>) {
  const all = loadLS<Record<string, any>>(EXTRAS_KEY, {});
  all[uid] = { ...(all[uid] || {}), ...(extras || {}) };
  saveLS(EXTRAS_KEY, all);
}

// --- Badges for AppHeader ---

export function badgeCounts(uid: string): { newMatches: number; unreadMessages: number } {
  const newMatches = getUnseenMatchCount(uid);
  const s = loadSocial();
  const unreadMessages = Object.values(s.unreadByUid?.[uid] || {}).reduce((a, b) => a + (Number(b) || 0), 0);
  return { newMatches, unreadMessages };
}
