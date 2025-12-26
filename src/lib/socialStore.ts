/* src/lib/socialStore.ts
   Local-only social layer for dev/testing.
   - Matches / Messages stored in localStorage
   - Profiles are sourced from:
     1) ff_profiles_by_uid_v1 (explicitly saved via /profile)
     2) ff_deck_profiles_v2 (Discover deck) as a fallback
*/

export type UserProfileSnapshot = {
  id: string;
  name?: string;
  displayName?: string;
  username?: string;
  email?: string;
  photoUrl?: string;
  photoURL?: string;
  avatarUrl?: string;
  primaryPhotoUrl?: string;
  photos?: any[];
  gallery?: any[];
  age?: number;
  city?: string;
  about?: string;
};

export type Match = {
  id: string;
  a: string;
  b: string;
  createdAt?: number; // ms since epoch
};

export type Message = {
  id: string;
  matchId: string;
  from: string;
  text: string;
  createdAt: number; // ms since epoch
  readBy?: string[];
};

type SocialState = {
  likesGiven: Record<string, string[]>;
  likesReceived: Record<string, string[]>;
  matches: Match[];
  chats: Record<string, Message[]>;
  lastReadByMatchAndUser: Record<string, Record<string, number>>; // matchId -> uid -> ms
  profileExtrasByUser: Record<string, Record<string, any>>;
};

const STORE_KEY = "ff_social_v1";
const USER_ID_KEY = "ff_user_id_v1";

// Profile stores
const PROFILES_BY_UID_KEY = "ff_profiles_by_uid_v1";
const DECK_KEY = "ff_deck_profiles_v2"; // Discover page seed deck (array)

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function load(): SocialState {
  if (typeof window === "undefined") {
    return {
      likesGiven: {},
      likesReceived: {},
      matches: [],
      chats: {},
      lastReadByMatchAndUser: {},
      profileExtrasByUser: {},
    };
  }

  return safeParse<SocialState>(localStorage.getItem(STORE_KEY), {
    likesGiven: {},
    likesReceived: {},
    matches: [],
    chats: {},
    lastReadByMatchAndUser: {},
    profileExtrasByUser: {},
  });
}

function save(s: SocialState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORE_KEY, JSON.stringify(s));
}

function uniqPush(arr: string[], v: string) {
  if (!arr.includes(v)) arr.push(v);
}

function nowMs() {
  return Date.now();
}

/* ---------------- Session-ish UID ---------------- */

export function getOrCreateUserId(): string {
  if (typeof window === "undefined") return "anon";
  const existing = localStorage.getItem(USER_ID_KEY);
  if (existing) return existing;
  const id = "u_" + Math.random().toString(36).slice(2) + "_" + Date.now().toString(36);
  localStorage.setItem(USER_ID_KEY, id);
  return id;
}

export function setUserId(uid: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_ID_KEY, uid);
}

export function uidFromToken(token: string): string {
  // tokens in this project are typically:
  // - "uid:<uid>"
  // - "<uid>"
  // - "email:<email>" (legacy)
  if (!token) return "anon";
  if (token.startsWith("uid:")) return token.slice(4);
  if (token.startsWith("email:")) return token.slice(6);
  return token;
}

/* ---------------- Profiles ---------------- */

function loadProfilesByUid(): Record<string, UserProfileSnapshot> {
  if (typeof window === "undefined") return {};
  return safeParse<Record<string, UserProfileSnapshot>>(localStorage.getItem(PROFILES_BY_UID_KEY), {});
}

function saveProfilesByUid(map: Record<string, UserProfileSnapshot>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILES_BY_UID_KEY, JSON.stringify(map));
}

function loadDeckProfiles(): any[] {
  if (typeof window === "undefined") return [];
  return safeParse<any[]>(localStorage.getItem(DECK_KEY), []);
}

function normalizeProfileFromAny(p: any, fallbackId: string): UserProfileSnapshot {
  return {
    id: String(p?.id ?? p?.uid ?? p?.userId ?? fallbackId),
    name: p?.name ?? p?.displayName ?? p?.username ?? p?.fullName,
    displayName: p?.displayName,
    username: p?.username,
    email: p?.email,
    photoUrl: p?.photoUrl ?? p?.photoURL ?? p?.avatarUrl ?? p?.primaryPhotoUrl,
    photoURL: p?.photoURL,
    avatarUrl: p?.avatarUrl,
    primaryPhotoUrl: p?.primaryPhotoUrl,
    photos: p?.photos,
    gallery: p?.gallery,
    age: typeof p?.age === "number" ? p.age : undefined,
    city: typeof p?.city === "string" ? p.city : undefined,
    about: typeof p?.about === "string" ? p.about : undefined,
  };
}

export function upsertUserProfileSnapshot(uid: string, patch: Partial<UserProfileSnapshot>) {
  if (!uid) return;
  const map = loadProfilesByUid();
  const current = map[uid] || { id: uid };
  const next: UserProfileSnapshot = { ...current, ...patch, id: uid };
  map[uid] = next;
  saveProfilesByUid(map);

  // Also try to update the Discover deck if it exists.
  try {
    if (typeof window === "undefined") return;
    const deck = loadDeckProfiles();
    const idx = deck.findIndex((x: any) => String(x?.id ?? x?.uid ?? "") === uid);
    if (idx >= 0) {
      deck[idx] = { ...deck[idx], ...next, id: uid };
      localStorage.setItem(DECK_KEY, JSON.stringify(deck));
    }
  } catch {}
}

export function loadUserProfileSnapshot(uid: string): UserProfileSnapshot | null {
  if (!uid) return null;

  // 1) Explicit by-uid store (edited via /profile)
  const byUid = loadProfilesByUid();
  const direct = byUid[uid];
  if (direct) return normalizeProfileFromAny(direct, uid);

  // 2) Discover deck (seeded profiles)
  try {
    const deck = loadDeckProfiles();
    const found = deck.find((p: any) => String(p?.id ?? p?.uid ?? "") === uid);
    if (found) return normalizeProfileFromAny(found, uid);
  } catch {}

  // 3) As a last resort, return minimal snapshot
  return { id: uid };
}

export function getProfileExtras(uid: string) {
  const s = load();
  return s.profileExtrasByUser[uid] || {};
}

export function setProfileExtras(
  uid: string,
  extras: { headline?: string; about?: string; zip?: string; subscriptionTier?: string; fullName?: string; displayName?: string }
) {
  const s = load();
  s.profileExtrasByUser[uid] = { ...(s.profileExtrasByUser[uid] || {}), ...extras };
  save(s);

  // Mirror select fields to the profile snapshot
  upsertUserProfileSnapshot(uid, {
    name: extras.fullName ?? undefined,
    displayName: extras.displayName ?? undefined,
    about: extras.about ?? undefined,
  });
}

/* ---------------- Like / Match ---------------- */

export function like(targetUid: string, myUid: string): { matched: boolean; matchId?: string } {
  const s = load();
  if (!s.likesGiven[myUid]) s.likesGiven[myUid] = [];
  if (!s.likesReceived[targetUid]) s.likesReceived[targetUid] = [];
  uniqPush(s.likesGiven[myUid], targetUid);
  uniqPush(s.likesReceived[targetUid], myUid);

  const otherLikedMe = (s.likesGiven[targetUid] || []).includes(myUid);
  if (otherLikedMe) {
    const matchId = "match_" + [myUid, targetUid].sort().join("_");
    const exists = s.matches.some((m) => m.id === matchId);
    if (!exists) {
      s.matches.unshift({ id: matchId, a: myUid, b: targetUid, createdAt: nowMs() });
    }
    save(s);
    return { matched: true, matchId };
  }

  save(s);
  return { matched: false };
}

export function getMatchesFor(uid: string): Match[] {
  const s = load();
  return (s.matches || []).filter((m) => m.a === uid || m.b === uid);
}

/* NEW MATCH "CLICKED" tracking (for new match badge) */
export function markMatchClicked(matchId: string, uid: string) {
  const s = load();
  if (!s.lastReadByMatchAndUser[matchId]) s.lastReadByMatchAndUser[matchId] = {};
  s.lastReadByMatchAndUser[matchId][uid] = nowMs();
  save(s);
}

/* ---------------- Chat ---------------- */

export function getChat(matchId: string): Message[] {
  const s = load();
  return s.chats[matchId] || [];
}

export function sendMessage(matchId: string, fromUid: string, text: string) {
  const s = load();
  if (!s.chats[matchId]) s.chats[matchId] = [];
  const msg: Message = {
    id: "msg_" + Math.random().toString(36).slice(2) + "_" + Date.now().toString(36),
    matchId,
    from: fromUid,
    text,
    createdAt: nowMs(),
    readBy: [fromUid],
  };
  s.chats[matchId].push(msg);
  save(s);
}

// Back-compat helper used by /chat/[id]/page.tsx
export function addChatMessage(matchId: string, payload: { fromUserId: string; text: string }) {
  const fromUid = payload?.fromUserId || "anon";
  const text = String(payload?.text ?? "").trim();
  if (!text) return;
  sendMessage(matchId, fromUid, text);
}

// Back-compat helper used by /chat/[id]/page.tsx
export function clearUnreadForChat(uid: string, matchId: string) {
  if (!uid || !matchId) return;
  markChatRead(matchId, uid);
}

export function markChatRead(matchId: string, uid: string) {
  const s = load();
  const msgs = s.chats[matchId] || [];
  msgs.forEach((m) => {
    if (!m.readBy) m.readBy = [];
    if (!m.readBy.includes(uid)) m.readBy.push(uid);
  });
  if (!s.lastReadByMatchAndUser[matchId]) s.lastReadByMatchAndUser[matchId] = {};
  s.lastReadByMatchAndUser[matchId][uid] = nowMs();
  save(s);
}

/* unread count computed from messages' readBy */
export function unreadCountForMatch(matchId: string, uid: string): number {
  const msgs = getChat(matchId);
  let c = 0;
  for (const m of msgs) {
    if (m.from !== uid && !(m.readBy || []).includes(uid)) c++;
  }
  return c;
}

/* Compatibility: chat page previously called incrementUnread(...) directly.
   In this implementation, unread is derived from message readBy, so this is a no-op
   that keeps the build working. */
export function incrementUnread(_uid: string, _matchId: string, _amount: number = 1) {
  // no-op (kept for older imports)
}

/* ---------------- Badges ---------------- */

export function badgeCounts(uid: string): { total: number; matches: number; messages: number } {
  const matches = getMatchesFor(uid);

  let newMatches = 0;
  const s = load();
  for (const m of matches) {
    const last = s.lastReadByMatchAndUser?.[m.id]?.[uid] ?? 0;
    const createdAt = m.createdAt ?? 0;
    if (createdAt > last) newMatches++;
  }

  let unreadMessages = 0;
  for (const m of matches) {
    unreadMessages += unreadCountForMatch(m.id, uid);
  }

  return {
    total: newMatches + unreadMessages,
    matches: newMatches,
    messages: unreadMessages,
  };
}
