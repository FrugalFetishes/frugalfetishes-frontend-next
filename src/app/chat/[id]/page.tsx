"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { requireSession } from "@/lib/session";
import {
  uidFromToken,
  getChat,
  addChatMessage,
  incrementUnread,
  clearUnreadForChat,
  loadUserProfileSnapshot,
} from "@/lib/socialStore";

type ProfileSnapshot =
  | { name?: string; displayName?: string; username?: string; email?: string; photoUrl?: string; avatarUrl?: string }
  | null;

type Row =
  | { kind: "date"; id: string; label: string }
  | { kind: "msg"; id: string; from: string; text: string; ts: number };

function fmtDate(ts: number) {
  try {
    return new Date(ts).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function fmtTime(ts: number) {
  try {
    return new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

function fallbackNameFromUid(u: string): string {
  if (!u) return "Chat";
  if (u.includes("@")) return u.split("@")[0] || u;
  return u.slice(0, 8);
}

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const matchId = params?.id || "";

  const token = useMemo(() => {
    try {
      return requireSession();
    } catch {
      return null as any;
    }
  }, []);
  const uid = useMemo(() => uidFromToken(token) ?? "anon", [token]);

  const otherUid = useMemo(() => {
    const parts = String(matchId).split("__");
    if (parts.length !== 2) return "";
    return parts[0] === uid ? parts[1] : parts[0];
  }, [matchId, uid]);

  const other = useMemo<ProfileSnapshot>(() => {
    try {
      return (loadUserProfileSnapshot(otherUid) as any) as ProfileSnapshot;
    } catch {
      return null;
    }
  }, [otherUid]);

  const otherName =
    other?.name || other?.displayName || other?.username || other?.email || fallbackNameFromUid(otherUid);

  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    try {
      clearUnreadForChat(uid, matchId);
    } catch {}

    const buildRows = () => {
      const msgs: any[] = (() => {
        try {
          return getChat(matchId) as any[];
        } catch {
          return [];
        }
      })();

      const out: Row[] = [];
      let lastDay = "";

      for (const m of msgs) {
        const ts = Number(m.createdAt) || 0;
        const day = fmtDate(ts);

        if (day && day !== lastDay) {
          lastDay = day;
          out.push({ kind: "date", id: `d:${day}`, label: day });
        }

        const from = String(m.fromUid ?? m.fromUserId ?? m.from ?? "");
        out.push({ kind: "msg", id: String(m.id ?? `${from}:${ts}`), from, text: String(m.text ?? ""), ts });
      }

      setRows(out);
    };

    buildRows();
    const id = window.setInterval(buildRows, 700);
    return () => window.clearInterval(id);
  }, [uid, matchId]);

  function onSend() {
    const t = text.trim();
    if (!t) return;

    // socialStore signature: addChatMessage(matchId, fromUid, toUid, text)
    try {
      addChatMessage(matchId, uid, otherUid, t);
    } catch {}

    try {
      if (otherUid) incrementUnread(otherUid, matchId);
    } catch {}

    setText("");
  }

  return (
    <div className="ff-page">
      <AppHeader active="messages" />

      <main className="ff-shell">
        <div className="ff-chat-top">
          <button className="ff-pill" onClick={() => router.back()}>
            Back
          </button>
          <div className="ff-chat-title">{otherName}</div>
          <Link className="ff-pill" href="/matches">
            Matches
          </Link>
        </div>

        <div className="ff-chat">
          {rows.length === 0 ? (
            <div className="ff-muted">No messages yet. Say hi.</div>
          ) : (
            rows.map((r) =>
              r.kind === "date" ? (
                <div key={r.id} className="ff-chat-date">
                  {r.label}
                </div>
              ) : (
                <div key={r.id} className={r.from === uid ? "ff-bubble ff-bubble-me" : "ff-bubble"}>
                  <div className="ff-bubble-text">{r.text}</div>
                  <div className="ff-bubble-time">{fmtTime(r.ts)}</div>
                </div>
              )
            )
          )}
        </div>

        <div className="ff-chat-input">
          <input
            className="ff-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message…"
            onKeyDown={(e) => {
              if (e.key === "Enter") onSend();
            }}
          />
          <button className="ff-pill" onClick={onSend}>
            Send
          </button>
        </div>
      </main>
    </div>
  );
}
