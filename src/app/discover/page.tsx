"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import { clearSession } from "@/lib/session";

type Profile = {
  id: string;
  name?: string;
  age?: number;
  city?: string;
  bio?: string;
  photoUrl?: string;
  photos?: string[];
};

function normProfile(raw: any): Profile {
  const id = String(raw?.id || raw?._id || raw?.uid || "");
  return {
    id,
    name: raw?.name ?? raw?.displayName ?? raw?.username ?? "Unknown",
    age: typeof raw?.age === "number" ? raw.age : undefined,
    city: raw?.city ?? raw?.location?.city ?? undefined,
    bio: raw?.bio ?? raw?.about ?? "",
    photoUrl: raw?.photoUrl ?? raw?.photo ?? raw?.avatarUrl ?? (Array.isArray(raw?.photos) ? raw.photos[0] : undefined),
    photos: Array.isArray(raw?.photos) ? raw.photos : undefined,
  };
}

export default function DiscoverPage() {
  const router = useRouter();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);

  const [sheet, setSheet] = useState<Profile | null>(null);

  // swipe
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });

  const active = profiles[idx] || null;
  const next = profiles[idx + 1] || null;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiGet("/api/feed");
        const arr = Array.isArray(res?.profiles) ? res.profiles : Array.isArray(res) ? res : [];
        if (!alive) return;
        setProfiles(arr.map(normProfile).filter(p => p.id));
        setIdx(0);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { alive = false; };
  }, []);

  const label = useMemo(() => {
    if (!active) return "";
    const parts = [active.name, active.age ? String(active.age) : ""].filter(Boolean).join(", ");
    return parts || "Profile";
  }, [active]);

  async function send(action: "like" | "pass", profileId: string) {
    if (!profileId || busy) return;
    setBusy(true);
    try {
      await apiPost(`/api/${action}`, { profileId });
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
      setDrag({ x: 0, y: 0, active: false });
      setIdx(v => Math.min(v + 1, profiles.length));
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!active || sheet) return;
    (e.currentTarget as any).setPointerCapture?.(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    setDrag({ x: 0, y: 0, active: true });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!startRef.current || !drag.active || sheet) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    setDrag({ x: dx, y: dy, active: true });
  }

  async function onPointerUp() {
    if (!startRef.current || sheet) return;
    const dx = drag.x;
    const dy = drag.y;
    startRef.current = null;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    // Up swipe opens sheet
    if (dy < -120 && absY > absX) {
      setSheet(active);
      setDrag({ x: 0, y: 0, active: false });
      return;
    }

    // Left / right swipe
    if (dx > 140) return send("like", active?.id || "");
    if (dx < -140) return send("pass", active?.id || "");

    setDrag({ x: 0, y: 0, active: false });
  }

  async function logout() {
    clearSession?.();
    router.replace("/login");
  }

  return (
    <div className="ff-shell">
      <div className="ff-topbar">
        <div className="ff-topbar-left">
          <img className="ff-logo" src="/FFmenuheaderlogo.png" alt="FrugalFetishes" />
          <span className="ff-badge">Discover</span>
        </div>

        <div className="ff-topbar-right">
          <button className="ff-iconbtn" onClick={() => router.push("/matches")} aria-label="Matches" title="Matches">💬</button>
          <button className="ff-iconbtn" onClick={logout} aria-label="Logout" title="Logout">⎋</button>
        </div>
      </div>

      <div
        className="ff-glass"
        style={{
          width: "min(980px, 94vw)",
          minHeight: 520,
          padding: 18,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", gap: 16, alignItems: "stretch", justifyContent: "space-between" }}>
          {/* art side */}
          <div
            style={{
              flex: 1,
              minHeight: 460,
              borderRadius: 22,
              position: "relative",
              overflow: "hidden",
              background:
                "radial-gradient(700px 500px at 22% 28%, rgba(255,79,163,.22), transparent 60%), radial-gradient(700px 500px at 80% 60%, rgba(124,58,237,.20), transparent 60%), rgba(0,0,0,.18)",
              border: "1px solid rgba(255,255,255,.10)",
            }}
          >
            {/* decorative circles */}
            <div style={{ position: "absolute", top: 24, left: 24, width: 96, height: 96, borderRadius: 999, border: "2px solid rgba(255,255,255,.14)" }} />
            <div style={{ position: "absolute", bottom: 26, right: 26, width: 56, height: 56, borderRadius: 999, border: "2px solid rgba(255,255,255,.10)" }} />

            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <img
                  src={active?.photoUrl || "/frugalfetishes.png"}
                  alt={label}
                  style={{
                    width: 320,
                    height: 420,
                    objectFit: "cover",
                    borderRadius: 22,
                    border: "1px solid rgba(255,255,255,.18)",
                    boxShadow: "0 26px 70px rgba(0,0,0,.55)",
                    transform: sheet ? "scale(.98)" : `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x * 0.04}deg)`,
                    transition: drag.active ? "none" : "transform 180ms ease",
                    touchAction: "none",
                    userSelect: "none",
                  }}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                />

                <div style={{ marginTop: 12, fontWeight: 900 }}>{label}</div>
                <div className="ff-subtle" style={{ fontSize: 13 }}>
                  Swipe: left=pass • right=like • up=view
                </div>
              </div>
            </div>

            {/* next card shadow */}
            {next ? (
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", opacity: 0.35, pointerEvents: "none" }}>
                <div
                  style={{
                    width: 300,
                    height: 400,
                    borderRadius: 22,
                    border: "1px solid rgba(255,255,255,.10)",
                    background: "rgba(0,0,0,.18)",
                    transform: "translate(22px, 18px)",
                    filter: "blur(0.2px)",
                  }}
                />
              </div>
            ) : null}
          </div>

          {/* controls side */}
          <div style={{ width: 340, display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 className="ff-title" style={{ fontSize: 34, margin: "6px 0 0" }}>Find your match</h2>
            <div className="ff-subtle" style={{ fontSize: 13, lineHeight: 1.35 }}>
              Keep it playful. Swipe, peek, and see who clicks.
            </div>

            <div style={{ height: 10 }} />

            <div className="ff-pillrow">
              <button className="ff-pill" onClick={() => active && send("pass", active.id)} aria-label="Pass" title="Pass">❌</button>
              <button className="ff-pill" onClick={() => active && setSheet(active)} aria-label="View" title="View">👁️</button>
              <button className="ff-pill ff-pillPrimary" onClick={() => active && send("like", active.id)} aria-label="Like" title="Like">❤️</button>
            </div>

            <div className="ff-subtle" style={{ fontSize: 12, textAlign: "center" }}>
              Tip: you can still click the picture, then swipe.
            </div>

            <div style={{ flex: 1 }} />

            <div className="ff-subtle" style={{ fontSize: 12, textAlign: "center" }}>
              Profiles shown are dev data. Matches appear after mutual likes.
            </div>
          </div>
        </div>

        {/* sheet */}
        {sheet ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,.62)",
              display: "grid",
              placeItems: "center",
              padding: 18,
              zIndex: 10,
            }}
            onClick={() => setSheet(null)}
          >
            <div
              className="ff-glass"
              style={{ width: "min(880px, 94vw)", padding: 18, display: "grid", gap: 12 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <img className="ff-avatar" src={sheet.photoUrl || "/frugalfetishes.png"} alt={sheet.name || "Profile"} />
                  <div>
                    <div style={{ fontWeight: 900 }}>{sheet.name} {sheet.age ? `, ${sheet.age}` : ""}</div>
                    <div className="ff-subtle" style={{ fontSize: 12 }}>{sheet.city || ""}</div>
                  </div>
                </div>
                <button className="ff-iconbtn" onClick={() => setSheet(null)} aria-label="Close" title="Close">✕</button>
              </div>

              <div className="ff-subtle" style={{ lineHeight: 1.5 }}>
                {sheet.bio || "No bio yet."}
              </div>

              <div className="ff-pillrow" style={{ justifyContent: "flex-end" }}>
                <button className="ff-pill" onClick={() => active && send("pass", active.id)} aria-label="Pass" title="Pass">❌</button>
                <button className="ff-pill ff-pillPrimary" onClick={() => active && send("like", active.id)} aria-label="Like" title="Like">❤️</button>
              </div>
            </div>
          </div>
        ) : null}

        {/* empty */}
        {!active ? (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 6 }}>No more profiles</div>
              <div className="ff-subtle" style={{ fontSize: 13 }}>Seed more dev users, then refresh.</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
