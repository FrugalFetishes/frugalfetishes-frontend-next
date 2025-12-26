'use client';

import Link from "next/link";
import { useParams } from "next/navigation";
import { getCachedProfile } from "@/lib/socialStore";

export default function MatchProfilePage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent((params?.id as string) || "");
  const p = getCachedProfile(id);

  return (
    <div style={{ minHeight: "100vh", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 28, letterSpacing: 0.2 }}>Profile</h1>
        <Link
          href="/matches"
          style={{
            padding: "8px 12px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(0,0,0,0.28)",
            color: "#fff",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          Back
        </Link>
      </div>

      <div style={{ maxWidth: 520, margin: "0 auto", borderRadius: 22, overflow: "hidden", border: "1px solid rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.28)" }}>
        <div style={{ width: "100%", aspectRatio: "4 / 5", background: "rgba(255,255,255,0.06)" }}>
          {p?.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.photoUrl} alt={p.name || id} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.75, fontWeight: 700 }}>
              No photo
            </div>
          )}
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ fontWeight: 900, fontSize: 22 }}>{p?.name || id}</div>
          <div style={{ opacity: 0.85, marginTop: 6 }}>
            {(p?.age ? `${p.age}` : "")}{p?.city ? ` • ${p.city}` : ""}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <Link
              href={`/chat/${encodeURIComponent(id)}`}
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,43,106,0.18)",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 900,
              }}
            >
              Message
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
