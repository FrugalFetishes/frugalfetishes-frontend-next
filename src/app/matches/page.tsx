"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { requireSession } from "@/lib/session";
import { uidFromToken, consumeNewMatches, listMatchesFor, loadUserProfileSnapshot } from "@/lib/socialStore";

export default function MatchesPage() {
  const token = useMemo(() => {
    try { return requireSession(); } catch { return null as any; }
  }, []);
  const uid = useMemo(() => uidFromToken(token) ?? "anon", [token]);

  const [matches, setMatches] = useState(() => listMatchesFor(uid));

  useEffect(() => {
    // opening Matches should clear "new match" badge
    try { consumeNewMatches(uid); } catch {}
    const id = window.setInterval(() => setMatches(listMatchesFor(uid)), 700);
    return () => window.clearInterval(id);
  }, [uid]);

  return (
    <div className="ff-page">
      <AppHeader active="matches" />

      <main className="ff-shell">
        <h1 className="ff-title">Matches</h1>

        {matches.length === 0 ? (
          <div className="ff-card">
            <div className="ff-muted">No matches yet. Like someone in Discover to create one.</div>
          </div>
        ) : (
          <div className="ff-grid">
            {matches.map((m) => {
              const p = loadUserProfileSnapshot(m.otherUserId);
              const photo = p?.photoUrl || p?.profilePhotoUrl || p?.imageUrl || p?.avatarUrl || "/frugalfetishes.png";
              const name = p?.name || m.otherUserId;
              const age = typeof p?.age === "number" ? p.age : "";
              return (
                <Link key={m.matchId} className="ff-match" href={`/matches/${m.matchId}`}>
                  <img className="ff-match-img" src={photo} alt={name} />
                  <div className="ff-match-meta">
                    <div className="ff-match-name">{name}{age ? `, ${age}` : ""}</div>
                    <div className="ff-muted">Tap to view / message</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
