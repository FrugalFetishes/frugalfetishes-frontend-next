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

function safeString(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v == null) return '';
  return String(v);
}

export default function AccountDetailsPage() {
  const token = useMemo(() => {
    try {
      return requireSession();
    } catch {
      return '';
    }
  }, []);

  const uid = useMemo(() => {
    try {
      if (!token) return '';
      return uidFromToken(token) || '';
    } catch {
      return '';
    }
  }, [token]);

  const profile = useMemo(() => {
    try {
      if (!uid) return null;
      return loadUserProfileSnapshot(uid) as any;
    } catch {
      return null;
    }
  }, [uid]);

  const extras = useMemo(() => {
    try {
      if (!uid) return null;
      return getProfileExtras(uid) as any;
    } catch {
      return null;
    }
  }, [uid]);

  const email = safeString(profile?.email || extras?.email);
  const fullName = safeString(profile?.name || profile?.fullName || extras?.fullName);
  const displayName = safeString(profile?.displayName || profile?.username || extras?.displayName || extras?.username);
  const subscription = safeString(extras?.subscriptionStatus || extras?.subscription || 'FREE (placeholder)');
  const passwordMasked = maskPassword(undefined); // placeholder: we are not storing passwords client-side

  return (
    <div className="ff-page">
      <AppHeader active="profile" />

      <div className="ff-shell">
        <h1 className="ff-title">Account Details</h1>

        {!uid ? (
          <div className="ff-card">
            <div className="ff-row">
              <div className="ff-k">Status</div>
              <div className="ff-v">Not logged in</div>
            </div>
            <div className="ff-muted">Go to <Link className="ff-link" href="/login">Login</Link>.</div>
          </div>
        ) : (
          <>
            <div className="ff-card">
              <div className="ff-row">
                <div className="ff-k">Email</div>
                <div className="ff-v">{email || '(not set)'}</div>
              </div>
              <div className="ff-row">
                <div className="ff-k">Full name</div>
                <div className="ff-v">{fullName || '(not set)'}</div>
              </div>
              <div className="ff-row">
                <div className="ff-k">Display name</div>
                <div className="ff-v">{displayName || '(not set)'}</div>
              </div>
              <div className="ff-row">
                <div className="ff-k">Password</div>
                <div className="ff-v">{passwordMasked}</div>
              </div>
              <div className="ff-row">
                <div className="ff-k">Subscription</div>
                <div className="ff-v">{subscription}</div>
              </div>
            </div>

            <div className="ff-card">
              <div className="ff-row">
                <div className="ff-k">User ID</div>
                <div className="ff-v ff-mono">{uid}</div>
              </div>
              <div className="ff-row">
                <div className="ff-k">Session token</div>
                <div className="ff-v ff-mono">{token ? token.slice(0, 24) + '…' : '(none)'}</div>
              </div>
              <div className="ff-muted">
                Account editing happens on the Profile page for now.
              </div>
            </div>

            <div className="ff-actions">
              <Link className="ff-btn" href="/profile">Edit Profile</Link>
              <Link className="ff-btn" href="/matches">Back to Matches</Link>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .ff-page {
          min-height: 100vh;
        }
        .ff-shell {
          max-width: 720px;
          margin: 0 auto;
          padding: 18px 14px 40px;
        }
        .ff-title {
          margin: 10px 0 14px;
          font-size: 22px;
          color: rgba(255,255,255,0.92);
        }
        .ff-card {
          border-radius: 16px;
          padding: 14px 14px;
          margin: 12px 0;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(0,0,0,0.18);
          backdrop-filter: blur(8px);
        }
        .ff-row {
          display: flex;
          gap: 12px;
          align-items: baseline;
          padding: 6px 0;
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .ff-row:last-child {
          border-bottom: none;
        }
        .ff-k {
          width: 140px;
          opacity: 0.75;
          font-size: 13px;
          color: rgba(255,255,255,0.85);
        }
        .ff-v {
          flex: 1;
          font-size: 14px;
          color: rgba(255,255,255,0.95);
          word-break: break-word;
        }
        .ff-mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
          font-size: 12px;
          opacity: 0.95;
        }
        .ff-actions {
          display: flex;
          gap: 10px;
          margin-top: 14px;
          flex-wrap: wrap;
        }
        .ff-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(0,0,0,0.15);
          color: rgba(255,255,255,0.9);
          text-decoration: none;
        }
        .ff-link {
          color: rgba(255,255,255,0.95);
          text-decoration: underline;
        }
        .ff-muted {
          opacity: 0.8;
          font-size: 13px;
          margin-top: 6px;
          color: rgba(255,255,255,0.85);
        }
      `}</style>
    </div>
  );
}
