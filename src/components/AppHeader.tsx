"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { requireSession, clearSession } from "@/lib/session";
import { uidFromToken, badgeCounts } from "@/lib/socialStore";

type ActiveTab =
  | "discover"
  | "matches"
  | "messages"
  | "advanced-search"
  | "profile"
  | "account"
  | "subscribe";

type Counts = { total: number; matches: number; messages: number };

function clamp(n: any): number {
  const x = Number(n);
  return Number.isFinite(x) ? Math.max(0, Math.floor(x)) : 0;
}

export default function AppHeader(props: { active?: ActiveTab }) {
  const pathname = usePathname();
  const active: ActiveTab =
    props.active ||
    (pathname?.startsWith("/discover")
      ? "discover"
      : pathname?.startsWith("/matches")
      ? "matches"
      : pathname?.startsWith("/messages") || pathname?.startsWith("/chat")
      ? "messages"
      : pathname?.startsWith("/advanced-search")
      ? "advanced-search"
      : pathname?.startsWith("/account")
      ? "account"
      : pathname?.startsWith("/subscribe")
      ? "subscribe"
      : "profile");

  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Counts>({ total: 0, matches: 0, messages: 0 });

  // Compute uid as a STRING (never null) so TS/build never fails.
  const uid = useMemo(() => {
    try {
      const token = requireSession();
      return uidFromToken(token) ?? "";
    } catch {
      return "";
    }
  }, []);

  useEffect(() => {
    const tick = () => {
      try {
        // Some flows can change session after mount; re-read token and uid for correctness.
        const token = requireSession();
        const u = uidFromToken(token) ?? "";
        const raw: any = badgeCounts(u);

        setCounts({
          total: clamp(raw?.total ?? (raw?.matches ?? 0) + (raw?.messages ?? 0)),
          matches: clamp(raw?.matches ?? raw?.newMatches ?? 0),
          messages: clamp(raw?.messages ?? raw?.unreadMessages ?? 0),
        });
      } catch {
        setCounts({ total: 0, matches: 0, messages: 0 });
      }
    };

    tick();
    const id = window.setInterval(tick, 700);
    return () => window.clearInterval(id);
  }, []);

  const anyBadge = counts.total > 0;

  function onLogout() {
    try {
      clearSession();
    } catch {}
    window.location.href = "/login";
  }

  const dotStyle: React.CSSProperties = {
    position: "absolute",
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 9999,
    background: "#ff3b30",
    border: "2px solid rgba(0,0,0,0.45)",
    boxShadow: "0 0 0 1px rgba(255,255,255,0.18)",
    pointerEvents: "none",
    zIndex: 9999,
  };

  const badgeStyle: React.CSSProperties = {
    marginLeft: "auto",
    minWidth: 18,
    height: 18,
    padding: "0 6px",
    borderRadius: 9999,
    background: "#ff3b30",
    color: "white",
    fontSize: 12,
    lineHeight: "18px",
    textAlign: "center",
  };

  return (
    <header className="ff-header">
      <div className="ff-header-left">
        <button
          className="ff-hamburger"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
          style={{ position: "relative", overflow: "visible" }}
        >
          <span className="ff-hamburger-icon">☰</span>
          {anyBadge ? <span style={dotStyle} aria-label="Notifications" /> : null}
        </button>

        <div className="ff-brand">FrugalFetishes</div>
      </div>

      <div className="ff-header-right">
        <button className="ff-pill" onClick={onLogout}>
          Logout
        </button>
      </div>

      {open ? (
        <nav className="ff-menu" role="navigation" aria-label="Main menu">
          <Link className={active === "discover" ? "ff-menu-item ff-menu-active" : "ff-menu-item"} href="/discover" onClick={() => setOpen(false)}>
            Discover
          </Link>

          <Link className={active === "matches" ? "ff-menu-item ff-menu-active" : "ff-menu-item"} href="/matches" onClick={() => setOpen(false)}>
            <span>Matches</span>
            {counts.matches > 0 ? <span style={badgeStyle}>{counts.matches}</span> : null}
          </Link>

          <Link className={active === "messages" ? "ff-menu-item ff-menu-active" : "ff-menu-item"} href="/messages" onClick={() => setOpen(false)}>
            <span>Messages</span>
            {counts.messages > 0 ? <span style={badgeStyle}>{counts.messages}</span> : null}
          </Link>

          <Link className={active === "advanced-search" ? "ff-menu-item ff-menu-active" : "ff-menu-item"} href="/advanced-search" onClick={() => setOpen(false)}>
            Advanced Search
          </Link>

          <Link className={active === "profile" ? "ff-menu-item ff-menu-active" : "ff-menu-item"} href="/profile" onClick={() => setOpen(false)}>
            Profile
          </Link>

          <Link className={active === "account" ? "ff-menu-item ff-menu-active" : "ff-menu-item"} href="/account" onClick={() => setOpen(false)}>
            Account Details
          </Link>

          <Link className={active === "subscribe" ? "ff-menu-item ff-menu-active" : "ff-menu-item"} href="/subscribe" onClick={() => setOpen(false)}>
            Subscribe
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
