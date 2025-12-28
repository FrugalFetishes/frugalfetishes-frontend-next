'use client';

import { useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import { requireSession } from '@/lib/session';
import {
  uidFromToken,
  getMatchesFor,
  loadUserProfileSnapshot,
  markMatchClicked,
  type Match,
} from '@/lib/socialStore';

function placeholderAvatarDataUri(label: string) {
  const seed = (label || 'U').trim().slice(0, 2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#2a2a2a"/>
        <stop offset="1" stop-color="#111"/>
      </linearGradient>
    </defs>
    <rect width="160" height="160" rx="28" fill="url(#g)"/>
    <text x="80" y="92" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
      font-size="56" font-weight="800" fill="#fff">${seed}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function MatchProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const matchId = String(params?.id || '').trim();

  const token = useMemo(() => requireSession(), []);
  const myUid = useMemo(() => uidFromToken(token) ?? 'anon', [token]);

  const match: Match | null = useMemo(() => {
    try {
      const all = getMatchesFor(myUid);
      return all.find((m) => m.id === matchId) || null;
    } catch {
      return null;
    }
  }, [myUid, matchId]);

  useEffect(() => {
    if (!matchId) return;
    try {
      markMatchClicked(myUid, matchId);
    } catch {}
  }, [myUid, matchId]);

  const otherUid = useMemo(() => {
    if (!match) return '';
    const a = (match as any).a as string | undefined;
    const b = (match as any).b as string | undefined;
    if (!a || !b) return '';
    return a === myUid ? b : b === myUid ? a : (a || b);
  }, [match, myUid]);

  const snap = useMemo(() => (otherUid ? loadUserProfileSnapshot(otherUid) : null), [otherUid]);
  const name = (snap?.displayName || snap?.fullName || otherUid || 'Match').toString();
  const photo = (snap?.photoUrl || '').toString() || placeholderAvatarDataUri(name);

  function onOpenChat() {
    if (!matchId) return;
    try {
      markMatchClicked(myUid, matchId);
    } catch {}
    router.push(`/chat/${matchId}`);
  }

  if (!matchId) {
    return (
      <div className="ff-page">
        <AppHeader active="matches" />
        <main className="ff-shell">
          <h1 className="ff-h1">Match</h1>
          <div style={{ opacity: 0.85 }}>Missing match id.</div>
        </main>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="ff-page">
        <AppHeader active="matches" />
        <main className="ff-shell">
          <h1 className="ff-h1">Match</h1>
          <div style={{ opacity: 0.85, marginTop: 10 }}>
            This match isn’t in your local list yet. Go back to Matches and open it again.
          </div>
          <button type="button" className="ff-btn" style={{ marginTop: 14 }} onClick={() => router.push('/matches')}>
            Back to Matches
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="ff-page">
      <AppHeader active="matches" />
      <main className="ff-shell" style={{ maxWidth: 920 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <img
            src={photo}
            alt={name}
            style={{ width: 88, height: 88, borderRadius: 18, objectFit: 'cover', background: 'rgba(255,255,255,0.08)' }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.15, wordBreak: 'break-word' }}>{name}</div>
            <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>Match ID: {matchId}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button type="button" className="ff-btn" onClick={onOpenChat} style={{ fontWeight: 900 }}>
            Message
          </button>
          <button type="button" className="ff-btn" onClick={() => router.push('/matches')} style={{ opacity: 0.9 }}>
            Back
          </button>
        </div>
      </main>
    </div>
  );
}
