'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { requireSession } from "@/lib/session";
import {
  uidFromToken,
  getMatchesFor,
  loadUserProfileSnapshot,
  unreadCountForMatch,
  clearUnreadForChat,
  type Match,
} from "@/lib/socialStore";

type Row = {
  matchId: string;
  otherUid: string;
  name: string;
  photo: string;
  lastTs: number;
  unread: number;
};

function safeNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function displayNameFromProfile(p: any, fallbackUid: string, match?: any) {
  const fromMatch =
    match?.otherDisplayName ||
    match?.otherName ||
    match?.displayName ||
    match?.fullName ||
    match?.name;
  if (typeof fromMatch === 'string' && fromMatch.trim()) return fromMatch.trim();
  const name =
    p?.displayName ||
    p?.name ||
    p?.fullName ||
    p?.username ||
    p?.email?.split?.("@")?.[0];

  if (typeof name === "string" && name.trim()) return name.trim();
  // fallback: short uid
  if (typeof fallbackUid === "string" && fallbackUid.includes("@")) return fallbackUid.split("@")[0];
  return (fallbackUid || "User").slice(0, 8);
}

function photoFromProfile(p: any, match?: any) {
  const fromMatch =
    match?.otherPhotoUrl ||
    match?.otherPhotoURL ||
    match?.photoUrl ||
    match?.photoURL ||
    match?.avatarUrl ||
    match?.primaryPhotoUrl;
  if (typeof fromMatch === 'string' && fromMatch.trim()) return fromMatch.trim();
  return (
    p?.photoUrl ||
    p?.avatarUrl ||
    p?.photoURL ||
    p?.avatar ||
    "/icon.png"
  );
}

function toMatchId(m: any): string {
  if (!m) return "";
  if (typeof m === "string") return m;
  if (typeof m.id === "string") return m.id;
  return String(m.id ?? "");
}

function otherUidFromMatch(m: any, uid: string): string {
  const a = (m as any).a ?? (m as any).userA ?? (m as any).uidA;
  const b = (m as any).b ?? (m as any).userB ?? (m as any).uidB;
  if (a === uid) return String(b ?? "");
  if (b === uid) return String(a ?? "");
  // fallback if shape is unknown
  return String(b ?? a ?? "");
}

export default function MessagesPage() {
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
      return uidFromToken(token ?? '');
    } catch {
      return null;
    }
  }, [token]);

  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!uid) {
      setRows([]);
      return;
    }

    // Build list from local store (matches + chat summaries).
    let matches: Match[] = [];
    try {
      matches = (getMatchesFor(uid) as any[]) as Match[];
    } catch {
      matches = [];
    }

    const out: Row[] = [];
    for (const m of matches) {
      const matchId = toMatchId(m);
      if (!matchId) continue;

      const otherUid = otherUidFromMatch(m as any, uid);
      const p = (() => {
        try {
          return loadUserProfileSnapshot(otherUid) as any;
        } catch {
          return null;
        }
      })();

      const lastTs =
        safeNum((m as any).lastMessageAt) ||
        safeNum((m as any).lastTs) ||
        safeNum((m as any).updatedAt) ||
        safeNum((m as any).createdAt) ||
        Date.now();

      let unread = 0;
      try {
        unread = unreadCountForMatch(uid, matchId);
      } catch {
        unread =
          safeNum((m as any).unread?.[uid]) ||
          safeNum((m as any).unreadCount?.[uid]) ||
          safeNum((m as any).unreadCount) ||
          0;
      }

      out.push({
        matchId,
        otherUid,
        name: displayNameFromProfile(p, otherUid, m),
        photo: photoFromProfile(p),
        lastTs,
        unread,
      });
    }

    out.sort((a, b) => b.lastTs - a.lastTs);
    setRows(out);
  }, [uid]);

  return (
    <div className="ff-page">
      <AppHeader active="messages" />
      <div className="ff-shell">
        <h1 className="ff-h1">Messages</h1>

        {!uid ? (
          <div className="ff-muted">
            You’re not logged in. Go to <Link href="/login">Login</Link>.
          </div>
        ) : rows.length === 0 ? (
          <div className="ff-muted">
            No conversations yet. Match with someone first.
          </div>
        ) : (
          <div className="ff-list">
            {rows.map((r) => (
              <div key={r.matchId} className="ff-row">
                <div className="ff-row-left">
                  <img className="ff-avatar" src={r.photo} alt={r.name} />
                  <div className="ff-row-text">
                    <div className="ff-row-title">
                      {r.name}
                      {r.unread > 0 ? (
                        <span className="ff-badge" style={{ marginLeft: 8 }}>
                          {r.unread}
                        </span>
                      ) : null}
                    </div>
                    <div className="ff-row-sub">
                      {new Date(r.lastTs).toLocaleString()}
                    </div>
                  </div>
                </div>

                <Link
                  className="ff-btn"
                  href={`/chat/${encodeURIComponent(r.matchId)}`}
                  onClick={() => {
                    try {
                      clearUnreadForChat(uid, r.matchId);
                    } catch {}
                  }}
                >
                  Open
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
