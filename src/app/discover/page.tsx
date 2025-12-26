'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { apiGet, apiPost } from '@/lib/api';
import { loadSession } from '@/lib/session';

type Profile = {
  id: string;
  name?: string;
  age?: number;
  city?: string;
  bio?: string;
  interests?: string[];
  photoUrl?: string | null;
  photos?: string[] | null;
};

type FeedResponse =
  | { ok: true; profiles: Profile[] }
  | { ok: true; users: Profile[] }
  | { ok: true; feed: Profile[] }
  | { ok: true; data: any }
  | { ok: false; error?: string }
  | any;

function toText(v: any): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  try { return String(v); } catch { return ''; }
}

function normalizePhotoUrl(url: any): string | null {
  const s = toText(url).trim();
  if (!s) return null;
  if (s.startsWith('data:image/')) return s;
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (s.startsWith('/')) return s;
  // Some backends return just the filename stored in /public
  if (!s.includes('/') && (s.endsWith('.png') || s.endsWith('.jpg') || s.endsWith('.jpeg') || s.endsWith('.webp'))) {
    return `/${s}`;
  }
  return s;
}

function pickProfilePhoto(p: Profile | null): string | null {
  if (!p) return null;
  const fromArray = Array.isArray(p.photos) ? p.photos.find(Boolean) : null;
  return normalizePhotoUrl(fromArray || p.photoUrl || null);
}

function placeholderAvatarDataUri(name?: string) {
  const initials = (name || 'User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#4b134f"/>
        <stop offset="1" stop-color="#1d0b2a"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="400" cy="320" r="140" fill="rgba(255,255,255,0.10)"/>
    <text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle"
      font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial"
      font-size="150" fill="rgba(255,255,255,0.85)" font-weight="700">${initials || 'U'}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function DiscoverPage() {
  const router = useRouter();

  // ---------- auth guard (client-side) ----------
  useEffect(() => {
    const token = loadSession();
    if (!token) router.push('/login');
  }, [router]);

  // ---------- feed ----------
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string>('');

  // Restore swipe overlays + expanded sheet behavior
  const [expanded, setExpanded] = useState(false);

  const current = useMemo(() => profiles[cursor] ?? null, [profiles, cursor]);
  const currentPhoto = useMemo(() => pickProfilePhoto(current), [current]);

  // ---------- swipe state ----------
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const [drag, setDrag] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [busy, setBusy] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(() => setToast(''), 2200);
  }

  function extractList(res: FeedResponse): Profile[] {
    if (!res) return [];
    const raw =
      (Array.isArray(res.profiles) && res.profiles) ||
      (Array.isArray(res.users) && res.users) ||
      (Array.isArray(res.feed) && res.feed) ||
      (Array.isArray(res.data) && res.data) ||
      [];

    // Normalize + filter obviously bad entries (this prevents “random” placeholder cards)
    const list: Profile[] = raw
      .map((u: any) => ({
        id: toText(u?.id || u?._id || u?.uid || ''),
        name: toText(u?.name || u?.displayName || u?.username || ''),
        age: typeof u?.age === 'number' ? u.age : Number.isFinite(Number(u?.age)) ? Number(u.age) : undefined,
        city: toText(u?.city || u?.location?.city || ''),
        bio: toText(u?.bio || u?.about || ''),
        interests: Array.isArray(u?.interests) ? u.interests.map(toText).filter(Boolean) : [],
        photoUrl: u?.photoUrl ?? u?.photo ?? u?.avatarUrl ?? null,
        photos: Array.isArray(u?.photos) ? u.photos : null
      }))
      .filter((u) => !!u.id);

    return list;
  }

  async function loadFeed() {
    setLoading(true);
    try {
      const res = await apiGet('/api/feed');
      const list = extractList(res);

      if (!list.length) {
        setProfiles([]);
        setCursor(0);
        showToast('No more profiles available right now.');
        return;
      }

      setProfiles(list);
      setCursor(0);
    } catch (e: any) {
      showToast(e?.message ? `Feed error: ${e.message}` : 'Feed error');
      setProfiles([]);
      setCursor(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetSwipeState() {
    startRef.current = null;
    dragRef.current = null;
    setDrag({ dx: 0, dy: 0 });
  }

  async function sendDecision(decision: 'like' | 'pass') {
    if (!current || busy) return;
    setBusy(true);
    try {
      // Best-effort: backend call, ignore failures so UI still works
      try {
        await apiPost('/api/decision', { targetUserId: current.id, decision });
      } catch {}

      setCursor((c) => c + 1);
      resetSwipeState();
      setExpanded(false);
    } finally {
      setBusy(false);
    }
  }

  // ---------- pointer handlers ----------
  const SWIPE_X = 120;   // px for like/pass commit
  const SHEET_UP = 90;   // px for expand
  const SHEET_DOWN = 90; // px for close expanded

  function onPointerDown(e: React.PointerEvent) {
    if (busy) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    dragRef.current = { dx: 0, dy: 0 };
    setDrag({ dx: 0, dy: 0 });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!startRef.current) return;

    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;

    dragRef.current = { dx, dy };
    setDrag({ dx, dy });
  }

  function onPointerUp() {
    const d = dragRef.current;
    resetSwipeState();

    if (!d || !current || busy) return;

    const absX = Math.abs(d.dx);
    const absY = Math.abs(d.dy);

    // Expanded sheet: swipe down to close
    if (expanded) {
      if (d.dy > SHEET_DOWN && absY > absX) {
        setExpanded(false);
      }
      return;
    }

    // Not expanded:
    // swipe up to expand (vertical dominant)
    if (d.dy < -SHEET_UP && absY > absX) {
      setExpanded(true);
      return;
    }

    // horizontal commit like/pass
    if (absX >= SWIPE_X && absX > absY) {
      if (d.dx > 0) sendDecision('like');
      else sendDecision('pass');
      return;
    }
  }

  // ---------- UI styles ----------
  const page: React.CSSProperties = {
    minHeight: '100vh',
    padding: '14px 12px 28px',
    background: 'radial-gradient(1200px 800px at 25% 20%, rgba(255,64,160,0.18), transparent 55%), radial-gradient(900px 700px at 80% 35%, rgba(120,70,255,0.18), transparent 55%), linear-gradient(180deg, #0a0712, #150820)'
  };

  const header: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    margin: '6px auto 18px',
    maxWidth: 980,
    position: 'relative'
  };

  const titleWrap: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 0
  };

  const brandImg: React.CSSProperties = {
    height: 34,
    width: 'auto',
    objectFit: 'contain',
    filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.45))'
  };

  const title: React.CSSProperties = {
    margin: 0,
    fontSize: 20,
    letterSpacing: 0.2,
    color: 'rgba(255,255,255,0.92)'
  };

  const subtitle: React.CSSProperties = {
    margin: 0,
    fontSize: 12,
    color: 'rgba(255,255,255,0.60)'
  };

  const cardWrap: React.CSSProperties = {
    margin: '0 auto',
    maxWidth: 420,
    width: '100%',
    position: 'relative'
  };

  const card: React.CSSProperties = {
    width: '100%',
    height: 560,
    borderRadius: 22,
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.10)',
    boxShadow: '0 26px 80px rgba(0,0,0,0.55)',
    background: 'rgba(255,255,255,0.04)',
    position: 'relative',
    touchAction: 'none'
  };

  const imgStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'scale(1.01)',
    filter: 'saturate(1.05) contrast(1.03)'
  };

  const gradientOverlay: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    background:
      'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.78) 100%)'
  };

  const namePlate: React.CSSProperties = {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    display: 'grid',
    gap: 6
  };

  const nameLine: React.CSSProperties = {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    justifyContent: 'space-between'
  };

  const nameText: React.CSSProperties = {
    fontSize: 22,
    fontWeight: 800,
    color: 'rgba(255,255,255,0.95)',
    textShadow: '0 8px 22px rgba(0,0,0,0.55)'
  };

  const small: React.CSSProperties = {
    fontSize: 12,
    color: 'rgba(255,255,255,0.70)'
  };

  const actions: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    position: 'absolute',
    bottom: 18,
    right: 16
  };

  const iconBtn = (kind: 'pass' | 'view' | 'like'): React.CSSProperties => ({
    width: kind === 'view' ? 42 : 46,
    height: kind === 'view' ? 42 : 46,
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.16)',
    background:
      kind === 'like'
        ? 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.20), rgba(255,64,160,0.22))'
        : kind === 'pass'
        ? 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18), rgba(110,110,110,0.18))'
        : 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18), rgba(120,70,255,0.18))',
    boxShadow: '0 16px 34px rgba(0,0,0,0.38)',
    display: 'grid',
    placeItems: 'center',
    color: 'rgba(255,255,255,0.92)',
    cursor: 'pointer',
    userSelect: 'none'
  });

  const overlayLabel: React.CSSProperties = {
    position: 'absolute',
    top: 22,
    left: 22,
    padding: '10px 14px',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.18)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    fontWeight: 900,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#fff',
    boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
    pointerEvents: 'none'
  };

  const sheet: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(15, 8, 24, 0.88)',
    borderTop: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '22px 22px 0 0',
    padding: '16px 16px 18px',
    transform: expanded ? 'translateY(0)' : 'translateY(72%)',
    transition: 'transform 220ms ease',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)'
  };

  const sheetHandle: React.CSSProperties = {
    width: 52,
    height: 6,
    borderRadius: 999,
    background: 'rgba(255,255,255,0.20)',
    margin: '0 auto 12px'
  };

  const sheetTitle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8
  };

  const sheetName: React.CSSProperties = {
    fontSize: 20,
    fontWeight: 900,
    color: 'rgba(255,255,255,0.95)',
    margin: 0
  };

  const chipRow: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10
  };

  const chip: React.CSSProperties = {
    padding: '6px 10px',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.10)',
    fontSize: 12,
    color: 'rgba(255,255,255,0.78)'
  };

  // Drag transform for the card
  const cardTransform = useMemo(() => {
    if (expanded) return 'translate3d(0,0,0)';
    const dx = drag.dx;
    const dy = drag.dy;
    const rot = Math.max(-12, Math.min(12, dx / 18));
    return `translate3d(${dx}px, ${dy * 0.15}px, 0) rotate(${rot}deg)`;
  }, [drag, expanded]);

  const likeOpacity = useMemo(() => {
    if (expanded) return 0;
    return Math.max(0, Math.min(1, (drag.dx - 24) / 90));
  }, [drag.dx, expanded]);

  const passOpacity = useMemo(() => {
    if (expanded) return 0;
    return Math.max(0, Math.min(1, (-drag.dx - 24) / 90));
  }, [drag.dx, expanded]);

  const upHintOpacity = useMemo(() => {
    if (expanded) return 0;
    const dy = -drag.dy;
    return Math.max(0, Math.min(1, (dy - 10) / 80));
  }, [drag.dy, expanded]);

  return (
    <div style={page}>
      <div style={header}>
        <div style={titleWrap}>
          <button
            aria-label="Menu"
            title="Menu"
            onClick={() => {
              // simple toggle: relies on CSS in globals for burger drawer if present
              const el = document.getElementById('ff-burger');
              if (el) el.style.display = el.style.display === 'block' ? 'none' : 'block';
            }}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.92)',
              cursor: 'pointer'
            }}
          >
            ☰
          </button>

          <img src="/frugalfetishes.png" alt="FrugalFetishes" style={brandImg} onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }} />
          <div style={{ minWidth: 0 }}>
            <p style={title}>Discover</p>
            <p style={subtitle}>{loading ? 'Loading…' : current ? 'Swipe left/right · swipe up for profile' : 'No profiles'}</p>
          </div>
        </div>

        <div id="ff-burger" style={{
          display: 'none',
          position: 'absolute',
          top: 46,
          left: 0,
          background: 'rgba(15, 8, 24, 0.92)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 14,
          padding: 10,
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
          minWidth: 180,
          zIndex: 20
        }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <button onClick={() => loadFeed()} style={{ ...chip, cursor: 'pointer', textAlign: 'left' }}>Refresh feed</button>
            <Link href="/matches" style={{ ...chip, textDecoration: 'none' }}>Matches</Link>
            <button
              onClick={() => {
                // logout
                try { localStorage.removeItem('ff_session'); } catch {}
                router.push('/login');
              }}
              style={{ ...chip, cursor: 'pointer', textAlign: 'left' }}
            >
              Logout
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => loadFeed()} style={{ ...chip, cursor: 'pointer' }}>Refresh</button>
          <Link href="/matches" style={{ ...chip, textDecoration: 'none' }}>Matches</Link>
        </div>
      </div>

      {toast ? (
        <div style={{
          maxWidth: 980,
          margin: '0 auto 14px',
          padding: '10px 12px',
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(15, 8, 24, 0.75)',
          color: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)'
        }}>
          {toast}
        </div>
      ) : null}

      <div style={cardWrap}>
        {!current ? (
          <div style={{
            height: 560,
            borderRadius: 22,
            border: '1px solid rgba(255,255,255,0.10)',
            background: 'rgba(255,255,255,0.04)',
            display: 'grid',
            placeItems: 'center',
            color: 'rgba(255,255,255,0.75)',
            textAlign: 'center',
            padding: 18
          }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>No more profiles</div>
              <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 14 }}>
                Hit Refresh to check again.
              </div>
              <button onClick={() => loadFeed()} style={{ ...chip, cursor: 'pointer' }}>Refresh feed</button>
            </div>
          </div>
        ) : (
          <div
            style={{ ...card, transform: cardTransform, transition: startRef.current ? 'none' : 'transform 180ms ease' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <img
              src={currentPhoto ?? placeholderAvatarDataUri(current.name)}
              alt={`${current.name || 'Profile'} photo`}
              style={imgStyle}
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                img.src = placeholderAvatarDataUri(current.name);
              }}
            />
            <div style={gradientOverlay} />

            {/* LIKE / PASS overlays */}
            <div style={{ ...overlayLabel, opacity: likeOpacity, right: 22, left: 'auto', background: 'rgba(255,64,160,0.18)' }}>
              Like
            </div>
            <div style={{ ...overlayLabel, opacity: passOpacity, background: 'rgba(255,255,255,0.08)' }}>
              Pass
            </div>
            <div style={{ ...overlayLabel, opacity: upHintOpacity, left: '50%', transform: 'translateX(-50%)', background: 'rgba(120,70,255,0.16)' }}>
              Profile
            </div>

            <div style={namePlate}>
              <div style={nameLine}>
                <div style={nameText}>
                  {current.name || 'User'}
                  {typeof current.age === 'number' ? `, ${current.age}` : ''}
                </div>
                <div style={small}>{current.city || ''}</div>
              </div>
              <div style={{ ...small, opacity: 0.86, maxWidth: 360 }}>
                {current.bio ? current.bio.slice(0, 84) + (current.bio.length > 84 ? '…' : '') : 'Swipe up to see the full profile.'}
              </div>
            </div>

            <div style={actions}>
              <button aria-label="Pass" title="Pass" disabled={busy} onClick={() => sendDecision('pass')} style={iconBtn('pass')}>
                ✕
              </button>

              <Link aria-label="View" title="View" href={`/matches/${encodeURIComponent(current.id)}`} style={iconBtn('view')}>
                👁
              </Link>

              <button aria-label="Like" title="Like" disabled={busy} onClick={() => sendDecision('like')} style={iconBtn('like')}>
                ♥
              </button>
            </div>

            {/* bottom sheet (expanded profile) */}
            <div style={sheet}>
              <div style={sheetHandle} />
              <div style={sheetTitle}>
                <h2 style={sheetName}>
                  {current.name || 'User'} {typeof current.age === 'number' ? `· ${current.age}` : ''}
                </h2>
                <div style={{ ...small, opacity: 0.8 }}>{current.city || ''}</div>
              </div>

              <div style={{ ...small, opacity: 0.9, lineHeight: 1.4 }}>
                {current.bio || 'No bio yet.'}
              </div>

              {Array.isArray(current.interests) && current.interests.length ? (
                <div style={chipRow}>
                  {current.interests.slice(0, 10).map((t) => (
                    <span key={t} style={chip}>{t}</span>
                  ))}
                </div>
              ) : null}

              <div style={{ marginTop: 12, ...small, opacity: 0.7 }}>
                Swipe down to return to Discover.
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 980, margin: '14px auto 0', opacity: 0.65, color: 'rgba(255,255,255,0.75)', fontSize: 12, textAlign: 'center' }}>
        Tip: Swipe right = Like · Swipe left = Pass · Swipe up = Profile · Swipe down (in profile) = Back
      </div>
    </div>
  );
}
