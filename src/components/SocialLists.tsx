'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';

import {
  getMatchesFor,
  getChat,
  unreadCountForMatch,
  loadUserProfileSnapshot,
  type Match,
  type Message,
  isMatchClicked,
} from '@/lib/socialStore';

type Row = {
  matchId: string;
  otherUid: string;
  otherName: string;
  otherPhotoUrl: string;
  lastText: string;
  lastAt: number;
  unread: number;
  clicked: boolean;
};

function clamp(n: any): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, x);
}

function formatTime(ts: number): string {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) {
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function placeholderAvatarDataUri(label: string) {
  const seed = (label || 'U').trim();
  const safe = seed.replace(/</g, '&lt;').slice(0, 2).toUpperCase();
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2a0a2a"/>
      <stop offset="1" stop-color="#111"/>
    </linearGradient>
  </defs>
  <rect width="140" height="140" rx="70" fill="url(#g)"/>
  <text x="50%" y="54%" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        font-size="54" font-weight="800" fill="#fff">${safe}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function buildRows(myUid: string): Row[] {
  let matches: Match[] = [];
  try {
    matches = getMatchesFor(myUid) as any;
  } catch {}

  const rows: Row[] = [];

  for (const m of matches || []) {
    const otherUid = (m as any).a === myUid ? (m as any).b : (m as any).a;
    const snap = (() => {
      try {
        return loadUserProfileSnapshot(otherUid) as any;
      } catch {
        return null as any;
      }
    })();

    const otherName = String(snap?.displayName || snap?.name || otherUid || 'User');
    const otherPhotoUrl = String(snap?.photoUrl || snap?.photoURL || snap?.avatarUrl || snap?.primaryPhotoUrl || '');

    const chat = (() => {
      try {
        return getChat(String((m as any).id || (m as any).matchId || '')) as any;
      } catch {
        return [] as any;
      }
    })() as Message[];

    const last = (chat || []).slice().sort((a: any, b: any) => clamp(a?.createdAt) - clamp(b?.createdAt)).pop() as any;

    const lastText = String(last?.text || '');
    const lastAt = clamp(last?.createdAt) || clamp((m as any).createdAt) || clamp((m as any).matchedAt);

    const matchId = String((m as any).id || (m as any).matchId || '');
    const unread = (() => {
      try {
        return clamp(unreadCountForMatch(myUid, matchId));
      } catch {
        return 0;
      }
    })();

    const clicked = (() => {
      try {
        return Boolean(isMatchClicked(myUid, matchId));
      } catch {
        return false;
      }
    })();

    rows.push({
      matchId,
      otherUid,
      otherName,
      otherPhotoUrl,
      lastText,
      lastAt,
      unread,
      clicked,
    });
  }

  rows.sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));
  return rows;
}

export function SocialMatchesLayout(props: { myUid: string }) {
  const router = useRouter();

  const rows = useMemo(() => buildRows(props.myUid), [props.myUid]);

  const newMatches = rows.filter((r) => !r.clicked);
  const conversations = rows; // all matches have a chat thread in this app model

  const sectionTitle: React.CSSProperties = {
    fontSize: 24,
    fontWeight: 900,
    margin: '18px 0 10px',
  };

  const subTitle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 800,
    opacity: 0.9,
    margin: '14px 0 10px',
  };

  const horizScroll: React.CSSProperties = {
    display: 'flex',
    gap: 12,
    overflowX: 'auto',
    paddingBottom: 8,
    paddingTop: 2,
  };

  const newCard: React.CSSProperties = {
    width: 138,
    minWidth: 138,
    height: 164,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    boxShadow: '0 6px 22px rgba(0,0,0,0.35)',
    background: 'rgba(0,0,0,0.2)',
    cursor: 'pointer',
  };

  const waveBtn: React.CSSProperties = {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(0,0,0,0.35)',
    color: 'rgba(255,255,255,0.92)',
    padding: '8px 10px',
    fontWeight: 800,
    fontSize: 14,
    cursor: 'pointer',
  };

  const convoRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 6px',
    borderRadius: 14,
    cursor: 'pointer',
  };

  const avatarWrap: React.CSSProperties = {
    width: 56,
    height: 56,
    borderRadius: 999,
    overflow: 'hidden',
    flex: '0 0 auto',
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(0,0,0,0.25)',
  };

  const avatarImg: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  };

  const nameStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 900,
    lineHeight: 1.1,
    marginBottom: 4,
  };

  const previewStyle: React.CSSProperties = {
    fontSize: 14,
    opacity: 0.85,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 520,
  };

  const metaRight: React.CSSProperties = {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flex: '0 0 auto',
  };

  const dot: React.CSSProperties = {
    width: 12,
    height: 12,
    borderRadius: 999,
    background: '#8b5cf6',
    boxShadow: '0 0 0 4px rgba(139,92,246,0.12)',
  };

  const countBadge: React.CSSProperties = {
    minWidth: 20,
    height: 20,
    padding: '0 6px',
    borderRadius: 999,
    background: '#ef4444',
    color: '#fff',
    fontWeight: 900,
    fontSize: 12,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={sectionTitle}>Matches</div>

      <div style={subTitle}>New matches</div>
      {newMatches.length ? (
        <div style={horizScroll}>
          {newMatches.map((r) => (
            <div
              key={r.matchId}
              style={newCard}
              onClick={() => router.push(`/matches/${encodeURIComponent(r.matchId)}`)}
              role="button"
              aria-label={`Open match ${r.otherName}`}
            >
              <img
                src={r.otherPhotoUrl || placeholderAvatarDataUri(r.otherName)}
                alt={r.otherName}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                draggable={false}
                onError={(e) => {
                  try {
                    (e.currentTarget as any).src = placeholderAvatarDataUri(r.otherName);
                  } catch {}
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0) 55%)',
                }}
              />
              <div style={{ position: 'absolute', left: 10, bottom: 46, fontWeight: 900, fontSize: 16 }}>
                {r.otherName}
              </div>
              <button
                type="button"
                style={waveBtn}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/chat/${encodeURIComponent(r.matchId)}`);
                }}
              >
                Message
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ opacity: 0.85, padding: '8px 0 6px' }}>No new matches yet.</div>
      )}

      <div style={subTitle}>Conversations</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {conversations.length ? (
          conversations.map((r) => (
            <div
              key={r.matchId}
              style={convoRow}
              onClick={() => router.push(`/chat/${encodeURIComponent(r.matchId)}`)}
              role="button"
              aria-label={`Open chat with ${r.otherName}`}
            >
              <div style={avatarWrap}>
                <img
                  src={r.otherPhotoUrl || placeholderAvatarDataUri(r.otherName)}
                  alt={r.otherName}
                  style={avatarImg}
                  draggable={false}
                  onError={(e) => {
                    try {
                      (e.currentTarget as any).src = placeholderAvatarDataUri(r.otherName);
                    } catch {}
                  }}
                />
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={nameStyle}>{r.otherName}</div>
                <div style={previewStyle}>{r.lastText || 'Say hello…'}</div>
              </div>

              <div style={metaRight}>
                <div style={{ opacity: 0.75, fontSize: 12, fontWeight: 700 }}>{formatTime(r.lastAt)}</div>
                {r.unread > 0 ? (
                  r.unread === 1 ? (
                    <span style={dot} aria-label="Unread" />
                  ) : (
                    <span style={countBadge} aria-label={`${r.unread} unread`}>
                      {r.unread}
                    </span>
                  )
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div style={{ opacity: 0.85, padding: '8px 0 10px' }}>No conversations yet.</div>
        )}
      </div>
    </div>
  );
}
