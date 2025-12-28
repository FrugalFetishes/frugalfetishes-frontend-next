'use client';

/**
 * FrugalFetishes Social Store
 * LocalStorage-backed social graph + chat used by the Next.js UI.
 * This file is intentionally self-contained and defensive to avoid deploy/type issues.
 */

export type Sex = 'male' | 'female';

export type Geo = { lat: number; lng: number };

export type ProfileSnapshot = {
  uid: string;
  displayName?: string;
  photoUrl?: string;          // primary photo (string url/data-uri)
  photos?: string[];          // gallery (urls/data-uris)
  age?: number;
  sex?: Sex;
  zipCode?: string;
  location?: Geo | null;      // best-effort geo (mobile), may be null
  updatedAt?: number;         // ms epoch
};

export type ProfileExtras = {
  fullName?: string;
  headline?: string;
  bio?: string;
  interests?: string[];
  subscriptionTier?: 'free' | 'verified' | 'gold' | 'platinum' | string;
  displayName?: string; // optional mirror
  zipCode?: string;
  sex?: Sex;
  age?: number;
  location?: Geo | null;
};

export type Match = {
  id: string; // matchId
  a: string;  // uid
  b: string;  // uid
  createdAt: number; // ms epoch
};

export type Message = {
  id: string;
  fromUserId: string;
  toUserId: string;
  text: string;
  createdAt: number; // ms epoch
};

type Dict<T> = Record<string, T>;

type StoreState = {
  version: 1;
  profilesByUid: Dict<ProfileSnapshot>;
  extrasByUid: Dict<ProfileExtras>;
  likesByUser: Dict<Dict<number>>;              // fromUid -> toUid -> ts
  matchesByUser: Dict<Dict<Match>>;             // uid -> matchId -> match
  clickedMatchesByUser: Dict<Dict<boolean>>;    // uid -> matchId -> clicked?
  unreadByUser: Dict<Dict<number>>;             // uid -> matchId -> unread count
  chatsByMatch: Dict<Message[]>;                // matchId -> messages
};

const STORAGE_KEY = 'ff_social_v1';

function now(): number {
  return Date.now();
}

function clamp(n: any): number {
  const x = Number(n);
  return Number.isFinite(x) && x > 0 ? x : 0;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function initialState(): StoreState {
  return {
    version: 1,
    profilesByUid: {},
    extrasByUid: {},
    likesByUser: {},
    matchesByUser: {},
    clickedMatchesByUser: {},
    unreadByUser: {},
    chatsByMatch: {},
  };
}

function load(): StoreState {
  if (typeof window === 'undefined') return initialState();

  // Try current key first, then a few legacy keys (from older deployments).
  const keysToTry = [STORAGE_KEY, 'ff_social_v2', 'ff_social_v0', 'ff_social'];
  let parsed: StoreState | null = null;

  for (const k of keysToTry) {
    const cand = safeParse<StoreState>(window.localStorage.getItem(k));
    if (cand && (cand as any).version) {
      parsed = cand as any;
      // If we found legacy data under a different key, persist it to the current key.
      if (k !== STORAGE_KEY) {
        try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cand)); } catch {}
      }
      break;
    }
  }

  if (!parsed || parsed.version !== 1) return initialState();

  const hardened: StoreState = {
    ...initialState(),
    ...parsed,
    profilesByUid: parsed.profilesByUid ?? {},
    extrasByUid: parsed.extrasByUid ?? {},
    likesByUser: parsed.likesByUser ?? {},
    matchesByUser: parsed.matchesByUser ?? {},
    clickedMatchesByUser: parsed.clickedMatchesByUser ?? {},
    unreadByUser: parsed.unreadByUser ?? {},
    chatsByMatch: parsed.chatsByMatch ?? {},
  };

  // Normalize snapshots so UI never ends up with a blank displayName.
  for (const [uid, snapAny] of Object.entries(hardened.profilesByUid || {})) {
    const snap: any = snapAny || {};
    const extras: any = (hardened.extrasByUid || {})[uid] || {};
    const inferred =
      String(
        snap.displayName ||
          extras.displayName ||
          extras.fullName ||
          snap.fullName ||
          snap.email ||
          uid
      ).trim() || uid;

    if (!snap.id) snap.id = uid;
    if (!snap.uid) snap.uid = uid;
    if (!snap.displayName) snap.displayName = inferred;
    if (!snap.updatedAt) snap.updatedAt = Date.now();
    hardened.profilesByUid[uid] = snap as any;

    // Keep extras mirror in sync if missing.
    if (!extras.displayName) {
      hardened.extrasByUid[uid] = { ...extras, displayName: inferred } as any;
    }
  }

  return hardened;
}


function save(s: StoreState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore quota errors
  }
}

function ensureMap<T>(root: Dict<T>, key: string, factory: () => T): T {
  if (!root[key]) root[key] = factory();
  return root[key];
}

function normalizeSex(v: any): Sex {
  const s = String(v || '').toLowerCase().trim();
  return s === 'female' ? 'female' : 'male';
}

function normalizeGeo(v: any): Geo | null {
  try {
    if (!v || typeof v !== 'object') return null;
    const lat = Number((v as any).lat);
    const lng = Number((v as any).lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

/**
 * Token -> UID
 * Current app uses the token as the user identifier (email-like). Keep this forgiving.
 */
export function uidFromToken(token: string | null | undefined): string | null {
  const t = (token ?? '').toString().trim();
  return t ? t : null;
}

// ---- Profile snapshot helpers ----

export function loadUserProfileSnapshot(uid: string): ProfileSnapshot | null {
  const s = load();
  const snapAny: any = (s.profilesByUid && (s.profilesByUid as any)[uid]) || null;
  if (!snapAny) return null;

  const extrasAny: any = (s.extrasByUid && (s.extrasByUid as any)[uid]) || {};
  const inferred =
    String(
      snapAny.displayName ||
        extrasAny.displayName ||
        extrasAny.fullName ||
        snapAny.fullName ||
        snapAny.email ||
        uid
    ).trim() || uid;

  // Ensure stable identifiers + non-empty displayName.
  let changed = false;
  if (!snapAny.id) { snapAny.id = uid; changed = true; }
  if (!snapAny.uid) { snapAny.uid = uid; changed = true; }
  if (!snapAny.displayName) { snapAny.displayName = inferred; changed = true; }

  // Mirror a few optional fields from extras so consumers can read either.
  for (const k of ['sex', 'age', 'zipCode', 'location'] as const) {
    if (snapAny[k] === undefined && extrasAny?.[k] !== undefined) {
      snapAny[k] = extrasAny[k];
      changed = true;
    }
  }

  if (changed) {
    try { (s.profilesByUid as any)[uid] = snapAny; save(s); } catch {}
  }

  return snapAny as ProfileSnapshot;
}


export function upsertUserProfileSnapshot(uid: string, patch: Partial<ProfileSnapshot>): ProfileSnapshot {
  const s = load();
  const prev = s.profilesByUid[uid] ?? { uid };
  const next: ProfileSnapshot = {
    ...prev,
    ...patch,
    uid,
    sex: patch.sex !== undefined ? normalizeSex(patch.sex) : (prev.sex ? normalizeSex(prev.sex) : undefined),
    location: patch.location !== undefined ? normalizeGeo(patch.location) : (prev.location ? normalizeGeo(prev.location) : null),
    updatedAt: now(),
  };

  // Normalize photos
  if (Array.isArray(next.photos)) {
    next.photos = next.photos.filter(Boolean).map((x) => String(x));
  }
  if (next.photoUrl) next.photoUrl = String(next.photoUrl);

  s.profilesByUid[uid] = next;
  save(s);
  return next;
}

export function getProfileExtras(uid: string): ProfileExtras {
  const s = load();
  const extrasAny: any = (s.extrasByUid && (s.extrasByUid as any)[uid]) || {};
  const snapAny: any = (s.profilesByUid && (s.profilesByUid as any)[uid]) || {};

  // If extras are missing fields but snapshot has them (or vice versa), merge gently.
  const merged: any = { ...snapAny, ...extrasAny };

  // Ensure displayName is never blank for UI/header.
  const inferred =
    String(
      merged.displayName ||
        merged.fullName ||
        merged.email ||
        snapAny.displayName ||
        uid
    ).trim() || uid;

  if (!merged.displayName) merged.displayName = inferred;

  // Normalize common photo key variants used across older profile pages.
  if (!merged.primaryPhotoUrl && merged.avatarUrl) merged.primaryPhotoUrl = merged.avatarUrl;
  if (!merged.primaryPhotoUrl && merged.photoUrl) merged.primaryPhotoUrl = merged.photoUrl;
  if (!merged.primaryPhotoUrl && merged.photoURL) merged.primaryPhotoUrl = merged.photoURL;

  return merged as ProfileExtras;
}


export function setProfileExtras(uid: string, patch: Partial<ProfileExtras>): ProfileExtras {
  const s = load();
  const prev = s.extrasByUid[uid] ?? {};
  const next: ProfileExtras = {
    ...prev,
    ...patch,
  };

  // Don't accidentally wipe existing values with empty strings.
  // (This happened during earlier zip/city experiments.)
  const prevAny: any = prev as any;
  const nextAny: any = next as any;
  for (const k of ['displayName', 'fullName', 'headline', 'bio', 'zipCode'] as const) {
    const incoming = (patch as any)?.[k];
    if (incoming === '' && prevAny?.[k]) nextAny[k] = prevAny[k];
  }


  // keep core fields consistent if provided
  if (patch.sex !== undefined) next.sex = normalizeSex(patch.sex);
  if (patch.location !== undefined) next.location = normalizeGeo(patch.location);
  if (patch.age !== undefined) next.age = Number(patch.age);

  s.extrasByUid[uid] = next;
  save(s);

  // mirror a few values into snapshot for discover cards
  const snapPatch: Partial<ProfileSnapshot> = {};
  if (patch.displayName !== undefined) snapPatch.displayName = String(patch.displayName);
  if (patch.sex !== undefined) snapPatch.sex = normalizeSex(patch.sex);
  if (patch.age !== undefined) snapPatch.age = Number(patch.age);
  if (patch.zipCode !== undefined) snapPatch.zipCode = String(patch.zipCode);
  if (patch.location !== undefined) snapPatch.location = normalizeGeo(patch.location);

  if (Object.keys(snapPatch).length) upsertUserProfileSnapshot(uid, snapPatch);

  return next;
}

// ---- Likes & matches ----

export function createMatchId(a: string, b: string): string {
  const x = String(a);
  const y = String(b);
  return x < y ? `${x}__${y}` : `${y}__${x}`;
}

/**
 * Register a like. If reciprocal, create match for both sides.
 * Returns created matchId if match created.
 */
export function likeUser(fromUid: string, toUid: string): string | null {
  const from = String(fromUid);
  const to = String(toUid);
  if (!from || !to || from === to) return null;

  const s = load();

  const likesFrom = ensureMap(s.likesByUser, from, () => ({} as Dict<number>)) as Dict<number>;
  likesFrom[to] = now();

  const likesTo = ensureMap(s.likesByUser, to, () => ({} as Dict<number>)) as Dict<number>;
  const isReciprocal = Boolean(likesTo[from]);

  if (isReciprocal) {
    const matchId = createMatchId(from, to);
    const match: Match = { id: matchId, a: from < to ? from : to, b: from < to ? to : from, createdAt: now() };

    const mFrom = ensureMap(s.matchesByUser, from, () => ({} as Dict<Match>)) as Dict<Match>;
    const mTo = ensureMap(s.matchesByUser, to, () => ({} as Dict<Match>)) as Dict<Match>;

    // only create once
    if (!mFrom[matchId] && !mTo[matchId]) {
      mFrom[matchId] = match;
      mTo[matchId] = match;

      // unread "new match" badge for both users until clicked
      const clickedFrom = ensureMap(s.clickedMatchesByUser, from, () => ({} as Dict<boolean>)) as Dict<boolean>;
      const clickedTo = ensureMap(s.clickedMatchesByUser, to, () => ({} as Dict<boolean>)) as Dict<boolean>;
      clickedFrom[matchId] = false;
      clickedTo[matchId] = false;
    }

    save(s);
    return matchId;
  }

  save(s);
  return null;
}

export function getMatchesFor(uid: string): Match[] {
  const u = String(uid);
  const s = load();
  const map = s.matchesByUser[u] ?? {};
  return Object.values(map).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export function markMatchClicked(uid: string, matchId: string): void {
  const u = String(uid);
  const mid = String(matchId);
  if (!u || !mid) return;
  const s = load();
  const map = ensureMap(s.clickedMatchesByUser, u, () => ({} as Dict<boolean>)) as Dict<boolean>;
  map[mid] = true;
  save(s);
}

export function isMatchClicked(uid: string, matchId: string): boolean {
  const u = String(uid);
  const mid = String(matchId);
  if (!u || !mid) return true;
  const s = load();
  const map = s.clickedMatchesByUser[u] ?? {};
  const v = map[mid];
  return v === true;
}

// ---- Chat ----

export function getChat(matchId: string): Message[] {
  const mid = String(matchId);
  const s = load();
  return (s.chatsByMatch[mid] ?? []).slice().sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
}

export function addChatMessage(matchId: string, fromUid: string, toUid: string, text: string): Message {
  const mid = String(matchId);
  const from = String(fromUid);
  const to = String(toUid);
  const t = String(text ?? '').trim();
  const s = load();

  const msg: Message = { id: `${now()}_${Math.random().toString(16).slice(2)}`, fromUserId: from, toUserId: to, text: t, createdAt: now() };
  const arr = ensureMap(s.chatsByMatch, mid, () => ([] as Message[])) as Message[];
  arr.push(msg);

  // increment unread for recipient
  incrementUnread(to, mid, 1);

  save(s);
  return msg;
}

export function unreadCountForMatch(uid: string, matchId: string): number {
  const u = String(uid);
  const mid = String(matchId);
  const s = load();
  const map = s.unreadByUser[u] ?? {};
  return clamp(map[mid] ?? 0);
}

export function incrementUnread(uid: string, matchId: string, amount: number = 1): void {
  const u = String(uid);
  const mid = String(matchId);
  if (!u || !mid) return;
  const s = load();
  const map = ensureMap(s.unreadByUser, u, () => ({} as Dict<number>)) as Dict<number>;
  map[mid] = clamp(map[mid] ?? 0) + clamp(amount);
  save(s);
}

export function clearUnreadForChat(uid: string, matchId: string): void {
  const u = String(uid);
  const mid = String(matchId);
  const s = load();
  const map = ensureMap(s.unreadByUser, u, () => ({} as Dict<number>)) as Dict<number>;
  map[mid] = 0;
  save(s);
}

// ---- Badges (hamburger) ----

export function badgeCounts(uid: string): { total: number; matches: number; messages: number } {
  const u = String(uid);
  const s = load();

  // matches = count of unclicked matches
  const matchesMap = s.matchesByUser[u] ?? {};
  const clickedMap = s.clickedMatchesByUser[u] ?? {};
  const newMatches = Object.keys(matchesMap).reduce((acc, mid) => acc + (clickedMap[mid] === false ? 1 : 0), 0);

  // messages = total unread across matches
  const unreadMap = s.unreadByUser[u] ?? {};
  const unreadTotal = Object.values(unreadMap).reduce((acc, v) => acc + clamp(v), 0);

  return {
    total: clamp(newMatches + unreadTotal),
    matches: clamp(newMatches),
    messages: clamp(unreadTotal),
  };
}
