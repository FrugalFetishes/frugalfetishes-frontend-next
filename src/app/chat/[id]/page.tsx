'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import AppHeader from '@/components/AppHeader';
import { requireSession } from '@/lib/session';
import {
  uidFromToken,
  getMatchesFor,
  getChat,
  addChatMessage,
  clearUnreadForChat,
  loadUserProfileSnapshot,
} from '@/lib/socialStore';

type ChatMsg = {
  id: string;
  ts: number;
  from: string;
  to: string;
  text: string;
};

function asString(v: unknown, fallback = ''): string {
  if (typeof v === 'string') return v;
  if (v == null) return fallback;
  try { return String(v); } catch { return fallback; }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function placeholderAvatarDataUri(label: string) {
  const seed = (label || 'U').trim();
  const safe = seed.slice(0, 2).toUpperCase();

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#7a2b72"/>
        <stop offset="1" stop-color="#201428"/>
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="64" fill="url(#g)"/>
    <text x="64" y="74" text-anchor="middle" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto"
          font-size="44" font-weight="800" fill="#f7e9ff">${safe}</text>
  </svg>`.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function formatTime(ts: number) {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function ChatPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const matchId = asString((params as any)?.id, '').trim();

  const token = useMemo(() => requireSession(), []);
  const myUid = useMemo(() => uidFromToken(token) || 'anon', [token]);

  const match = useMemo(() => {
    try {
      const ms = getMatchesFor(myUid) as any[];
      return (ms || []).find((m) => asString(m?.id) === matchId) || null;
    } catch {
      return null;
    }
  }, [myUid, matchId]);

  const otherUid = useMemo(() => {
    const a = asString(match?.a);
    const b = asString(match?.b);
    if (!a || !b) return '';
    return a === myUid ? b : a;
  }, [match, myUid]);

  const otherProfile = useMemo(() => {
    if (!otherUid) return null;
    try {
      return loadUserProfileSnapshot(otherUid) as any;
    } catch {
      return null;
    }
  }, [otherUid]);

  const myProfile = useMemo(() => loadUserProfileSnapshot(myUid), [myUid]);
  const myName = useMemo(() => {
    const snap: any = myProfile as any;
    return String(snap?.displayName ?? snap?.username ?? snap?.handle ?? 'You');
  }, [myProfile]);
  const myPhoto = useMemo(() => {
    const snap: any = myProfile as any;
    return String(snap?.photoUrl ?? snap?.photoURL ?? snap?.avatarUrl ?? snap?.primaryPhotoUrl ?? '');
  }, [myProfile]);


  const otherName = useMemo(() => {
    const dn = asString(otherProfile?.displayName);
    const fn = asString(otherProfile?.fullName);
    return dn || fn || 'Chat';
  }, [otherProfile]);

  const otherPhoto = useMemo(() => {
    const p = asString(otherProfile?.photoUrl);
    return p || placeholderAvatarDataUri(otherName);
  }, [otherProfile, otherName]);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [lastSentAt, setLastSentAt] = useState(0);

  const messages: ChatMsg[] = useMemo(() => {
    try {
      const raw = getChat(matchId) as any;
      const arr = Array.isArray(raw) ? raw : (raw?.messages || raw?.items || []);
      if (!Array.isArray(arr)) return [];
      return arr
        .map((m: any, i: number) => ({
          id: asString(m?.id || m?._id || `${matchId}-${i}`),
          ts: Number(m?.ts || m?.createdAt || m?.time || Date.now()),
          from: asString(m?.from || m?.fromUid || m?.senderUid),
          to: asString(m?.to || m?.toUid || m?.recipientUid),
          text: asString(m?.text || m?.body || m?.message),
        }))
        .filter((m: ChatMsg) => m.text.trim().length > 0)
        .sort((a: ChatMsg, b: ChatMsg) => a.ts - b.ts);
    } catch {
      return [];
    }
  }, [matchId, lastSentAt]);

  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // Clear unread when opening this chat.
  useEffect(() => {
    if (!myUid || !matchId) return;
    try { clearUnreadForChat(myUid, matchId); } catch {}
  }, [myUid, matchId]);

  // Auto-scroll to bottom.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const canSend = draft.trim().length > 0 && !sending && Boolean(otherUid) && Boolean(matchId);

  async function onSend() {
    const text = draft.trim();
    if (!text || !otherUid || !matchId) return;

    setSending(true);
    try {
      addChatMessage(matchId, myUid, otherUid, text);
      setDraft('');
      setLastSentAt(Date.now());
      try { clearUnreadForChat(myUid, matchId); } catch {}
    } finally {
      setSending(false);
    }
  }

  const pageStyle: React.CSSProperties = {
    height: '100dvh',
    display: 'flex',
    flexDirection: 'column',
  };

  const shellStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    padding: '12px 12px 18px',
  };

  const chatCard: React.CSSProperties = {
    width: 'min(720px, 100%)',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(0,0,0,0.18)',
    boxShadow: '0 16px 42px rgba(0,0,0,0.35)',
    overflow: 'hidden',
  };

  const topBar: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    background: 'linear-gradient(90deg, rgba(122,43,114,0.20), rgba(32,20,40,0.12))',
  };

  const iconBtn: React.CSSProperties = {
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(0,0,0,0.22)',
    color: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    padding: '6px 10px',
    fontWeight: 800,
    cursor: 'pointer',
  };

  const nameWrap: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    flex: 1,
  };

  const nameStyle: React.CSSProperties = {
    fontWeight: 900,
    letterSpacing: 0.2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const subStyle: React.CSSProperties = {
    opacity: 0.75,
    fontSize: 12,
    marginTop: 1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const avatarStyle: React.CSSProperties = {
    width: 38,
    height: 38,
    borderRadius: 999,
    objectFit: 'cover',
    border: '1px solid rgba(255,255,255,0.18)',
  };

  const scrollerStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 14px 10px',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    gap: 10,
    margin: '10px 0',
  };

  const bubbleBase: React.CSSProperties = {
    maxWidth: '78%',
    padding: '10px 12px',
    borderRadius: 16,
    lineHeight: 1.25,
    border: '1px solid rgba(255,255,255,0.10)',
    boxShadow: '0 10px 24px rgba(0,0,0,0.22)',
    wordBreak: 'break-word',
  };

  const mineBubble: React.CSSProperties = {
    ...bubbleBase,
    marginLeft: 'auto',
    background: 'linear-gradient(180deg, rgba(122,43,114,0.55), rgba(122,43,114,0.24))',
  };

  const theirsBubble: React.CSSProperties = {
    ...bubbleBase,
    background: 'rgba(0,0,0,0.28)',
  };

  const tsStyle: React.CSSProperties = {
    marginTop: 6,
    fontSize: 11,
    opacity: 0.7,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
  };

  const composerWrap: React.CSSProperties = {
    padding: '12px 12px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    background: 'linear-gradient(90deg, rgba(0,0,0,0.18), rgba(122,43,114,0.12))',
  };

  const composerRow: React.CSSProperties = {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-end',
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    minHeight: 42,
    maxHeight: 140,
    resize: 'none',
    padding: '10px 12px',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(0,0,0,0.22)',
    color: 'rgba(255,255,255,0.92)',
    outline: 'none',
  };

  const sendStyle: React.CSSProperties = {
    borderRadius: 16,
    padding: '10px 14px',
    border: '1px solid rgba(255,255,255,0.14)',
    background: canSend ? 'rgba(122,43,114,0.55)' : 'rgba(0,0,0,0.22)',
    color: 'rgba(255,255,255,0.92)',
    fontWeight: 900,
    cursor: canSend ? 'pointer' : 'not-allowed',
    minWidth: 86,
  };

  if (!matchId) {
    return (
      <div className="ff-page" style={pageStyle}>
        <AppHeader active="messages" />
        <div className="ff-shell" style={{ padding: 24 }}>
          <div style={{ opacity: 0.9 }}>Missing chat id.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ff-page" style={pageStyle}>
      <AppHeader active="messages" />

      <main className="ff-shell" style={shellStyle}>
        <div style={chatCard}>
          <div style={topBar}>
            <button
              type="button"
              style={iconBtn}
              onClick={() => {
                try { router.push('/messages'); } catch { router.back(); }
              }}
              aria-label="Back to messages"
              title="Back"
            >
              ←
            </button>

            <img src={otherPhoto} alt={otherName} style={avatarStyle} />

            <div style={nameWrap}>
              <div style={nameStyle}>{otherName}</div>
              <div style={subStyle}>{otherUid ? otherUid : ' '}</div>
            </div>

            <button
              type="button"
              style={iconBtn}
              onClick={() => {
                // Placeholder: voice/video later
                alert('Coming soon');
              }}
              aria-label="Call"
              title="Call"
            >
              📞
            </button>

            <button
              type="button"
              style={iconBtn}
              onClick={() => {
                // Placeholder: overflow menu later
                alert('Coming soon');
              }}
              aria-label="More"
              title="More"
            >
              ⋯
            </button>
          </div>

          <div ref={scrollerRef} style={scrollerStyle}>
            {!otherUid ? (
              <div style={{ opacity: 0.85, padding: 10 }}>
                Match not found. Go back to Messages and open again.
              </div>
            ) : messages.length === 0 ? (
              <div style={{ opacity: 0.85, padding: 10 }}>
                No messages yet. Say hi 👋
              </div>
            ) : (
              messages.map((m) => {
                const isMine = m.from === myUid;
                const bubble = isMine ? mineBubble : theirsBubble;

                return (
                  <div key={m.id} style={{ ...rowStyle, justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                    {(isMine ? myPhoto : otherPhoto) ? (
                      <img
                        src={isMine ? myPhoto : otherPhoto}
                        alt={isMine ? myName : otherName}
                        style={{ ...avatarStyle, width: 28, height: 28, alignSelf: 'flex-end' }}
                      />
                    ) : (
                      <div
                        style={{
                          ...avatarStyle,
                          width: 28,
                          height: 28,
                          alignSelf: 'flex-end',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 800,
                          background: 'rgba(255,255,255,0.10)',
                        }}
                      >
                        {(isMine ? myName : otherName).slice(0, 1).toUpperCase()}
                      </div>
                    )}

                    <div style={bubble}>
                      <div>{m.text}</div>
                      <div style={tsStyle}>
                        <span>{formatTime(m.ts)}</span>
                        {isMine ? <span style={{ opacity: 0.75 }}>✓</span> : null}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div style={composerWrap}>
            <div style={composerRow}>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type your message…"
                style={inputStyle}
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void onSend();
                  }
                }}
              />
              <button type="button" style={sendStyle} onClick={() => void onSend()} disabled={!canSend}>
                {sending ? '…' : 'Send'}
              </button>
            </div>

            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.72 }}>
              Tip: Press Enter to send • Shift+Enter for a new line
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
