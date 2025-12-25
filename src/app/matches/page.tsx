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
  const seconds = ts?._seconds ?? ts?.seconds ?? null;
  if (typeof seconds === "number") {
    const d = new Date(seconds * 1000);
    return d.toLocaleString();
  }
  try {
    const d = new Date(ts);
    if (!isNaN(d.getTime())) return d.toLocaleString();
  } catch {}
  return "";
}

export default function MatchesPage() {
  const [status, setStatus] = useState("Loading…");
  const [rows, setRows] = useState<MatchRow[]>([]);

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

      const list = Array.isArray(res.items) ? res.items : Array.isArray(res.matches) ? res.matches : [];
      setRows(list);
      setStatus(list.length ? "Ready" : "No matches yet.");
    })();
  }, []);

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }} className="ff-page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Matches</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="ff-btn" onClick={() => (window.location.href = "/discover")} style={{ padding: "10px 14px" }}>
            Discover
          </button>
        </div>
      </div>

      <div style={{ marginTop: 14, opacity: 0.9 }}>{status}</div>

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {rows.map((m) => {
          const p = m.profile || {};
          const name = p.displayName || "Unknown";
          const city = p.city || "";
          const age = typeof p.age === "number" ? p.age : undefined;
          const photo = (Array.isArray(p.photos) && p.photos[0]) || p.photoUrl || "";

          return (
            <button className="ff-btn"
              key={m.matchId}
              onClick={() => (window.location.href = `/matches/${encodeURIComponent(m.matchId)}`)}
              style={{
                textAlign: "left",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 14,
                background: "rgba(255,255,255,0.04)",
                padding: 14,
                display: "grid",
                gridTemplateColumns: "56px 1fr auto",
                alignItems: "center",
                gap: 14,
                cursor: "pointer"
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.06)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 12,
                  opacity: 0.9
                }}
              >
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  "No photo"
                )}
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {name}{age !== undefined ? `, ${age}` : ""}
                </div>
                <div style={{ opacity: 0.85, fontSize: 13, marginTop: 2 }}>
                  {city ? city : ""}{city ? " • " : ""}{fmtTime(m.matchedAt)}
                </div>
              </div>

              <div style={{ opacity: 0.8, fontSize: 12, whiteSpace: "nowrap" }}>View profile →</div>
            </button>
          );
        })}
      </div>
    </main>
  );
}
