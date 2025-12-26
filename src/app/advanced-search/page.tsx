'use client';

import { useMemo, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { requireSession } from '@/lib/session';
import { uidFromToken } from '@/lib/socialStore';

type AdvSearch = {
  sex: 'any' | 'male' | 'female' | 'nonbinary';
  minAge: number;
  maxAge: number;
  maxDistanceMi: number;
  interests: string[];
};

const KEY = 'ff_adv_search_v1';

function load(): AdvSearch {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { sex: 'any', minAge: 18, maxAge: 60, maxDistanceMi: 25, interests: [] };
    const v = JSON.parse(raw);
    return {
      sex: v?.sex || 'any',
      minAge: typeof v?.minAge === 'number' ? v.minAge : 18,
      maxAge: typeof v?.maxAge === 'number' ? v.maxAge : 60,
      maxDistanceMi: typeof v?.maxDistanceMi === 'number' ? v.maxDistanceMi : 25,
      interests: Array.isArray(v?.interests) ? v.interests.filter((x: any) => typeof x === 'string') : [],
    };
  } catch {
    return { sex: 'any', minAge: 18, maxAge: 60, maxDistanceMi: 25, interests: [] };
  }
}

function save(v: AdvSearch) {
  localStorage.setItem(KEY, JSON.stringify(v));
}

export default function AdvancedSearchPage() {
  const token = useMemo(() => requireSession(), []);
  const uid = useMemo(() => uidFromToken(token) || 'anon', [token]);

  const initial = useMemo(() => (typeof window !== 'undefined' ? load() : { sex: 'any', minAge: 18, maxAge: 60, maxDistanceMi: 25, interests: [] }), []);
  const [sex, setSex] = useState<AdvSearch['sex']>(initial.sex);
  const [minAge, setMinAge] = useState<number>(initial.minAge);
  const [maxAge, setMaxAge] = useState<number>(initial.maxAge);
  const [maxDistanceMi, setMaxDistanceMi] = useState<number>(initial.maxDistanceMi);
  const [interestText, setInterestText] = useState<string>(initial.interests.join(', '));
  const [status, setStatus] = useState<string>('');

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.92)',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = { fontSize: 12, opacity: 0.75, marginBottom: 6 };

  function apply() {
    const interests = interestText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const v: AdvSearch = {
      sex,
      minAge: Math.max(18, Math.min(99, Number(minAge) || 18)),
      maxAge: Math.max(18, Math.min(99, Number(maxAge) || 60)),
      maxDistanceMi: Math.max(1, Math.min(500, Number(maxDistanceMi) || 25)),
      interests,
    };

    if (v.maxAge < v.minAge) {
      const t = v.minAge;
      v.minAge = v.maxAge;
      v.maxAge = t;
    }

    save(v);
    setStatus('Saved. (Discover filtering hook comes next)');
    window.setTimeout(() => setStatus(''), 1400);
  }

  return (
    <div className="ff-page">
      <AppHeader active="advanced-search" />
      <main className="ff-shell" style={{ maxWidth: 820 }}>
        <h1 className="ff-h1">Advanced search</h1>

        <div style={{ display: 'grid', gap: 12, maxWidth: 640 }}>
          <div>
            <div style={labelStyle}>Sex</div>
            <select style={fieldStyle} value={sex} onChange={(e) => setSex(e.target.value as any)}>
              <option value="any">Any</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="nonbinary">Non-binary</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={labelStyle}>Min age</div>
              <input style={fieldStyle} type="number" value={minAge} onChange={(e) => setMinAge(Number(e.target.value))} />
            </div>
            <div>
              <div style={labelStyle}>Max age</div>
              <input style={fieldStyle} type="number" value={maxAge} onChange={(e) => setMaxAge(Number(e.target.value))} />
            </div>
          </div>

          <div>
            <div style={labelStyle}>Distance from user (miles)</div>
            <input style={fieldStyle} type="number" value={maxDistanceMi} onChange={(e) => setMaxDistanceMi(Number(e.target.value))} />
          </div>

          <div>
            <div style={labelStyle}>Interest tiles (comma-separated)</div>
            <input style={fieldStyle} value={interestText} onChange={(e) => setInterestText(e.target.value)} placeholder="latex, feet, role play…" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={apply}
              style={{
                borderRadius: 999,
                padding: '10px 14px',
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.10)',
                color: 'rgba(255,255,255,0.92)',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              Save filters
            </button>
            {status ? <div style={{ fontSize: 12, opacity: 0.8 }}>{status}</div> : null}
          </div>

          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Logged in as: <span style={{ fontFamily: 'monospace' }}>{uid}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
