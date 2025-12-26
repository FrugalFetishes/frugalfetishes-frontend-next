'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { requireSession } from '@/lib/session';
import { uidFromToken, loadUserProfileSnapshot, getProfileExtras } from '@/lib/socialStore';

function maskPassword(pw?: string): string {
  if (!pw) return '••••••••';
  return '•'.repeat(Math.max(8, Math.min(24, pw.length)));
}

export default function AccountDetailsPage() {
  const token = useMemo(() => {
    try {
      return requireSession();
    } catch {
      return null as any;
    }
  }, []);

  const uid = useMemo(() => uidFromToken(token), [token]);

  const profile = useMemo(() => {
    try {
      return loadUserProfileSnapshot(uid) as any;
    } catch {
      return null as any;
    }
  }, [uid]);

  const extras = useMemo(() => {
    try {
      return getProfileExtras(uid) as any;
    } catch {
      return {};
    }
  }, [uid]);

  const email = String(profile?.email ?? extras?.email ?? '');
  const fullName = String(extras?.fullName ?? profile?.fullName ?? '');
  const displayName = String(profile?.displayName ?? extras?.displayName ?? '');
  const tier = String(extras?.subscriptionTier ?? 'free');

  return (
    <div className="ff-page">
      <AppHeader active="account" />
      <div className="ff-shell">
        <h1 className="ff-h1">Account Details</h1>

        <div className="ff-card">
          <div className="ff-kv">
            <div className="k">Email</div>
            <div className="v">{email || '—'}</div>
          </div>

          <div className="ff-kv">
            <div className="k">Full name</div>
            <div className="v">{fullName || '—'}</div>
          </div>

          <div className="ff-kv">
            <div className="k">Display name</div>
            <div className="v">{displayName || '—'}</div>
          </div>

          <div className="ff-kv">
            <div className="k">Password</div>
            <div className="v">{maskPassword()}</div>
          </div>

          <div className="ff-kv">
            <div className="k">Subscription status</div>
            <div className="v">{tier.toUpperCase()}</div>
          </div>

          <div className="ff-actions">
            <Link className="ff-btn" href="/profile">Edit Profile</Link>
            <Link className="ff-btn" href="/subscribe">Manage Subscription</Link>
          </div>

          <p className="ff-muted">
            Password editing is a placeholder for now (OTP auth).
          </p>
        </div>
      </div>

      <style jsx>{`
        .ff-shell {
          max-width: 860px;
          margin: 0 auto;
          padding: 18px;
        }
        .ff-h1 {
          font-size: 28px;
          margin: 10px 0 16px;
        }
        .ff-card {
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(0,0,0,0.12);
          border-radius: 16px;
          padding: 14px;
          display: grid;
          gap: 10px;
        }
        .ff-kv {
          display: grid;
          grid-template-columns: 160px 1fr;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .ff-kv:last-child {
          border-bottom: 0;
        }
        .k {
          opacity: 0.75;
          font-size: 13px;
        }
        .v {
          font-weight: 600;
          overflow-wrap: anywhere;
        }
        .ff-actions {
          display: flex;
          gap: 10px;
          margin-top: 6px;
          flex-wrap: wrap;
        }
        .ff-btn {
          padding: 10px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(0,0,0,0.15);
          color: rgba(255,255,255,0.9);
          text-decoration: none;
        }
        .ff-muted {
          opacity: 0.8;
          font-size: 13px;
          margin-top: 6px;
        }
      `}</style>
    </div>
  );
}
