'use client';

import { useEffect, useMemo, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { requireSession } from '@/lib/session';
import { uidFromToken } from '@/lib/socialStore';

type Filters = {
  sex: string;
  maxDistanceMiles: number;
  minAge: number;
  maxAge: number;
  interests: string[];
};

const KEY = 'ff:advancedSearch';

export default function AdvancedSearchPage() {
  const token = useMemo(() => {
    try {
      return requireSession();
    } catch {
      return null as any;
    }
  }, []);

  const uid = useMemo(() => uidFromToken(token), [token]);

  const [filters, setFilters] = useState<Filters>({
    sex: 'any',
    maxDistanceMiles: 25,
    minAge: 18,
    maxAge: 60,
    interests: [],
  });

  const [interestInput, setInterestInput] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setFilters(JSON.parse(raw));
    } catch {}
  }, [uid]);

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(filters));
    } catch {}
    alert('Saved (UI placeholder). Next step: wire these filters into Discover feed.');
  }

  function addInterest() {
    const v = interestInput.trim();
    if (!v) return;
    setFilters((f) => ({ ...f, interests: Array.from(new Set([...f.interests, v.toLowerCase()])) }));
    setInterestInput('');
  }

  function removeInterest(v: string) {
    setFilters((f) => ({ ...f, interests: f.interests.filter((x) => x !== v) }));
  }

  return (
    <div className="ff-page">
      <AppHeader active="advanced-search" />
      <div className="ff-shell">
        <h1 className="ff-h1">Advanced Search</h1>
        <p className="ff-muted">
          This page saves your preferences now. Next step is wiring these filters into the Discover feed.
        </p>

        <div className="ff-card">
          <label className="ff-label">
            Sex
            <select
              className="ff-input"
              value={filters.sex}
              onChange={(e) => setFilters((f) => ({ ...f, sex: e.target.value }))}
            >
              <option value="any">Any</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="nonbinary">Non-binary</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label className="ff-label">
            Distance (miles)
            <input
              className="ff-input"
              type="number"
              min={1}
              max={500}
              value={filters.maxDistanceMiles}
              onChange={(e) => setFilters((f) => ({ ...f, maxDistanceMiles: Number(e.target.value || 0) }))}
            />
          </label>

          <div className="ff-grid">
            <label className="ff-label">
              Min age
              <input
                className="ff-input"
                type="number"
                min={18}
                max={99}
                value={filters.minAge}
                onChange={(e) => setFilters((f) => ({ ...f, minAge: Number(e.target.value || 18) }))}
              />
            </label>
            <label className="ff-label">
              Max age
              <input
                className="ff-input"
                type="number"
                min={18}
                max={99}
                value={filters.maxAge}
                onChange={(e) => setFilters((f) => ({ ...f, maxAge: Number(e.target.value || 60) }))}
              />
            </label>
          </div>

          <div className="ff-label">
            Interest tiles
            <div className="ff-row">
              <input
                className="ff-input"
                placeholder="e.g. latex"
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
              />
              <button className="ff-btn" onClick={addInterest}>
                Add
              </button>
            </div>
            <div className="ff-tags">
              {filters.interests.map((t) => (
                <button key={t} className="ff-tag" onClick={() => removeInterest(t)} title="Remove">
                  {t} ×
                </button>
              ))}
            </div>
          </div>

          <button className="ff-primary" onClick={save}>
            Save
          </button>
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
          margin: 10px 0 8px;
        }
        .ff-muted {
          opacity: 0.8;
          margin-bottom: 12px;
        }
        .ff-card {
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(0,0,0,0.12);
          border-radius: 16px;
          padding: 14px;
          display: grid;
          gap: 12px;
        }
        .ff-label {
          display: grid;
          gap: 6px;
          font-size: 13px;
          opacity: 0.95;
        }
        .ff-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .ff-input {
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(0,0,0,0.15);
          color: rgba(255,255,255,0.9);
          padding: 10px 12px;
        }
        .ff-row {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .ff-btn {
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(0,0,0,0.15);
          color: rgba(255,255,255,0.9);
        }
        .ff-primary {
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.95);
          font-weight: 700;
        }
        .ff-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }
        .ff-tag {
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(0,0,0,0.15);
          color: rgba(255,255,255,0.9);
          padding: 6px 10px;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}
