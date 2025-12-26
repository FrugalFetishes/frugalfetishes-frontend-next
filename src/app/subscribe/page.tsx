"use client";

import { useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { requireSession } from "@/lib/session";
import { uidFromToken, getProfileExtras, setProfileExtras } from "@/lib/socialStore";

type Tier = "verified" | "gold" | "platinum";

const TIERS: { id: Tier; title: string; price: string; bullets: string[] }[] = [
  {
    id: "verified",
    title: "VERIFIED",
    price: "$3.99 one-time",
    bullets: [
      "Cuts down bots & fake profiles",
      "Send/receive messages",
      "Send/receive matches",
      "Earn XP and participate in events",
      "Future: Screening Room + Game Room access",
    ],
  },
  {
    id: "gold",
    title: "SUBSCRIBED — GOLD",
    price: "$9.99 / month (placeholder)",
    bullets: [
      "Monthly credit dispersal (placeholder)",
      "10% XP boost (placeholder)",
      "Future: reduced message credit cost",
    ],
  },
  {
    id: "platinum",
    title: "SUBSCRIBED — PLATINUM",
    price: "$19.99 / month (placeholder)",
    bullets: [
      "Higher monthly credits (placeholder)",
      "20% XP boost (placeholder)",
      "Priority access to new features (placeholder)",
    ],
  },
];

export default function SubscribePage() {
  const token = useMemo(() => {
    try { return requireSession(); } catch { return null as any; }
  }, []);

  const uid: string = useMemo(() => {
    try { return (uidFromToken(token) ?? ""); } catch { return ""; }
  }, [token]);

  const currentTier = useMemo(() => {
    if (!uid) return "free";
    try {
      return String((getProfileExtras(uid) as any)?.subscriptionTier ?? "free");
    } catch {
      return "free";
    }
  }, [uid]);

  const [selected, setSelected] = useState<Tier>("verified");
  const [saved, setSaved] = useState<string>("");

  function saveTier(t: Tier) {
    if (!uid) {
      setSaved("Please log in again.");
      return;
    }
    try {
      const prev = (getProfileExtras(uid) as any) ?? {};
      setProfileExtras(uid, { ...prev, subscriptionTier: t, subscriptionUpdatedAt: Date.now() });
      setSaved(`Saved: ${t}`);
    } catch {
      setSaved("Could not save subscription (local).");
    }
  }

  return (
    <div className="ff-page">
      <AppHeader active="profile" />

      <main className="ff-main">
        <h1 className="ff-h1">Subscribe</h1>
        <div className="ff-muted">Current tier: <b>{currentTier}</b></div>

        <div style={{ height: 12 }} />

        <div className="ff-list">
          {TIERS.map((t) => (
            <div key={t.id} className="ff-card">
              <div className="ff-row">
                <div>
                  <div className="ff-row-title">{t.title}</div>
                  <div className="ff-muted">{t.price}</div>
                </div>
                <label className="ff-pill" style={{ cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="tier"
                    checked={selected === t.id}
                    onChange={() => setSelected(t.id)}
                    style={{ marginRight: 8 }}
                  />
                  Select
                </label>
              </div>

              <ul className="ff-bullets">
                {t.bullets.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ height: 12 }} />

        <button className="ff-pill" onClick={() => saveTier(selected)}>
          Save Subscription (placeholder)
        </button>

        {saved ? <div className="ff-muted" style={{ marginTop: 10 }}>{saved}</div> : null}
      </main>
    </div>
  );
}
