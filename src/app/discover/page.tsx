"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { clearSession, loadSession } from "@/lib/session";

type FeedProfile = {
  uid?: string;
  id?: string;
  displayName?: string;
  age?: number;
  city?: string;
  photos?: string[];
  photoUrl?: string;
};

export default function DiscoverPage() {
  const [me, setMe] = useState<any>(null);
  const [feed, setFeed] = useState<FeedProfile[]>([]);
  const [status, setStatus] = useState<string>("Loading…");

  useEffect(() => {
    const token = loadSession();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    (async () => {
      setStatus("Loading profile…");
      const meRes = await apiGet("/api/profile/me");
      if (!meRes?.ok) {
        setStatus(`Profile load failed: ${meRes?.error || "unknown error"}`);
        return;
      }
      setMe(meRes);

      setStatus("Loading feed…");
      const feedRes = await apiGet("/api/feed");
      if (!feedRes?.ok) {
        setStatus(`Feed load failed: ${feedRes?.error || "unknown error"}`);
        return;
      }

      const items = Array.isArray(feedRes?.items) ? feedRes.items : (Array.isArray(feedRes) ? feedRes : []);
      setFeed(items);
      setStatus(items.length ? "Ready" : "No profiles returned yet.");
    })();
  }, []);

  async function like(uid: string) {
    setStatus("Liking…");
    const res = await apiPost("/api/like", { targetUid: uid });
    if (!res?.ok) setStatus(`Like failed: ${res?.error || "unknown error"}`);
    else setStatus("Liked.");
  }

  function logout() {
    clearSession();
    window.location.href = "/login";
  }

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0 }}>Discover</h1>
          <div style={{ opacity: 0.85, marginTop: 6 }}>{status}</div>
          {me?.displayName ? (
            <div style={{ opacity: 0.85, marginTop: 6 }}>
              Logged in as <strong>{me.displayName}</strong>
              {me.city ? <> · {me.city}</> : null}
            </div>
          ) : null}
        </div>

        <button onClick={logout} style={{ padding: "10px 14px" }}>Logout</button>
      </div>

      <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
        {feed.map((p, idx) => {
          const uid = (p.uid || p.id || "") as string;
          const name = p.displayName || "Unknown";
          const age = typeof p.age === "number" ? p.age : undefined;
          const city = p.city || "";
          const photo = (p.photos && p.photos[0]) || p.photoUrl || "";

          return (
            <div key={uid || idx} style={{ border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: 12 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 64, height: 64, borderRadius: 10, overflow: "hidden", background: "rgba(255,255,255,0.08)" }}>
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : null}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>
                    {name}{age ? `, ${age}` : ""}
                  </div>
                  <div style={{ opacity: 0.85 }}>{city}</div>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>{uid ? `uid: ${uid}` : ""}</div>
                </div>

                {uid ? (
                  <button onClick={() => like(uid)} style={{ padding: "10px 14px" }}>
                    Like
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
