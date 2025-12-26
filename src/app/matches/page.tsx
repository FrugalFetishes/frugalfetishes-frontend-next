'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import AppHeader from '@/components/AppHeader';
import { requireSession } from '@/lib/session';
import {
  uidFromToken,
  getMatchesFor,
  loadUserProfileSnapshot,
  type Match,
} from '@/lib/socialStore';

type Row = {
  matchId: string;
  otherUid: string;
  name: string;
  photo: string;
  matchedAt?: number;
};

function shortUid(uid: string) {
  if (!uid) return 'User';
  const s = String(uid);
  return s.includes('@') ? s.split('@')[0] : s.slice(0, 8);
}

function toMillis(v: any): number | undefined {
  if (v == null) return undefined;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
    const d = Date.parse(v);
    if (Number.isFinite(d)) return d;
    return undefined;
  }
  // Firestore Timestamp shape { seconds, nanoseconds }
  if (typeof v === 'object' && typeof v.seconds === 'number') return v.seconds * 1000;
  return undefined;
}

function matchIdFrom(m: string | Match): string {
  if (typeof m === 'string') return m;
  const anyM: any = m as any;
  return String(anyM.id ?? anyM.matchId ?? anyM.key ?? '');
}

function otherUidFrom(m: string | Match, selfUid: string): string {
  if (typeof m === 'string') {
    // If matchId encodes both uids like "uidA__uidB" or "uidA:uidB" try to extract.
    const s = m;
    const parts = s.includes('__') ? s.split('__') : s.includes(':') ? s.split(':') : s.split('|');
    if (parts.length === 2) return parts[0] === selfUid ? parts[1] : parts[0];
    return '';
  }
  const anyM: any = m as any;
  const a: string | undefined = anyM.a ?? anyM.userA ?? anyM.uidA;
  const b: string | undefined = anyM.b ?? anyM.userB ?? anyM.uidB;
  if (a && b) return a === selfUid ? b : a;
  // last resort: try parsing from id
  const mid = matchIdFrom(m);
  return otherUidFrom(mid, selfUid);
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
      return uidFromToken(token);
    } catch {
      return '';
    }
  }, [token]);

  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string>('');

  useEffect(() => {
    let alive = true;

    const run = async () => {
      try {
        setErr('');
        if (!uid) {
          if (alive) setRows([]);
          return;
        }

        const raw = getMatchesFor(uid) as unknown as Array<string | Match>;
        const list = Array.isArray(raw) ? raw : [];

        const built: Row[] = [];
        for (const m of list) {
          const matchId = matchIdFrom(m);
          if (!matchId) continue;

          const otherUid = otherUidFrom(m, uid);
          const snap: any = otherUid ? await loadUserProfileSnapshot(otherUid) : null;

          const name =
            (snap?.displayName as string) ||
            (snap?.name as string) ||
            (snap?.username as string) ||
            shortUid(otherUid);

          const photo =
            (snap?.photoUrl as string) ||
            (snap?.photoURL as string) ||
            (snap?.avatarUrl as string) ||
            (snap?.avatar as string) ||
            '/icon.png';

          const anyM: any = typeof m === 'string' ? {} : (m as any);
          const matchedAt =
            toMillis(anyM.createdAt) ??
            toMillis(anyM.matchedAt) ??
            toMillis(anyM.ts) ??
            toMillis(anyM.updatedAt);

          built.push({ matchId, otherUid, name, photo, matchedAt });
        }

        // newest first when we have timestamps
        built.sort((x, y) => (y.matchedAt ?? 0) - (x.matchedAt ?? 0));

        if (alive) setRows(built);
      } catch (e: any) {
        if (!alive) return;
        setRows([]);
        setErr(e?.message ? String(e.message) : 'Failed to load matches');
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [uid]);

  return (
    <div className="ff-page">
      <AppHeader active="matches" />

      <main className="ff-main">
        <h1 className="ff-h1">Matches</h1>

        {err ? (
          <div className="ff-muted" style={{ maxWidth: 720 }}>
            {err}
          </div>
        ) : null}

        {rows.length === 0 ? (
          <div className="ff-muted">
            No matches yet. Swipe right on Discover and make sure the other account likes you back.
          </div>
        ) : (
          <div className="ff-list">
            {rows.map((r) => {
              const when =
                r.matchedAt != null
                  ? new Date(r.matchedAt).toLocaleString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : 'New match';

              return (
                <div key={r.matchId} className="ff-row">
                  <div className="ff-row-left">
                    <img className="ff-avatar" src={r.photo} alt={r.name} />
                    <div className="ff-row-text">
                      <div className="ff-row-title">{r.name}</div>
                      <div className="ff-row-sub">{when}</div>
                    </div>
                  </div>

                  <Link className="ff-btn" href={`/matches/${encodeURIComponent(r.matchId)}`}>
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
