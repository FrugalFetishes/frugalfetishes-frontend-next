"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { requireSession } from "@/lib/session";
import {
  uidFromToken,
  loadUserProfileSnapshot,
  type UserProfileSnapshot,
  getProfileExtras,
  setProfileExtras,
} from "@/lib/socialStore";

export default function MatchProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const matchId = params?.id || "";

  const token = useMemo(() => {
    try { return requireSession(); } catch { return null as any; }
  }, []);
  const uid = useMemo(() => uidFromToken(token) ?? "anon", [token]);

  // matchId is "a__b"
  const otherUid = useMemo(() => {
    const parts = String(matchId).split("__");
    if (parts.length !== 2) return "";
    return parts[0] === uid ? parts[1] : parts[0];
  }, [matchId, uid]);

  const p = useMemo<UserProfileSnapshot | null>(() => loadUserProfileSnapshot(otherUid), [otherUid]);
  const extrasKey = otherUid;
  const [extras, setExtras] = useState(() => getProfileExtras(extrasKey));

  const photo =
    p?.photoUrl ||
    p?.profilePhotoUrl ||
    p?.imageUrl ||
    p?.avatarUrl ||
    "/frugalfetishes.png";

  const name = p?.name || otherUid || "Profile";
  const age = typeof p?.age === "number" ? p.age : null;
  const city = p?.city || "";

  function onSaveExtras() {
    setProfileExtras(extrasKey, extras);
    alert("Saved (local for now).");
  }

  return (
    <div className="ff-page">
      <AppHeader active="profile" />

      <main className="ff-shell">
        <button className="ff-pill" onClick={() => router.back()}>Back</button>

        <div className="ff-profile">
          <img className="ff-profile-img" src={photo} alt={name} />
          <div className="ff-profile-top">
            <div className="ff-profile-name">
              {name}{age ? `, ${age}` : ""} {city ? <span className="ff-muted">• {city}</span> : null}
            </div>

            <div className="ff-muted">{extras.headline || "Headline (tap to edit below)"}</div>

            <button className="ff-pill" onClick={() => router.push(`/chat/${matchId}`)}>
              Message
            </button>
          </div>
        </div>

        <div className="ff-card">
          <div className="ff-field">
            <label className="ff-label">Headline</label>
            <input
              className="ff-input"
              value={extras.headline || ""}
              onChange={(e) => setExtras((x) => ({ ...x, headline: e.target.value }))}
              placeholder="Short headline shown on profile + feed"
            />
          </div>

          <div className="ff-field">
            <label className="ff-label">About Me</label>
            <textarea
              className="ff-textarea"
              value={extras.about || ""}
              onChange={(e) => setExtras((x) => ({ ...x, about: e.target.value }))}
              placeholder="A longer summary / bio"
              rows={6}
            />
          </div>

          <div className="ff-field">
            <label className="ff-label">Zip Code</label>
            <input
              className="ff-input"
              value={extras.zip || ""}
              onChange={(e) => setExtras((x) => ({ ...x, zip: e.target.value }))}
              placeholder="Used later for 60-mile local matching + admin cluster metrics"
            />
          </div>

          <button className="ff-pill" onClick={onSaveExtras}>Save</button>
        </div>
      </main>
    </div>
  );
}
