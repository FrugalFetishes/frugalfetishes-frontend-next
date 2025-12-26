'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { requireSession, clearSession } from '@/lib/session';
import { uidFromToken, badgeCounts } from '@/lib/socialStore';

type Counts = { total: number; matches: number; messages: number };

type MenuItem = {
  key: string;
  href: string;
  label: string;
  badge?: (c: Counts) => number;
};

const MENU: MenuItem[] = [
  { key: 'discover', href: '/discover', label: 'Discover' },
  { key: 'matches', href: '/matches', label: 'Matches', badge: (c) => c.matches },
  { key: 'messages', href: '/messages', label: 'Messages', badge: (c) => c.messages },
  { key: 'advanced-search', href: '/advanced-search', label: 'Advanced Search' },
  { key: 'profile', href: '/profile', label: 'Profile' },
  { key: 'account', href: '/account', label: 'Account Details' },
  { key: 'subscribe', href: '/subscribe', label: 'Subscribe' },
];

function clamp(n: unknown): number {
  const x = Number(n);
  if (!Number.isFinite(x) || x < 0) return 0;
  return Math.floor(x);
}

export default function AppHeader(props: { active?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Counts>({ total: 0, matches: 0, messages: 0 });

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
      return 'anon';
    }
  }, [token]);

  // Keep badge counts fresh (and immediate) on any page.
  useEffect(() => {
    let cancelled = false;

    const tick = () => {
      try {
        const raw = badgeCounts(uid) as any;
        const next: Counts = {
          total: clamp(raw?.total ?? (raw?.matches ?? 0) + (raw?.messages ?? 0)),
          matches: clamp(raw?.matches ?? raw?.newMatches ?? 0),
          messages: clamp(raw?.messages ?? raw?.unreadMessages ?? 0),
        };
        if (!cancelled) setCounts(next);
      } catch {}
    };

    tick();

    // Update when localStorage changes (other tab / same tab writes).
    const onStorage = () => tick();
    window.addEventListener('storage', onStorage);

    const id = window.setInterval(tick, 400);

    return () => {
      cancelled = true;
      window.removeEventListener('storage', onStorage);
      window.clearInterval(id);
    };
  }, [uid]);

  const activeKey = useMemo(() => {
    if (!pathname) return props.active || '';
    const p = pathname.toLowerCase();
    if (p.startsWith('/discover')) return 'discover';
    if (p.startsWith('/matches')) return 'matches';
    if (p.startsWith('/messages')) return 'messages';
    if (p.startsWith('/advanced-search')) return 'advanced-search';
    if (p.startsWith('/account')) return 'account';
    if (p.startsWith('/subscribe')) return 'subscribe';
    if (p.startsWith('/profile')) return 'profile';
    if (p.startsWith('/chat')) return 'chat';
    return props.active || '';
  }, [pathname, props.active]);

  function logout() {
    try {
      clearSession();
    } catch {}
    router.push('/login');
  }

  return (
    <div className="ff-header">
      <div className="ff-header-left">
        <button
          className="ff-hamburger"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          <span className="ff-hamburger-lines" />
          {counts.total > 0 && <span className="ff-dot" aria-label={`${counts.total} notifications`} />}
        </button>

        {open && (
          <div className="ff-menu" role="menu">
            {MENU.map((item) => {
              const b = item.badge ? item.badge(counts) : 0;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`ff-menu-item ${activeKey === item.key ? 'active' : ''}`}
                  onClick={() => setOpen(false)}
                >
                  <span>{item.label}</span>
                  {b > 0 && <span className="ff-badge">{b}</span>}
                </Link>
              );
            })}

            <button className="ff-menu-item ff-menu-logout" onClick={logout}>
              Logout
            </button>
          </div>
        )}
      </div>

      <div className="ff-header-center">FrugalFetishes</div>

      <div className="ff-header-right">
        <button className="ff-logout" onClick={logout}>
          Logout
        </button>
      </div>

      <style jsx>{`
        .ff-header {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
        }

        .ff-header-left {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ff-header-center {
          font-weight: 700;
          letter-spacing: 0.2px;
        }

        .ff-header-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ff-hamburger {
          position: relative;
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(0,0,0,0.15);
          display: grid;
          place-items: center;
        }

        .ff-hamburger-lines {
          width: 16px;
          height: 12px;
          display: block;
          position: relative;
        }
        .ff-hamburger-lines::before,
        .ff-hamburger-lines::after,
        .ff-hamburger-lines {
          background: transparent;
        }
        .ff-hamburger-lines::before,
        .ff-hamburger-lines::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          border-radius: 2px;
          background: rgba(255,255,255,0.8);
        }
        .ff-hamburger-lines::before {
          top: 1px;
          box-shadow: 0 5px 0 rgba(255,255,255,0.8), 0 10px 0 rgba(255,255,255,0.8);
        }
        .ff-hamburger-lines::after {
          display: none;
        }

        .ff-dot {
          position: absolute;
          top: -3px;
          left: -3px;
          width: 14px;
          height: 14px;
          border-radius: 999px;
          background: #ff3b30;
          border: 2px solid rgba(0,0,0,0.4);
          box-shadow: 0 0 0 1px rgba(255,255,255,0.15);
          pointer-events: none;
        }

        .ff-menu {
          position: absolute;
          top: 42px;
          left: 0;
          min-width: 220px;
          border-radius: 12px;
          padding: 8px;
          background: rgba(10, 8, 20, 0.92);
          border: 1px solid rgba(255,255,255,0.12);
          backdrop-filter: blur(10px);
          z-index: 50;
        }

        .ff-menu-item {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 10px;
          border-radius: 10px;
          color: rgba(255,255,255,0.9);
          text-decoration: none;
          font-size: 14px;
          background: transparent;
          border: 0;
          cursor: pointer;
        }

        .ff-menu-item:hover {
          background: rgba(255,255,255,0.08);
        }

        .ff-menu-item.active {
          background: rgba(255,255,255,0.12);
        }

        .ff-badge {
          min-width: 18px;
          height: 18px;
          padding: 0 6px;
          border-radius: 999px;
          background: #ff3b30;
          color: white;
          font-size: 12px;
          display: grid;
          place-items: center;
        }

        .ff-logout {
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(0,0,0,0.15);
          padding: 8px 12px;
          color: rgba(255,255,255,0.9);
          cursor: pointer;
        }

        .ff-menu-logout {
          margin-top: 6px;
          border-top: 1px solid rgba(255,255,255,0.12);
          padding-top: 12px;
        }
      `}</style>
    </div>
  );
}
