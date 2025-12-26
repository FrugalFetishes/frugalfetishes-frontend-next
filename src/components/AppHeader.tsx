"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { requireSession, clearSession } from "@/lib/session";
import { uidFromToken, badgeCounts } from "@/lib/socialStore";

type ActiveTab = "discover" | "matches" | "chat" | "profile";
type CountsState = { newMatches: number; unreadMessages: number };

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
  const [counts, setCounts] = useState<CountsState>({ newMatches: 0, unreadMessages: 0 });

  useEffect(() => {
    const tick = () => {
      try {
        const token = requireSession();
        const uid = uidFromToken(token) ?? "anon";
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
    const id = window.setInterval(tick, 600);
    return () => window.clearInterval(id);
  }, []);

  const anyBadge = counts.newMatches + counts.unreadMessages > 0;

  function onLogout() {
    try {
      clearSession();
    } catch {}
    window.location.href = "/login";
  }

  // Put the dot INSIDE the hamburger circle so it can't be clipped by layout/CSS.
  const dotStyle: React.CSSProperties = {
    position: "absolute",
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 9999,
    background: "#ff3b30",
    border: "2px solid rgba(0,0,0,0.45)",
    boxShadow: "0 0 0 1px rgba(255,255,255,0.18)",
    pointerEvents: "none",
    zIndex: 50,
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
          style={{ position: "relative" }}
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
              <span style={badgeStyle} aria-label={`${counts.newMatches} new matches`}>
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
              <span style={badgeStyle} aria-label={`${counts.unreadMessages} unread messages`}>
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
