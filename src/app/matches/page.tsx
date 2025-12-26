'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { requireSession } from "@/lib/session";
import { uidFromToken, getMatchesFor, type Match } from "@/lib/socialStore";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

type ProfileLite = {
  uid: string;
  displayName: string;
  photoUrl: string;
};

function otherUidFor(match: Match, me: string): string {
  // Match is expected to be { id, a, b, createdAt?, ... }
  // Fallback defensively if structure changes.
  // @ts-expect-error - tolerate legacy shapes
  const a: string | undefined = (match as any).a ?? (match as any).userA ?? (match as any).uidA;
  // @ts-expect-error - tolerate legacy shapes
  const b: string | undefined = (match as any).b ?? (match as any).userB ?? (match as any).uidB;

  if (a && b) return a === me ? b : a;

  // @ts-expect-error - tolerate legacy matchId encodings
  const id: string = (match as any).id ?? "";
  // common encoding: "uidA__uidB"
  if (id.includes("__")) {
    const parts = id.split("__");
    if (parts.length === 2) return parts[0] === me ? parts[1] : parts[0];
  }
  return "";
}

function formatWhen(ts: unknown): string {
  const n =
    typeof ts === "number" ? ts :
    typeof ts === "string" ? Number(ts) :
    // Firestore Timestamp (client) shape: { seconds, nanoseconds }
    (ts && typeof ts === "object" && "seconds" in (ts as any)) ? ((ts as any).seconds * 1000) :
    0;

  if (!n || !Number.isFinite(n)) return "";
  const d = new Date(n);
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "numeric", minute: "2-digit" });
}

async function loadProfile(uid: string): Promise<ProfileLite | null> {
  if (!uid) return null;

  // Try Firestore: profiles/<uid>
  try {
    const snap = await getDoc(doc(db, "profiles", uid));
    if (snap.exists()) {
      const data: any = snap.data();
      const displayName =
        String(
          data.displayName ??
          data.name ??
          data.username ??
          data.email ??
          uid
        );
      const photoUrl = String(data.photoUrl ?? data.profilePhotoUrl ?? data.avatarUrl ?? "");
      return { uid, displayName, photoUrl };
    }
  } catch {
    // ignore
  }

  return { uid, displayName: uid.slice(0, 8), photoUrl: "" };
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
    try {
      return uidFromToken(token) ?? "anon";
    } catch {
      return "anon";
    }
  }, [token]);

  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const matches = useMemo(() => {
    try {
      return getMatchesFor(uid);
    } catch {
      return [];
    }
  }, [uid]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const wanted = new Set<string>();
      for (const m of matches) {
        const other = otherUidFor(m, uid);
        if (other) wanted.add(other);
      }

      const missing = Array.from(wanted).filter((u) => !profiles[u]);
      if (missing.length === 0) return;

      const loaded = await Promise.all(missing.map(loadProfile));
      if (cancelled) return;

      setProfiles((prev) => {
        const next = { ...prev };
        for (const p of loaded) {
          if (p) next[p.uid] = p;
        }
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, matches.map((m) => (m as any).id ?? "").join("|")]);

  return (
    <div className="ff-page">
      <AppHeader active="matches" />
      <main className="ff-shell">
        <h1 className="ff-h1">Matches</h1>

        {matches.length === 0 ? (
          <p className="ff-muted">
            No matches yet. Swipe right on Discover and make sure the other account likes you back.
          </p>
        ) : (
          <div className="ff-list">
            {matches.map((m) => {
              const matchId = (m as any).id as string;
              const other = otherUidFor(m, uid);
              const p = other ? profiles[other] : undefined;

              const name = p?.displayName ?? (other ? other.slice(0, 8) : "Match");
              const photo = p?.photoUrl || "/frugalfetishes.png";
              const when = formatWhen((m as any).createdAt ?? (m as any).created_at ?? (m as any).ts);

              return (
                <div key={matchId} className="ff-row">
                  <div className="ff-row-left">
                    <img className="ff-avatar" src={photo} alt={name} />
                    <div className="ff-row-text">
                      <div className="ff-row-title">{name}</div>
                      <div className="ff-row-sub">
                        {when ? `Matched ${when}` : "New match"}
                      </div>
                    </div>
                  </div>

                  <Link className="ff-btn" href={`/matches/${matchId}`}>
                    Open
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
