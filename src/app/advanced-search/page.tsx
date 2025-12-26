'use client';

import React, { useMemo, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { requireSession } from '@/lib/session';

type SexFilter = 'any' | 'male' | 'female' | 'nonbinary';

type AdvSearch = {
  sex: SexFilter;
  minAge: number;
  maxAge: number;
  maxDistanceMi: number;
  interests: string[];
};

const KEY = 'ff_adv_search_v1';

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function loadAdv(): AdvSearch {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) throw new Error('no');
    const p = JSON.parse(raw) as any;
    const sex: SexFilter =
      p?.sex === 'male' || p?.sex === 'female' || p?.sex === 'nonbinary' ? p.sex : 'any';
    const minAge = clamp(Number(p?.minAge ?? 18) || 18, 18, 99);
    const maxAge = clamp(Number(p?.maxAge ?? 60) || 60, 18, 99);
    const maxDistanceMi = clamp(Number(p?.maxDistanceMi ?? 25) || 25, 1, 500);
    const interests = Array.isArray(p?.interests) ? p.interests.filter((x: any) => typeof x === 'string') : [];
    return {
      sex,
      minAge: Math.min(minAge, maxAge),
      maxAge: Math.max(minAge, maxAge),
      maxDistanceMi,
      interests,
    };
  } catch {
    return { sex: 'any', minAge: 18, maxAge: 60, maxDistanceMi: 25, interests: [] };
  }
}

function saveAdv(v: AdvSearch) {
  localStorage.setItem(KEY, JSON.stringify(v));
}

const interestOptions = [
  'latex',
  'feet',
  'leather',
  'lace',
  'power play',
  'role play',
  'vanilla',
  'curious',
];

export default function AdvancedSearchPage() {
  // ensure logged-in (throws/redirects if not)
  useMemo(() => requireSession(), []);

  const initial = useMemo<AdvSearch>(() => (typeof window !== 'undefined' ? loadAdv() : { sex: 'any', minAge: 18, maxAge: 60, maxDistanceMi: 25, interests: [] }), []);

  const [sex, setSex] = useState<SexFilter>(initial.sex);
  const [minAge, setMinAge] = useState<number>(initial.minAge);
  const [maxAge, setMaxAge] = useState<number>(initial.maxAge);
  const [maxDistanceMi, setMaxDistanceMi] = useState<number>(initial.maxDistanceMi);
  const [interests, setInterests] = useState<string[]>(initial.interests);

  const data: AdvSearch = useMemo(() => {
    const a = clamp(minAge, 18, 99);
    const b = clamp(maxAge, 18, 99);
    return {
      sex,
      minAge: Math.min(a, b),
      maxAge: Math.max(a, b),
      maxDistanceMi: clamp(maxDistanceMi, 1, 500),
      interests,
    };
  }, [sex, minAge, maxAge, maxDistanceMi, interests]);

  const toggleInterest = (k: string) => {
    setInterests((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  };

  const onSave = () => {
    try {
      saveAdv(data);
      alert('Saved. Go back to Discover to apply.');
    } catch {
      alert('Could not save settings.');
    }
  };

  const card: React.CSSProperties = {
    width: 'min(680px, 92vw)',
    margin: '0 auto',
    background: 'rgba(0,0,0,0.35)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 16,
  };

  const row: React.CSSProperties = { display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12, alignItems: 'center', padding: '10px 0' };

  const pill: React.CSSProperties = {
    padding: '8px 10px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.16)',
    background: 'rgba(0,0,0,0.25)',
    cursor: 'pointer',
    userSelect: 'none',
    fontSize: 13,
    lineHeight: 1.1,
  };

  const btn: React.CSSProperties = {
    padding: '10px 14px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'rgba(255,255,255,0.10)',
    color: 'white',
    fontWeight: 700,
    cursor: 'pointer',
  };

  return (
    <div className="ff-page">
      <AppHeader active="advanced-search" />
      <main className="ff-shell">
        <h1 className="ff-h1">Advanced search</h1>

        <div style={card}>
          <div style={row}>
            <div style={{ opacity: 0.9, fontWeight: 700 }}>Sex</div>
            <select value={sex} onChange={(e) => setSex(e.target.value as SexFilter)} style={{ padding: 10, borderRadius: 10, background: 'rgba(0,0,0,0.25)', color: 'white', border: '1px solid rgba(255,255,255,0.18)' }}>
              <option value="any">Any</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="nonbinary">Nonbinary</option>
            </select>
          </div>

          <div style={row}>
            <div style={{ opacity: 0.9, fontWeight: 700 }}>Age range</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input type="number" value={minAge} min={18} max={99} onChange={(e) => setMinAge(Number(e.target.value))} style={{ width: 110, padding: 10, borderRadius: 10, background: 'rgba(0,0,0,0.25)', color: 'white', border: '1px solid rgba(255,255,255,0.18)' }} />
              <div style={{ opacity: 0.8, alignSelf: 'center' }}>to</div>
              <input type="number" value={maxAge} min={18} max={99} onChange={(e) => setMaxAge(Number(e.target.value))} style={{ width: 110, padding: 10, borderRadius: 10, background: 'rgba(0,0,0,0.25)', color: 'white', border: '1px solid rgba(255,255,255,0.18)' }} />
            </div>
          </div>

          <div style={row}>
            <div style={{ opacity: 0.9, fontWeight: 700 }}>Max distance (mi)</div>
            <input type="number" value={maxDistanceMi} min={1} max={500} onChange={(e) => setMaxDistanceMi(Number(e.target.value))} style={{ width: 160, padding: 10, borderRadius: 10, background: 'rgba(0,0,0,0.25)', color: 'white', border: '1px solid rgba(255,255,255,0.18)' }} />
          </div>

          <div style={{ paddingTop: 10 }}>
            <div style={{ opacity: 0.9, fontWeight: 800, marginBottom: 10 }}>Interests</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {interestOptions.map((k) => {
                const on = interests.includes(k);
                return (
                  <div
                    key={k}
                    onClick={() => toggleInterest(k)}
                    style={{
                      ...pill,
                      borderColor: on ? 'rgba(255,100,180,0.55)' : 'rgba(255,255,255,0.16)',
                      background: on ? 'rgba(255,100,180,0.18)' : 'rgba(0,0,0,0.25)',
                    }}
                  >
                    {k}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
            <button type="button" style={btn} onClick={onSave}>
              Save
            </button>
          </div>

          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 10 }}>
            Note: Discover currently uses the local deck, so these filters are saved for the upcoming backend-powered discover feed.
          </div>
        </div>
      </main>
    </div>
  );
}
