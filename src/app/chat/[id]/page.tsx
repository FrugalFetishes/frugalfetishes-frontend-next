"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";

type ChatMsg = {
  id: string;
  text: string;
  isMe: boolean;
  createdAt?: number;
};

function normMsg(raw: any): ChatMsg {
  return {
    id: String(raw?.id || raw?._id || Math.random()),
    text: String(raw?.text || raw?.message || ""),
    isMe: Boolean(raw?.isMe ?? raw?.fromMe ?? raw?.sender === "me"),
    createdAt: typeof raw?.createdAt === "number" ? raw.createdAt : undefined,
  };
}

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const id = String((params as any)?.id || "");

  const [name, setName] = useState<string>("Chat");
  const [items, setItems] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiGet(`/api/chat/${encodeURIComponent(id)}`);
        const arr = Array.isArray(res?.messages) ? res.messages : Array.isArray(res) ? res : [];
        if (!alive) return;
        setItems(arr.map(normMsg));
        if (res?.name) setName(String(res.name));
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items.length]);

  const canSend = useMemo(() => text.trim().length > 0 && !sending, [text, sending]);

  async function send() {
    if (!canSend) return;
    const payload = text.trim();
    setText("");
    setSending(true);
    try {
      const res = await apiPost(`/api/chat/${encodeURIComponent(id)}`, { text: payload });
      const msg = res?.message ? res.message : res;
      setItems((prev) => [...prev, normMsg(msg || { text: payload, isMe: true })]);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="ff-shell">
      <div className="ff-topbar">
        <div className="ff-topbar-left">
          <img className="ff-logo" src="/FFmenuheaderlogo.png" alt="FrugalFetishes" />
          <span className="ff-badge">{name}</span>
        </div>
        <div className="ff-topbar-right">
          <button className="ff-iconbtn" onClick={() => router.push("/matches")} aria-label="Back" title="Back">←</button>
        </div>
      </div>

      <div className="ff-glass ff-chatbox">
        <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 420, maxHeight: "70vh", overflow: "auto", padding: 8 }}>
          {items.length === 0 ? (
            <div className="ff-subtle" style={{ textAlign: "center", padding: 18 }}>
              Say hi 👋
            </div>
          ) : (
            items.map((m) => (
              <div key={m.id} className={"ff-msg " + (m.isMe ? "ff-msgMe" : "")}>
                {m.text}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            className="ff-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message…"
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
          />
          <button
            className={"ff-iconbtn"}
            onClick={send}
            aria-label="Send"
            title="Send"
            disabled={!canSend}
            style={{ opacity: canSend ? 1 : 0.45 }}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
