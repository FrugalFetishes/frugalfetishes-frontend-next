"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { requireSession } from "@/lib/session";
import { uidFromToken, loadUserProfileSnapshot } from "@/lib/socialStore";

function fallbackNameFromUid(u: string): string {
  if (!u) return "Match";
  if (u.includes("@")) return u.split("@")[0] || u;
  return u.slice(0, 8);
}

export default function MatchProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const matchId = params?.id || "";

  const token = useMemo(() => {
    try { return requireSession(); } catch { return null as any; }
  }, []);
  const uid = useMemo(() => uidFromToken(token) ?? "anon", [token]);

  const otherUid = useMemo(() => {
    const parts = String(matchId).split("__");
    if (parts.length !== 2) return "";
    return parts[0] === uid ? parts[1] : parts[0];
  }, [matchId, uid]);

  const p: any = useMemo(() => (otherUid ? loadUserProfileSnapshot(otherUid) : null), [otherUid]);

  const name =
    p?.name ||
    p?.displayName ||
    p?.username ||
    p?.email ||
    fallbackNameFromUid(otherUid);

  const photo =
    p?.photoUrl ||
    p?.profilePhotoUrl ||
    p?.avatarUrl ||
    p?.imageUrl ||
    "/frugalfetishes.png";

  const headline = p?.headline || "Short headline shown on profile — edit in Profile.";

  return (
    <div className="ff-page">
      <AppHeader active="matches" />

      <main className="ff-shell">
        <div className="ff-chat-top">
          <button className="ff-pill" onClick={() => router.back()}>Back</button>
          <div className="ff-chat-title">{name}</div>
          <Link className="ff-pill" href="/matches">Matches</Link>
        </div>

        <div className="ff-profile">
          <img className="ff-profile-hero" src={photo} alt={name} />
          <div className="ff-profile-card">
            <div className="ff-h2">{name}</div>
            <div className="ff-muted">{headline}</div>

            <div style={{ height: 12 }} />

            {/* Always show Message so you can test chat */}
            <Link className="ff-pill" href={`/chat/${matchId}`}>Message</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
