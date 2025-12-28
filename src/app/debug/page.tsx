'use client';

import React, { useEffect, useMemo, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { requireSession } from '@/lib/session';
import { uidFromToken } from '@/lib/socialStore';

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

type StoreState = {
  version?: number;
  profilesByUid?: Record<string, any>;
  extrasByUid?: Record<string, any>;
  matchesByUser?: Record<string, any>;
  clickedMatchesByUser?: Record<string, any>;
  unreadByUser?: Record<string, any>;
  chatsByMatch?: Record<string, any>;
};

export default function DebugPage() {
  const [token, setToken] = useState<string>('');
  const [derivedUid, setDerivedUid] = useState<string>('');
  const [pinnedUid, setPinnedUid] = useState<string>('');
  const [store, setStore] = useState<StoreState | null>(null);
  const [status, setStatus] = useState<string>('');

  const profileUids = useMemo(() => Object.keys(store?.profilesByUid || {}), [store]);
  const extrasUids = useMemo(() => Object.keys(store?.extrasByUid || {}), [store]);

  const mostRecentUid = useMemo(() => {
    let best = '';
    let bestAt = 0;
    const p = store?.profilesByUid || {};
    for (const [uid, obj] of Object.entries(p)) {
      const at = clamp((obj as any)?.updatedAt);
      if (at > bestAt) {
        bestAt = at;
        best = uid;
      }
    }
    return best;
  }, [store]);

  function refresh() {
    try {
      const t = (requireSession() as any) ?? '';
      const tStr = String(t || '');
      setToken(tStr);

      const u = uidFromToken(tStr) || '';
      setDerivedUid(u);

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

  function pinTo(uid: string) {
    try {
      if (!uid) return;
      window.localStorage.setItem(PIN_KEY, uid);
      setPinnedUid(uid);
      setStatus(`Pinned uid to: ${uid}`);
    } catch {
      setStatus('Failed to pin.');
    }
  }

  function clearPin() {
    try {
      window.localStorage.removeItem(PIN_KEY);
      setPinnedUid('');
      setStatus('Pinned uid cleared.');
    } catch {
      setStatus('Failed to clear pin.');
    }
  }

  const box: React.CSSProperties = {
    maxWidth: 980,
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
    wordBreak: 'break-all',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0b0614, #05030a)' }}>
      <AppHeader active="profile" />
      <div style={box}>
        <div style={{ fontSize: 22, fontWeight: 900 }}>Debug: Local profile & matches store</div>
        <div style={{ opacity: 0.8, marginTop: 6 }}>
          This page shows what the app thinks your <b>uid</b> is, and what is actually stored in localStorage.
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
          <button type="button" style={btn} onClick={refresh}>
            Refresh
          </button>
          <button type="button" style={btn} onClick={clearPin}>
            Clear pinned uid
          </button>
          {mostRecentUid ? (
            <button type="button" style={btn} onClick={() => pinTo(mostRecentUid)}>
              Pin to most-recent uid
            </button>
          ) : null}
        </div>

        {status ? <div style={{ marginTop: 12, opacity: 0.9 }}>{status}</div> : null}

        <div style={card}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Session</div>
          <div style={{ marginBottom: 6 }}>
            <div style={{ opacity: 0.8, fontSize: 12 }}>Derived uid (uidFromToken(requireSession()))</div>
            <div style={mono}>{derivedUid || '—'}</div>
          </div>
          <div style={{ marginBottom: 6 }}>
            <div style={{ opacity: 0.8, fontSize: 12 }}>Pinned uid (ff_uid_pinned_v1)</div>
            <div style={mono}>{pinnedUid || '—'}</div>
          </div>
          <div>
            <div style={{ opacity: 0.8, fontSize: 12 }}>Token (first 80 chars)</div>
            <div style={mono}>{token ? token.slice(0, 80) + (token.length > 80 ? '…' : '') : '—'}</div>
          </div>
        </div>

        <div style={card}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>LocalStorage</div>
          <div style={{ opacity: 0.85, fontSize: 13 }}>
            STORAGE_KEY: <span style={mono}>{STORAGE_KEY}</span>
          </div>
          <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
            <div>
              <div style={{ opacity: 0.8, fontSize: 12 }}>profilesByUid keys ({profileUids.length})</div>
              <div style={mono}>{profileUids.length ? profileUids.join(', ') : '—'}</div>
            </div>
            <div>
              <div style={{ opacity: 0.8, fontSize: 12 }}>extrasByUid keys ({extrasUids.length})</div>
              <div style={mono}>{extrasUids.length ? extrasUids.join(', ') : '—'}</div>
            </div>
            <div>
              <div style={{ opacity: 0.8, fontSize: 12 }}>Most recent profile uid (by updatedAt)</div>
              <div style={mono}>{mostRecentUid || '—'}</div>
            </div>
          </div>
        </div>

        <div style={card}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>What to do with these results</div>
          <div style={{ opacity: 0.9, lineHeight: 1.5 }}>
            If <b>Derived uid</b> is different from the uid keys listed above, your app is reading from the wrong bucket.
            Click <b>“Pin to most-recent uid”</b> and refresh <b>/profile</b> and <b>/matches</b>.
          </div>
        </div>
      </div>
    </div>
  );
}
