"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { badgeCounts, uidFromToken } from "@/lib/socialStore";
import { requireSession, clearSession } from "@/lib/session";

type ActiveTab = "discover" | "matches" | "chat" | "profile";

type CountState = {
  newMatches: number;
  unreadMessages: number;
};

function asNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function AppHeader(props: { active?: ActiveTab }) {
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<CountState>({ newMatches: 0, unreadMessages: 0 });

  const token = useMemo(() => {
    try {
      return requireSession();
    } catch {
      return null as any;
    }
  }, []);

  const uid = useMemo(() => {
    if (!token) return "anon";
    return uidFromToken(token) ?? "anon";
  }, [token]);

  useEffect(() => {
    const tick = () => {
      try {
        const raw = badgeCounts(uid);
        setCounts({
          newMatches: asNum(raw.matches),
          unreadMessages: asNum(raw.messages),
        });
      } catch {
        // ignore
      }
    };

    tick();
    const t = window.setInterval(tick, 800);

    // also update immediately if anything in localStorage changes (message send, match created, etc.)
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key.startsWith("ff:")) tick();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.clearInterval(t);
      window.removeEventListener("storage", onStorage);
    };
  }, [uid]);

  const onLogout = () => {
    try {
      clearSession();
    } catch {}
    window.location.href = "/login";
  };

  const dot = counts.newMatches + counts.unreadMessages;

  return (
    <header className="ff-header">
      <div className="ff-header-left">
        <button
          className="ff-hamburger"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
          style={{ position: "relative" }}
        >
          ☰
          {dot > 0 ? <span aria-hidden="true" style={{ position: "absolute", top: 2, left: 18, width: 10, height: 10, borderRadius: 9999, background: "#ff3b30", boxShadow: "0 0 0 2px rgba(0,0,0,0.35)" }} /> : null}
        </button>
        <Link className="ff-brand" href="/discover">FrugalFetishes</Link>
      </div>

      <div className="ff-header-center">
        {props.active ? <span className="ff-active">{props.active[0].toUpperCase() + props.active.slice(1)}</span> : null}
      </div>

      <div className="ff-header-right">
        <button className="ff-logout" onClick={onLogout}>Logout</button>
      </div>

      {open ? (
        <div className="ff-menu">
          <Link className={props.active === "discover" ? "ff-menu-item active" : "ff-menu-item"} href="/discover" onClick={() => setOpen(false)}>
            Discover
          </Link>

          <Link className={props.active === "matches" ? "ff-menu-item active" : "ff-menu-item"} href="/matches" onClick={() => setOpen(false)}>
            Matches
            {counts.newMatches > 0 ? <span className="ff-badge">{counts.newMatches}</span> : null}
          </Link>

          <Link className={props.active === "chat" ? "ff-menu-item active" : "ff-menu-item"} href="/chat" onClick={() => setOpen(false)}>
            Messages
            {counts.unreadMessages > 0 ? <span className="ff-badge">{counts.unreadMessages}</span> : null}
          </Link>

          <Link className={props.active === "profile" ? "ff-menu-item active" : "ff-menu-item"} href="/profile" onClick={() => setOpen(false)}>
            Profile
          </Link>
        </div>
      ) : null}
    </header>
  );
}
