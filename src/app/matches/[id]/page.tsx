"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiGet } from "@/lib/api";

type MatchProfile = {
  id: string;
  name?: string;
  age?: number;
  city?: string;
  bio?: string;
  photoUrl?: string;
};

function norm(raw: any): MatchProfile {
  return {
    id: String(raw?.id || raw?._id || raw?.uid || ""),
    name: raw?.name ?? raw?.displayName ?? raw?.username ?? "Match",
    age: typeof raw?.age === "number" ? raw.age : undefined,
    city: raw?.city ?? raw?.location?.city ?? undefined,
    bio: raw?.bio ?? raw?.about ?? "",
    photoUrl: raw?.photoUrl ?? raw?.photo ?? raw?.avatarUrl ?? "/frugalfetishes.png",
  };
}

export default function MatchProfilePage() {
  const router = useRouter();
  const params = useParams();
  const id = String((params as any)?.id || "");
  const [p, setP] = useState<MatchProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiGet(`/api/matches/${encodeURIComponent(id)}`);
        const prof = res?.profile ? res.profile : res;
        if (!alive) return;
        setP(norm(prof));
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  return (
    <div className="ff-shell">
      <div className="ff-topbar">
        <div className="ff-topbar-left">
          <img className="ff-logo" src="/FFmenuheaderlogo.png" alt="FrugalFetishes" />
          <span className="ff-badge">Match</span>
        </div>
        <div className="ff-topbar-right">
          <button className="ff-iconbtn" onClick={() => router.push("/matches")} aria-label="Back" title="Back">←</button>
          <button className="ff-iconbtn" onClick={() => router.push(`/chat/${encodeURIComponent(id)}`)} aria-label="Chat" title="Chat">💬</button>
        </div>
      </div>

      <div className="ff-glass" style={{ width: "min(980px, 92vw)", padding: 18 }}>
        {loading ? (
          <div className="ff-subtle">Loading…</div>
        ) : !p ? (
          <div className="ff-subtle">Not found.</div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <img
                src={p.photoUrl || "/frugalfetishes.png"}
                alt={p.name || "Match"}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 24,
                  objectFit: "cover",
                  border: "1px solid rgba(255,255,255,.18)",
                  boxShadow: "0 20px 60px rgba(0,0,0,.55)",
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 28, fontWeight: 950, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {p.name}{p.age ? `, ${p.age}` : ""}
                </div>
                <div className="ff-subtle">{p.city || ""}</div>
              </div>
            </div>

            <div className="ff-subtle" style={{ lineHeight: 1.6 }}>
              {p.bio || "No bio yet."}
            </div>

            <div className="ff-pillrow" style={{ justifyContent: "flex-end" }}>
              <button className="ff-pill ff-pillPrimary" onClick={() => router.push(`/chat/${encodeURIComponent(id)}`)} aria-label="Chat" title="Chat">💬</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
