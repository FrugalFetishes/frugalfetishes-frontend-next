"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import { clearSession } from "@/lib/session";

type Match = {
  id: string;
  name?: string;
  photoUrl?: string;
  lastMessage?: string;
};

function normMatch(raw: any): Match {
  return {
    id: String(raw?.id || raw?._id || raw?.matchId || raw?.chatId || ""),
    name: raw?.name ?? raw?.displayName ?? raw?.username ?? "Match",
    photoUrl: raw?.photoUrl ?? raw?.photo ?? raw?.avatarUrl ?? raw?.otherPhotoUrl ?? "/frugalfetishes.png",
    lastMessage: raw?.lastMessage ?? raw?.snippet ?? "",
  };
}

export default function MatchesPage() {
  const router = useRouter();
  const [items, setItems] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiGet("/api/matches");
        const arr = Array.isArray(res?.matches) ? res.matches : Array.isArray(res) ? res : [];
        if (!alive) return;
        setItems(arr.map(normMatch).filter(m => m.id));
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  function logout() {
    clearSession?.();
    router.replace("/login");
  }

  return (
    <div className="ff-shell">
      <div className="ff-topbar">
        <div className="ff-topbar-left">
          <img className="ff-logo" src="/FFmenuheaderlogo.png" alt="FrugalFetishes" />
          <span className="ff-badge">Matches</span>
        </div>
        <div className="ff-topbar-right">
          <button className="ff-iconbtn" onClick={() => router.push("/discover")} aria-label="Discover" title="Discover">🔥</button>
          <button className="ff-iconbtn" onClick={logout} aria-label="Logout" title="Logout">⎋</button>
        </div>
      </div>

      <div className="ff-glass ff-list">
        <h1 className="ff-title" style={{ fontSize: 34 }}>Matches</h1>
        <div className="ff-subtle" style={{ fontSize: 13, marginBottom: 14 }}>
          Mutual likes show up here. Tap one to open the profile, then chat.
        </div>

        {loading ? (
          <div className="ff-subtle">Loading…</div>
        ) : items.length === 0 ? (
          <div className="ff-row" style={{ justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 900 }}>No matches yet</div>
              <div className="ff-subtle" style={{ fontSize: 13, marginTop: 6 }}>
                Go like a few profiles. A match appears when it’s mutual.
              </div>
              <div style={{ marginTop: 10 }}>
                <button className="ff-iconbtn" onClick={() => router.push("/discover")} aria-label="Go discover" title="Go discover">🔥</button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {items.map((m) => (
              <button
                key={m.id}
                className="ff-row"
                style={{ cursor: "pointer", textAlign: "left" }}
                onClick={() => router.push(`/matches/${encodeURIComponent(m.id)}`)}
                aria-label={`Open match ${m.name || ""}`}
                title="Open"
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <img className="ff-avatar" src={m.photoUrl || "/frugalfetishes.png"} alt={m.name || "Match"} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {m.name}
                    </div>
                    <div className="ff-subtle" style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {m.lastMessage || "Tap to view"}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="ff-badge">›</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
