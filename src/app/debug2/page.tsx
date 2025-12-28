'use client';

import React, { useEffect, useMemo, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { requireSession } from '@/lib/session';
import {
  uidFromToken,
  loadUserProfileSnapshot,
  getProfileExtras,
  getMatchesFor,
  getChat,
  type Match,
} from '@/lib/socialStore';

const STORAGE_KEY = 'ff_social_v1';
const PIN_KEY = 'ff_uid_pinned_v1';

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function clamp(n: any): number {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function pretty(obj: any) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

type StoreState = {
  version?: number;
  profilesByUid?: Record<string, any>;
  extrasByUid?: Record<string, any>;
  matchesByUser?: Record<string, any>;
  chatsByMatch?: Record<string, any>;
};

export default function DebugPageV2() {
  const [token, setToken] = useState<string>('');
  const [uid, setUid] = useState<string>('');
  const [pinnedUid, setPinnedUid] = useState<string>('');
  const [store, setStore] = useState<StoreState | null>(null);
  const [status, setStatus] = useState<string>('');

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

  const matches = useMemo(() => {
    try {
      if (!uid) return [] as Match[];
      return (getMatchesFor(uid) as any) || [];
    } catch {
      return [] as Match[];
    }
  }, [uid]);

  const matchIds = useMemo(() => {
    const ids: string[] = [];
    for (const m of matches || []) {
      const id = String((m as any).id || (m as any).matchId || '');
      if (id) ids.push(id);
    }
    return ids;
  }, [matches]);

  const chatsSummary = useMemo(() => {
    const out: { matchId: string; messages: number }[] = [];
    for (const mid of matchIds.slice(0, 10)) {
      try {
        const chat = getChat(mid) as any[];
        out.push({ matchId: mid, messages: Array.isArray(chat) ? chat.length : 0 });
      } catch {
        out.push({ matchId: mid, messages: 0 });
      }
    }
    return out;
  }, [matchIds]);

  function refresh() {
    try {
      const t = (requireSession() as any) ?? '';
      const tStr = String(t || '');
      setToken(tStr);

      const u = uidFromToken(tStr) || '';
      setUid(u);

      const pin = (typeof window !== 'undefined' ? window.localStorage.getItem(PIN_KEY) : '') || '';
      setPinnedUid(String(pin || ''));

      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
      const st = safeParse<StoreState | null>(raw, null);
      setStore(st);
      setStatus('');
    } catch (e: any) {
      setStatus(e?.message ? String(e.message) : 'Failed to refresh.');
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const box: React.CSSProperties = {
    maxWidth: 1020,
    margin: '0 auto',
    padding: 16,
    color: 'white',
  };

  const card: React.CSSProperties = {
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 14,
    background: 'rgba(0,0,0,0.28)',
    marginTop: 12,
  };

  const btn: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.16)',
    background: 'rgba(255,255,255,0.08)',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 800,
  };

  const mono: React.CSSProperties = {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: 12,
    opacity: 0.95,
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
  };

  const small = { opacity: 0.82, fontSize: 12 } as React.CSSProperties;

  const storeProfile = uid ? (store?.profilesByUid || {})[uid] : null;
  const storeExtras = uid ? (store?.extrasByUid || {})[uid] : null;

  const matchesKeyed = uid ? Boolean((store?.matchesByUser || {})[uid]) : false;
  const chatsCount = Object.keys(store?.chatsByMatch || {}).length;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0b0614, #05030a)' }}>
      <AppHeader active="profile" />
      <div style={box}>
        <div style={{ fontSize: 22, fontWeight: 900 }}>Debug v2: What’s actually stored + what UI reads</div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
          <button type="button" style={btn} onClick={refresh}>
            Refresh
          </button>
        </div>

        {status ? <div style={{ marginTop: 12, opacity: 0.9 }}>{status}</div> : null}

        <div style={card}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Session</div>
          <div style={small}>uidFromToken(requireSession())</div>
          <div style={mono}>{uid || '—'}</div>
          <div style={{ marginTop: 8, ...small }}>Pinned uid (ff_uid_pinned_v1)</div>
          <div style={mono}>{pinnedUid || '—'}</div>
          <div style={{ marginTop: 8, ...small }}>Token (first 80 chars)</div>
          <div style={mono}>{token ? token.slice(0, 80) + (token.length > 80 ? '…' : '') : '—'}</div>
        </div>

        <div style={card}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Storage snapshot (raw localStorage)</div>
          <div style={small}>profilesByUid[uid] (raw)</div>
          <div style={mono}>{pretty(storeProfile) || '—'}</div>
          <div style={{ marginTop: 10, ...small }}>extrasByUid[uid] (raw)</div>
          <div style={mono}>{pretty(storeExtras) || '—'}</div>
          <div style={{ marginTop: 10, ...small }}>matchesByUser has key for uid?</div>
          <div style={mono}>{String(matchesKeyed)}</div>
          <div style={{ marginTop: 10, ...small }}>chatsByMatch count</div>
          <div style={mono}>{String(chatsCount)}</div>
        </div>

        <div style={card}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>What library functions return</div>
          <div style={small}>loadUserProfileSnapshot(uid)</div>
          <div style={mono}>{pretty(profile)}</div>
          <div style={{ marginTop: 10, ...small }}>getProfileExtras(uid)</div>
          <div style={mono}>{pretty(extras)}</div>
        </div>

        <div style={card}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Matches + chats</div>
          <div style={small}>getMatchesFor(uid) count</div>
          <div style={mono}>{String(matches.length)}</div>
          <div style={{ marginTop: 8, ...small }}>First match IDs</div>
          <div style={mono}>{matchIds.length ? matchIds.slice(0, 10).join(', ') : '—'}</div>
          <div style={{ marginTop: 8, ...small }}>Chat message counts (first 10 matches)</div>
          <div style={mono}>{pretty(chatsSummary)}</div>
        </div>

        <div style={card}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Interpretation</div>
          <div style={{ opacity: 0.9, lineHeight: 1.5 }}>
            If <b>raw localStorage</b> contains profile/extras but the <b>library functions</b> return null/empty, the bug is inside
            <code style={{ opacity: 0.9 }}> socialStore </code> parsing/mapping logic. If both are empty, the data isn’t stored on this domain/browser anymore.
          </div>
        </div>
      </div>
    </div>
  );
}
