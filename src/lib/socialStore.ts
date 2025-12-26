'use client';

export type ProfileSummary = {
  id: string;
  name: string;
  age?: number;
  city?: string;
  photoUrl?: string;
};

export type Match = {
  id: string;          // other user's id/key
  name: string;
  age?: number;
  city?: string;
  photoUrl?: string;
  matchedAt: number;   // epoch ms
};

const EMAIL_KEY = 'ff_email';
const LEGACY_MATCHES_KEY = 'ff_matches_v1'; // previous single-key storage (migration)
const LEGACY_LIKES_KEY = 'ff_likes_v1';

function safeNow() {
  return Date.now();
}

function norm(s: string) {
  return (s || '').trim().toLowerCase();
}

function kLikes(userKey: string) {
  return `ff_likes_v2:${norm(userKey)}`;
}
function kPasses(userKey: string) {
  return `ff_passes_v2:${norm(userKey)}`;
}
function kMatches(userKey: string) {
  return `ff_matches_v2:${norm(userKey)}`;
}
function kUnseenMatches(userKey: string) {
  return `ff_unseen_matches_v2:${norm(userKey)}`;
}
function kProfileCache() {
  return `ff_profile_cache_v2`;
}

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: any) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function setCurrentUserEmail(email: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(EMAIL_KEY, (email || '').trim());
  } catch {}
}

export function getCurrentUserKey(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const e = localStorage.getItem(EMAIL_KEY);
    if (e && e.trim()) return e.trim();
  } catch {}
  return null;
}

function cacheProfile(p: ProfileSummary) {
  if (!p?.id) return;
  const key = kProfileCache();
  const cache = readJSON<Record<string, ProfileSummary>>(key, {});
  cache[p.id] = { ...cache[p.id], ...p };
  writeJSON(key, cache);
}

export function getCachedProfile(id: string): ProfileSummary | null {
  if (!id) return null;
  const cache = readJSON<Record<string, ProfileSummary>>(kProfileCache(), {});
  return cache[id] ?? null;
}

function migrateLegacyIfNeeded(userKey: string) {
  // If legacy single-key likes/matches exist, copy them into user-scoped keys once.
  const markerKey = `ff_migrated_v2:${norm(userKey)}`;
  const already = readJSON<boolean>(markerKey, false);
  if (already) return;

  const legacyMatches = readJSON<Match[]>(LEGACY_MATCHES_KEY, []);
  const legacyLikes = readJSON<string[]>(LEGACY_LIKES_KEY, []);
  if (legacyMatches.length) writeJSON(kMatches(userKey), legacyMatches);
  if (legacyLikes.length) writeJSON(kLikes(userKey), legacyLikes);

  writeJSON(markerKey, true);
}

export function getUnseenMatchesCount(userKey: string | null): number {
  if (!userKey) return 0;
  migrateLegacyIfNeeded(userKey);
  return readJSON<number>(kUnseenMatches(userKey), 0);
}

export function markAllMatchesSeen(userKey: string | null) {
  if (!userKey) return;
  migrateLegacyIfNeeded(userKey);
  writeJSON(kUnseenMatches(userKey), 0);
}

export function getMatches(userKey: string | null): Match[] {
  if (!userKey) return [];
  migrateLegacyIfNeeded(userKey);
  const list = readJSON<Match[]>(kMatches(userKey), []);
  // newest first
  return [...list].sort((a, b) => (b.matchedAt || 0) - (a.matchedAt || 0));
}

function addToSet(key: string, value: string) {
  const list = readJSON<string[]>(key, []);
  const v = value;
  if (!v) return;
  if (!list.includes(v)) {
    list.push(v);
    writeJSON(key, list);
  }
}

function hasInSet(key: string, value: string): boolean {
  const list = readJSON<string[]>(key, []);
  return value ? list.includes(value) : false;
}

function upsertMatch(userKey: string, other: ProfileSummary) {
  const mk = kMatches(userKey);
  const list = readJSON<Match[]>(mk, []);
  const existing = list.find((m) => m.id === other.id);
  if (existing) return; // don't duplicate
  const newMatch: Match = {
    id: other.id,
    name: other.name || 'Match',
    age: other.age,
    city: other.city,
    photoUrl: other.photoUrl,
    matchedAt: safeNow(),
  };
  list.push(newMatch);
  writeJSON(mk, list);
}

function bumpUnseen(userKey: string, amount: number) {
  const uk = kUnseenMatches(userKey);
  const cur = readJSON<number>(uk, 0);
  const next = Math.max(0, (cur || 0) + amount);
  writeJSON(uk, next);
}

export function recordDecisionAndMaybeMatch(args: {
  currentUserKey: string;
  currentUserId: string;         // identifier shown to others (usually email)
  target: ProfileSummary;
  decision: 'like' | 'pass';
}): { matched: boolean } {
  const { currentUserKey, currentUserId, target, decision } = args;
  if (!currentUserKey || !currentUserId || !target?.id) return { matched: false };

  migrateLegacyIfNeeded(currentUserKey);
  cacheProfile(target);

  if (decision === 'pass') {
    addToSet(kPasses(currentUserKey), target.id);
    return { matched: false };
  }

  // LIKE
  addToSet(kLikes(currentUserKey), target.id);

  // Mutual like? (target liked current user)
  const targetUserKey = target.id; // in this app, we treat target.id as their user key (seed emails etc.)
  // If they are on the same device, we can read their likes list and detect mutual for testing.
  const mutual = hasInSet(kLikes(targetUserKey), currentUserId);

  if (!mutual) return { matched: false };

  // Create match for BOTH users
  const currentSummary: ProfileSummary = { id: currentUserId, name: currentUserId };
  upsertMatch(currentUserKey, target);
  upsertMatch(targetUserKey, currentSummary);

  bumpUnseen(currentUserKey, 1);
  bumpUnseen(targetUserKey, 1);

  return { matched: true };
}
