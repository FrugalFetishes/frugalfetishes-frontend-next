"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";
import { requireSession } from "@/lib/session";

type Profile = {
  id: string;
  name?: string;
  age?: number;
  city?: string;
  photoUrl?: string;
};

const SEEN_KEY = "ff_seen_profiles_v1";

function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x) => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function saveSeen(seen: Set<string>) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen)));
  } catch {
    // ignore
  }
}

export default function DiscoverPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [idx, setIdx] = useState(0);
  const [status, setStatus] = useState<string>("");

  const [loading, setLoading] = useState(false);

  const seenRef = useRef<Set<string> | null>(null);

  const current = useMemo(() => profiles[idx] ?? null, [profiles, idx]);

  useEffect(() => {
    // Client-side auth guard
    requireSession();
    // Load seen list once
    if (!seenRef.current && typeof window !== "undefined") {
      seenRef.current = loadSeen();
    }
    // Fetch deck
    void loadDeck(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadDeck(initial = false) {
    if (loading) return;
    setLoading(true);
    setStatus(initial ? "Loading..." : "Refreshing...");
    try {
      const res = await apiGet("/api/feed");
      const list: Profile[] = Array.isArray(res?.profiles)
        ? res.profiles
        : Array.isArray(res)
          ? res
          : [];

      const seen = seenRef.current ?? new Set<string>();
      const filtered = list.filter((p) => p?.id && !seen.has(String(p.id)));

      setProfiles(filtered);
      setIdx(0);

      if (filtered.length === 0) {
        setStatus("No more profiles.");
      } else {
        setStatus("Ready");
      }
    } catch (e: any) {
      setStatus(e?.message ? String(e.message) : "Failed to load feed.");
    } finally {
      setLoading(false);
    }
  }

  function markSeen(profileId: string) {
    const seen = seenRef.current ?? new Set<string>();
    seen.add(profileId);
    seenRef.current = seen;
    saveSeen(seen);
  }

  async function act(action: "like" | "pass") {
    if (!current?.id) return;
    const id = String(current.id);
    markSeen(id);

    // Fire-and-forget to backend (if implemented)
    try {
      await apiPost(`/api/${action}`, { profileId: id });
    } catch {
      // ignore for now; local seen list still advances deck for testing
    }

    // advance
    const nextIdx = idx + 1;
    if (nextIdx >= profiles.length) {
      setStatus("No more profiles.");
    }
    setIdx(nextIdx);
  }

  function resetDeck() {
    try {
      localStorage.removeItem(SEEN_KEY);
    } catch {
      // ignore
    }
    seenRef.current = new Set();
    setProfiles([]);
    setIdx(0);
    setStatus("Resetting...");
    void loadDeck(false);
  }

  return (
    <main className="page">
      <div className="topbar">
        <div>
          <h1 className="title">Discover</h1>
          <div className="subtitle">{status}</div>
        </div>

        <div className="topbarActions">
          <button className="iconBtn" type="button" onClick={() => void loadDeck(false)} aria-label="Refresh deck" title="Refresh">
            ↻
          </button>
          <button className="iconBtn" type="button" onClick={resetDeck} aria-label="Reset test deck" title="Reset test deck">
            ⟲
          </button>
        </div>
      </div>

      {!current ? (
        <div className="emptyState">
          <div className="emptyCard">
            <div className="emptyTitle">No more profiles available</div>
            <div className="emptyBody">
              For testing, tap <b>Reset</b> (⟲) to see the same deck again.
            </div>

            <div className="emptyActions">
              <button className="primaryBtn" type="button" onClick={resetDeck}>
                Reset Deck
              </button>
              <button className="ghostBtn" type="button" onClick={() => void loadDeck(false)}>
                Refresh
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="deckWrap">
          <div className="card">
            <div
              className="cardMedia"
              style={{
                backgroundImage: current.photoUrl ? `url(${current.photoUrl})` : undefined
              }}
            />
            <div className="cardOverlay" />

            <div className="cardBody">
              <div className="cardTitle">
                {current.name ?? "Unknown"}
                {typeof current.age === "number" ? `, ${current.age}` : ""}
              </div>

              <div className="cardMeta">{current.city ?? ""}</div>

              <div className="cardActions">
                <button className="pillBtn" type="button" onClick={() => void act("pass")}>
                  ✕
                </button>

                <Link className="pillBtn" href={`/profile/${encodeURIComponent(String(current.id))}`}>
                  View
                </Link>

                <button className="pillBtn primary" type="button" onClick={() => void act("like")}>
                  ❤
                </button>
              </div>

              <div className="hint">Swipe: left=pass • right=like • up=view</div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
