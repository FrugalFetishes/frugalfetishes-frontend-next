'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { clearSession, requireSession } from '@/lib/session';
import { badgeCounts, uidFromToken, loadUserProfileSnapshot } from '@/lib/socialStore';

export type ActiveTab =
  | 'discover'
  | 'matches'
  | 'messages'
  | 'profile'
  | 'advanced-search'
  | 'account'
  | 'subscribe'
  | 'debug';

type Counts = {
  total: number;
  matches: number;
  messages: number;
};

function clamp(n: unknown): number {
  const x = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(x) || x <= 0) return 0;
  return Math.floor(x);
}

function Badge({ n }: { n: number }) {
  if (!n) return null;
  const txt = n > 99 ? '99+' : String(n);
  return (
    <span
      aria-label={`${txt} notifications`}
      style={{
        marginLeft: 8,
        minWidth: 18,
        height: 18,
        padding: '0 6px',
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 800,
        lineHeight: '18px',
        background: '#ff3b30',
        color: '#fff',
        boxShadow: '0 6px 16px rgba(0,0,0,0.28)',
      }}
    >
      {txt}
    </span>
  );
}

export default function AppHeader(props: {
  active?: ActiveTab;
  onResetDeck?: () => void;
  onRefreshDeck?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const active: ActiveTab | undefined =
    props.active ??
    (pathname?.startsWith('/matches')
      ? 'matches'
      : pathname?.startsWith('/messages') || pathname?.startsWith('/chat')
        ? 'messages'
        : pathname?.startsWith('/profile')
          ? 'profile'
          : pathname?.startsWith('/advanced-search')
            ? 'advanced-search'
            : pathname?.startsWith('/account')
              ? 'account'
              : pathname?.startsWith('/subscribe')
                ? 'subscribe'
                : pathname?.startsWith('/debug')
                  ? 'debug'
                  : 'discover');

  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Counts>({ total: 0, matches: 0, messages: 0 });

  const inboxBadge = clamp(counts.matches) + clamp(counts.messages);


  const uid = useMemo(() => {
    try {
      const token = requireSession();
      return uidFromToken(token) || 'anon';
    } catch {
      return 'anon';
    }
  }, []);

  const displayName = useMemo(() => {
    try {
      if (!uid || uid === 'anon') return '';
      const snap = loadUserProfileSnapshot(uid);
      const name = (snap?.displayName || (snap as any)?.email || '').toString().trim();
      return name;
    } catch {
      return '';
    }
  }, [uid]);

  const headerLabel = useMemo(() => {
    const name = (displayName || '').toString().trim();
    return name ? `Welcome back, ${name}` : 'Welcome back';
  }, [displayName]);

  useEffect(() => {
    let alive = true;
    const tick = () => {
      try {
        const raw = badgeCounts(uid);
        const next: Counts = {
          total: clamp(raw?.total ?? (raw?.matches ?? 0) + (raw?.messages ?? 0)),
          matches: clamp(raw?.matches ?? 0),
          messages: clamp(raw?.messages ?? 0),
        };
        if (alive) setCounts(next);
      } catch {
        if (alive) setCounts({ total: 0, matches: 0, messages: 0 });
      }
    };
    tick();
    const t = window.setInterval(tick, 1000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [uid]);

  const showHamburgerDot = counts.total > 0;

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: '10px 12px',
    fontSize: 13,
    borderRadius: 10,
    color: 'rgba(255,255,255,0.92)',
    textDecoration: 'none',
    cursor: 'pointer',
    userSelect: 'none',
  };

  const rowActiveStyle: React.CSSProperties = {
    ...rowStyle,
    background: 'rgba(255,255,255,0.10)',
  };

  const badgeStyle: React.CSSProperties = {
    marginLeft: 8,
    minWidth: 18,
    height: 18,
    padding: '0 6px',
    borderRadius: 999,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 800,
    background: 'rgba(255, 80, 120, 0.95)',
    color: 'white',
    boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
  };

  function go(path: string) {
    setOpen(false);
    router.push(path);
  }

  function logout() {
    setOpen(false);
    clearSession();
    router.push('/login');
  }

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        padding: '10px 14px',
        background: 'rgba(8, 4, 12, 0.52)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        overflow: 'visible',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Open menu"
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.92)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              lineHeight: '16px',
              position: 'relative',
              overflow: 'visible',
            }}
          >
            ☰
            {showHamburgerDot ? (
              <span
                aria-label="Notifications"
                style={{
                  position: 'absolute',
                  top: -3,
                  right: -3,
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: '#ff3b30',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.35)',
                  border: '2px solid rgba(8, 4, 12, 0.80)',
                  pointerEvents: 'none',
                }}
              />
            ) : null}
          </button>

          <Link href="/discover" style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 800, textDecoration: 'none' }}>
            {headerLabel}
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={logout}
            style={{
              borderRadius: 999,
              padding: '8px 12px',
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.92)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {open ? (
        <div
          style={{
            position: 'absolute',
            left: 14,
            top: 54,
            width: 240,
            borderRadius: 14,
            padding: 8,
            background: 'rgba(12, 8, 18, 0.92)',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '0 22px 60px rgba(0,0,0,0.45)',
            overflow: 'visible',
          }}
        >
          <div style={{ padding: '6px 8px', fontSize: 11, opacity: 0.7 }}>Navigation</div>

          <div
            style={active === 'discover' ? rowActiveStyle : rowStyle}
            onClick={() => go('/discover')}
            role="menuitem"
          >
            <span>Discover</span>
          </div>

          <div
            style={active === 'matches' || active === 'messages' ? rowActiveStyle : rowStyle}
            onClick={() => go('/matches')}
          >
            <span>Inbox</span>
            {inboxBadge > 0 ? <span style={badgeStyle}>{inboxBadge}</span> : null}
          </div>

          <div style={{ padding: '6px 8px', fontSize: 11, opacity: 0.7, marginTop: 4 }}>Search</div>

          <div
            style={active === 'advanced-search' ? rowActiveStyle : rowStyle}
            onClick={() => go('/advanced-search')}
            role="menuitem"
          >
            <span>Advanced search</span>
          </div>

          <div style={{ padding: '6px 8px', fontSize: 11, opacity: 0.7, marginTop: 4 }}>You</div>

          <div
            style={active === 'profile' ? rowActiveStyle : rowStyle}
            onClick={() => go('/profile')}
            role="menuitem"
          >
            <span>Profile</span>
          </div>

          <div
            style={active === 'account' ? rowActiveStyle : rowStyle}
            onClick={() => go('/account')}
            role="menuitem"
          >
            <span>Account details</span>
          </div>

          <div
            style={active === 'subscribe' ? rowActiveStyle : rowStyle}
            onClick={() => go('/subscribe')}
            role="menuitem"
          >
            <span>Subscribe</span>
          </div>

          {(props.onResetDeck || props.onRefreshDeck) ? (
            <>
              <div style={{ padding: '6px 8px', fontSize: 11, opacity: 0.7, marginTop: 4 }}>Debug</div>

              {props.onResetDeck ? (
                <div
                  style={active === 'debug' ? rowActiveStyle : rowStyle}
                  onClick={() => {
                    setOpen(false);
                    props.onResetDeck?.();
                  }}
                  role="menuitem"
                >
                  <span>Reset deck</span>
                </div>
              ) : null}

              {props.onRefreshDeck ? (
                <div
                  style={active === 'debug' ? rowActiveStyle : rowStyle}
                  onClick={() => {
                    setOpen(false);
                    props.onRefreshDeck?.();
                  }}
                  role="menuitem"
                >
                  <span>Refresh</span>
                </div>
              ) : null}
            </>
          ) : null}

          <div style={{ padding: '6px 8px', fontSize: 11, opacity: 0.7, marginTop: 4 }}>Session</div>

          <div style={rowStyle} onClick={logout} role="menuitem">
            <span>Logout</span>
          </div>
        </div>
      ) : null}
    </header>
  );
}
