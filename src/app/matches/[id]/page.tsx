'use client';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import Link from "next/link";
import { requireAuthOrRedirect } from "@/lib/session";

type MatchProfile = {
  id: string;
  name?: string;
  age?: number;
  photoUrl?: string;
  city?: string;
  bio?: string;
};

export default function MatchProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [p, setP] = useState<MatchProfile | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    requireAuthOrRedirect(router);
    (async () => {
      try {
        const res = await apiGet(`/api/matches/${id}`);
        const prof = res?.profile || res;
        setP(prof || null);
      } catch (e: any) {
        setStatus(e?.message ? String(e.message) : "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router, id]);

  return (
    <div style={{ padding: 18, display: "grid", placeItems: "center" }}>
      <div style={{ width: "min(720px, 92vw)" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
          <h1 style={{ margin: 0 }}>Match</h1>
          <div style={{ opacity: 0.75, fontSize: 13 }}>{status || (loading ? "Loading…" : "")}</div>
        </div>

        <div className="panel" style={{ overflow: "hidden" }}>
          <div style={{ position: "relative", height: 360 }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `url(${p?.photoUrl || ""}) center/cover no-repeat, rgba(255,255,255,.06)`,
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to top, rgba(0,0,0,.75), rgba(0,0,0,.15) 50%, rgba(0,0,0,.05))",
              }}
            />
            <div style={{ position: "absolute", left: 16, right: 16, bottom: 14 }}>
              <div style={{ fontSize: 24, fontWeight: 950 }}>
                {p?.name || "Unknown"} {typeof p?.age === "number" ? `, ${p.age}` : ""}
              </div>
              {p?.city && <div style={{ opacity: 0.8, marginTop: 4 }}>{p.city}</div>}
            </div>
          </div>

          <div style={{ padding: 16, display: "grid", gap: 12 }}>
            {p?.bio && <div style={{ opacity: 0.86, lineHeight: 1.6 }}>{p.bio}</div>}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link className="pillBtn" href={`/chat/${id}`}>
                Open chat
              </Link>
              <Link className="pillBtn" href="/matches">
                Back to matches
              </Link>
              <Link className="pillBtn" href="/discover">
                Discover
              </Link>
            </div>
          </div>
        </div>

        {!loading && !p && (
          <div style={{ marginTop: 12, opacity: 0.85 }}>
            Could not load this match. Go back to <Link href="/matches">Matches</Link>.
          </div>
        )}
      </div>
    </div>
  );
}
