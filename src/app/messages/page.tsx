'use client';

import React, { useMemo } from 'react';
import AppHeader from '@/components/AppHeader';
import { requireSession } from '@/lib/session';
import { uidFromToken } from '@/lib/socialStore';
import { SocialMatchesLayout } from '@/components/SocialLists';

export default function MessagesPage() {
  const token = useMemo(() => requireSession(), []);
  const myUid = useMemo(() => uidFromToken(token ?? null) || 'anon', [token]);

  return (
    <div className="ff-page">
      <AppHeader active="messages" />
      <main className="ff-shell" style={{ maxWidth: 920 }}>
        {/* Using the same layout keeps UX consistent. */}
        <SocialMatchesLayout myUid={myUid} />
      </main>
    </div>
  );
}
