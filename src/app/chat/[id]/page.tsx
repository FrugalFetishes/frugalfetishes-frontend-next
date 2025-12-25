"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { loadSession } from "@/lib/session";

type Msg = {
  id?: string;
  matchId?: string;
  fromUid?: string;
  toUid?: string;
  text?: string;
  createdAt?: any;
};

function fmtTime(ts: any): string {
  if (!ts) return "";
  const seconds = ts?._seconds ?? ts?.seconds;
  if (typeof seconds === "number") {
    const d = new Date(seconds * 1000);
    return d.toLocaleTimeString();
  }
  const d = new Date(ts);
  if (!isNaN(d.getTime())) return d.toLocaleTimeString();
  return "";
}

export default function ChatPage({ params }: { params: { id: string } }) {
  const matchId = decodeURIComponent(params.id || "");
  const [status, setStatus] = useState("Loading…");
  const [me, setMe] = useState<any>(null);
  const [other, setOther] = useState<any>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const title = useMemo(() => {
    const name = other?.displayName || "Chat";
    const city = other?.city ? ` · ${other.city}` : "";
    return `${name}${city}`;
  }, [other]);

  async function loadAll() {
    setStatus("Loading profile…");
    const meRes = await apiGet("/api/profile/me");
    if (!meRes?.ok) {
      setStatus(`Profile load failed: ${meRes?.error || "unknown error"}`);
      return;
    }
    setMe(meRes);

    setStatus("Loading match…");
    const matchesRes = await apiGet("/api/matches?limit=50");
    if (matchesRes?.ok) {
      const row = (Array.isArray(matchesRes.items) ? matchesRes.items : []).find((x: any) => x?.matchId === matchId);
      setOther(row?.profile || null);
    }

    setStatus("Loading thread…");
    const threadRes = await apiGet(`/api/messages/thread?matchId=${encodeURIComponent(matchId)}&limit=100`);
    if (!threadRes?.ok) {
      setStatus(`Thread load failed: ${threadRes?.error || "unknown error"}`);
      return;
    }

    const rows = Array.isArray(threadRes.items) ? threadRes.items : Array.isArray(threadRes.messages) ? threadRes.messages : [];
    setMessages(rows);
    setStatus("Ready");

    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  useEffect(() => {
    const token = loadSession();
    if (!token) {
      window.location.href = "/login";
      return;
    }
    if (!matchId) {
      window.location.href = "/matches";
      return;
    }

    loadAll();

    const t = setInterval(() => {
      // Simple polling MVP
      apiGet(`/api/messages/thread?matchId=${encodeURIComponent(matchId)}&limit=100`).then((r) => {
        if (r?.ok) {
          const rows = Array.isArray(r.items) ? r.items : Array.isArray(r.messages) ? r.messages : [];
          setMessages(rows);
        }
      });
    }, 2500);

    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  async function send() {
    const clean = text.trim();
    if (!clean || sending) return;

    setSending(true);
    setStatus("Sending…");

    const res = await apiPost("/api/messages/send", { matchId, text: clean });

    setSending(false);

    if (!res?.ok) {
      setStatus(`Send failed: ${res?.error || "unknown error"}`);
      return;
    }

    setText("");
    setStatus("Sent.");

    await apiGet(`/api/messages/thread?matchId=${encodeURIComponent(matchId)}&limit=100`).then((r) => {
      if (r?.ok) {
        const rows = Array.isArray(r.items) ? r.items : Array.isArray(r.messages) ? r.messages : [];
        setMessages(rows);
      }
    });

    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  return (
    <main style={{ padding: 18, maxWidth: 900, margin: "0 auto" }} className="ff-page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>{title}</h1>
          <div style={{ opacity: 0.8, marginTop: 6 }}>{status}</div>
          <div style={{ opacity: 0.6, marginTop: 4, fontSize: 12 }}>matchId: {matchId}</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="ff-btn" onClick={() => (window.location.href = "/matches")} style={{ padding: "10px 14px" }}>
            Back
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 14,
          background: "rgba(255,255,255,0.04)",
          height: "65vh",
          overflow: "auto",
          padding: 12,
        }}
      >
        {messages.map((m, i) => {
          const isMe = me?.uid && m.fromUid === me.uid;
          return (
            <div
              key={m.id || i}
              style={{
                display: "flex",
                justifyContent: isMe ? "flex-end" : "flex-start",
                margin: "8px 0",
              }}
            >
              <div
                style={{
                  maxWidth: "75%",
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  whiteSpace: "pre-wrap",
                }}
              >
                <div style={{ fontSize: 14 }}>{m.text || ""}</div>
                <div style={{ opacity: 0.65, fontSize: 11, marginTop: 6 }}>
                  {fmtTime(m.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Write a message…"
          style={{ flex: 1, padding: 12 }}
        />
        <button className="ff-btn" onClick={send} disabled={sending} style={{ padding: "12px 16px" }}>
          Send
        </button>
      </div>

      <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
        Note: This chat polls every ~2.5s (MVP). We can switch to real-time later.
      </div>
    </main>
  );
}
