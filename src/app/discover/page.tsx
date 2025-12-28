'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { apiGet, apiPost } from '@/lib/api';
import { requireSession, clearSession } from '@/lib/session';


import { uidFromToken, likeUser, getProfileExtras } from '@/lib/socialStore';
type Profile = {
  id: string;
  name: string;
  age?: number;
  zipCode?: string;
  sex?: 'male' | 'female';
  location?: { lat: number; lng: number };
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

function safeString(v: any, fallback: string = ''): string {
  try {
    if (v === undefined || v === null) return fallback;
    const s = String(v).trim();
    return s ? s : fallback;
  } catch {
    return fallback;
  }
}

function distanceMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const R = 3958.8; // Earth radius miles
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
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
  const myUid = useMemo(() => {
    try {
      return uidFromToken(requireSession());
    } catch {
      return 'anon';
    }
  }, []);

  const myExtras = useMemo(() => {
    try {
      return getProfileExtras(myUid);
    } catch {
      return null as any;
    }
  }, [myUid]);

  const [deviceLoc, setDeviceLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const cached = window.localStorage.getItem('ff_device_loc');
      if (cached) {
        const obj = JSON.parse(cached);
        if (obj && typeof obj.lat === 'number' && typeof obj.lng === 'number') setDeviceLoc({ lat: obj.lat, lng: obj.lng });
      }
    } catch {}

    // Attempt to get location (mobile-first); if denied it will silently fall back to ZIP.
    try {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setDeviceLoc(next);
          try {
            window.localStorage.setItem('ff_device_loc', JSON.stringify(next));
          } catch {}
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } catch {}
  }, []);

  const myLoc = (deviceLoc || (myExtras as any)?.location || null) as { lat: number; lng: number } | null;
  const myZip = useMemo(() => safeString((myExtras as any)?.zipCode || (myExtras as any)?.zip || ''), [myExtras]);

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

  // Derived display fields for placeholders / expanded panel (kept purely client-side; no swipe logic changes)
  const currentName = useMemo(() => {
    try {
      const anyCur: any = current as any;
      return safeString(anyCur?.displayName || anyCur?.name || anyCur?.fullName || anyCur?.email || anyCur?.id || 'User');
    } catch {
      return 'User';
    }
  }, [current]);


  const currentAge = useMemo(() => {
    try {
      const anyCur: any = current as any;
      const n = Number(anyCur?.age);
      return Number.isFinite(n) ? n : undefined;
    } catch {
      return undefined;
    }
  }, [current]);

  const currentZip = useMemo(() => {
    try {
      const curr: any = current as any;
      return safeString(curr?.zipCode || curr?.zip || curr?.postalCode || '');
    } catch {
      return '';
    }
  }, [current]);

  const currentLoc = useMemo(() => {
    try {
      const curId = (current as any)?.id;
      if (!curId) return null;
      const ex: any = getProfileExtras(curId);
      const loc = ex?.location;
      if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') return { lat: loc.lat, lng: loc.lng };
      const curAny: any = current as any;
      const loc2 = curAny?.location;
      if (loc2 && typeof loc2.lat === 'number' && typeof loc2.lng === 'number') return { lat: loc2.lat, lng: loc2.lng };
      return null;
    } catch {
      return null;
    }
  }, [current]);

  const distanceMi = useMemo(() => {
    try {
      if (myLoc && currentLoc) {
        const d = distanceMiles(myLoc, currentLoc);
        if (Number.isFinite(d)) return Math.round(d * 10) / 10;
      }
    } catch {}
    return null as number | null;
  }, [myLoc, currentLoc]);


  const distanceMi = useMemo(() => {
    try {
      if (!myLoc || !currentLoc) return null;
      const R = 3958.8; // miles
      const toRad = (x: number) => (x * Math.PI) / 180;
      const dLat = toRad(currentLoc.lat - myLoc.lat);
      const dLng = toRad(currentLoc.lng - myLoc.lng);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(myLoc.lat)) * Math.cos(toRad(currentLoc.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const d = R * c;
      if (!Number.isFinite(d)) return null;
      return Math.round(d * 10) / 10;
    } catch {
      return null;
    }
  }, [myLoc, currentLoc]);

  const currentAbout = useMemo(() => {
    try {
      const anyCur: any = current as any;
      return safeString(anyCur?.about || anyCur?.bio || anyCur?.headline || anyCur?.description || '');
    } catch {
      return '';
    }
  }, [current]);



  const pillBtn: React.CSSProperties = {
    height: 36,
    padding: '0 12px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.92)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    fontSize: 13,
    lineHeight: '36px',
    userSelect: 'none',
  };

  const iconBtn: React.CSSProperties = {
    width: 42,
    height: 42,
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.94)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    userSelect: 'none',
  };

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
          zipCode: (p as any).zipCode ? String((p as any).zipCode) : (p as any).zip ? String((p as any).zip) : undefined,
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
        .filter((p) => p.id && p.id !== myUid);

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
        zipCode: (p as any).zipCode || (p as any).zip || undefined,
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
    if (decision === 'like') try { likeUser(myUid, current.id); } catch {}
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

  const stageStyle: React.CSSProperties = {
    maxWidth: 980,
    margin: '0 auto',
    padding: '16px',
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

  const bottomFade: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '44%',
    background: 'linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.76))',
  };

  const infoStyle: React.CSSProperties = {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
    display: 'grid',
    gap: 6,
    zIndex: 2,
  };

  const nameStyle: React.CSSProperties = { fontSize: 22, fontWeight: 800, letterSpacing: 0.2 };

  const badge: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  };

  const actionRow: React.CSSProperties = {
    position: 'absolute',
    right: 14,
    bottom: 14,
    display: 'flex',
    gap: 10,
    zIndex: 3,
  };

  const miniHint: React.CSSProperties = {
    marginTop: 12,
    opacity: 0.78,
    fontSize: 12,
    textAlign: 'center',
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

  const expandedSheet: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70vh',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    background: 'rgba(12, 6, 20, 0.90)',
    backdropFilter: 'blur(14px)',
    borderTop: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 -20px 60px rgba(0,0,0,0.55)',
    zIndex: 50,
    transform: expanded ? 'translateY(0)' : 'translateY(100%)',
    transition: 'transform 200ms ease',
    padding: 18,
    overflow: 'auto',
  };

  const expandedHandle: React.CSSProperties = {
    width: 46,
    height: 5,
    borderRadius: 999,
    background: 'rgba(255,255,255,0.22)',
    margin: '2px auto 12px',
  };

  const topToast: React.CSSProperties = {
    position: 'fixed',
    top: 70,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'min(760px, 92vw)',
    padding: '10px 12px',
    borderRadius: 14,
    background: 'rgba(0,0,0,0.52)',
    border: '1px solid rgba(255,255,255,0.12)',
    backdropFilter: 'blur(10px)',
    color: 'rgba(255,255,255,0.90)',
    fontSize: 13,
    zIndex: 60,
  };

  return (
    <div style={containerStyle}>
      <AppHeader active="discover" />

      {/* Debug controls (temporary) */}
      <div style={{ padding: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button type="button" style={pillBtn} onClick={resetDeck}>
          ↺ Reset deck
        </button>
        <button type="button" style={pillBtn} onClick={() => void fetchFeed()} disabled={busy}>
          ⟳ Refresh
        </button>
        <Link href="/matches" style={{ ...pillBtn, textDecoration: 'none' }}>
          💬 Matches
        </Link>
      </div>

      {status ? <div style={topToast}>{status}</div> : null}

      <div style={stageStyle}>
        <div style={cardWrap}>
          {current ? (
            <div
              style={cardStyle}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {swipeLabel ? (
                <div
                  style={{
                    ...overlayPill,
                    borderColor: swipeLabel === 'like' ? 'rgba(98, 255, 176, 0.95)' : 'rgba(255, 98, 118, 0.95)',
                    color: swipeLabel === 'like' ? 'rgba(98, 255, 176, 0.95)' : 'rgba(255, 98, 118, 0.95)',
                    transform: swipeLabel === 'like' ? 'rotate(-12deg)' : 'rotate(12deg)',
                  }}
                >
                  {swipeLabel === 'like' ? 'LIKE' : 'PASS'}
                </div>
              ) : null}

              {!currentPhoto ? (
                <img
                  src={placeholderAvatarDataUri(currentName)}
                  alt={`${currentName}'s photo`}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }}
                />
              ) : null}

              <div style={bottomFade} />

              <div style={infoStyle}>
                <div style={nameStyle}>
                  {currentName}
                  {typeof currentAge === 'number' ? `, ${currentAge}` : ''}
                </div>
                <div style={badge}>
                  <span style={{ opacity: 0.9 }}>{distanceMi != null ? `${distanceMi} mi` : (currentZip || '—')}</span>
                </div>
                <div style={{ opacity: 0.85, fontSize: 13 }}>
                  {currentAbout ? currentAbout : 'Swipe left/right, or swipe up to view profile.'}
                </div>
              </div>

              <div style={actionRow}>
                <button type="button" aria-label="Pass" style={{ ...iconBtn, background: 'rgba(255, 98, 118, 0.14)' }} onClick={() => decide('pass')}>
                  ✕
                </button>
                <button type="button" aria-label="View" style={{ ...iconBtn, background: 'rgba(255,255,255,0.10)' }} onClick={() => setExpanded(true)}>
                  ⌃
                </button>
                <button type="button" aria-label="Like" style={{ ...iconBtn, background: 'rgba(98, 255, 176, 0.14)' }} onClick={() => decide('like')}>
                  ♥
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                width: 'min(520px, 94vw)',
                borderRadius: 22,
                border: '1px solid rgba(255,255,255,0.10)',
                background: 'rgba(255,255,255,0.04)',
                padding: 18,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 18 }}>No more profiles available</div>
              <div style={{ opacity: 0.85, marginTop: 8, fontSize: 13 }}>
                Your backend returned an empty deck from <code>/api/feed</code>, or you already swiped through everything.
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" style={pillBtn} onClick={resetDeck}>
                  ↺ Reset deck
                </button>
                <button type="button" style={pillBtn} onClick={() => void fetchFeed()} disabled={busy}>
                  ⟳ Refresh
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={miniHint}>Swipe left = Pass · Swipe right = Like · Swipe up = Expand · Swipe down = Close</div>
      </div>

      <div
        style={expandedSheet}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div style={expandedHandle} />
        {current ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ fontSize: 22, fontWeight: 900 }}>
                {currentName}
                {typeof currentAge === 'number' ? `, ${currentAge}` : ''}
              </div>
              <button type="button" style={pillBtn} onClick={() => setExpanded(false)}>
                ↓ Back
              </button>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ opacity: 0.8, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase' }}>About</div>
                <div style={{ opacity: 0.92, lineHeight: 1.55 }}>{currentAbout || 'No bio yet.'}</div>
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ opacity: 0.8, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase' }}>ZIP</div>
                <div style={{ opacity: 0.92 }}>{distanceMi != null ? `${distanceMi} mi` : (currentZip || '—')}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
              <button type="button" style={{ ...pillBtn, background: 'rgba(255, 98, 118, 0.12)' }} onClick={() => decide('pass')}>
                ✕ Pass
              </button>
              <button type="button" style={{ ...pillBtn, background: 'rgba(98, 255, 176, 0.12)' }} onClick={() => decide('like')}>
                ♥ Like
              </button>
            </div>
          </div>
        ) : (
          <div style={{ opacity: 0.85 }}>No profile selected.</div>
        )}
      </div>
    </div>
  );
}
