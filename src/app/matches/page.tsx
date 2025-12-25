"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { loadSession } from "@/lib/session";

type MatchRow = {
  matchId: string;
  otherUid: string | null;
  matchedAt: any;
  profile: any | null;
};

function fmtTime(ts: any): string {
  if (!ts) return "";
  // Firestore Timestamp-like: { _seconds } or { seconds }
  const seconds = ts?._seconds ?? ts?.seconds;
  if (typeof seconds === "number") {
    const d = new Date(seconds * 1000);
    return d.toLocaleString();
  }
  const d = new Date(ts);
  if (!isNaN(d.getTime())) return d.toLocaleString();
  return "";
}

export default function MatchesPage() {
  const [status, setStatus] = useState("Loading…");
  const [items, setItems] = useState<MatchRow[]>([]);

  useEffect(() => {
    const token = loadSession();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    (async () => {
      setStatus("Loading matches…");
      const res = await apiGet("/api/matches?limit=50");
      if (!res?.ok) {
        setStatus(`Matches load failed: ${res?.error || "unknown error"}`);
        return;
      }
      const rows = Array.isArray(res.items) ? res.items : [];
      setItems(rows);
      setStatus(rows.length ? "Ready" : "No matches yet.");
    })();
  }, []);

  return (
    <main style={{ padding: 24, maxWidth: 780, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <h1 style={{ margin: 0 }}>Matches</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => (window.location.href = "/discover")} style={{ padding: "10px 14px" }}>
            Back to Discover
          </button>
        </div>
      </div>

      <div style={{ marginTop: 10, opacity: 0.85 }}>{status}</div>

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {items.map((m) => {
          const p = m.profile || {};
          const name = p.displayName || "Unknown";
          const city = p.city || "";
          const age = typeof p.age === "number" ? p.age : undefined;
          const photo = (Array.isArray(p.photos) && p.photos[0]) || p.photoUrl || "";

          return (
            <button
              key={m.matchId}
              onClick={() => (window.location.href = `/chat/${encodeURIComponent(m.matchId)}`)}
              style={{
                textAlign: "left",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 14,
                background: "rgba(255,255,255,0.04)",
                padding: 12,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.08)" }}>
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : null}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>
                    {name}{age ? `, ${age}` : ""}
                  </div>
                  <div style={{ opacity: 0.85 }}>{city}</div>
                  <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>
                    Matched: {fmtTime(m.matchedAt) || "—"} · matchId: {m.matchId}
                  </div>
                </div>

                <div style={{ opacity: 0.7 }}>Open Chat →</div>
              </div>
            </button>
          );
        })}
      </div>
    </main>
  );
}
