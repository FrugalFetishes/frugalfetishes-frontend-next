'use client';

import { useMemo, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { requireSession } from '@/lib/session';
import {
  uidFromToken,
  loadUserProfileSnapshot,
  upsertUserProfileSnapshot,
  getProfileExtras,
  setProfileExtras,
} from '@/lib/socialStore';

export default function ProfilePage() {
  const token = useMemo(() => requireSession(), []);
  const uid = useMemo(() => uidFromToken(token), [token]);

  const snap = useMemo(() => loadUserProfileSnapshot(uid), [uid]);
  const extras = useMemo(() => getProfileExtras(uid), [uid]);

  const [displayName, setDisplayName] = useState<string>(
    String((snap?.displayName || extras?.displayName || '').toString())
  );
  const [fullName, setFullName] = useState<string>(String((snap?.fullName || extras?.fullName || '').toString()));
  const [photoUrl, setPhotoUrl] = useState<string>(String((snap?.photoUrl || '').toString()));
  const [headline, setHeadline] = useState<string>(String((extras?.headline || '').toString()));
  const [about, setAbout] = useState<string>(String((extras?.about || '').toString()));

  function onSave() {
    // Save snapshot (used by Matches/Messages display)
    upsertUserProfileSnapshot(uid, {
      id: uid,
      displayName: displayName.trim(),
      fullName: fullName.trim(),
      photoUrl: photoUrl.trim(),
      email: extras?.email,
    });

    // Save extras (account + subscription)
    setProfileExtras(uid, {
      displayName: displayName.trim(),
      fullName: fullName.trim(),
      headline: headline.trim(),
      about: about.trim(),
    });

    alert('Saved');
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.16)',
    background: 'rgba(0,0,0,0.25)',
    color: 'white',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = { fontSize: 12, opacity: 0.75, marginBottom: 6 };

  return (
    <div className="ff-page">
      <AppHeader active="profile" />
      <main className="ff-shell" style={{ maxWidth: 920 }}>
        <h1 className="ff-h1">Profile</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <div style={labelStyle}>Display Name</div>
            <input style={inputStyle} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>

          <div>
            <div style={labelStyle}>Full Name</div>
            <input style={inputStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <div style={labelStyle}>Photo URL</div>
            <input style={inputStyle} value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} />
            <div style={{ marginTop: 10, display: 'flex', gap: 12, alignItems: 'center' }}>
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="Profile"
                  style={{ width: 72, height: 72, borderRadius: 16, objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: 72, height: 72, borderRadius: 16, background: 'rgba(255,255,255,0.08)' }} />
              )}
              <div style={{ opacity: 0.8, fontSize: 12 }}>UID: {uid}</div>
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <div style={labelStyle}>Headline</div>
            <input style={inputStyle} value={headline} onChange={(e) => setHeadline(e.target.value)} />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <div style={labelStyle}>About</div>
            <textarea
              style={{ ...inputStyle, minHeight: 110, resize: 'vertical' }}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button
            type="button"
            className="ff-btn"
            onClick={onSave}
            style={{ padding: '10px 14px', borderRadius: 12, fontWeight: 800 }}
          >
            Save
          </button>
        </div>
      </main>
    </div>
  );
}
