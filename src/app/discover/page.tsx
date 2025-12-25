'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { useRouter } from "next/navigation";

type Profile = {
  id: string;
  name?: string;
  age?: number;
  photoUrl?: string;
  city?: string;
  bio?: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function DiscoverPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [idx, setIdx] = useState(0);
  const [status, setStatus] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  const top = profiles[idx];

  const startX = useRef<number | null>(null);
  const currentX = useRef<number>(0);
  const dragging = useRef(false);

  const transform = useMemo(() => {
    const dx = currentX.current;
    const rot = clamp(dx / 18, -12, 12);
    return `translateX(${dx}px) rotate(${rot}deg)`;
  }, [idx, sheetOpen]);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await apiGet("/api/feed");
        const list = Array.isArray(res?.profiles) ? res.profiles : Array.isArray(res) ? res : [];
        setProfiles(list);
      } catch (e: any) {
        setStatus(e?.message ? String(e.message) : "Failed to load feed.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function nextCard() {
    setIdx((v) => Math.min(v + 1, profiles.length));
    currentX.current = 0;
    startX.current = null;
  }

  async function like() {
    if (!top) return;
    setStatus("Liked.");
    try {
      await apiPost("/api/like", { targetId: top.id });
    } catch {}
    nextCard();
  }

  function pass() {
    if (!top) return;
    setStatus("Passed.");
    nextCard();
  }

  function openProfile() {
    setSheetOpen(true);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (sheetOpen) return;
    dragging.current = true;
    startX.current = e.clientX;
    currentX.current = 0;
    (e.currentTarget as any).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current || startX.current == null || sheetOpen) return;
    const dx = e.clientX - startX.current;
    currentX.current = dx;
    setIdx((v) => v);
  }

  function onPointerUp() {
    if (!dragging.current || sheetOpen) return;
    dragging.current = false;
    const dx = currentX.current;

    const threshold = 90;
    if (dx > threshold) return void like();
    if (dx < -threshold) return void pass();

    currentX.current = 0;
    startX.current = null;
    setIdx((v) => v);
  }

  if (loading) return <div style={{ padding: 18 }}>Loading…</div>;

  if (!top)
    return (
      <div style={{ padding: 18 }}>
        <h1 style={{ margin: "8px 0 6px" }}>Discover</h1>
        <div style={{ opacity: 0.85 }}>No more profiles.</div>
      </div>
    );

  return (
    <div style={{ padding: 18, display: "grid", placeItems: "center" }}>
      <div style={{ width: "min(520px, 92vw)" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
          <h1 style={{ margin: 0 }}>Discover</h1>
          <div style={{ opacity: 0.75, fontSize: 13 }}>{status || "Ready"}</div>
        </div>

        <div style={{ position: "relative", height: 540 }}>
          {profiles[idx + 1] && (
            <div
              className="panel"
              style={{
                position: "absolute",
                inset: 0,
                transform: "scale(0.98) translateY(10px)",
                opacity: 0.5,
              }}
            />
          )}

          <div
            className="panel"
            style={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              transform,
              transition: dragging.current ? "none" : "transform 180ms ease",
              touchAction: "pan-y",
              userSelect: "none",
              cursor: sheetOpen ? "default" : "grab",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url(${top.photoUrl || ""})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "saturate(1.05) contrast(1.02)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to top, rgba(0,0,0,.78), rgba(0,0,0,.18) 45%, rgba(0,0,0,.05))",
              }}
            />

            <div style={{ position: "absolute", left: 16, right: 16, bottom: 14 }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>
                {top.name || "Unknown"}
                {typeof top.age === "number" ? `, ${top.age}` : ""}
              </div>
              <div style={{ opacity: 0.8, fontSize: 13, marginTop: 2 }}>{top.city ? top.city : ""}</div>

              <div className="actionRow" style={{ marginTop: 12 }}>
                <button className="actionIcon" aria-label="Pass" onClick={pass} title="Pass">
                  ✕
                </button>
                <button className="actionIcon primary" aria-label="View profile" onClick={openProfile} title="View">
                  👁
                </button>
                <button className="actionIcon primary" aria-label="Like" onClick={like} title="Like">
                  ♥
                </button>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75, textAlign: "center" }}>
                Swipe left=pass • right=like • tap 👁 to view
              </div>
            </div>
          </div>
        </div>

        {sheetOpen && (
          <div className="menuOverlay" role="dialog" aria-modal="true">
            <button className="overlayBackdrop" aria-label="Close profile" onClick={() => setSheetOpen(false)} />
            <aside
              className="menuPanel"
              style={{
                left: "50%",
                transform: "translateX(-50%)",
                top: "auto",
                bottom: 10,
                width: "min(560px, calc(100% - 20px))",
              }}
            >
              <div className="menuHeader">
                <div className="menuTitle">Profile</div>
                <button className="iconBtn" aria-label="Close" onClick={() => setSheetOpen(false)}>
                  ✕
                </button>
              </div>

              <div style={{ padding: "12px 6px", display: "grid", gap: 10 }}>
                <div style={{ fontSize: 20, fontWeight: 900 }}>
                  {top.name || "Unknown"} {typeof top.age === "number" ? `• ${top.age}` : ""}
                </div>
                {top.city && <div style={{ opacity: 0.85 }}>{top.city}</div>}
                {top.bio && <div style={{ opacity: 0.85, lineHeight: 1.5 }}>{top.bio}</div>}
              </div>

              <div className="menuFooter" style={{ display: "flex", gap: 10 }}>
                <button className="pillBtn" onClick={() => setSheetOpen(false)}>
                  Close
                </button>
                <button className="pillBtn danger" onClick={() => (setSheetOpen(false), pass())}>
                  Pass
                </button>
                <button className="pillBtn" onClick={() => (setSheetOpen(false), like())}>
                  Like
                </button>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
