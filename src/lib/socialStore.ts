// src/lib/socialStore.ts
// Local-first social persistence (likes, matches, messages, notifications)
// SSR-safe: never touches localStorage unless in browser.
// This file also provides COMPAT exports (badgeCounts, uidFromToken, getChat, addChatMessage, incrementUnread)
// to match existing imports across the app.

export type Match = {
  id: string;              // matchId
  a: string;               // uid A
  b: string;               // uid B
  createdAt: number;       // ms epoch
  lastMessageAt?: number;  // ms epoch
  lastMessageText?: string;
};

export type Message = {
  id: string;
  matchId: string;
  from: string;           // uid
  text: string;
  createdAt: number;      // ms epoch
};

type SeenState = {
  likesGiven: Record<string, string[]>;  // uid -> [targetUid]
  likesReceived: Record<string, string[]>; // uid -> [fromUid]
  matches: Match[];
  messages: Message[];
  unreadByUser: Record<string, Record<string, number>>; // uid -> matchId -> count
  newMatchesByUser: Record<string, number>; // uid -> count
  profileExtrasByUser: Record<string, { headline?: string; about?: string; zip?: string }>;
};

const KEY = "ff_social_v1";

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function load(): SeenState {
  const empty: SeenState = {
    likesGiven: {},
    likesReceived: {},
    matches: [],
    messages: [],
    unreadByUser: {},
    newMatchesByUser: {},
    profileExtrasByUser: {},
  };
  if (!isBrowser()) return empty;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    return { ...empty, ...parsed };
  } catch {
    return empty;
  }
}

function save(state: SeenState) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

function uniqPush(arr: string[], v: string) {
  if (!arr.includes(v)) arr.push(v);
}

export function uidFromSessionToken(token: string | null): string | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length >= 2) {
      const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const json = JSON.parse(atob(payload));
      return (json.user_id || json.uid || json.sub || null) as string | null;
    }
  } catch {}
  return "tok_" + token.slice(0, 12);
}

export function getBadges(uid: string) {
  const s = load();
  const matchCount = s.newMatchesByUser[uid] || 0;
  const unread = s.unreadByUser[uid] || {};
  const msgCount = Object.values(unread).reduce((a, b) => a + (b || 0), 0);
  return { total: matchCount + msgCount, matches: matchCount, messages: msgCount };
}

export function clearNewMatches(uid: string) {
  const s = load();
  s.newMatchesByUser[uid] = 0;
  save(s);
}

export function clearUnreadForMatch(uid: string, matchId: string) {
  const s = load();
  if (!s.unreadByUser[uid]) s.unreadByUser[uid] = {};
  s.unreadByUser[uid][matchId] = 0;
  save(s);
}

export function getMatchesFor(uid: string): Match[] {
  const s = load();
  return s.matches
    .filter((m) => m.a === uid || m.b === uid)
    .sort((x, y) => (y.lastMessageAt || y.createdAt) - (x.lastMessageAt || x.createdAt));
}

export function getMessages(matchId: string): Message[] {
  const s = load();
  return s.messages
    .filter((m) => m.matchId === matchId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function sendMessage(matchId: string, fromUid: string, toUid: string, text: string) {
  const s = load();

  const msg: Message = {
    id: "m_" + Math.random().toString(36).slice(2),
    matchId,
    from: fromUid,
    text,
    createdAt: Date.now(),
  };
  s.messages.push(msg);

  const m = s.matches.find((mm) => mm.id === matchId);
  if (m) {
    m.lastMessageAt = msg.createdAt;
    m.lastMessageText = text.slice(0, 80);
  }

  if (!s.unreadByUser[toUid]) s.unreadByUser[toUid] = {};
  s.unreadByUser[toUid][matchId] = (s.unreadByUser[toUid][matchId] || 0) + 1;

  save(s);
  return msg;
}

export function getProfileExtras(uid: string) {
  const s = load();
  return s.profileExtrasByUser[uid] || {};
}

export function setProfileExtras(uid: string, extras: { headline?: string; about?: string; zip?: string }) {
  const s = load();
  s.profileExtrasByUser[uid] = { ...(s.profileExtrasByUser[uid] || {}), ...extras };
  save(s);
}

// Like logic: if B already liked A, create match
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
      const [a, b] = [myUid, targetUid].sort();
      s.matches.push({ id: matchId, a, b, createdAt: Date.now() });
      s.newMatchesByUser[myUid] = (s.newMatchesByUser[myUid] || 0) + 1;
      s.newMatchesByUser[targetUid] = (s.newMatchesByUser[targetUid] || 0) + 1;
    }
    save(s);
    return { matched: true, matchId };
  }

  save(s);
  return { matched: false };
}

export function pass(_targetUid: string, _myUid: string) {
  // no-op for now
}

export function resetAllSocial() {
  if (!isBrowser()) return;
  localStorage.removeItem(KEY);
}

/* =========================
   COMPAT EXPORTS (for existing imports)
   ========================= */

// AppHeader.tsx expects badgeCounts()
export function badgeCounts(uid: string) {
  return getBadges(uid);
}

// chat/[id]/page.tsx expects uidFromToken()
export function uidFromToken(token: string | null) {
  return uidFromSessionToken(token);
}

// chat expects getChat() + addChatMessage() + incrementUnread()
export function getChat(matchId: string) {
  return getMessages(matchId);
}

export function addChatMessage(matchId: string, fromUid: string, toUid: string, text: string): Message | null;
export function addChatMessage(
  matchId: string,
  payload: { fromUserId: string; text: string; toUserId?: string }
): Message | null;
export function addChatMessage(matchId: string, a: any, b?: any, c?: any): Message | null {
  // Supports both:
  // 1) addChatMessage(matchId, fromUid, toUid, text)
  // 2) addChatMessage(matchId, { fromUserId, text, toUserId? })
  if (typeof a === "string") {
    const fromUid = a;
    const toUid = String(b || "");
    const text = String(c || "");
    if (!fromUid || !toUid || !text) return null;
    return sendMessage(matchId, fromUid, toUid, text);
  }

  const payload = a as { fromUserId?: string; text?: string; toUserId?: string };
  const fromUid = payload?.fromUserId || "";
  const text = payload?.text || "";
  if (!fromUid || !text) return null;

  // Infer recipient from match record if not provided
  const s = load();
  const m = s.matches.find((mm) => mm.id === matchId);
  const inferredToUid =
    payload?.toUserId ||
    (m ? (m.a === fromUid ? m.b : m.b === fromUid ? m.a : "") : "");

  if (!inferredToUid) return null;

  // Note: sendMessage() does its own load/save, so we don't mutate the loaded state here.
  return sendMessage(matchId, fromUid, inferredToUid, text);
}


export function incrementUnread(uid: string, matchId: string, amount: number = 1) {
  const s = load();
  if (!s.unreadByUser[uid]) s.unreadByUser[uid] = {};
  s.unreadByUser[uid][matchId] = (s.unreadByUser[uid][matchId] || 0) + amount;
  save(s);
}

export function markChatRead(uid: string, matchId: string) {
  clearUnreadForMatch(uid, matchId);
}


// Extra compat: some files import clearUnreadForChat()
export function clearUnreadForChat(uid: string, matchId: string) {
  return clearUnreadForMatch(uid, matchId);
}

// Extra compat: placeholder snapshot loader (wired later to real profiles)
export function loadUserProfileSnapshot(_uid: string) {
  // For now, return null. UI should handle missing snapshot.
  return null;
}
