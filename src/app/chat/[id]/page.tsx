'use client';

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import { requireAuthOrRedirect } from "@/lib/session";
import Link from "next/link";

type Msg = {
  id?: string;
  text: string;
  from?: string;
  createdAt?: string;
};

export default function ChatPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    requireAuthOrRedirect(router);
    (async () => {
      try {
        const res = await apiGet(`/api/chat/${id}`);
        const list = Array.isArray(res?.messages) ? res.messages : Array.isArray(res) ? res : [];
        setMsgs(list);
      } catch (e: any) {
        setStatus(e?.message ? String(e.message) : "Failed to load chat.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router, id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  async function send() {
    const t = text.trim();
    if (!t) return;
    setText("");
    try {
      const res = await apiPost(`/api/chat/${id}`, { text: t });
      const msg = res?.message || res;
      setMsgs((prev) => [...prev, ...(msg ? [msg] : [])]);
    } catch (e: any) {
      setStatus(e?.message ? String(e.message) : "Failed to send.");
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") send();
  }

  return (
    <div style={{ padding: 18, display: "grid", placeItems: "center" }}>
      <div style={{ width: "min(820px, 92vw)" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
          <h1 style={{ margin: 0 }}>Chat</h1>
          <div style={{ opacity: 0.75, fontSize: 13 }}>{status || (loading ? "Loading…" : "")}</div>
        </div>

        <div className="panel" style={{ height: "68vh", minHeight: 420, display: "grid", gridTemplateRows: "1fr auto" }}>
          <div style={{ overflow: "auto", padding: 14, display: "grid", gap: 10 }}>
            {loading ? (
              <div style={{ opacity: 0.85 }}>Loading…</div>
            ) : msgs.length === 0 ? (
              <div style={{ opacity: 0.85 }}>No messages yet. Say hi.</div>
            ) : (
              msgs.map((m, i) => (
                <div
                  key={m.id || i}
                  style={{
                    maxWidth: "78%",
                    justifySelf: m.from === "me" ? "end" : "start",
                    padding: "10px 12px",
                    borderRadius: 16,
                    border: "1px solid rgba(255,255,255,.10)",
                    background:
                      m.from === "me"
                        ? "radial-gradient(300px 140px at 30% 50%, rgba(255,79,174,.22), transparent 60%), rgba(255,255,255,.06)"
                        : "rgba(255,255,255,.06)",
                  }}
                >
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.45 }}>{m.text}</div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,.08)", display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Message…"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,.12)",
                  background: "rgba(0,0,0,.25)",
                  color: "var(--text)",
                }}
              />
              <button className="pillBtn" onClick={send}>
                Send
              </button>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link className="pillBtn" href={`/matches/${id}`}>
                Profile
              </Link>
              <Link className="pillBtn" href="/matches">
                Matches
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
