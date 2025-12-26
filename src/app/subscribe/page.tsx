'use client';

import { useMemo } from 'react';
import AppHeader from '@/components/AppHeader';
import { requireSession } from '@/lib/session';
import { uidFromToken, setProfileExtras, getProfileExtras } from '@/lib/socialStore';

type Tier = 'verified' | 'gold' | 'platinum';

function TierCard(props: {
  title: string;
  price: string;
  tier: Tier;
  bullets: string[];
  onChoose: (tier: Tier) => void;
  active: boolean;
}) {
  return (
    <div className={`ff-tier ${props.active ? 'active' : ''}`}>
      <div className="ff-tier-head">
        <div>
          <div className="ff-tier-title">{props.title}</div>
          <div className="ff-tier-price">{props.price}</div>
        </div>
        <button className="ff-primary" onClick={() => props.onChoose(props.tier)}>
          Choose
        </button>
      </div>
      <ul className="ff-tier-list">
        {props.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    </div>
  );
}

export default function SubscribePage() {
  const token = useMemo(() => {
    try {
      return requireSession();
    } catch {
      return null as any;
    }
  }, []);

  const uid = useMemo(() => uidFromToken(token), [token]);

  const currentTier = useMemo(() => {
    try {
      return String((getProfileExtras(uid) as any)?.subscriptionTier ?? 'free');
    } catch {
      return 'free';
    }
  }, [uid]);

  function choose(tier: Tier) {
    // Placeholder: store locally in profile extras.
    setProfileExtras(uid, {
      subscriptionTier: tier,
      subscriptionUpdatedAt: Date.now(),
    } as any);

    alert(`Saved subscription tier: ${tier.toUpperCase()} (placeholder).`);
  }

  return (
    <div className="ff-page">
      <AppHeader active="subscribe" />
      <div className="ff-shell">
        <h1 className="ff-h1">Subscribe</h1>
        <p className="ff-muted">
          Payment wiring is later. This page sets a local subscription tier so we can unlock features during testing.
        </p>

        <div className="ff-grid">
          <TierCard
            title="VERIFIED"
            price="$3.99 one-time"
            tier="verified"
            active={currentTier === 'verified'}
            onChoose={choose}
            bullets={[
              'Cuts down bots/fake profiles via verification',
              'Send messages',
              'Receive messages',
              'Send/receive matches',
              'Gain XP',
              'Virtual dates: Screening Room (shared video) + Game Room (head-to-head)',
            ]}
          />

          <TierCard
            title="SUBSCRIBED — GOLD"
            price="(monthly) — placeholder"
            tier="gold"
            active={currentTier === 'gold'}
            onChoose={choose}
            bullets={[
              'Monthly credits (placeholder)',
              '10% XP boost',
              'Credits later used for premium actions (messages, boosts, etc.)',
              'Credits can also be earned via events + XP',
            ]}
          />

          <TierCard
            title="SUBSCRIBED — PLATINUM"
            price="(monthly) — placeholder"
            tier="platinum"
            active={currentTier === 'platinum'}
            onChoose={choose}
            bullets={[
              'Higher monthly credits (placeholder)',
              '20% XP boost',
              'All GOLD benefits',
            ]}
          />
        </div>
      </div>

      <style jsx>{`
        .ff-shell {
          max-width: 980px;
          margin: 0 auto;
          padding: 18px;
        }
        .ff-h1 {
          font-size: 28px;
          margin: 10px 0 8px;
        }
        .ff-muted {
          opacity: 0.8;
          margin-bottom: 12px;
        }
        .ff-grid {
          display: grid;
          gap: 14px;
          grid-template-columns: 1fr;
        }
        @media (min-width: 920px) {
          .ff-grid {
            grid-template-columns: 1fr 1fr 1fr;
          }
        }
        .ff-tier {
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(0,0,0,0.12);
          border-radius: 16px;
          padding: 14px;
          display: grid;
          gap: 10px;
        }
        .ff-tier.active {
          outline: 2px solid rgba(255,255,255,0.18);
        }
        .ff-tier-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .ff-tier-title {
          font-weight: 800;
          letter-spacing: 0.2px;
        }
        .ff-tier-price {
          opacity: 0.85;
          font-size: 13px;
          margin-top: 2px;
        }
        .ff-tier-list {
          margin: 0;
          padding-left: 18px;
          display: grid;
          gap: 8px;
          opacity: 0.92;
          font-size: 13px;
          line-height: 1.3;
        }
        .ff-primary {
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.95);
          font-weight: 800;
        }
      `}</style>
    </div>
  );
}
