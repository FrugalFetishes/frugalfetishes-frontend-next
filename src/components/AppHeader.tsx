"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { requireSession, clearSession } from "@/lib/session";
import { uidFromToken, badgeCounts } from "@/lib/socialStore";

type ActiveTab = "discover" | "matches" | "chat" | "profile";

type CountsState = {
  newMatches: number;
  unreadMessages: number;
};

function safeNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function AppHeader(props: { active?: ActiveTab }) {
  const pathname = usePathname();
  const active: ActiveTab =
    props.active ||
    (pathname?.startsWith("/discover")
      ? "discover"
      : pathname?.startsWith("/matches")
      ? "matches"
      : pathname?.startsWith("/chat")
      ? "chat"
      : "profile");

  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<CountsState>({
    newMatches: 0,
    unreadMessages: 0,
  });

  const token = useMemo(() => {
    try {
      return requireSession();
    } catch {
      return null as any;
    }
  }, []);

  const uid = useMemo(() => uidFromToken(token) ?? "anon", [token]);

  useEffect(() => {
    const tick = () => {
      try {
        const raw: any = badgeCounts(uid);
        setCounts({
          newMatches: safeNum(raw?.matches),
          unreadMessages: safeNum(raw?.messages),
        });
      } catch {
        setCounts({ newMatches: 0, unreadMessages: 0 });
      }
    };

    tick();
    const id = window.setInterval(tick, 800);
    return () => window.clearInterval(id);
  }, [uid]);

  const anyBadge = (counts.newMatches + counts.unreadMessages) > 0;

  function onLogout() {
    try {
      clearSession();
    } catch {}
    window.location.href = "/login";
  }

  return (
    <header className="ff-header">
      <div className="ff-header-left">
        <button
          className="ff-hamburger"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="ff-hamburger-icon">☰</span>
          {anyBadge ? <span className="ff-badge-dot" aria-label="Notifications" /> : null}
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
          <Link
            className={active === "discover" ? "ff-menu-item ff-menu-active" : "ff-menu-item"}
            href="/discover"
            onClick={() => setOpen(false)}
          >
            Discover
          </Link>

          <Link
            className={active === "matches" ? "ff-menu-item ff-menu-active" : "ff-menu-item"}
            href="/matches"
            onClick={() => setOpen(false)}
          >
            <span>Matches</span>
            {counts.newMatches > 0 ? (
              <span className="ff-menu-badge" aria-label={`${counts.newMatches} new matches`}>
                {counts.newMatches}
              </span>
            ) : null}
          </Link>

          <Link
            className={active === "chat" ? "ff-menu-item ff-menu-active" : "ff-menu-item"}
            href="/chat"
            onClick={() => setOpen(false)}
          >
            <span>Messages</span>
            {counts.unreadMessages > 0 ? (
              <span className="ff-menu-badge" aria-label={`${counts.unreadMessages} unread messages`}>
                {counts.unreadMessages}
              </span>
            ) : null}
          </Link>

          <Link
            className={active === "profile" ? "ff-menu-item ff-menu-active" : "ff-menu-item"}
            href="/profile"
            onClick={() => setOpen(false)}
          >
            Profile
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
