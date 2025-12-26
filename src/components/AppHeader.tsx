'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { requireSession, clearSession } from "@/lib/session";
import { uidFromToken, badgeCounts } from "@/lib/socialStore";

type ActiveTab =
  | "discover"
  | "matches"
  | "messages"
  | "profile"
  | "advanced-search"
  | "account"
  | "subscribe"
  | "debug";

type Counts = {
  total: number;      // total notifications (matches + messages)
  matches: number;    // new/unopened matches
  messages: number;   // unread messages
};

function clamp(n: unknown): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.floor(x));
}

function Badge({ n }: { n: number }) {
  if (!n || n <= 0) return null;
  return (
    <span
      aria-label={`${n}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 18,
        height: 18,
        padding: "0 6px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        lineHeight: "18px",
        background: "#ff2d55",
        color: "#fff",
        marginLeft: 8,
      }}
    >
      {n}
    </span>
  );
}

function Dot({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        top: -2,
        right: -2,
        width: 10,
        height: 10,
        borderRadius: 999,
        background: "#ff2d55",
        boxShadow: "0 0 0 2px rgba(0,0,0,0.6)",
      }}
    />
  );
}

export default function AppHeader(props: { active?: ActiveTab }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Counts>({ total: 0, matches: 0, messages: 0 });

  const active = useMemo<ActiveTab | undefined>(() => {
    if (props.active) return props.active;
    if (!pathname) return undefined;
    if (pathname.startsWith("/discover")) return "discover";
    if (pathname.startsWith("/matches")) return "matches";
    if (pathname.startsWith("/messages")) return "messages";
    if (pathname.startsWith("/chat")) return "messages";
    if (pathname.startsWith("/advanced-search")) return "advanced-search";
    if (pathname.startsWith("/account")) return "account";
    if (pathname.startsWith("/subscribe")) return "subscribe";
    if (pathname.startsWith("/profile")) return "profile";
    return undefined;
  }, [pathname, props.active]);

  const token = useMemo(() => {
    try {
      return requireSession();
    } catch {
      return null as any;
    }
  }, []);

  const uid = useMemo(() => {
    if (!token) return null;
    try {
      return uidFromToken(token);
    } catch {
      return null;
    }
  }, [token]);

  useEffect(() => {
    if (!uid) {
      setCounts({ total: 0, matches: 0, messages: 0 });
      return;
    }

    const tick = () => {
      try {
        const raw: any = badgeCounts(uid);
        const next: Counts = {
          total: clamp(raw?.total ?? (raw?.matches ?? 0) + (raw?.messages ?? 0)),
          matches: clamp(raw?.matches ?? raw?.newMatches ?? 0),
          messages: clamp(raw?.messages ?? raw?.unreadMessages ?? 0),
        };
        setCounts(next);
      } catch {
        // ignore
      }
    };

    tick();

    // Poll lightly because this app stores in localStorage and other tabs may update.
    const t = window.setInterval(tick, 800);
    return () => window.clearInterval(t);
  }, [uid]);

  // close menu when route changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const MenuLink = ({
    href,
    label,
    tab,
    badge,
  }: {
    href: string;
    label: string;
    tab?: ActiveTab;
    badge?: number;
  }) => {
    const isActive = tab && active === tab;
    return (
      <Link
        href={href}
        onClick={() => setOpen(false)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "8px 10px",
          borderRadius: 10,
          color: "rgba(255,255,255,0.92)",
          textDecoration: "none",
          background: isActive ? "rgba(255,255,255,0.10)" : "transparent",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center" }}>
          {label}
          {!!badge && badge > 0 ? <Badge n={badge} /> : null}
        </span>
        <span aria-hidden="true" style={{ opacity: 0.4 }}>
          ›
        </span>
      </Link>
    );
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        background: "rgba(10,10,14,0.25)",
        borderBottom: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          minHeight: 54,
        }}
      >
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
            style={{
              position: "relative",
              width: 36,
              height: 36,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.25)",
              color: "rgba(255,255,255,0.95)",
              cursor: "pointer",
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 18, lineHeight: "36px" }}>
              ☰
            </span>
            <Dot show={counts.total > 0} />
          </button>

          {open ? (
            <nav
              role="menu"
              aria-label="Main menu"
              style={{
                position: "absolute",
                top: 42,
                left: 0,
                width: 240,
                padding: 10,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(12,12,18,0.92)",
                boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
                overflow: "visible",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <MenuLink href="/discover" label="Discover" tab="discover" />
                <MenuLink href="/matches" label="Matches" tab="matches" badge={counts.matches} />
                <MenuLink href="/messages" label="Messages" tab="messages" badge={counts.messages} />
                <MenuLink href="/advanced-search" label="Advanced Search" tab="advanced-search" />
                <MenuLink href="/profile" label="Profile" tab="profile" />
                <MenuLink href="/account" label="Account Details" tab="account" />
                <MenuLink href="/subscribe" label="Subscribe" tab="subscribe" />

                <div style={{ height: 1, margin: "8px 0", background: "rgba(255,255,255,0.10)" }} />

                {/* Debug bucket (temporary) */}
                <div style={{ padding: "6px 10px", fontSize: 12, opacity: 0.8 }}>
                  DEBUG
                </div>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.removeItem("ff:deck");
                      localStorage.removeItem("ff:discoverDeck");
                      localStorage.removeItem("ff:discover:index");
                    } catch {}
                    setOpen(false);
                    // reload current page
                    try { window.location.reload(); } catch {}
                  }}
                  style={{
                    textAlign: "left",
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "none",
                    background: "transparent",
                    color: "rgba(255,255,255,0.92)",
                    cursor: "pointer",
                  }}
                >
                  Reset deck
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    try { window.location.reload(); } catch {}
                  }}
                  style={{
                    textAlign: "left",
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "none",
                    background: "transparent",
                    color: "rgba(255,255,255,0.92)",
                    cursor: "pointer",
                  }}
                >
                  Refresh
                </button>

                <div style={{ height: 1, margin: "8px 0", background: "rgba(255,255,255,0.10)" }} />

                <button
                  type="button"
                  onClick={() => {
                    try {
                      clearSession();
                    } catch {}
                    setOpen(false);
                    try {
                      window.location.href = "/login";
                    } catch {}
                  }}
                  style={{
                    textAlign: "left",
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "none",
                    background: "rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.95)",
                    cursor: "pointer",
                  }}
                >
                  Logout
                </button>
              </div>
            </nav>
          ) : null}

          <div style={{ fontWeight: 800, color: "rgba(255,255,255,0.92)" }}>FrugalFetishes</div>
        </div>

        {/* Right side: keep simple */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Optional quick link - keeps existing UX */}
          <Link
            href="/discover"
            style={{
              color: "rgba(255,255,255,0.70)",
              textDecoration: "none",
              fontSize: 13,
            }}
          >
            {active ? active[0].toUpperCase() + active.slice(1).replace("-", " ") : ""}
          </Link>
        </div>
      </div>
    </header>
  );
}
