"use client";

import { useMemo } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { requireSession } from "@/lib/session";
import { uidFromToken, getMatchesFor, loadUserProfileSnapshot, type UserProfileSnapshot } from "@/lib/socialStore";

export default function MatchesPage() {
  const token = useMemo(() => {
    try { return requireSession(); } catch { return null as any; }
  }, []);
  const uid = useMemo(() => uidFromToken(token) ?? "anon", [token]);

  const matches = useMemo(() => getMatchesFor(uid), [uid]);

  return (
    <div className="ff-page">
      <AppHeader active="matches" />
      <main className="ff-shell">
        <h1 className="ff-title">Matches</h1>

        {matches.length === 0 ? (
          <div className="ff-muted">No matches yet. Swipe right on Discover and make sure the other account likes you back.</div>
        ) : (
          <div className="ff-list">
            {matches.map((m) => {
              const otherUid = m.a === uid ? m.b : m.a;
              const p = loadUserProfileSnapshot(otherUid) as UserProfileSnapshot | null;
              const name = p?.name || otherUid;
              const photo = p?.photoUrl || p?.profilePhotoUrl || p?.imageUrl || p?.avatarUrl || "/frugalfetishes.png";
              return (
                <Link key={m.id} href={`/matches/${m.id}`} className="ff-row">
                  <img className="ff-avatar" src={photo} alt={name} />
                  <div className="ff-row-main">
                    <div className="ff-row-title">{name}</div>
                    <div className="ff-row-sub ff-muted">New match</div>
                  </div>
                  <span className="ff-pill">Open</span>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
