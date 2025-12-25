"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";
import { requireSession, clearSession } from "@/lib/session";

type Profile = {
  id: string;
  name: string;
  age?: number;
  city?: string;
  bio?: string;
  photoUrl?: string;
};

function normalizePhotoUrl(url?: string): string | null {
  if (!url) return null;
  const u = String(url).trim();
  if (!u) return null;

  // Common bug: people store paths like "/public/foo.png" in data.
  if (u.startsWith("/public/")) return "/" + u.slice("/public/".length);
  if (u.startsWith("public/")) return "/" + u.slice("public/".length);

  // Already absolute URL
  if (/^https?:\/\//i.test(u)) return u;

  // Root-relative
  if (u.startsWith("/")) return u;

  // Otherwise treat as root-relative file name/path
  return "/" + u;
}

function pickPhotoUrl(p: any): string | undefined {
    const candidates: any[] = [
      p?.photoUrl,
      p?.photoURL,
      p?.photo,
      p?.avatarUrl,
      p?.avatarURL,
      p?.profilePhotoUrl,
      p?.profilePhotoURL,
      p?.imageUrl,
      p?.imageURL,
      p?.images?.[0],
      p?.photos?.[0],
      p?.photoUrls?.[0],
      p?.photoURLs?.[0],
      p?.pictures?.[0],
    ];
    for (const c of candidates) {
      const u = normalizePhotoUrl(c);
      if (u) return u;
    }
    return undefined;
  }

function placeholderAvatarDataUri(name?: string) {
  const safe = (name || "User").trim();
  const initials = safe
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "U";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#2a0f2b"/>
        <stop offset="100%" stop-color="#1a1a2e"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle"
      font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial"
      font-size="160" fill="rgba(255,255,255,0.85)">${initials}</text>
  </svg>`;

  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}


const SEEN_KEY = "ff_seen_profiles_v1";

function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x) => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function saveSeen(seen: Set<string>) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen)));
  } catch {}
}

function demoDeck(): Profile[] {
  // Safe fallback deck for UI testing if backend returns none.
  return [
    {
      id: "demo_donald",
      name: "Donald",
      age: 34,
      city: "Miami",
      bio: "Just here to test the swipe deck.",
      photoUrl: "https://picsum.photos/800/1200?random=11"},
    {
      id: "demo_jess",
      name: "Jess",
      age: 34,
      city: "Orlando",
      bio: "Demo profile — like/pass to test.",
      photoUrl: "https://picsum.photos/800/1200?random=12"},
    {
      id: "demo_rebecca",
      name: "Rebecca",
      age: 44,
      city: "Tampa",
      bio: "Demo profile — tap View to open.",
      photoUrl: "https://picsum.photos/800/1200?random=13"
    }
  ];
}

export default function DiscoverPage() {
  const token = requireSession();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [cursor, setCursor] = useState<number>(0);
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [useDemo, setUseDemo] = useState<boolean>(false);
  const [dragX, setDragX] = useState<number>(0);
  const [dragging, setDragging] = useState<boolean>(false);
  const dragStartX = useRef<number>(0);

  const originalDeckRef = useRef<Profile[] | null>(null);

  const current = useMemo(() => profiles[cursor] || null, [profiles, cursor]);

  async function refreshDeck() {
    if (!token || busy) return;
    setBusy(true);
    setStatus("Refreshing…");
    try {
      const seen = loadSeen();
      const res = await apiGet("/api/feed");

      // Accept several possible backend shapes.
      const rawList: any[] =
        (Array.isArray(res) ? res : null) ||
        (Array.isArray(res?.profiles) ? res.profiles : null) ||
        (Array.isArray(res?.items) ? res.items : null) ||
        [];

      let list: Profile[] = rawList
        .map((p: any) => ({
          id: String(p?.id ?? p?._id ?? ""),
          name: String(p?.name ?? p?.displayName ?? "Unknown"),
          age: typeof p?.age === "number" ? p.age : undefined,
          city: typeof p?.city === "string" ? p.city : undefined,
          bio: typeof p?.bio === "string" ? p.bio : typeof p?.about === "string" ? p.about : undefined,
          photoUrl:
            typeof p?.photoUrl === "string"
              ? p.photoUrl
              : typeof p?.photo === "string"
                ? p.photo
                : typeof p?.avatarUrl === "string"
                  ? p.avatarUrl
                  : undefined
        }))
        .filter((p) => p.id && !seen.has(p.id));

      // If backend has nothing, only use the demo deck when you explicitly enable it (Reset Deck).
      if (!list.length) {
        if (useDemo) {
          list = demoDeck().filter((p) => !seen.has(p.id));
          setStatus("No more profiles available. Using demo deck for testing.");
        } else {
          setStatus("No more profiles available.");
        }
      } else {
        setStatus("");
      }

      setProfiles(list);
      setCursor(0);

      if (!originalDeckRef.current) {
        originalDeckRef.current = list;
      }
    } catch (e: any) {
      if (useDemo) {
        setProfiles(demoDeck());
        setCursor(0);
        setStatus("Feed error. Showing demo deck for testing.");
      } else {
        setProfiles([]);
        setCursor(0);
        setStatus("Feed error. Try Refresh, or use Reset Deck to load a demo deck.");
      }
    } finally {
      setBusy(false);
    }
  }

  function markSeen(id: string) {
    const seen = loadSeen();
    seen.add(id);
    saveSeen(seen);
  }

  
  function onCardPointerDown(e: any) {
    if (busy || !current) return;
    setDragging(true);
    dragStartX.current = e.clientX;
    setDragX(0);
    try {
      (e.currentTarget as any).setPointerCapture?.(e.pointerId);
    } catch {}
  }

  function onCardPointerMove(e: any) {
    if (!dragging) return;
    const dx = e.clientX - dragStartX.current;
    setDragX(dx);
  }

  function onCardPointerUp(e: any) {
    if (!dragging) return;
    setDragging(false);
    const dx = e.clientX - dragStartX.current;
    const TH = 120;
    if (dx > TH) {
      setDragX(0);
      sendDecision("like");
      return;
    }
    if (dx < -TH) {
      setDragX(0);
      sendDecision("pass");
      return;
    }
    setDragX(0);
  }

async function sendDecision(decision: "like" | "pass") {
    if (!token || !current || busy) return;
    setBusy(true);
    try {
      markSeen(current.id);

      // Best effort: call backend (ignore failures so UI keeps moving)
      try {
        await apiPost("/api/decision", { targetUserId: current.id, decision });
      } catch {}

      setCursor((c) => c + 1);
      setStatus(decision === "like" ? "Liked." : "Passed.");
      setTimeout(() => setStatus(""), 900);
    } finally {
      setBusy(false);
    }
  }

  function resetDeck() {
    // Explicitly enable demo deck for testing (so we don't show random demo photos unless you ask for it).
    setUseDemo(true);
    try {
      localStorage.removeItem(SEEN_KEY);
    } catch {}
    const deck = demoDeck();
    originalDeckRef.current = deck;
    setProfiles(deck);
    setCursor(0);
    setDragX(0);
    setDragging(false);
    setStatus("Demo deck loaded.");
    setTimeout(() => setStatus(""), 900);
  }

  // Keyboard shortcuts for quick testing:
  // Left arrow = pass, Right arrow = like, R = reset
  useEffect(() => {
    if (!token) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") sendDecision("pass");
      if (e.key === "ArrowRight") sendDecision("like");
      if (e.key.toLowerCase() === "r") resetDeck();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, current, busy]);

  useEffect(() => {
    if (!token) return;
    refreshDeck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const bgStyle: React.CSSProperties = {
    minHeight: "100vh",
    padding: "24px 16px 40px",
    background:
      "radial-gradient(900px 600px at 15% 10%, rgba(255, 64, 157, 0.22), rgba(0,0,0,0) 55%), radial-gradient(900px 600px at 85% 25%, rgba(148, 89, 255, 0.22), rgba(0,0,0,0) 55%), linear-gradient(135deg, #140017, #0b0010 55%, #070012)",
    color: "rgba(255,255,255,0.92)"
  };

  const topBar: React.CSSProperties = {
    maxWidth: 980,
    margin: "0 auto 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  };

  const pill: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 36,
    padding: "0 12px",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.22)",
    color: "rgba(255,255,255,0.92)",
    textDecoration: "none",
    cursor: "pointer",
    userSelect: "none"
  };

  const statusToast: React.CSSProperties = {
    position: "fixed",
    left: 12,
    right: 12,
    top: 12,
    zIndex: 50,
    maxWidth: 720,
    margin: "0 auto",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(10, 0, 16, 0.72)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    color: "rgba(255,255,255,0.92)",
    fontSize: 13
  };

  const cardWrap: React.CSSProperties = {
    maxWidth: 980,
    margin: "0 auto",
    display: "grid",
    placeItems: "center"
  };

  const card: React.CSSProperties = {
    width: "min(520px, 92vw)",
    aspectRatio: "3 / 4",
    borderRadius: 24,
    position: "relative",
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.18)",
    boxShadow: "0 18px 60px rgba(0,0,0,0.45)"
  };

  const imgStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    pointerEvents: "none",
    userSelect: "none",
    filter: "contrast(1.03) saturate(1.05)"
  };

  const overlay: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(0,0,0,0.00) 40%, rgba(0,0,0,0.58) 78%, rgba(0,0,0,0.78) 100%)"
  };

  const footer: React.CSSProperties = {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 14,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12
  };

  const nameStyle: React.CSSProperties = {
    margin: 0,
    fontSize: 22,
    letterSpacing: 0.2
  };

  const mini: React.CSSProperties = {
    margin: "4px 0 0",
    fontSize: 13,
    opacity: 0.86
  };

  const actions: React.CSSProperties = {
    display: "flex",
    gap: 10
  };

  const actionBtn = (variant: "pass" | "like" | "view"): React.CSSProperties => ({
    width: 44,
    height: 44,
    borderRadius: 22,
    border: "1px solid rgba(255,255,255,0.20)",
    background:
      variant === "like"
        ? "rgba(255, 64, 157, 0.35)"
        : variant === "pass"
          ? "rgba(255,255,255,0.10)"
          : "rgba(148, 89, 255, 0.28)",
    color: "rgba(255,255,255,0.95)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    userSelect: "none"
  });

  function logout() {
    try {
      clearSession();
    } catch {}
    window.location.href = "/login";
  }

  return (
    <div style={bgStyle}>
      {status ? <div style={statusToast}>{status}</div> : null}

      <div style={topBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src="/FFmenuheaderlogo.png"
            alt="FrugalFetishes"
            style={{ height: 28, width: "auto", filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.6))" }}
          />
          <div style={{ fontWeight: 700, letterSpacing: 0.2 }}>Discover</div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button style={pill} onClick={resetDeck} disabled={busy}>
            Reset Deck
          </button>
          <button style={pill} onClick={refreshDeck} disabled={busy}>
            Refresh
          </button>
          <Link style={pill} href="/matches">
            Matches
          </Link>
          <button style={pill} onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      <div style={cardWrap}>
        {!current ? (
          <div
            style={{
              width: "min(720px, 94vw)",
              padding: 18,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.22)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              lineHeight: 1.4
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>No profiles available</div>
            <div style={{ opacity: 0.9 }}>
              Click <b>Reset Deck</b> to clear seen profiles, or <b>Refresh</b> to fetch new ones.
              <br />
              Keyboard: <b>←</b> pass, <b>→</b> like, <b>R</b> reset.
            </div>
          </div>
        ) : (
          <div
            style={{
              ...card,
              transform: `translateX(${dragX}px) rotate(${dragX / 20}deg)`,
              transition: dragging ? "none" : "transform 200ms ease",
              cursor: "grab",
            }}
            onPointerDown={onCardPointerDown}
            onPointerMove={onCardPointerMove}
            onPointerUp={onCardPointerUp}
            onPointerCancel={onCardPointerUp}
          >
                      <img
            src={current.photoUrl ?? placeholderAvatarDataUri(current.name)}
            alt={`${current.name}'s photo`}
            draggable={false}
            style={imgStyle}
            onError={(e) => {
              // If a remote/local image fails, fall back to a generated placeholder (NOT the brand logo).
              const el = e.currentTarget as HTMLImageElement;
              el.onerror = null;
              el.src = placeholderAvatarDataUri(current.name);
            }}
          />
            <div style={overlay} />

            <div style={footer}>
              <div>
                <h2 style={nameStyle}>
                  {current.name}
                  {typeof current.age === "number" ? `, ${current.age}` : ""}
                </h2>
                <div style={mini}>
                  {current.city ? current.city : ""}
                  {current.bio ? (current.city ? " • " : "") + current.bio : ""}
                </div>
              </div>

              <div style={actions}>
                <button style={actionBtn("pass")} onClick={() => sendDecision("pass")} aria-label="Pass" disabled={busy}>
                  ✕
                </button>
                <Link style={actionBtn("view")} href={`/matches/${encodeURIComponent(current.id)}`} aria-label="View">
                  👁
                </Link>
                <button style={actionBtn("like")} onClick={() => sendDecision("like")} aria-label="Like" disabled={busy}>
                  ♥
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 980, margin: "16px auto 0", opacity: 0.75, fontSize: 12, textAlign: "center" }}>
        Swipe is enabled on desktop via keyboard shortcuts for now. Mobile swipe can be layered back in once the feed is stable.
      </div>
    </div>
  );
}
