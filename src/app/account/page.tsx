'use client';

import { useMemo } from 'react';
import AppHeader from '@/components/AppHeader';
import { requireSession } from '@/lib/session';
import { uidFromToken, loadUserProfileSnapshot, getProfileExtras } from '@/lib/socialStore';

function cell(label: string, value: string) {
  return { label, value };
}

export default function AccountDetailsPage() {
  const token = useMemo(() => requireSession(), []);
  const uid = useMemo(() => uidFromToken(token) || 'anon', [token]);

  const profile = useMemo(() => loadUserProfileSnapshot(uid), [uid]);
  const extras = useMemo(() => getProfileExtras(uid), [uid]);

  const email = (profile?.email || (token.includes('@') ? token : '') || '').toString();
  const fullName = (extras?.fullName || profile?.name || '').toString();
  const displayName = (extras?.displayName || profile?.displayName || profile?.name || '').toString();
  const subscriptionTier = (extras?.subscriptionTier || 'free').toString();

  const rows = [
    cell('Email', email || '(not set)'),
    cell('Full name', fullName || '(not set)'),
    cell('Display name', displayName || '(not set)'),
    cell('Password', '•••••••• (placeholder)'),
    cell('Subscription status', subscriptionTier),
    cell('UID', uid),
  ];

  return (
    <div className="ff-page">
      <AppHeader active="account" />

      <main className="ff-shell" style={{ maxWidth: 980 }}>
        <h1 className="ff-h1">Account details</h1>

        <div
          style={{
            maxWidth: 900,
            borderRadius: 18,
            border: '1px solid rgba(255,255,255,0.10)',
            background: 'rgba(255,255,255,0.06)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '12px 14px', fontSize: 12, opacity: 0.75, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            This page is local-dev friendly. Subscription and password are placeholders until Stripe/auth is wired.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr' }}>
            {rows.map((r) => (
              <div key={r.label} style={{ display: 'contents' }}>
                <div
                  style={{
                    padding: '12px 14px',
                    fontSize: 12,
                    fontWeight: 800,
                    opacity: 0.8,
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    borderRight: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {r.label}
                </div>
                <div
                  style={{
                    padding: '12px 14px',
                    fontSize: 13,
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    fontFamily: r.label === 'UID' ? 'monospace' : 'inherit',
                  }}
                >
                  {r.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
