// src/lib/matchesStore.ts
"use client";

export type StoredMatch = {
  id: string;
  name: string;
  age?: number;
  city?: string;
  bio?: string;
  photoUrl?: string;
  photos?: string[];
  matchedAt: number; // epoch ms
};

const KEY = "ff_matches_v1";

function safeParse(raw: string | null): StoredMatch[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v.filter((m) => m && typeof m.id === "string" && typeof m.name === "string")
      .map((m) => ({
        id: String(m.id),
        name: String(m.name),
        age: typeof m.age === "number" ? m.age : undefined,
        city: typeof m.city === "string" ? m.city : undefined,
        bio: typeof m.bio === "string" ? m.bio : undefined,
        photoUrl: typeof m.photoUrl === "string" ? m.photoUrl : undefined,
        photos: Array.isArray(m.photos) ? m.photos.map(String) : undefined,
        matchedAt: typeof m.matchedAt === "number" ? m.matchedAt : Date.now(),
      }));
  } catch {
    return [];
  }
}

export function loadMatches(): StoredMatch[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(KEY))
    .sort((a, b) => b.matchedAt - a.matchedAt);
}

export function saveMatches(list: StoredMatch[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

export function addMatch(m: Omit<StoredMatch, "matchedAt"> & Partial<Pick<StoredMatch, "matchedAt">>) {
  if (typeof window === "undefined") return;

  const list = loadMatches();
  const next: StoredMatch = {
    id: m.id,
    name: m.name,
    age: m.age,
    city: m.city,
    bio: m.bio,
    photoUrl: m.photoUrl,
    photos: m.photos,
    matchedAt: typeof m.matchedAt === "number" ? m.matchedAt : Date.now(),
  };

  // de-dupe by id
  const filtered = list.filter((x) => x.id !== next.id);
  filtered.unshift(next);
  saveMatches(filtered);
}

export function clearMatches() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
