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

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const matchId = params?.id || "";

  const token = useMemo(() => {
    try { return requireSession(); } catch { return null as any; }
  }, []);
  const uid = useMemo(() => uidFromToken(token) ?? "anon", [token]);

  const otherUid = useMemo(() => {
    const parts = String(matchId).split("__");
    if (parts.length !== 2) return "";
    return parts[0] === uid ? parts[1] : parts[0];
  }, [matchId, uid]);

  const other = useMemo(() => loadUserProfileSnapshot(otherUid), [otherUid]);
  const otherName = other?.name || otherUid || "Chat";

  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    // opening chat clears unread badge for this thread
    try { clearUnreadForChat(uid, matchId); } catch {}

    const buildRows = () => {
      const msgs = getChat(matchId);
      const out: Row[] = [];
      let lastDay = "";
      for (const m of msgs) {
        const day = fmtDate(m.ts);
        if (day && day !== lastDay) {
          lastDay = day;
          out.push({ kind: "date", id: `d:${day}`, label: day });
        }
        out.push({ kind: "msg", id: m.id, from: m.fromUserId, text: m.text, ts: m.ts });
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

    addChatMessage(matchId, { fromUserId: uid, text: t });
    // mark unread for the other user (local)
    if (otherUid) incrementUnread(otherUid, matchId, 1);
    setText("");
  }

  return (
    <div className="ff-page">
      <AppHeader active="chat" />

      <main className="ff-shell">
        <div className="ff-chat-top">
          <button className="ff-pill" onClick={() => router.back()}>Back</button>
          <div className="ff-chat-title">{otherName}</div>
          <Link className="ff-pill" href="/matches">Matches</Link>
        </div>

        <div className="ff-chat">
          {rows.length === 0 ? (
            <div className="ff-muted">No messages yet. Say hi.</div>
          ) : (
            rows.map((r) =>
              r.kind === "date" ? (
                <div key={r.id} className="ff-chat-date">{r.label}</div>
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
            onKeyDown={(e) => { if (e.key === "Enter") onSend(); }}
          />
          <button className="ff-pill" onClick={onSend}>Send</button>
        </div>
      </main>
    </div>
  );
}
