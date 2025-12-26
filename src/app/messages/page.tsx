'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { requireSession } from '@/lib/session';
import { uidFromToken, getMatchesFor, getChat } from '@/lib/socialStore';

type Row = {
  matchId: string;
  otherId: string;
  lastText: string;
  lastTs: number;
};

function shortId(uid: string): string {
  if (!uid) return 'User';
  if (uid.includes('@')) return uid.split('@')[0] || uid;
  return uid.slice(0, 8);
}

export default function MessagesPage() {
  const token = useMemo(() => {
    try {
      return requireSession();
    } catch {
      return null as any;
    }
  }, []);

  const uid = useMemo(() => uidFromToken(token), [token]);

  const [rows] = useState<Row[]>(() => {
    let matches: any[] = [];
    try {
      matches = getMatchesFor(uid) as any[];
    } catch {}

    const out: Row[] = [];
    for (const m of matches) {
      const matchId = String((m as any).id ?? m);
      const a = String((m as any).a ?? (m as any).userA ?? '');
      const b = String((m as any).b ?? (m as any).userB ?? '');
      const otherId = a === uid ? b : a;

      let msgs: any[] = [];
      try {
        msgs = getChat(matchId) as any[];
      } catch {}

      if (!msgs || msgs.length === 0) continue;

      const last = msgs[msgs.length - 1] as any;
      out.push({
        matchId,
        otherId,
        lastText: String(last?.text ?? ''),
        lastTs: Number(last?.createdAt ?? 0),
      });
    }

    out.sort((x, y) => (y.lastTs || 0) - (x.lastTs || 0));
    return out;
  });

  return (
    <div className="ff-page">
      <AppHeader active="messages" />
      <div className="ff-shell">
        <h1 className="ff-h1">Messages</h1>

        {rows.length === 0 ? (
          <p className="ff-muted">No messages yet. Match someone first, then send a message.</p>
        ) : (
          <div className="ff-list">
            {rows.map((r) => (
              <div key={r.matchId} className="ff-row">
                <div className="ff-row-left">
                  <div className="ff-avatar">{shortId(r.otherId).slice(0, 1).toUpperCase()}</div>
                  <div className="ff-row-text">
                    <div className="ff-row-title">{shortId(r.otherId)}</div>
                    <div className="ff-row-sub">{r.lastText || '—'}</div>
                  </div>
                </div>
                <Link className="ff-btn" href={`/chat/${encodeURIComponent(r.matchId)}`}>
                  Open
                </Link>
              </div>
            ))}
          </div>
        )}
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
        .ff-muted {
          opacity: 0.8;
        }
        .ff-list {
          display: grid;
          gap: 12px;
        }
        .ff-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(0,0,0,0.12);
        }
        .ff-row-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .ff-avatar {
          width: 38px;
          height: 38px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.18);
          display: grid;
          place-items: center;
          background: rgba(255,255,255,0.06);
          flex: 0 0 auto;
        }
        .ff-row-text {
          min-width: 0;
        }
        .ff-row-title {
          font-weight: 700;
        }
        .ff-row-sub {
          opacity: 0.85;
          font-size: 13px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 520px;
        }
        .ff-btn {
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(0,0,0,0.15);
          color: rgba(255,255,255,0.9);
          text-decoration: none;
        }
      `}</style>
    </div>
  );
}
