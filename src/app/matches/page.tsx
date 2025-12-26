"use client";

import { useMemo } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { requireSession } from "@/lib/session";
import { uidFromToken, getMatchesFor, loadUserProfileSnapshot } from "@/lib/socialStore";

type MatchLike = string | { id?: string } | any;

function toMatchId(m: MatchLike): string {
  if (typeof m === "string") return m;
  if (m && typeof m.id === "string") return m.id;
  try {
    return String(m);
  } catch {
    return "";
  }
}

export default function MatchesPage() {
  const token = useMemo(() => {
    try { return requireSession(); } catch { return null as any; }
  }, []);
  const uid = useMemo(() => uidFromToken(token) ?? "anon", [token]);

  const matches = useMemo(() => {
    try { return getMatchesFor(uid) as MatchLike[]; } catch { return [] as MatchLike[]; }
  }, [uid]);

  return (
    <div className="ff-page">
      <AppHeader active="matches" />

      <main className="ff-shell">
        <h1 className="ff-h1">Matches</h1>

        {matches.length === 0 ? (
          <div className="ff-muted">
            No matches yet. Swipe right on Discover and make sure the other account likes you back.
          </div>
        ) : (
          <div className="ff-list">
            {matches.map((m, idx) => {
              const matchId = toMatchId(m) || `m:${idx}`;
              const parts = String(matchId).split("__");
              const otherUid =
                parts.length === 2 ? (parts[0] === uid ? parts[1] : parts[0]) : "";

              const p: any = otherUid ? loadUserProfileSnapshot(otherUid) : null;
              const name =
                p?.name ||
                p?.displayName ||
                p?.username ||
                p?.email ||
                otherUid ||
                "New match";
              const photo =
                p?.photoUrl ||
                p?.profilePhotoUrl ||
                p?.avatarUrl ||
                p?.imageUrl ||
                "/frugalfetishes.png";

              return (
                <div key={matchId} className="ff-row">
                  <div className="ff-row-left">
                    <img className="ff-avatar" src={photo} alt={name} />
                    <div className="ff-row-text">
                      <div className="ff-row-title">{name}</div>
                      <div className="ff-muted">New match</div>
                    </div>
                  </div>

                  <Link className="ff-pill" href={`/matches/${matchId}`}>
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
