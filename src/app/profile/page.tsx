'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { requireSession } from '@/lib/session';
import {
  uidFromToken,
  loadUserProfileSnapshot,
  upsertUserProfileSnapshot,
  getProfileExtras,
  setProfileExtras,
} from '@/lib/socialStore';

function clampStr(v: any): string {
  if (typeof v === 'string') return v;
  if (v == null) return '';
  try { return String(v); } catch { return ''; }
}

function isDataUri(s: string) {
  return typeof s === 'string' && s.startsWith('data:image/');
}

function ensureHttps(url: string) {
  const u = clampStr(url).trim();
  if (!u) return '';
  if (isDataUri(u)) return u;
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  // allow protocol-relative or bare domains
  if (u.startsWith('//')) return 'https:' + u;
  return 'https://' + u;
}

function normalizePhotoUrl(url: string) {
  return ensureHttps(url).trim();
}

export default function ProfilePage() {
  const token = useMemo(() => requireSession(), []);
  const uid = useMemo(() => (uidFromToken(token) ?? 'anon'), [token]);

  const snap = useMemo(() => loadUserProfileSnapshot(uid), [uid]);
  const extras = useMemo(() => getProfileExtras(uid), [uid]);
  const extrasAny: any = extras as any;

  const initialGallery: string[] = useMemo(() => {
        const anyExtras: any = extras as any;
    const g = (anyExtras && (anyExtras.gallery || anyExtras.galleryUrls)) as any;
    const fromExtras = Array.isArray(g) ? g.filter(Boolean).map((x) => clampStr(x)).filter(Boolean) : [];

    // Also honor legacy/alternate single-photo fields so the current profile picture
    // shows up even if the gallery array isn't populated.
    const legacySingles = [
      (extras as any)?.primaryPhotoUrl,
      (extras as any)?.photoUrl,
      (extras as any)?.avatarUrl,
      (snap as any)?.primaryPhotoUrl,
      (snap as any)?.photoUrl,
      (snap as any)?.photoURL,
      (snap as any)?.avatarUrl,
    ]
      .map((x) => clampStr(x))
      .filter(Boolean);

    const out: string[] = [];
    const seen = new Set<string>();
    for (const u of [...legacySingles, ...fromExtras]) {
      if (!u) continue;
      if (seen.has(u)) continue;
      seen.add(u);
      out.push(u);
    }
    return out;
  }, [extras, snap]);

  const initialPrimary = useMemo(() => {
    const anyExtras: any = extras as any;
    const fromExtras = clampStr(anyExtras?.primaryPhotoUrl || anyExtras?.avatarUrl || anyExtras?.photoUrl || anyExtras?.photoURL || '');
    const fromSnap = clampStr((snap as any)?.photoUrl || (snap as any)?.photoURL || '');
    return fromExtras || fromSnap || initialGallery[0] || '';
  }, [extras, snap, initialGallery]);

  const initialAge = useMemo(() => {
    const n = Number((extras as any)?.age ?? (snap as any)?.age ?? 0);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [extras, snap]);

  const initialSex = useMemo(() => {
    const v = String((extras as any)?.sex ?? (snap as any)?.sex ?? 'any');
    return (v || 'any').toLowerCase();
  }, [extras, snap]);

  const initialZipCode = useMemo(() => {
    const ex: any = extras as any;
    const sn: any = snap as any;
    return String(ex?.zipCode ?? ex?.zip ?? sn?.zipCode ?? sn?.zip ?? '').toString();
  }, [extras, snap]);

  const initialLocation = useMemo(() => {
    const loc = (extras as any)?.location ?? (snap as any)?.location;
    if (loc && typeof loc === 'object' && typeof (loc as any).lat === 'number' && typeof (loc as any).lng === 'number') return loc as { lat: number; lng: number };
    return null as null | { lat: number; lng: number };
  }, [extras, snap]);

  const [age, setAge] = useState<number>(initialAge);
  const [sex, setSex] = useState<string>(initialSex);
  const [zipCode, setZipCode] = useState<string>(initialZipCode);

  const [displayName, setDisplayName] = useState<string>(clampStr(snap?.displayName || extrasAny?.displayName || ''));
  const [fullName, setFullName] = useState<string>(clampStr(extrasAny?.fullName || ''));
  const [headline, setHeadline] = useState<string>(clampStr(extrasAny?.headline || ''));
  const [about, setAbout] = useState<string>(clampStr(extrasAny?.bio || ''));
  const [primaryPhotoUrl, setPrimaryPhotoUrl] = useState<string>(clampStr(initialPrimary));
  const [gallery, setGallery] = useState<string[]>(initialGallery);
  const effectivePrimary = useMemo(() => normalizePhotoUrl(primaryPhotoUrl || ''), [primaryPhotoUrl]);

  const [newUrl, setNewUrl] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Keep primary in sync and always visible.
    if (primaryPhotoUrl) {
      if (!gallery.includes(primaryPhotoUrl)) {
        setGallery((prev) => [primaryPhotoUrl, ...prev.filter((u) => u !== primaryPhotoUrl)]);
        return;
      }
    } else {
      if (gallery.length) setPrimaryPhotoUrl(gallery[0]);
    }
  }, [gallery, primaryPhotoUrl]);

  function toast(msg: string) {
    setStatus(msg);
    window.setTimeout(() => setStatus(''), 2200);
  }

  function addUrlToGallery(raw: string) {
    const url = ensureHttps(raw);
    if (!url) return;
    setGallery((prev) => {
      const next = Array.from(new Set([url, ...prev])).slice(0, 9);
      return next;
    });
    if (!primaryPhotoUrl) setPrimaryPhotoUrl(url);
  }

  function onPickFiles(files: FileList | null) {
    if (!files || !files.length) return;
    const max = Math.min(files.length, 6);
    let idx = 0;

    const readNext = () => {
      if (idx >= max) return;
      const f = files[idx++];
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : '';
        if (dataUrl && isDataUri(dataUrl)) {
          setGallery((prev) => {
            const next = [dataUrl, ...prev];
            // keep unique but allow multiple different data URIs
            const uniq: string[] = [];
            for (const u of next) {
              if (!u) continue;
              if (uniq.includes(u)) continue;
              uniq.push(u);
              if (uniq.length >= 9) break;
            }
            return uniq;
          });
          if (!primaryPhotoUrl) setPrimaryPhotoUrl(dataUrl);
        }
        readNext();
      };
      reader.onerror = () => readNext();
      reader.readAsDataURL(f);
    };

    readNext();
  }

  function removeFromGallery(url: string) {
    setGallery((prev) => prev.filter((x) => x !== url));
    if (primaryPhotoUrl === url) {
      const next = gallery.filter((x) => x !== url)[0] || '';
      setPrimaryPhotoUrl(next);
    }
  }

  function save() {
    try {
      const cleanZip = zipCode.trim();

      // Snapshot (core fields)
      upsertUserProfileSnapshot(uid, {
        id: uid,
        displayName: displayName.trim(),
        fullName: fullName.trim(),
        email: '',
        photoUrl: primaryPhotoUrl || '',
        updatedAt: Date.now(),
        sex: sex || 'any',
        age: Number(age) || 0,
        zipCode: cleanZip,
        location: initialLocation || null,
      } as any);

      // Extras (editable profile fields + gallery)
      setProfileExtras(uid, ({
        displayName: (displayName.trim() || uid),
        fullName: fullName.trim(),
        headline: headline.trim(),
        bio: about.trim(),
        sex: sex || 'any',
        age: Number(age) || 0,
        zipCode: cleanZip,
        location: initialLocation || null,

        // photo keys (keep compatibility across older UI)
        primaryPhotoUrl: primaryPhotoUrl || '',
        avatarUrl: primaryPhotoUrl || '',
        galleryUrls: gallery,
        gallery: gallery,
      } as any));

      toast('Saved!');
    } catch (e: any) {
      toast('Save failed');
      console.error(e);
    }
  }

  const pageWrap: React.CSSProperties = {
    minHeight: '100vh',
    padding: '18px 14px 30px',
    display: 'flex',
    justifyContent: 'center',
  };

  const card: React.CSSProperties = {
    width: 'min(860px, 96vw)',
    background: 'rgba(0,0,0,0.25)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 18,
    padding: 16,
    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
  };

  const row: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginTop: 12,
  };

  const label: React.CSSProperties = { fontSize: 12, opacity: 0.85, marginBottom: 6 };
  const input: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(0,0,0,0.25)',
    color: 'white',
    outline: 'none',
  };

  const textarea: React.CSSProperties = {
    ...input,
    minHeight: 92,
    resize: 'vertical',
  };

  const btn: React.CSSProperties = {
    padding: '9px 12px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.16)',
    background: 'rgba(255,255,255,0.08)',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 700,
  };

  const btnSmall: React.CSSProperties = {
    ...btn,
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 800,
  };

  const primaryPreviewWrap: React.CSSProperties = {
    marginTop: 10,
    padding: 12,
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.04)',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  };

  const primaryPreviewImg: React.CSSProperties = {
    width: 84,
    height: 84,
    borderRadius: 14,
    objectFit: 'cover',
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(0,0,0,0.25)',
  };

  const thumbsWrap: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))',
    gap: 10,
    marginTop: 10,
  };

  const thumb: React.CSSProperties = {
    width: '100%',
    aspectRatio: '1 / 1',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.12)',
    overflow: 'hidden',
    position: 'relative',
    background: 'rgba(0,0,0,0.25)',
    cursor: 'pointer',
  };

  const thumbImg: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  };

  const selectedPill: React.CSSProperties = {
    position: 'absolute',
    left: 8,
    bottom: 8,
    padding: '4px 8px',
    borderRadius: 999,
    background: 'rgba(0,0,0,0.55)',
    border: '1px solid rgba(255,255,255,0.22)',
    fontSize: 11,
    fontWeight: 900,
  };

  const delBtn: React.CSSProperties = {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 28,
    height: 28,
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'rgba(0,0,0,0.45)',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 900,
    lineHeight: '26px',
    textAlign: 'center',
  };

  const statusStyle: React.CSSProperties = {
    position: 'fixed',
    top: 86,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 99,
    padding: '8px 12px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'rgba(0,0,0,0.65)',
    color: 'white',
    fontWeight: 800,
  };

  return (
    <>
      <AppHeader active="profile" />

      {status ? <div style={statusStyle}>{status}</div> : null}

      <div style={pageWrap}>
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900 }}>Profile</div>
              <div style={{ opacity: 0.78, marginTop: 2, fontSize: 12 }}>Logged in as: {uid}</div>
            </div>
            <button type="button" style={btn} onClick={save}>
              Save
            </button>
          </div>

          <div style={{ marginTop: 14, fontWeight: 900 }}>Photos</div>
          <div style={{ opacity: 0.8, fontSize: 12, marginTop: 4 }}>
            Upload photos, delete them, and click a photo to set it as your profile picture.
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => onPickFiles(e.target.files)}
            />
            <button type="button" style={btnSmall} onClick={() => fileInputRef.current?.click()}>
              Upload images
            </button>

            <div style={{ display: 'flex', gap: 8, flex: '1 1 320px', alignItems: 'center' }}>
              <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="Paste image URL (https://...)"
                style={input}
              />
              <button
                type="button"
                style={btnSmall}
                onClick={() => {
                  addUrlToGallery(newUrl);
                  setNewUrl('');
                }}
              >
                Add
              </button>
            </div>
          </div>

          {primaryPhotoUrl ? (
            <div style={primaryPreviewWrap}>
              <img src={primaryPhotoUrl} alt="Profile" style={primaryPreviewImg} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, marginBottom: 2 }}>Current profile photo</div>
                <div style={{ opacity: 0.75, fontSize: 12, lineHeight: 1.2 }}>
                  Tap any photo below to set it as your profile pic.
                </div>
              </div>
            </div>
          ) : null}

          <div style={thumbsWrap}>
            {gallery.length ? (
              gallery.map((url) => {
                const selected = normalizePhotoUrl(url) === effectivePrimary;
                return (
                  <div
                    key={url}
                    style={{
                      ...thumb,
                      outline: selected ? '2px solid rgba(255,255,255,0.65)' : 'none',
                    }}
                    onClick={() => setPrimaryPhotoUrl(url)}
                    role="button"
                    aria-label={selected ? 'Selected profile photo' : 'Set as profile photo'}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="Photo" style={thumbImg} draggable={false} />
                    {selected ? <div style={selectedPill}>Profile pic</div> : null}
                    <div
                      style={delBtn}
                      role="button"
                      aria-label="Delete photo"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromGallery(url);
                      }}
                    >
                      ×
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ opacity: 0.8, padding: 10, fontSize: 13 }}>No photos yet. Upload or add a URL.</div>
            )}
          </div>

          <div style={row}>
            <div>
              <div style={label}>Display name</div>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={input} />
            </div>
            <div>
              <div style={label}>Full name</div>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} style={input} />
            </div>
          </div>


          <div style={row}>
            <div>
              <div style={label}>Sex</div>
              <select value={sex} onChange={(e) => setSex(e.target.value)} style={input as any}>
                <option value="any">Any</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="nonbinary">Non-binary</option>
              </select>
            </div>
            <div>
              <div style={label}>Age</div>
              <input
                value={age ? String(age) : ''}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setAge(Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0);
                }}
                placeholder="e.g. 28"
                style={input}
                inputMode="numeric"
              />
            </div>
            <div>
              <div style={label}>ZIP code</div>
              <input value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="e.g. 33101" style={input} />
            </div>
          </div>


          <div style={row}>
            <div>
              <div style={label}>Headline</div>
              <input value={headline} onChange={(e) => setHeadline(e.target.value)} style={input} />
            </div>
            <div>
              <div style={label}>Profile photo URL (auto from selection)</div>
              <input
                value={primaryPhotoUrl}
                onChange={(e) => setPrimaryPhotoUrl(e.target.value)}
                placeholder="Select a photo above or paste URL"
                style={input}
              />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={label}>About</div>
            <textarea value={about} onChange={(e) => setAbout(e.target.value)} style={textarea} />
          </div>
        </div>
      </div>
    </>
  );
}
