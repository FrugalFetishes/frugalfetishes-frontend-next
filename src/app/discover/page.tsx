"use client"; 

import { useEffect, useMemo, useRef, useState } from "react";
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

function isInteractiveTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return Boolean(el.closest("button,a,input,textarea,select,label"));
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export default function DiscoverPage() {
  const [me, setMe] = useState<any>(null);
  const [feed, setFeed] = useState<FeedProfile[]>([]);
  const [status, setStatus] = useState<string>("Loading…");

  // Stack index: 0 is top card.
  const [index, setIndex] = useState(0);

  // Profile sheet state
  const [selected, setSelected] = useState<FeedProfile | null>(null);

  // Drag state
  const drag = useRef({
    active: false,
    pointerId: 0,
    startX: 0,
    startY: 0,
    dx: 0,
    dy: 0,
    lastX: 0,
    lastY: 0,
    lastT: 0,
    vx: 0,
    vy: 0
  });

  const [anim, setAnim] = useState<{ x: number; y: number; rot: number; transitioning: boolean }>({
    x: 0,
    y: 0,
    rot: 0,
    transitioning: false
  });

  const top = useMemo(() => feed[index] || null, [feed, index]);
  const next = useMemo(() => feed[index + 1] || null, [feed, index]);

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

      const items = Array.isArray(feedRes?.items) ? feedRes.items : Array.isArray(feedRes) ? feedRes : [];
      setFeed(items);
      setIndex(0);
      setStatus(items.length ? "Ready" : "No profiles returned yet.");
    })();
  }, []);

  function logout() {
    clearSession();
    window.location.href = "/login";
  }

  async function like(uid: string) {
    setStatus("Liking…");
    const res = await apiPost("/api/like", { targetUid: uid });
    if (!res?.ok) setStatus(`Like failed: ${res?.error || "unknown error"}`);
    else setStatus("Liked.");
  }

  async function pass(uid: string) {
    // Backend might not have /api/pass — we try, but never block UI.
    setStatus("Passed.");
    try {
      await apiPost("/api/pass", { targetUid: uid });
    } catch {
      // ignore
    }
  }

  function advance() {
    setAnim({ x: 0, y: 0, rot: 0, transitioning: false });
    setSelected(null);
    setIndex((i) => Math.min(i + 1, Math.max(0, feed.length)));
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!top) return;
    if (selected) return; // sheet open; stack disabled
    if (isInteractiveTarget(e.target)) return;

    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);

    const t = performance.now();
    drag.current.active = true;
    drag.current.pointerId = e.pointerId;
    drag.current.startX = e.clientX;
    drag.current.startY = e.clientY;
    drag.current.dx = 0;
    drag.current.dy = 0;
    drag.current.lastX = e.clientX;
    drag.current.lastY = e.clientY;
    drag.current.lastT = t;
    drag.current.vx = 0;
    drag.current.vy = 0;

    setAnim((a) => ({ ...a, transitioning: false }));
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current.active) return;
    if (e.pointerId !== drag.current.pointerId) return;

    const t = performance.now();
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;

    // velocity (simple)
    const dt = Math.max(1, t - drag.current.lastT);
    drag.current.vx = (e.clientX - drag.current.lastX) / dt;
    drag.current.vy = (e.clientY - drag.current.lastY) / dt;

    drag.current.dx = dx;
    drag.current.dy = dy;
    drag.current.lastX = e.clientX;
    drag.current.lastY = e.clientY;
    drag.current.lastT = t;

    // Rotate based on horizontal drag; clamp so it doesn't go crazy.
    const rot = clamp(dx / 18, -12, 12);

    setAnim({ x: dx, y: dy, rot, transitioning: false });
  }

  async function onPointerUp(e: React.PointerEvent) {
    if (!drag.current.active) return;
    if (e.pointerId !== drag.current.pointerId) return;

    drag.current.active = false;

    const dx = drag.current.dx;
    const dy = drag.current.dy;
    const vx = drag.current.vx;
    const vy = drag.current.vy;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    // Thresholds
    const SWIPE_X = 110; // px
    const SWIPE_UP = -120; // dy < this means "open"
    const SWIPE_DOWN_SHEET = 120;

    // If mostly vertical UP and not too horizontal, open sheet
    if (dy < SWIPE_UP && absX < 70) {
      setSelected(top);
      setAnim({ x: 0, y: 0, rot: 0, transitioning: true });
      return;
    }

    // Like / Pass by swipe left/right
    if (dx > SWIPE_X || (vx > 0.6 && absX > 40)) {
      // Swipe right = like
      const uid = getUid(top);
      setAnim({ x: 500, y: dy, rot: 12, transitioning: true });
      if (uid) await like(uid);
      setTimeout(advance, 180);
      return;
    }

    if (dx < -SWIPE_X || (vx < -0.6 && absX > 40)) {
      // Swipe left = pass
      const uid = getUid(top);
      setAnim({ x: -500, y: dy, rot: -12, transitioning: true });
      if (uid) await pass(uid);
      setTimeout(advance, 180);
      return;
    }

    // Snap back
    setAnim({ x: 0, y: 0, rot: 0, transitioning: true });
  }

  // Sheet swipe-down to close
  const sheetDrag = useRef({ active: false, startY: 0, dy: 0, pointerId: 0 });

  function sheetPointerDown(e: React.PointerEvent) {
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    sheetDrag.current.active = true;
    sheetDrag.current.pointerId = e.pointerId;
    sheetDrag.current.startY = e.clientY;
    sheetDrag.current.dy = 0;
  }

  function sheetPointerMove(e: React.PointerEvent) {
    if (!sheetDrag.current.active) return;
    if (e.pointerId !== sheetDrag.current.pointerId) return;
    sheetDrag.current.dy = e.clientY - sheetDrag.current.startY;
    // only allow downward drag feel
    const y = Math.max(0, sheetDrag.current.dy);
    const sheet = document.getElementById("ff-profile-sheet");
    if (sheet) sheet.style.transform = `translateY(${y}px)`;
  }

  function sheetPointerUp(e: React.PointerEvent) {
    if (!sheetDrag.current.active) return;
    if (e.pointerId !== sheetDrag.current.pointerId) return;
    sheetDrag.current.active = false;

    const dy = sheetDrag.current.dy;
    const sheet = document.getElementById("ff-profile-sheet");
    if (sheet) sheet.style.transform = "translateY(0px)";

    if (dy > 120) setSelected(null);
  }

  const topPhoto = top ? getPrimaryPhoto(top) : "";
  const nextPhoto = next ? getPrimaryPhoto(next) : "";

  return (
    <main style={{ padding: 24 }}>
      <button
        onClick={() => (window.location.href = "/matches")}
        style={{ position: "fixed", top: 16, right: 96, padding: "10px 14px", zIndex: 9999 }}
      >
        Matches
      </button>

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

        <button onClick={logout} style={{ padding: "10px 14px" }}>
          Logout
        </button>
      </div>

      {/* Card Stack */}
      <div style={{ marginTop: 18, display: "flex", justifyContent: "center" }}>
        <div style={{ position: "relative", width: "min(520px, 92vw)", height: "72vh", maxHeight: 640 }}>
          {/* Next card (behind) */}
          {next ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.05)",
                transform: "scale(0.97) translateY(10px)",
                transition: "transform 180ms ease-out",
                overflow: "hidden"
              }}
            >
              {nextPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={nextPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} />
              ) : null}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0.05))" }} />
              <div style={{ position: "absolute", left: 14, bottom: 14 }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{next.displayName || "Unknown"}</div>
                <div style={{ opacity: 0.85 }}>{next.city || ""}</div>
              </div>
            </div>
          ) : null}

          {/* Top card */}
          {top ? (
            <div
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(255,255,255,0.06)",
                overflow: "hidden",
                touchAction: "none",
                cursor: "grab",
                transform: `translate(${anim.x}px, ${anim.y}px) rotate(${anim.rot}deg)`,
                transition: anim.transitioning ? "transform 180ms ease-out" : "none",
                boxShadow: "0 18px 60px rgba(0,0,0,0.55)"
              }}
            >
              {topPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={topPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : null}

              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0.06))" }} />

              {/* Like/Nope indicators */}
              <div
                style={{
                  position: "absolute",
                  top: 16,
                  left: 16,
                  padding: "8px 12px",
                  border: "2px solid rgba(0,255,170,0.8)",
                  color: "rgba(0,255,170,0.9)",
                  borderRadius: 10,
                  fontWeight: 900,
                  letterSpacing: 1,
                  transform: `rotate(-12deg)`,
                  opacity: clamp(anim.x / 120, 0, 1)
                }}
              >
                LIKE
              </div>

              <div
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  padding: "8px 12px",
                  border: "2px solid rgba(255,80,80,0.8)",
                  color: "rgba(255,80,80,0.9)",
                  borderRadius: 10,
                  fontWeight: 900,
                  letterSpacing: 1,
                  transform: `rotate(12deg)`,
                  opacity: clamp((-anim.x) / 120, 0, 1)
                }}
              >
                NOPE
              </div>

              {/* Bottom info */}
              <div style={{ position: "absolute", left: 16, right: 16, bottom: 16 }}>
                <div style={{ fontSize: 26, fontWeight: 900 }}>
                  {top.displayName || "Unknown"}
                  {typeof top.age === "number" ? `, ${top.age}` : ""}
                </div>
                <div style={{ opacity: 0.9 }}>{top.city || ""}</div>

                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  <button
                    onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const uid = getUid(top);
                      setAnim({ x: -500, y: 0, rot: -12, transitioning: true });
                      if (uid) pass(uid);
                      setTimeout(advance, 180);
                    }}
                    style={{ padding: "10px 14px" }}
                  >
                    Pass
                  </button>

                  <button
                    onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelected(top);
                    }}
                    style={{ padding: "10px 14px" }}
                  >
                    View
                  </button>

                  <button
                    onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const uid = getUid(top);
                      setAnim({ x: 500, y: 0, rot: 12, transitioning: true });
                      if (uid) like(uid);
                      setTimeout(advance, 180);
                    }}
                    style={{ padding: "10px 14px" }}
                  >
                    Like
                  </button>
                </div>

                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
                  Swipe: left=pass · right=like · up=view profile
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.04)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0.9
              }}
            >
              No more profiles.
            </div>
          )}
        </div>
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
            id="ff-profile-sheet"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={sheetPointerDown}
            onPointerMove={sheetPointerMove}
            onPointerUp={sheetPointerUp}
            style={{
              width: "min(900px, 100%)",
              maxHeight: "90vh",
              background: "rgba(20,20,20,0.98)",
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              border: "1px solid rgba(255,255,255,0.12)",
              padding: 16,
              touchAction: "none"
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

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
              Swipe down to close
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
              <div style={{ width: "100%", height: 360, borderRadius: 14, overflow: "hidden", background: "rgba(255,255,255,0.06)" }}>
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
                {selected.city ? (
                  <div>
                    <strong>City:</strong> {selected.city}
                  </div>
                ) : null}
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
                  onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onClick={async () => {
                    const uid = getUid(selected);
                    if (uid) await like(uid);
                    setSelected(null);
                    setTimeout(advance, 120);
                  }}
                  style={{ padding: "10px 14px" }}
                >
                  Like
                </button>
                <button
                  onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onClick={async () => {
                    const uid = getUid(selected);
                    if (uid) await pass(uid);
                    setSelected(null);
                    setTimeout(advance, 120);
                  }}
                  style={{ padding: "10px 14px" }}
                >
                  Pass
                </button>
                <button onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }} onClick={() => setSelected(null)} style={{ padding: "10px 14px" }}>
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
