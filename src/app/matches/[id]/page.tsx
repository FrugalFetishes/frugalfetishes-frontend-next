\"use client\";

import { useEffect, useMemo, useState } from \"react\";
import { useParams } from \"next/navigation\";
import { apiGet } from \"@/lib/api\";
import { loadSession } from \"@/lib/session\";

type MatchRow = {
  matchId: string;
  otherUid: string | null;
  matchedAt: any;
  profile: any | null;
};

export default function MatchDetailPage() {
  const params = useParams();
  const matchId = useMemo(() => {
    const raw = (params as any)?.id;
    return typeof raw === \"string\" ? raw : Array.isArray(raw) ? raw[0] : \"\";
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [match, setMatch] = useState<MatchRow | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      const token = loadSession();
      if (!token) {
        window.location.href = \"/login\";
        return;
      }

      try {
        const res = await apiGet(\"/api/matches\", token);
        const list: MatchRow[] = Array.isArray(res?.matches) ? res.matches : [];
        const found = list.find((m) => String(m.matchId) === String(matchId)) || null;
        setMatch(found);
        if (!found) setErr(\"Match not found (try going back to Matches)\");
      } catch (e: any) {
        setErr(e?.message || \"Failed to load match\");
      } finally {
        setLoading(false);
      }
    })();
  }, [matchId]);

  const p = match?.profile || {};
  const name = p.displayName || \"Unknown\";
  const city = p.city || \"\";
  const age = typeof p.age === \"number\" ? p.age : undefined;
  const bio = p.bio || p.about || \"\";
  const photos: string[] = Array.isArray(p.photos) ? p.photos : [];
  const photo = photos[0] || p.photoUrl || \"\";

  return (
    <main style={{ padding: 24, maxWidth: 860, margin: \"0 auto\" }}>
      <div style={{ display: \"flex\", alignItems: \"center\", justifyContent: \"space-between\", gap: 12 }}>
        <button onClick={() => (window.location.href = \"/matches\")}>← Back</button>
        <div style={{ display: \"flex\", gap: 10 }}>
          <button onClick={() => (window.location.href = `/chat/${encodeURIComponent(matchId)}`)}>Open chat</button>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        {loading ? (
          <div style={{ opacity: 0.9 }}>Loading…</div>
        ) : err ? (
          <div style={{ opacity: 0.9 }}>{err}</div>
        ) : (
          <div
            style={{
              border: \"1px solid rgba(255,255,255,0.14)\",
              borderRadius: 18,
              background: \"rgba(255,255,255,0.04)\",
              overflow: \"hidden\",
            }}
          >
            <div style={{ display: \"grid\", gridTemplateColumns: \"320px 1fr\", gap: 0 }}>
              <div style={{ minHeight: 320, background: \"rgba(255,255,255,0.06)\", display: \"grid\", placeItems: \"center\" }}>
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt={name} style={{ width: \"100%\", height: \"100%\", objectFit: \"cover\" }} />
                ) : (
                  <div style={{ opacity: 0.85 }}>No photo</div>
                )}
              </div>

              <div style={{ padding: 18 }}>
                <h1 style={{ marginTop: 0, marginBottom: 8 }}>
                  {name}{age !== undefined ? `, ${age}` : \"\"}
                </h1>
                <div style={{ opacity: 0.9, marginBottom: 12 }}>{city}</div>

                {bio ? (
                  <div style={{ opacity: 0.95, lineHeight: 1.45, whiteSpace: \"pre-wrap\" }}>{bio}</div>
                ) : (
                  <div style={{ opacity: 0.85 }}>No bio yet.</div>
                )}

                {photos.length > 1 ? (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>More photos</div>
                    <div style={{ display: \"flex\", gap: 10, flexWrap: \"wrap\" }}>
                      {photos.slice(1, 6).map((u, i) => (
                        <div key={i} style={{ width: 92, height: 92, borderRadius: 12, overflow: \"hidden\", background: \"rgba(255,255,255,0.06)\" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={u} alt={`${name} ${i + 2}`} style={{ width: \"100%\", height: \"100%\", objectFit: \"cover\" }} />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div style={{ marginTop: 18, display: \"flex\", gap: 10 }}>
                  <button onClick={() => (window.location.href = `/chat/${encodeURIComponent(matchId)}`)}>Message</button>
                  <button onClick={() => (window.location.href = \"/discover\")}>Back to Discover</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
