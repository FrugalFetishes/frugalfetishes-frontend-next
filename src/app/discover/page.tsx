'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { requireSession } from '@/lib/session';
import { uidFromToken, like } from '@/lib/socialStore';
import AppHeader from "@/components/AppHeader";

type Profile = {
  id: string;
  name: string;
  age?: number;
  city?: string;
  bio?: string;
  photoUrl?: string;
  profilePhotoUrl?: string;
  primaryPhotoUrl?: string;
  mainPhotoUrl?: string;
  imageUrl?: string;
  avatarUrl?: string;
  images?: any[];
  photos?: any[];
  gallery?: any[];
};

const DECK_KEY = 'ff_deck_profiles_v2';
const IDX_KEY = 'ff_deck_idx_v2';
const MATCHES_KEY = 'ff_matches_v2';

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveLS(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
function loadLS<T>(key: string, fallback: T): T {
  try {
    return safeJsonParse<T>(localStorage.getItem(key), fallback);
  } catch {
    return fallback;
  }
}

function normalizePhotoUrl(p?: string | null): string | null {
  if (!p) return null;
  const s = String(p).trim();
  if (!s) return null;

  // Never use site branding assets as a profile photo.
  if (s.includes('frugalfetishes.png') || s.includes('FFmenuheaderlogo.png')) return null;

  // Next serves the /public folder at the site root.
  // Normalize both "/public/x.png" and "x.png" -> "/x.png".
  if (s.startsWith('/public/')) return `/${s.slice('/public/'.length)}`;
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:') || s.startsWith('/')) return s;

  // Bare filename -> from /public at root
  return `/${s.replace(/^\/+/, '')}`;
}

function pickPhotoUrl(profile: any): string | null {
  const direct =
    profile?.profilePhotoUrl ||
    profile?.primaryPhotoUrl ||
    profile?.mainPhotoUrl ||
    profile?.photoUrl ||
    profile?.imageUrl ||
    profile?.avatarUrl;

  const directNorm = normalizePhotoUrl(direct);
  if (directNorm) return directNorm;

  const arrCandidates: any[] = [];
  for (const key of ['images', 'photos', 'gallery']) {
    if (Array.isArray(profile?.[key])) arrCandidates.push(...profile[key]);
  }
  for (const item of arrCandidates) {
    const u = normalizePhotoUrl(item?.url || item?.src || item?.href || item);
    if (u) return u;
  }
  return null;
}

function placeholderAvatarDataUri(name: string) {
  const initials = (name || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || '')
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="rgba(255, 126, 185, 0.45)"/>
      <stop offset="1" stop-color="rgba(121, 84, 255, 0.35)"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="1200" fill="url(#g)"/>
  <circle cx="600" cy="520" r="220" fill="rgba(255,255,255,0.20)"/>
  <circle cx="600" cy="1240" r="520" fill="rgba(255,255,255,0.12)"/>
  <text x="600" y="700" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="260" font-weight="800" fill="rgba(255,255,255,0.78)">${initials}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

type SwipeLabel = 'like' | 'pass' | null;

export default function DiscoverPage() {
  const token = useMemo(() => {
    try { return requireSession(); } catch { return null as any; }
  }, []);
  const uid = useMemo(() => uidFromToken(token) ?? "anon", [token]);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [idx, setIdx] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [expanded, setExpanded] = useState(false);
  const [swipeLabel, setSwipeLabel] = useState<SwipeLabel>(null);
  const [busy, setBusy] = useState(false);
  const [decisionApiEnabled, setDecisionApiEnabled] = useState(true);

  const drag = useRef({ active: false, x0: 0, y0: 0, dx: 0, dy: 0 });
  const [dragXY, setDragXY] = useState({ x: 0, y: 0 });

  const current = profiles[idx] || null;
  const currentPhoto = current ? pickPhotoUrl(current) : null;

  async function fetchFeed() {
    setBusy(true);
    setStatus('Refreshing…');
    try {
      // Require session token (client-side guard). This redirects to /login if missing.
      requireSession();

      const res = await apiGet('/api/feed');
      const raw: any[] =
        (res as any)?.profiles ||
        (res as any)?.items ||
        (res as any)?.feed ||
        (Array.isArray(res) ? (res as any[]) : []) ||
        [];

      const list: Profile[] = raw
        .filter(Boolean)
        .map((p: any) => ({
          id: String(p.id || p.userId || p.uid || ''),
          name: String(p.name || p.displayName || 'Unknown'),
          age: typeof p.age === 'number' ? p.age : Number(p.age) || undefined,
          city: p.city ? String(p.city) : undefined,
          bio: p.bio ? String(p.bio) : p.about ? String(p.about) : undefined,
          photoUrl: p.photoUrl,
          profilePhotoUrl: p.profilePhotoUrl,
          primaryPhotoUrl: p.primaryPhotoUrl,
          mainPhotoUrl: p.mainPhotoUrl,
          imageUrl: p.imageUrl,
          avatarUrl: p.avatarUrl,
          images: p.images,
          photos: p.photos,
          gallery: p.gallery,
        }))
        .filter((p) => p.id);

      if (list.length) {
        setProfiles(list);
        setIdx(0);
        saveLS(DECK_KEY, list);
        saveLS(IDX_KEY, 0);
        setStatus('');
      } else {
        // Keep existing deck for testing if backend is empty.
        setStatus('No more profiles available (using saved demo deck for testing).');
      }
    } catch (e: any) {
      setStatus(e?.message ? String(e.message) : 'Failed to load feed.');
    } finally {
      setBusy(false);
    }
  }

  function resetDeck() {
    try {
      const deck = loadLS<Profile[]>(DECK_KEY, []);
      if (deck.length) setProfiles(deck);
      setIdx(0);
      saveLS(IDX_KEY, 0);
      setStatus('Deck reset.');
    } catch {
      setStatus('Could not reset deck.');
    }
  }

  async function sendDecision(decision: 'like' | 'pass', targetUserId: string) {
    // If /api/decision is missing in the backend, we don't want to spam 404s.
    if (!decisionApiEnabled) return;

    try {
      // apiPost signature in this repo: (path, body)
      const res: any = await apiPost('/api/decision', { targetUserId, decision });

      // Some apiPost implementations return a Response; handle that too.
      const status = typeof res?.status === 'number' ? res.status : null;
      if (status === 404) {
        // Backend endpoint not deployed yet; fall back to local-only decisions.
        setDecisionApiEnabled(false);
        // Keep UI quiet; this is expected in dev.
        console.info('Decision API not available (404). Falling back to local-only decisions.');
      }
    } catch (e: any) {
      const msg = String(e?.message || e || '');
      // If we can detect a 404 from the thrown error, disable future calls.
      if (msg.includes('404')) {
        // Backend endpoint not deployed yet; fall back to local-only decisions.
        setDecisionApiEnabled(false);
        // Keep UI quiet; this is expected in dev.
        console.info('Decision API not available (404). Falling back to local-only decisions.');
      }
      // Otherwise ignore so UI still works.
    }
  }

  function persistLocalMatch(p: Profile) {
    try {
      const list = loadLS<any[]>(MATCHES_KEY, []);
      if (list.some((m) => m?.userId === p.id)) return;
      list.unshift({
        id: `m_${p.id}`,
        userId: p.id,
        name: p.name,
        age: p.age,
        city: p.city,
        photoUrl: pickPhotoUrl(p),
        matchedAt: Date.now(),
      });
      saveLS(MATCHES_KEY, list);
    } catch {}
  }

  function nextCard() {
    setIdx((i) => {
      const n = i + 1;
      saveLS(IDX_KEY, n);
      return n;
    });
    setDragXY({ x: 0, y: 0 });
    setSwipeLabel(null);
    setExpanded(false);
  }

  function decide(decision: 'like' | 'pass') {
    if (!current) return;
    if (decision === 'like') {
      try {
        const res = like(current.id, uid);
        if (res.matched) {
          // optional: quick hint; keeps UI simple
          console.log('Matched!', res.matchId);
        }
      } catch (e) {
        console.warn('like() failed', e);
      }
    }
    void sendDecision(decision, current.id);
    nextCard();
  }

  useEffect(() => {
    // Hydrate saved deck immediately so you can test swipe even if backend feed is empty.
    const deck = loadLS<Profile[]>(DECK_KEY, []);
    const savedIdx = loadLS<number>(IDX_KEY, 0);
    if (deck.length) setProfiles(deck);
    if (Number.isFinite(savedIdx) && savedIdx >= 0) setIdx(savedIdx);

    void fetchFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- swipe mechanics ---
  const THRESH_X = 110;
  const THRESH_UP = 90;
  const THRESH_DOWN = 80;

  function onPointerDown(e: any) {
    if (!current) return;
    drag.current.active = true;
    drag.current.x0 = e.clientX;
    drag.current.y0 = e.clientY;
    try { e.currentTarget?.setPointerCapture?.(e.pointerId); } catch {}

    drag.current.dx = 0;
    drag.current.dy = 0;
    setSwipeLabel(null);
  }

  function onPointerMove(e: any) {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.x0;
    const dy = e.clientY - drag.current.y0;
    drag.current.dx = dx;
    drag.current.dy = dy;

    // If expanded: allow downward swipe to close
    if (expanded) {
      setDragXY({ x: 0, y: Math.min(dy, 0) });
      if (dy > THRESH_DOWN) {
        setExpanded(false);
        drag.current.active = false;
    try { e.currentTarget?.releasePointerCapture?.(e.pointerId); } catch {}

        setDragXY({ x: 0, y: 0 });
      }
      return;
    }

    setDragXY({ x: dx, y: dy });

    // Show label while dragging horizontally
    if (Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dy)) {
      setSwipeLabel(dx > 0 ? 'like' : 'pass');
    } else {
      setSwipeLabel(null);
    }
  }

  function onPointerUp() {
    if (!drag.current.active) return;
    drag.current.active = false;

    const { dx, dy } = drag.current;

    // Up swipe opens expanded profile (only when mostly vertical)
    if (!expanded && Math.abs(dy) > Math.abs(dx) && dy < -THRESH_UP) {
      setExpanded(true);
      setDragXY({ x: 0, y: 0 });
      setSwipeLabel(null);
      return;
    }

    // Horizontal swipe to decide
    if (!expanded && Math.abs(dx) >= THRESH_X && Math.abs(dx) > Math.abs(dy)) {
      decide(dx > 0 ? 'like' : 'pass');
      return;
    }

    // Snap back
    setDragXY({ x: 0, y: 0 });
    setSwipeLabel(null);
  }

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background:
      'radial-gradient(900px 600px at 20% 20%, rgba(255, 96, 170, 0.22), rgba(0,0,0,0)), radial-gradient(800px 600px at 85% 30%, rgba(120, 84, 255, 0.22), rgba(0,0,0,0)), linear-gradient(180deg, #0b0614, #05030a)',
    color: 'white',
  };

  const cardWrap: React.CSSProperties = {
    display: 'grid',
    placeItems: 'center',
    paddingTop: 18,
  };

  const cardStyle: React.CSSProperties = {
    width: 'min(520px, 94vw)',
    height: 'min(690px, 72vh)',
    borderRadius: 26,
    border: '1px solid rgba(255,255,255,0.10)',
    boxShadow: '0 22px 60px rgba(0,0,0,0.55)',
    overflow: 'hidden',
    position: 'relative',
    transform: `translate(${dragXY.x}px, ${dragXY.y}px) rotate(${dragXY.x * 0.03}deg)`,
    transition: drag.current.active ? 'none' : 'transform 180ms ease',
    background:
      currentPhoto
        ? `url(${currentPhoto}) center/cover no-repeat`
        : 'linear-gradient(135deg, rgba(255,126,185,0.18), rgba(121,84,255,0.12))',
    touchAction: 'none',
  };

  const overlayPill: React.CSSProperties = {
    position: 'absolute',
    top: 18,
    left: 18,
    padding: '10px 14px',
    borderRadius: 999,
    fontWeight: 900,
    letterSpacing: 2,
    fontSize: 14,
    border: '2px solid rgba(255,255,255,0.70)',
    background: 'rgba(0,0,0,0.30)',
    textTransform: 'uppercase',
  };

  return (
    <div className="ff-page">
      <AppHeader active="discover" />

      <main className="ff-shell">
        <div style={containerStyle}>
          {/* Card stack */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={cardWrap}>
              {loading ? (
                <div style={{ opacity: 0.9, padding: 18 }}>Loading…</div>
              ) : current ? (
                <div style={cardStyle}>
                  {swipeLabel ? (
                    <div
                      style={{
                        ...overlayPill,
                        borderColor:
                          swipeLabel === 'like'
                            ? 'rgba(98, 255, 176, 0.95)'
                            : 'rgba(255, 98, 118, 0.95)',
                        color:
                          swipeLabel === 'like'
                            ? 'rgba(98, 255, 176, 0.95)'
                            : 'rgba(255, 98, 118, 0.95)',
                        transform: swipeLabel === 'like' ? 'rotate(-12deg)' : 'rotate(12deg)',
                      }}
                    >
                      {swipeLabel === 'like' ? 'LIKE' : 'PASS'}
                    </div>
                  ) : null}

                  {!currentPhoto ? (
                    <img
                      src={placeholderAvatarDataUri(current.name)}
                      alt={current.name || 'Profile'}
                      style={photoStyle}
                      draggable={false}
                    />
                  ) : (
                    <img src={currentPhoto} alt={current.name || 'Profile'} style={photoStyle} draggable={false} />
                  )}

                  <div style={cardBottomStyle}>
                    <div style={{ fontWeight: 800, fontSize: 20 }}>
                      {current.name || 'Someone'}
                      {typeof current.age === 'number' ? `, ${current.age}` : ''}
                    </div>
                    <div style={{ opacity: 0.8, fontSize: 13 }}>{current.city || ''}</div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button type="button" style={btnPass} onClick={() => doSwipe('pass')} disabled={busy}>
                        ✕
                      </button>
                      <button type="button" style={btnLike} onClick={() => doSwipe('like')} disabled={busy}>
                        ♥
                      </button>
                    </div>

                    <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
                      Swipe left/right or use buttons. Swipe up to view profile.
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ opacity: 0.9, padding: 18 }}>No profiles to show.</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
