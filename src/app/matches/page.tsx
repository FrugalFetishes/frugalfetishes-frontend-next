"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import AppHeader from "@/components/AppHeader";
import { requireSession } from "@/lib/session";
import {
  uidFromToken,
  getMatchesFor,
  loadUserProfileSnapshot,
  markMatchClicked,
  type Match,
} from "@/lib/socialStore";

type ProfileLite = {
  displayName?: string;
  name?: string;
  username?: string;
  email?: string;
  photoUrl?: string;
  photo?: string;
  avatarUrl?: string;
  aboutMe?: string;
  headline?: string;
};

type MatchRow = {
  matchId: string;
  otherUid: string;
  name: string;
  photo: string;
  matchedAt?: number;
};

function shortUid(uid: string): string {
  if (!uid) return "User";
  if (uid.includes("@")) return uid.split("@")[0] || uid;
  return uid.slice(0, 8);
}

function displayNameFor(p: ProfileLite | null, otherUid: string, match?: any): string {
  const fromMatch =
    match?.otherDisplayName ||
    match?.otherName ||
    match?.displayName ||
    match?.fullName ||
    match?.name;
  if (typeof fromMatch === 'string' && fromMatch.trim()) return fromMatch.trim();

  const v =
    p?.displayName ||
    p?.name ||
    p?.username ||
    (p?.email ? p.email.split("@")[0] : "") ||
    "";
  return v.trim() || shortUid(otherUid);
}

function initialAvatarDataUri(label: string): string {
  const letter = (label.trim()[0] || "?").toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
  <rect width="64" height="64" rx="32" ry="32" fill="#2b2b2b"/>
  <text x="32" y="40" text-anchor="middle" font-size="28" font-family="Arial" fill="#ffffff">${letter}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function toMillis(v: any): number | undefined {
  if (!v) return undefined;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
    const d = Date.parse(v);
    if (!Number.isNaN(d)) return d;
    return undefined;
  }
  // tolerate Firestore-like timestamps (seconds + nanoseconds)
  const seconds = (v as any).seconds;
  if (typeof seconds === "number") return seconds * 1000;
  const ms = (v as any).toMillis;
  if (typeof ms === "function") {
    try {
      return ms.call(v);
    } catch {}
  }
  return undefined;
}

function otherUidFromMatch(uid: string, match: Match): string {
  const a: string | undefined = (match as any).a ?? (match as any).userA ?? (match as any).uidA;
  const b: string | undefined = (match as any).b ?? (match as any).userB ?? (match as any).uidB;
  if (a && a !== uid) return a;
  if (b && b !== uid) return b;
  // last resort: try arrays/objects
  const users: any = (match as any).users;
  if (Array.isArray(users)) {
    const other = users.find((x) => x && x !== uid);
    if (typeof other === "string") return other;
  }
  return "";
}

export default function MatchesPage() {
  const token = useMemo(() => {
    try {
      return requireSession();
    } catch {
      return null as any;
    }
  }, []);

  const uid = useMemo(() => uidFromToken((token ?? "") as string) || "anon", [token]);

  const [rows, setRows] = useState<MatchRow[] | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        if (!uid) {
          if (alive) setRows([]);
          return;
        }

        const matches = await getMatchesFor(uid);

        const out: MatchRow[] = matches.map((m: Match) => {
          const matchId = (m as any).id || (m as any).matchId || "";
          const otherUid = otherUidFromMatch(uid, m) || "";
          const p: ProfileLite | null = otherUid ? (loadUserProfileSnapshot(otherUid) as any) : null;

          const name = displayNameFor(p, otherUid || "User", m);
          const photo =
            (p?.photoUrl || p?.avatarUrl || p?.photo || "").trim() || initialAvatarDataUri(name);

          const matchedAt =
            toMillis((m as any).createdAt) ??
            toMillis((m as any).matchedAt) ??
            toMillis((m as any).matchCreatedAt);

          return {
            matchId: String(matchId || `${uid}:${otherUid}`),
            otherUid,
            name,
            photo,
            matchedAt,
          };
        });

        // newest first
        out.sort((a, b) => (b.matchedAt || 0) - (a.matchedAt || 0));

        if (alive) setRows(out);
      } catch (e) {
        // keep page alive even if one match is malformed
        if (alive) setRows([]);
        console.error("[matches] load failed", e);
      }
    })();

    return () => {
      alive = false;
    };
  }, [uid]);

  return (
    <div className="ff-page">
      <AppHeader active="matches" />
      <main className="ff-main">
        <h1 className="ff-h1">Matches</h1>

        {rows === null ? (
          <div className="ff-muted">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="ff-muted">
            No matches yet. Swipe right on Discover and make sure the other account likes you back.
          </div>
        ) : (
          <div className="ff-list">
            {rows.map((r) => {
              const ts =
                typeof r.matchedAt === "number"
                  ? new Date(r.matchedAt).toLocaleString()
                  : "New match";

              return (
                <div key={r.matchId} className="ff-row">
                  <div className="ff-row-left">
                    <img className="ff-avatar" src={r.photo} alt={r.name} />
                    <div className="ff-row-text">
                      <div className="ff-row-title">{r.name}</div>
                      <div className="ff-muted">{ts}</div>
                    </div>
                  </div>

                  <Link
                    className="ff-btn"
                    href={`/matches/${encodeURIComponent(r.matchId)}`}
                    onClick={() => {
                      try {
                        markMatchClicked(uid, r.matchId);
                      } catch {}
                    }}
                  >
                    Open
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
