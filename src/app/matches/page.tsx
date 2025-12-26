"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { requireSession } from "@/lib/session";
import { uidFromToken, listMatchesForUid, loadUserProfileSnapshot, markAllMatchesSeen } from "@/lib/socialStore";

export default function MatchesPage() {
  const router = useRouter();

  const token = useMemo(() => {
    try { return requireSession(); } catch { return null; }
  }, []);

  const uid = useMemo(() => uidFromToken(token) || "anon", [token]);

  const matches = useMemo(() => listMatchesForUid(uid), [uid]);

  useEffect(() => {
    // visiting /matches marks them as seen (so the header badge clears)
    try { markAllMatchesSeen(uid); } catch {}
  }, [uid]);

  return (
    <div className="min-h-screen">
      <AppHeader active="matches" />

      <main className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="text-xl font-semibold mb-4">Matches</h1>

        {matches.length === 0 ? (
          <p className="opacity-80">No matches yet. Swipe right on Discover and make sure the other account likes you back.</p>
        ) : (
          <div className="space-y-3">
            {matches.map((m) => {
              const otherUid = m.a === uid ? m.b : m.a;
              const p = loadUserProfileSnapshot(otherUid);
              const label = p?.name ? `${p.name}${p.age ? `, ${p.age}` : ""}` : otherUid;

              return (
                <div key={m.id} className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{label}</div>
                    <div className="text-sm opacity-80 truncate">{p?.city || ""}</div>
                  </div>

                  <button
                    className="rounded-lg px-3 py-2 bg-white/10 hover:bg-white/15"
                    onClick={() => router.push(`/matches/${m.id}`)}
                  >
                    Open
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
