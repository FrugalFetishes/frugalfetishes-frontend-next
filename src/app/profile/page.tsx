'use client';

import { useMemo, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { requireSession } from '@/lib/session';
import { uidFromToken, loadUserProfileSnapshot, upsertUserProfileSnapshot, getProfileExtras, setProfileExtras } from '@/lib/socialStore';

export default function ProfilePage() {
  const token = useMemo(() => requireSession(), []);
  const uid = useMemo(() => uidFromToken(token) || 'anon', [token]);

  const snap = useMemo(() => loadUserProfileSnapshot(uid), [uid]);
  const extras = useMemo(() => getProfileExtras(uid), [uid]);

  const [displayName, setDisplayName] = useState<string>((snap?.displayName || snap?.name || extras?.displayName || '').toString());
  const [fullName, setFullName] = useState<string>((extras?.fullName || snap?.name || '').toString());
  const [photoUrl, setPhotoUrl] = useState<string>((snap?.photoUrl || snap?.photoURL || snap?.avatarUrl || snap?.primaryPhotoUrl || '').toString());
  const [headline, setHeadline] = useState<string>((extras?.headline || '').toString());
  const [about, setAbout] = useState<string>((extras?.about || snap?.about || '').toString());
  const [zip, setZip] = useState<string>((extras?.zip || '').toString());
  const [status, setStatus] = useState<string>('');

  function saveAll() {
    try {
      upsertUserProfileSnapshot(uid, {
        id: uid,
        displayName: displayName.trim() || undefined,
        name: fullName.trim() || undefined,
        photoUrl: photoUrl.trim() || undefined,
      });
      setProfileExtras(uid, {
        displayName: displayName.trim() || undefined,
        fullName: fullName.trim() || undefined,
        headline: headline.trim() || undefined,
        about: about.trim() || undefined,
        zip: zip.trim() || undefined,
      });
      setStatus('Saved.');
      window.setTimeout(() => setStatus(''), 1200);
    } catch {
      setStatus('Save failed.');
      window.setTimeout(() => setStatus(''), 1600);
    }
  }

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

  return (
    <div className="ff-page">
      <AppHeader active="profile" />

      <main className="ff-shell" style={{ maxWidth: 820 }}>
        <h1 className="ff-h1">Profile</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, maxWidth: 640 }}>
          <div>
            <div style={labelStyle}>Display name</div>
            <input style={fieldStyle} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Public name (shown on matches/messages)" />
          </div>

          <div>
            <div style={labelStyle}>Full name</div>
            <input style={fieldStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
          </div>

          <div>
            <div style={labelStyle}>Profile photo URL</div>
            <input style={fieldStyle} value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://…" />
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
              (Optional) If blank, the app will show a placeholder avatar.
            </div>
          </div>

          <div>
            <div style={labelStyle}>Headline</div>
            <input style={fieldStyle} value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Short headline shown on profile" />
          </div>

          <div>
            <div style={labelStyle}>About</div>
            <textarea
              style={{ ...fieldStyle, minHeight: 110, resize: 'vertical' }}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Write something about yourself…"
            />
          </div>

          <div>
            <div style={labelStyle}>ZIP</div>
            <input style={fieldStyle} value={zip} onChange={(e) => setZip(e.target.value)} placeholder="ZIP code (for distance later)" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={saveAll}
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
              Save
            </button>
            {status ? <div style={{ fontSize: 12, opacity: 0.8 }}>{status}</div> : null}
          </div>

          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
            Your UID: <span style={{ fontFamily: 'monospace' }}>{uid}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
