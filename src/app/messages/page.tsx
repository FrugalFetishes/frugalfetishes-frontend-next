'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import AppHeader from '@/components/AppHeader';
import { requireSession } from '@/lib/session';
import {
  getMatchesFor,
  getChat,
  loadUserProfileSnapshot,
  uidFromToken,
  unreadCountForMatch,
  type Match,
} from '@/lib/socialStore';

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
  name: string;
  photo: string;
  lastAt?: number;
  unread: number;
};

function toMs(v: any): number | undefined {
  if (v == null) return undefined;
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  if (typeof v?.toMillis === 'function') {
    try { return v.toMillis(); } catch {}
  }
  if (typeof v?.seconds === 'number') return v.seconds * 1000;
  return undefined;
}

function displayName(p: any, fallbackUid: string) {
  const name = p?.displayName || p?.name || p?.username || '';
  if (typeof name === 'string' && name.trim()) return name.trim();
  if (fallbackUid.includes('@')) return fallbackUid.split('@')[0];
  return fallbackUid.slice(0, 8);
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

function otherUidForMatch(m: Match, myUid: string) {
  if (!m) return '';
  return m.a === myUid ? m.b : m.b === myUid ? m.a : (m.b || m.a || '');
}

function fmtLast(ms?: number) {
  if (!ms) return '';
  try {
    return new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function MessagesPage() {
  const token = useMemo(() => requireSession(), []);
  const myUid = useMemo(() => uidFromToken(token) || 'anon', [token]);

  const rows: Row[] = useMemo(() => {
    let matches: Match[] = [];
    try { matches = getMatchesFor(myUid) as Match[]; } catch {}
    const out: Row[] = [];

    for (const m of matches) {
      const otherUid = otherUidForMatch(m, myUid);
      const snap = otherUid ? loadUserProfileSnapshot(otherUid) : null;
      const name = displayName(snap, otherUid || 'User');
      const photo = pickPhoto(snap, name || otherUid || 'U');

      const chat = getChat(m.id) || [];
      const last = chat.length ? toMs(chat[chat.length - 1]?.createdAt) : toMs((m as any).createdAt);
      const unread = unreadCountForMatch(m.id, myUid);
      out.push({ matchId: m.id, otherUid, name, photo, lastAt: last, unread });
    }

    out.sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));
    return out;
  }, [myUid]);

  return (
    <div className="ff-page">
      <AppHeader active="messages" />

      <div className="ff-shell">
        <h1 className="ff-h1">Messages</h1>

        {rows.length === 0 ? (
          <div style={{ opacity: 0.85, padding: 14 }}>No chats yet.</div>
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
                    alt={r.name || 'Chat'}
                    style={{ width: 44, height: 44, borderRadius: 14, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.10)' }}
                    draggable={false}
                  />

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.name || 'Someone'}
                      </div>
                      {r.unread ? (
                        <span
                          style={{
                            minWidth: 18,
                            height: 18,
                            padding: '0 6px',
                            borderRadius: 999,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: 800,
                            background: '#ff3b30',
                            color: '#fff',
                          }}
                        >
                          {r.unread > 99 ? '99+' : String(r.unread)}
                        </span>
                      ) : null}
                    </div>
                    <div style={{ opacity: 0.75, fontSize: 12 }}>{fmtLast(r.lastAt)}</div>
                  </div>
                </div>

                <Link
                  href={`/chat/${encodeURIComponent(r.matchId)}`}
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
      </div>
    </div>
  );
}
