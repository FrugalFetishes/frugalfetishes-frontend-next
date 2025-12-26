// src/app/matches/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { readSession } from "@/lib/session";
import { uidFromSessionToken, getBadges, clearNewMatches, getMatchesFor, type Match } from "@/lib/socialStore";

export default function MatchesPage() {
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [badges, setBadges] = useState({ total: 0, matches: 0, messages: 0 });

  // Load client-only data
  useEffect(() => {
    const tok = readSession();
    const u = uidFromSessionToken(tok);
    if (!u) {
      router.replace("/login");
      return;
    }
    setUid(u);
    setBadges(getBadges(u));
    setMatches(getMatchesFor(u));
    // Clear "new match" badge when user opens matches page
    clearNewMatches(u);
    setBadges(getBadges(u));
  }, [router]);

  const empty = useMemo(() => !matches || matches.length === 0, [matches]);

  return (
    <div className="appShell">
      <AppHeader active="matches" badges={badges} />
      <main className="appMain">
        <h1 className="pageTitle">Matches</h1>

        {empty ? (
          <div className="panel">
            <div className="panelTitle">No matches yet</div>
            <div className="panelText">Like someone in Discover to create one.</div>
            <div style={{ marginTop: 12 }}>
              <Link className="pillBtn" href="/discover">Go to Discover</Link>
            </div>
          </div>
        ) : (
          <div className="grid">
            {matches.map((m) => {
              const other = uid ? (m.a === uid ? m.b : m.a) : "";
              return (
                <Link key={m.id} href={`/matches/${encodeURIComponent(other)}`} className="matchCard">
                  <div className="matchCardTitle">{other}</div>
                  <div className="matchCardMeta">
                    {m.lastMessageText ? m.lastMessageText : "Tap to view profile"}
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
