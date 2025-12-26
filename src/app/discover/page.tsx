'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

type Profile = {
  id: string;
  name?: string;
  age?: number;
  city?: string;
  bio?: string;

  // Common photo fields (we will pick from these ONLY, no demo/random photos)
  photoUrl?: string;
  profilePhotoUrl?: string;
  primaryPhotoUrl?: string;
  mainPhotoUrl?: string;
  imageUrl?: string;
  avatarUrl?: string;

  photos?: Array<string | { url?: string }>;
  images?: Array<string | { url?: string }>;
  gallery?: Array<string | { url?: string }>;
};

function normalizePublicPath(u?: string | null): string | null {
  if (!u) return null;
  let s = String(u).trim();
  if (!s) return null;
  // If backend stored "public/xyz.png" or "/public/xyz.png", Next serves it at "/xyz.png"
  s = s.replace(/^\/?public\//, "/");
  if (!s.startsWith("http") && !s.startsWith("/")) s = "/" + s;
  return s;
}

function pickPhotoUrl(p: any): string | null {
  if (!p) return null;

  const direct =
    p.photoUrl ||
    p.profilePhotoUrl ||
    p.primaryPhotoUrl ||
    p.mainPhotoUrl ||
    p.imageUrl ||
    p.avatarUrl;

  const normalizedDirect = normalizePublicPath(direct);
  if (normalizedDirect) return normalizedDirect;

  const arrays = [p.photos, p.images, p.gallery];
  for (const arr of arrays) {
    if (Array.isArray(arr) && arr.length > 0) {
      const first = arr[0];
      if (typeof first === "string") {
        const n = normalizePublicPath(first);
        if (n) return n;
      } else if (first && typeof first === "object" && typeof first.url === "string") {
        const n = normalizePublicPath(first.url);
        if (n) return n;
      }
    }
  }

  return null;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function DiscoverPage() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [idx, setIdx] = useState(0);
  const [status, setStatus] = useState<string>("");

  const [sheetOpen, setSheetOpen] = useState(false);

  const top = profiles[idx] ?? null;

  // Swipe state
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const dxRef = useRef<number>(0);
  const dyRef = useRef<number>(0);
  const dragging = useRef(false);

  const photo = useMemo(() => pickPhotoUrl(top), [top]);

  const overlay = useMemo(() => {
    const dx = dxRef.current;
    if (!dragging.current) return null;
    if (Math.abs(dx) < 30) return null;
    return dx > 0 ? "LIKE" : "PASS";
  }, [idx, sheetOpen]);

  const transform = useMemo(() => {
    const dx = dxRef.current;
    const rot = clamp(dx / 18, -12, 12);
    return `translateX(${dx}px) rotate(${rot}deg)`;
  }, [idx, sheetOpen]);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await apiGet("/api/feed");
        const list: any[] = Array.isArray(res?.profiles) ? res.profiles : Array.isArray(res) ? res : [];
        setProfiles(list as Profile[]);
        setIdx(0);
        setStatus(list.length ? "Ready" : "No profiles returned from /api/feed.");
      } catch (e: any) {
        setStatus(e?.message ? String(e.message) : "Failed to load feed.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function resetDrag() {
    dragging.current = false;
    startX.current = null;
    startY.current = null;
    dxRef.current = 0;
    dyRef.current = 0;
  }

  function nextCard() {
    resetDrag();
    setIdx((v) => Math.min(v + 1, profiles.length));
  }

  async function sendDecision(decision: "like" | "pass") {
    if (!top?.id) return;
    // best effort: ignore errors so UI remains responsive
    try {
      await apiPost("/api/decision", { targetUserId: top.id, decision });
    } catch {
      // ignore
    }
  }

  async function like() {
    if (!top) return;
    setStatus("Liked.");
    await sendDecision("like");
    nextCard();
  }

  async function pass() {
    if (!top) return;
    setStatus("Passed.");
    await sendDecision("pass");
    nextCard();
  }

  function onPointerDown(e: React.PointerEvent) {
    if (sheetOpen) return;
    dragging.current = true;
    startX.current = e.clientX;
    startY.current = e.clientY;
    dxRef.current = 0;
    dyRef.current = 0;
    (e.currentTarget as any).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current || startX.current == null || startY.current == null || sheetOpen) return;
    dxRef.current = e.clientX - startX.current;
    dyRef.current = e.clientY - startY.current;
    // force rerender
    setIdx((v) => v);
  }

  async function onPointerUp() {
    if (!dragging.current) return;

    const dx = dxRef.current;
    const dy = dyRef.current;

    const swipeX = 90;
    const swipeUp = -90;

    // Up-swipe opens sheet
    if (!sheetOpen && Math.abs(dy) > Math.abs(dx) && dy < swipeUp) {
      resetDrag();
      setSheetOpen(true);
      return;
    }

    // Like / pass
    if (!sheetOpen && dx > swipeX) return void like();
    if (!sheetOpen && dx < -swipeX) return void pass();

    // Snap back
    resetDrag();
    setIdx((v) => v);
  }

  function onSheetPointerDown(e: React.PointerEvent) {
    // allow swipe-down to close
    dragging.current = true;
    startX.current = e.clientX;
    startY.current = e.clientY;
    dxRef.current = 0;
    dyRef.current = 0;
    (e.currentTarget as any).setPointerCapture?.(e.pointerId);
  }

  function onSheetPointerMove(e: React.PointerEvent) {
    if (!dragging.current || startY.current == null) return;
    dyRef.current = e.clientY - startY.current;
    setIdx((v) => v);
  }

  function onSheetPointerUp() {
    const dy = dyRef.current;
    // Swipe down closes
    if (dy > 90) {
      resetDrag();
      setSheetOpen(false);
      return;
    }
    resetDrag();
  }

  if (loading) return <div style={{ padding: 18 }}>Loading…</div>;

  if (!top)
    return (
      <div style={{ padding: 18 }}>
        <h1 style={{ margin: "8px 0 6px" }}>Discover</h1>
        <div className="panel" style={{ padding: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>No more profiles available</div>
          <div style={{ opacity: 0.85, lineHeight: 1.5 }}>
            Your backend returned an empty deck from <code>/api/feed</code>, or you already swiped through everything.
          </div>
        </div>
      </div>
    );

  return (
    <div style={{ padding: 18, display: "grid", placeItems: "center" }}>
      <div style={{ width: "min(520px, 92vw)" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
          <h1 style={{ margin: 0 }}>Discover</h1>
          <div
            className="panel"
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              fontSize: 13,
              opacity: 0.95,
              maxWidth: "60%",
              textAlign: "right",
            }}
          >
            {status || "Ready"}
          </div>
        </div>

        <div style={{ position: "relative", height: 560 }}>
          {/* Peek next card */}
          {profiles[idx + 1] && (
            <div
              className="panel"
              style={{
                position: "absolute",
                inset: 0,
                transform: "scale(0.985) translateY(10px)",
                opacity: 0.45,
              }}
            />
          )}

          {/* Active card */}
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
            {/* Photo / background */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  photo
                    ? `url(${photo}) center/cover no-repeat`
                    : "radial-gradient(900px 520px at 20% 30%, rgba(255,79,174,.22), transparent 55%), radial-gradient(900px 700px at 80% 20%, rgba(127,63,245,.18), transparent 60%), rgba(255,255,255,.06)",
              }}
            />

            {/* Gradient overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to top, rgba(0,0,0,.78), rgba(0,0,0,.18) 45%, rgba(0,0,0,.05))",
              }}
            />

            {/* LIKE/PASS overlay */}
            {overlay && (
              <div
                style={{
                  position: "absolute",
                  top: 18,
                  left: overlay === "LIKE" ? 18 : "auto",
                  right: overlay === "PASS" ? 18 : "auto",
                  padding: "10px 14px",
                  borderRadius: 16,
                  fontWeight: 950,
                  letterSpacing: 2,
                  border: "1px solid rgba(255,255,255,.18)",
                  background: overlay === "LIKE" ? "rgba(255,79,174,.22)" : "rgba(255,255,255,.06)",
                  backdropFilter: "blur(10px)",
                }}
              >
                {overlay}
              </div>
            )}

            <div style={{ position: "absolute", left: 16, right: 16, bottom: 14 }}>
              <div style={{ fontSize: 22, fontWeight: 900 }}>
                {top.name || "Unknown"}
                {typeof top.age === "number" ? `, ${top.age}` : ""}
              </div>
              <div style={{ opacity: 0.85, fontSize: 13, marginTop: 2 }}>{top.city || ""}</div>

              <div className="actionRow" style={{ marginTop: 12 }}>
                <button className="actionIcon" aria-label="Pass" onClick={() => void pass()} title="Pass">
                  ✕
                </button>
                <button className="actionIcon primary" aria-label="View profile" onClick={() => setSheetOpen(true)} title="View profile">
                  👁
                </button>
                <button className="actionIcon primary" aria-label="Like" onClick={() => void like()} title="Like">
                  ♥
                </button>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.78, textAlign: "center" }}>
                Swipe left=pass • right=like • up=view profile
              </div>
            </div>
          </div>
        </div>

        {/* Bottom sheet */}
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
              onPointerDown={onSheetPointerDown}
              onPointerMove={onSheetPointerMove}
              onPointerUp={onSheetPointerUp}
              onPointerCancel={onSheetPointerUp}
            >
              <div className="menuHeader">
                <div className="menuTitle">Profile</div>
                <button className="iconBtn" aria-label="Close" onClick={() => setSheetOpen(false)}>
                  ✕
                </button>
              </div>

              <div style={{ padding: "12px 6px", display: "grid", gap: 10 }}>
                <div style={{ fontSize: 20, fontWeight: 950 }}>
                  {top.name || "Unknown"} {typeof top.age === "number" ? `• ${top.age}` : ""}
                </div>
                {top.city && <div style={{ opacity: 0.85 }}>{top.city}</div>}
                {top.bio && <div style={{ opacity: 0.85, lineHeight: 1.5 }}>{top.bio}</div>}
                <div style={{ opacity: 0.75, fontSize: 12 }}>Swipe down to return to Discover.</div>
              </div>

              <div className="menuFooter" style={{ display: "flex", gap: 10 }}>
                <button className="pillBtn" onClick={() => setSheetOpen(false)}>
                  Back
                </button>
                <button className="pillBtn danger" onClick={() => (setSheetOpen(false), void pass())}>
                  Pass
                </button>
                <button className="pillBtn" onClick={() => (setSheetOpen(false), void like())}>
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
