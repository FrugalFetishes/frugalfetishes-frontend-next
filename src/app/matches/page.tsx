// src/app/matches/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadMatches, clearMatches, type StoredMatch } from "@/lib/matchesStore";

export default function MatchesPage() {
  const [items, setItems] = useState<StoredMatch[]>([]);

  useEffect(() => {
    setItems(loadMatches());
  }, []);

  const has = items.length > 0;

  const list = useMemo(() => items, [items]);

  return (
    <main style={{ padding: 20, maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <h1 style={{ margin: 0 }}>Matches</h1>

        <button
          type="button"
          onClick={() => {
            clearMatches();
            setItems([]);
          }}
          style={{
            marginLeft: "auto",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(0,0,0,0.25)",
            color: "#fff",
            padding: "8px 12px",
            cursor: "pointer",
          }}
          aria-label="Clear matches (dev)"
          title="Dev: clear matches"
        >
          Clear
        </button>

        <Link
          href="/discover"
          style={{
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(0,0,0,0.25)",
            color: "#fff",
            padding: "8px 12px",
            textDecoration: "none",
          }}
        >
          Back
        </Link>
      </div>

      {!has ? (
        <div
          style={{
            padding: 14,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.20)",
            color: "rgba(255,255,255,0.85)",
          }}
        >
          No matches yet. Like someone in Discover to create one.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {list.map((m) => (
            <Link
              key={m.id}
              href={`/matches/${encodeURIComponent(m.id)}`}
              style={{
                display: "block",
                borderRadius: 18,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(0,0,0,0.22)",
                textDecoration: "none",
                color: "#fff",
              }}
            >
              <div style={{ aspectRatio: "4/5", background: "rgba(255,255,255,0.06)", position: "relative" }}>
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.photoUrl}
                    alt={`${m.name}'s photo`}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ padding: 14, color: "rgba(255,255,255,0.75)" }}>No photo</div>
                )}
              </div>

              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 700 }}>{m.name}{typeof m.age === "number" ? `, ${m.age}` : ""}</div>
                <div style={{ opacity: 0.75, fontSize: 13 }}>{m.city ?? ""}</div>
                <div style={{ opacity: 0.55, fontSize: 12, marginTop: 6 }}>
                  Matched {new Date(m.matchedAt).toLocaleString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
