'use client';

import React, { useMemo } from 'react';
import AppHeader from '@/components/AppHeader';
import { requireSession } from '@/lib/session';
import { uidFromToken } from '@/lib/socialStore';
import { SocialMatchesLayout } from '@/components/SocialLists';

export default function MatchesPage() {
  const token = useMemo(() => requireSession(), []);
  const myUid = useMemo(() => uidFromToken(token ?? null) || 'anon', [token]);

  return (
    <div className="ff-page">
      <AppHeader active="matches" />
      <main className="ff-shell" style={{ maxWidth: 920, display: 'block', width: '100%', paddingTop: 8, paddingBottom: 24 }}>
        <SocialMatchesLayout myUid={myUid} />
      </main>
    </div>
  );
}
