'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { requireSession } from '@/lib/session';
import { uidFromToken, getMatchesFor, clearNewMatches, type Match } from '@/lib/socialStore';

function otherUid(m: Match, me: string) {
  return m.a === me ? m.b : m.a;
}

export default function MatchesPage() {
  const token = useMemo(() => {
    try { return requireSession(); } catch { return null as any; }
  }, []);
  const uid = useMemo(() => uidFromToken(token) ?? 'anon', [token]);

  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    try {
      // Clear the "new match" badge when you open the matches screen
      clearNewMatches(uid);
    } catch {}
    try {
      setMatches(getMatchesFor(uid));
    } catch {
      setMatches([]);
    }
  }, [uid]);

  return (
    <div className="ff-page">
      <AppHeader active="matches" />
      <main className="ff-shell">
        <h2 className="ff-h2">Matches</h2>

        {matches.length === 0 ? (
          <div className="ff-card">
            <div className="ff-muted">No matches yet.</div>
            <div className="ff-muted" style={{ marginTop: 8 }}>
              Tip: A match happens only when <b>both</b> users like each other.
            </div>
          </div>
        ) : (
          <div className="ff-grid">
            {matches.map((m) => {
              const other = otherUid(m, uid);
              const title = other || m.id;
              const subtitle =
                m.lastMessageText
                  ? m.lastMessageText
                  : m.lastMessageAt
                    ? 'Last message'
                    : 'New match';

              return (
                <Link key={m.id} className="ff-card ff-match-row" href={`/matches/${m.id}`}>
                  <div className="ff-match-left">
                    <div className="ff-avatar" aria-hidden="true">{(title || 'U')[0]?.toUpperCase()}</div>
                  </div>
                  <div className="ff-match-mid">
                    <div className="ff-match-name">{title}</div>
                    <div className="ff-muted">{subtitle}</div>
                  </div>
                  <div className="ff-match-right">
                    <span className="ff-pill">Open</span>
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
