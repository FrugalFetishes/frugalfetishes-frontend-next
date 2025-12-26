"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { requireSession } from "@/lib/session";
import { uidFromToken, getMatchesFor, type Match } from "@/lib/socialStore";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

type ProfileLite = {
  displayName?: string;
  name?: string;
  username?: string;
  photoUrl?: string;
  photoURL?: string;
  avatarUrl?: string;
};

type MatchRow = {
  matchId: string;
  otherUid: string;
  matchedAt?: number;
  name: string;
  photo: string;
};

function fallbackNameFromUid(uid: string): string {
  if (!uid) return "Match";
  if (uid.includes("@")) return uid.split("@")[0] || uid;
  return uid.slice(0, 8);
}

function toMillis(v: any): number | undefined {
  if (!v) return undefined;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
    const d = Date.parse(v);
    if (!Number.isNaN(d)) return d;
    return undefined;
  }
  // Firestore Timestamp-like
  if (typeof v === "object") {
    if (typeof v.toMillis === "function") {
      try {
        return v.toMillis();
      } catch {}
    }
    if (typeof v.seconds === "number") return v.seconds * 1000;
  }
  return undefined;
}

function getOtherUid(uid: string, match: any): string | null {
  // tolerate legacy shapes without failing typecheck
  const a: string | undefined = match?.a ?? match?.userA ?? match?.uidA ?? match?.users?.[0];
  const b: string | undefined = match?.b ?? match?.userB ?? match?.uidB ?? match?.users?.[1];
  if (a && b) return a === uid ? b : a;
  // fallback: if matchId encodes two uids "a__b"
  const id: string | undefined = match?.id ?? match?.matchId;
  if (id && id.includes("__")) {
    const [x, y] = id.split("__");
    if (x && y) return x === uid ? y : x;
  }
  return null;
}

function getMatchedAt(match: any): number | undefined {
  return (
    toMillis(match?.createdAt) ??
    toMillis(match?.matchedAt) ??
    toMillis(match?.created) ??
    toMillis(match?.ts) ??
    undefined
  );
}

function formatDateTime(ms?: number): string {
  if (!ms) return "";
  try {
    return new Date(ms).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

async function loadProfileLite(uid: string): Promise<ProfileLite | null> {
  try {
    const ref = doc(db, "profiles", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return (snap.data() as any) ?? null;
  } catch {
    return null;
  }
}

export default function MatchesPage() {
  const token = useMemo(() => {
    try {
      return requireSession();
    } catch {
      return null as any;
    }
  }, []);

  const uid = useMemo(() => {
    if (!token) return "anon";
    return uidFromToken(token) ?? "anon";
  }, [token]);

  const [rows, setRows] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);

      let matches: Match[] = [];
      try {
        matches = getMatchesFor(uid) as any;
      } catch {
        matches = [];
      }

      const built: MatchRow[] = [];

      for (const m of matches as any[]) {
        const matchId: string = String(m?.id ?? m?.matchId ?? "");
        const otherUid = getOtherUid(uid, m);
        if (!matchId || !otherUid) continue;

        const matchedAt = getMatchedAt(m);

        const prof = await loadProfileLite(otherUid);

        const name =
          (prof?.displayName || prof?.name || prof?.username || "").trim() ||
          fallbackNameFromUid(otherUid);

        const photo =
          (prof?.photoUrl || prof?.photoURL || prof?.avatarUrl || "").trim() ||
          "/avatar.png";

        built.push({ matchId, otherUid, matchedAt, name, photo });
      }

      // newest first
      built.sort((a, b) => (b.matchedAt ?? 0) - (a.matchedAt ?? 0));

      if (!cancelled) {
        setRows(built);
        setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [uid]);

  return (
    <div className="ff-page">
      <AppHeader active="matches" />

      <main className="ff-main">
        <h1 className="ff-h1">Matches</h1>

        {loading ? (
          <div className="ff-muted">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="ff-muted">
            No matches yet. Swipe right on Discover and make sure the other account likes you back.
          </div>
        ) : (
          <div className="ff-list">
            {rows.map((r) => (
              <div key={r.matchId} className="ff-row">
                <div className="ff-row-left">
                  <img className="ff-avatar" src={r.photo} alt={r.name} />
                  <div className="ff-row-text">
                    <div className="ff-row-title">{r.name}</div>
                    <div className="ff-row-sub">
                      {r.matchedAt ? `Matched ${formatDateTime(r.matchedAt)}` : "New match"}
                    </div>
                  </div>
                </div>

                <Link className="ff-pill" href={`/matches/${encodeURIComponent(r.matchId)}`}>
                  Open
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
