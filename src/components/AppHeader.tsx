"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { badgeCounts } from "@/lib/socialStore";
import { requireSession, clearSession } from "@/lib/session";

type MenuItem = { href: string; label: string; badge?: number };

export default function AppHeader(props: { active?: "discover" | "matches" | "chat" | "profile" }) {
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<{ newMatches: number; unreadMessages: number }>({
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

  // uid is derived inside badgeCounts via localStorage keys, but for safety we refresh counts by scanning
  useEffect(() => {
    const tick = () => {
      try {
        // badgeCounts uses uid keys; we store by uid in socialStore, so we need uid in localStorage to exist.
        // In practice, token->uid is used by pages that create matches/messages. Here we just refresh.
        // Pages will write the keys; we just compute.
        const uid = (() => {
          try {
            const parts = String(token || "").split(".");
            if (parts.length < 2) return "anon";
            const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
            const json = decodeURIComponent(
              atob(b64)
                .split("")
                .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
            );
            const payload = JSON.parse(json) as any;
            return payload?.uid || payload?.user_id || payload?.sub || "anon";
          } catch {
            return "anon";
          }
        })();
        const raw: any = badgeCounts(uid);
        setCounts({
          newMatches: Number(raw?.matches ?? 0),
          unreadMessages: Number(raw?.messages ?? 0),
        });
      } catch {}
    };
    tick();
    const id = window.setInterval(tick, 800);
    return () => window.clearInterval(id);
  }, [token]);

  const totalBadge = counts.newMatches + counts.unreadMessages;

  const items: MenuItem[] = [
    { href: "/discover", label: "Discover" },
    { href: "/matches", label: "Matches", badge: counts.newMatches || undefined },
    { href: "/chat/inbox", label: "Messages", badge: counts.unreadMessages || undefined },
    { href: "/search", label: "Advanced Search", badge: undefined },
    { href: "/profile", label: "Profile" },
  ];

  function onLogout() {
    try {
      clearSession();
    } catch {}
    window.location.href = "/login";
  }

  return (
    <header className="ff-header">
      <button
        className="ff-hamburger"
        aria-label="Menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ff-ham-line" />
        <span className="ff-ham-line" />
        <span className="ff-ham-line" />
        {totalBadge > 0 ? <span className="ff-badge">{totalBadge}</span> : null}
      </button>

      <div className="ff-brand">
        <img className="ff-brand-img" src="/FFmenuheaderlogo.png" alt="FrugalFetishes" />
      </div>

      <div className="ff-header-right">
        <button className="ff-pill" onClick={onLogout}>
          Logout
        </button>
      </div>

      {open ? (
        <div className="ff-menu" role="menu" aria-label="Main menu">
          {items.map((it) => (
            <Link
              key={it.href}
              className="ff-menu-item"
              href={it.href}
              onClick={() => setOpen(false)}
            >
              <span>{it.label}</span>
              {it.badge ? <span className="ff-badge ff-badge-sm">{it.badge}</span> : null}
            </Link>
          ))}
          <div className="ff-menu-divider" />
          <button className="ff-menu-item" onClick={onLogout}>
            <span>Logout</span>
          </button>
        </div>
      ) : null}
    </header>
  );
}
