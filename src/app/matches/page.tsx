'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getCurrentUserKey, getMatches, markAllMatchesSeen, getUnseenMatchesCount } from "@/lib/socialStore";

export default function MatchesPage() {
  const [userKey, setUserKey] = useState<string | null>(null);
  const [unseen, setUnseen] = useState(0);

  useEffect(() => {
    const k = getCurrentUserKey();
    setUserKey(k);
    setUnseen(getUnseenMatchesCount(k));
    // When user opens Matches, clear the badge
    markAllMatchesSeen(k);
    setUnseen(0);
  }, []);

  const matches = useMemo(() => getMatches(userKey), [userKey]);

  return (
    <div style={{ minHeight: "100vh", padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 28, letterSpacing: 0.2 }}>Matches</h1>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link
            href="/discover"
            style={{
              position: "relative",
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.28)",
              color: "#fff",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Back
          </Link>
        </div>
      </div>

      {!userKey && (
        <div style={{ opacity: 0.85, padding: 14, borderRadius: 16, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.28)" }}>
          Log in again (we need your email stored) to see matches.
        </div>
      )}

      {userKey && matches.length === 0 && (
        <div style={{ opacity: 0.85, padding: 14, borderRadius: 16, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.28)" }}>
          No matches yet. Like someone in Discover and have them like you back.
        </div>
      )}

      {userKey && matches.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14, marginTop: 12 }}>
          {matches.map((m) => (
            <Link
              key={m.id}
              href={`/matches/${encodeURIComponent(m.id)}`}
              style={{
                textDecoration: "none",
                color: "#fff",
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(0,0,0,0.28)",
                overflow: "hidden",
              }}
            >
              <div style={{ width: "100%", aspectRatio: "4 / 5", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photoUrl} alt={m.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ opacity: 0.75, fontWeight: 700 }}>No photo</div>
                )}
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: 0.2 }}>
                  {m.name}{m.age ? `, ${m.age}` : ""}
                </div>
                <div style={{ opacity: 0.85, fontSize: 13, marginTop: 4 }}>{m.city || ""}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
