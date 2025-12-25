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
  bio?: string;
  interests?: string[];
  photos?: string[];
  photoUrl?: string;
};

function getUid(p: FeedProfile) {
  return String(p.uid || p.id || "");
}

function getPrimaryPhoto(p: FeedProfile) {
  return (p.photos && p.photos[0]) || p.photoUrl || "";
}

export default function DiscoverPage() {
  const [me, setMe] = useState<any>(null);
  const [feed, setFeed] = useState<FeedProfile[]>([]);
  const [status, setStatus] = useState<string>("Loading…");
  const [selected, setSelected] = useState<FeedProfile | null>(null);

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

      const items = Array.isArray(feedRes?.items)
        ? feedRes.items
        : Array.isArray(feedRes)
          ? feedRes
          : [];

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
          const uid = getUid(p);
          const name = p.displayName || "Unknown";
          const age = typeof p.age === "number" ? p.age : undefined;
          const city = p.city || "";
          const photo = getPrimaryPhoto(p);

          return (
            <button
              key={uid || idx}
              onClick={() => setSelected(p)}
              style={{
                textAlign: "left",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 12,
                padding: 12,
                cursor: "pointer"
              }}
            >
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
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      like(uid);
                    }}
                    style={{ padding: "10px 14px" }}
                  >
                    Like
                  </button>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {/* Slide-up Profile Sheet */}
      {selected ? (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            zIndex: 50
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(900px, 100%)",
              maxHeight: "90vh",
              background: "rgba(20,20,20,0.98)",
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              border: "1px solid rgba(255,255,255,0.12)",
              padding: 16,
              transform: "translateY(0)",
              transition: "transform 200ms ease-out"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>
                {selected.displayName || "Profile"}
                {typeof selected.age === "number" ? `, ${selected.age}` : ""}
              </div>
              <button onClick={() => setSelected(null)} style={{ padding: "8px 12px" }}>
                Close
              </button>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
              {/* main photo */}
              <div style={{ width: "100%", height: 320, borderRadius: 14, overflow: "hidden", background: "rgba(255,255,255,0.06)" }}>
                {getPrimaryPhoto(selected) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getPrimaryPhoto(selected)}
                    alt={selected.displayName || "Profile"}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : null}
              </div>

              <div style={{ opacity: 0.9 }}>
                {selected.city ? <div><strong>City:</strong> {selected.city}</div> : null}
                {selected.bio ? <div style={{ marginTop: 8 }}>{selected.bio}</div> : null}
              </div>

              {Array.isArray(selected.interests) && selected.interests.length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {selected.interests.map((t, i) => (
                    <span
                      key={`${t}-${i}`}
                      style={{
                        fontSize: 12,
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.18)",
                        background: "rgba(255,255,255,0.06)"
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => {
                    const uid = getUid(selected);
                    if (uid) like(uid);
                  }}
                  style={{ padding: "10px 14px" }}
                >
                  Like
                </button>
                <button onClick={() => setSelected(null)} style={{ padding: "10px 14px" }}>
                  Back to Discover
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
