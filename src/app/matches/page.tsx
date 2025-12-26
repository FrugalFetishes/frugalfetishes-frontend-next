'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import AppHeader from '@/components/AppHeader';
import { requireSession } from '@/lib/session';
import { getMatchesFor, loadUserProfileSnapshot, uidFromToken, type Match, markMatchClicked } from '@/lib/socialStore';

function placeholderAvatarDataUri(label: string) {
  const seed = (label || 'U').trim();
  const ch = (seed[0] || 'U').toUpperCase();
  // simple hash -> 24bit color
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const bg = `#${((h >>> 8) & 0xffffff).toString(16).padStart(6, '0')}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">
  <rect width="100%" height="100%" rx="16" ry="16" fill="${bg}"/>
  <text x="50%" y="55%" text-anchor="middle" font-family="Arial" font-size="34" fill="#fff" font-weight="700">${ch}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}


type Row = {
  matchId: string;
  otherUid: string;
  createdAt: number | undefined;
  name: string;
  photo: string;
};

function toMs(v: any): number | undefined {
  if (v == null) return undefined;
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  // Firestore Timestamp-like
  if (typeof v?.toMillis === 'function') {
    try { return v.toMillis(); } catch {}
  }
  if (typeof v?.seconds === 'number') return v.seconds * 1000;
  return undefined;
}

function fmtDate(ms?: number) {
  if (!ms) return '';
  try {
    const d = new Date(ms);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

function fmtTime(ms?: number) {
  if (!ms) return '';
  try {
    const d = new Date(ms);
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

function pickPhoto(p: any, fallbackLabel: string) {
  const url =
    p?.photoUrl ||
    p?.photoURL ||
    p?.avatarUrl ||
    p?.primaryPhotoUrl ||
    (Array.isArray(p?.photos) && p.photos[0]?.url) ||
    (Array.isArray(p?.gallery) && p.gallery[0]?.url) ||
    '';
  if (typeof url === 'string' && url.trim()) return url.trim();
  return placeholderAvatarDataUri(fallbackLabel);
}

function displayName(p: any, fallbackUid: string) {
  const name = p?.displayName || p?.name || p?.username || '';
  if (typeof name === 'string' && name.trim()) return name.trim();
  // short uid fallback
  if (fallbackUid.includes('@')) return fallbackUid.split('@')[0];
  return fallbackUid.slice(0, 8);
}

function otherUidForMatch(m: Match, myUid: string) {
  if (!m) return '';
  return m.a === myUid ? m.b : m.b === myUid ? m.a : (m.b || m.a || '');
}

export default function MatchesPage() {
  const token = useMemo(() => requireSession(), []);
  const myUid = useMemo(() => uidFromToken(token) || 'anon', [token]);

  const rows: Row[] = useMemo(() => {
    let matches: Match[] = [];
    try {
      matches = getMatchesFor(myUid) as Match[];
    } catch {}

    const out: Row[] = [];
    for (const m of matches) {
      const otherUid = otherUidForMatch(m, myUid);
      const snap = otherUid ? loadUserProfileSnapshot(otherUid) : null;
      const name = displayName(snap, otherUid || 'User');
      const photo = pickPhoto(snap, name || otherUid || 'U');
      const createdAt = toMs((m as any).createdAt);
      out.push({ matchId: m.id, otherUid, createdAt, name, photo });
    }

    // newest first
    out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return out;
  }, [myUid]);

  return (
    <div className="ff-page">
      <AppHeader active="matches" />

      <main className="ff-shell">
        <h1 className="ff-h1">Matches</h1>

        {rows.length === 0 ? (
          <div style={{ opacity: 0.85, padding: 14 }}>No matches yet.</div>
        ) : (
          <div style={{ display: 'grid', gap: 10, maxWidth: 640 }}>
            {rows.map((r) => (
              <div
                key={r.matchId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: 12,
                  borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.10)',
                  background: 'rgba(255,255,255,0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <img
                    src={r.photo}
                    alt={r.name || 'Match'}
                    style={{ width: 44, height: 44, borderRadius: 14, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.10)' }}
                    draggable={false}
                  />

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.name || 'Someone'}
                    </div>
                    <div style={{ opacity: 0.75, fontSize: 12 }}>
                      {fmtDate(r.createdAt)} {fmtTime(r.createdAt)}
                    </div>
                  </div>
                </div>

                <Link
                  href={`/matches/${encodeURIComponent(r.matchId)}`}
                  onClick={() => {
                    try { markMatchClicked(r.matchId, myUid); } catch {}
                  }}
                  style={{
                    borderRadius: 999,
                    padding: '9px 12px',
                    border: '1px solid rgba(255,255,255,0.14)',
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.92)',
                    textDecoration: 'none',
                    fontSize: 12,
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                  }}
                >
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
