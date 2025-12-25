'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";

type Match = {
  id: string;
  name?: string;
  age?: number;
  photoUrl?: string;
  lastMessage?: string;
};

export default function MatchesPage() {
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res: any = await apiGet("/api/matches");
        const list = Array.isArray(res?.matches) ? res.matches : Array.isArray(res) ? res : [];
        setMatches(list);
      } catch (e: any) {
        setStatus(e?.message ? String(e.message) : "Failed to load matches.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div style={{ padding: 18, display: "grid", placeItems: "center" }}>
      <div style={{ width: "min(720px, 92vw)" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
          <h1 style={{ margin: 0 }}>Matches</h1>
          <div style={{ opacity: 0.75, fontSize: 13 }}>{status || (loading ? "Loading…" : `${matches.length} total`)}</div>
        </div>

        {loading ? (
          <div style={{ opacity: 0.85 }}>Loading…</div>
        ) : matches.length === 0 ? (
          <div className="panel" style={{ padding: 18 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>No matches yet</div>
            <div style={{ opacity: 0.8, lineHeight: 1.5 }}>
              You’ll see people here after you like someone and they like you back (or when we enable dev auto-matches).
            </div>
            <div style={{ marginTop: 12 }}>
              <Link className="pillBtn" href="/discover">
                Go to Discover
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {matches.map((m) => (
              <Link
                key={m.id}
                href={`/matches/${m.id}`}
                className="panel"
                style={{
                  display: "grid",
                  gridTemplateColumns: "64px 1fr",
                  gap: 12,
                  padding: 12,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 18,
                    border: "1px solid rgba(255,255,255,.10)",
                    background: `url(${m.photoUrl || ""}) center/cover no-repeat, rgba(255,255,255,.06)`,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>
                    {m.name || "Unknown"}
                    {typeof m.age === "number" ? `, ${m.age}` : ""}
                  </div>
                  <div style={{ opacity: 0.78, fontSize: 13, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {m.lastMessage || "Tap to open"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
