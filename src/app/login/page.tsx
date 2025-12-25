"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { startOTP, verifyOTP } from "@/lib/auth";
import { clearSession } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // NOTE: We intentionally do NOT import/use `getSession()` here because your
  // current session helper does not export it. We can add an auto-redirect later
  // once we confirm the session API surface.

  useEffect(() => {
    // If you want auto-redirect later, we'll wire it to whatever your session lib exports.
    // For now: keep it simple and build-safe.
  }, []);

  const canSend = useMemo(() => !!email.trim() && !sending && !verifying, [email, sending, verifying]);
  const canVerify = useMemo(() => !!email.trim() && !!otp.trim() && !sending && !verifying, [email, otp, sending, verifying]);

  async function onSend() {
    if (!canSend) return;
    setStatus("");
    setSending(true);
    try {
      const res = await startOTP(email.trim());
      if (res?.ok) {
        // DEV OTP support (backend may return devOtp)
        if (res?.devOtp) setStatus(`OTP sent. DEV OTP (testing): ${String(res.devOtp)}`);
        else setStatus("OTP sent. Check your email (or DEV OTP if enabled).");
      } else {
        setStatus(res?.error ? String(res.error) : "Failed to send OTP.");
      }
    } catch (e: any) {
      setStatus(e?.message ? String(e.message) : "Failed to send OTP.");
    } finally {
      setSending(false);
    }
  }

  async function onVerify() {
    if (!canVerify) return;
    setStatus("");
    setVerifying(true);
    try {
      const res = await verifyOTP(email.trim(), otp.trim());
      if (res?.ok) {
        setStatus("Verified. Redirecting…");
        router.push("/discover");
      } else {
        setStatus(res?.error ? String(res.error) : "Invalid code.");
      }
    } catch (e: any) {
      setStatus(e?.message ? String(e.message) : "Verify failed.");
    } finally {
      setVerifying(false);
    }
  }

  function onKeyDownEmail(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      onSend();
    }
  }

  function onKeyDownOtp(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      onVerify();
    }
  }

  function onAltSignIn(kind: "google" | "facebook" | "apple") {
    // Dummy for now — UI only.
    setStatus(`${kind.toUpperCase()} sign-in is not wired yet (dummy button).`);
  }

  async function onReset() {
    clearSession();
    setEmail("");
    setOtp("");
    setStatus("Session cleared.");
  }

  const bg = "radial-gradient(1200px 800px at 20% 15%, rgba(255, 90, 200, 0.18), transparent 60%), radial-gradient(900px 700px at 80% 25%, rgba(120, 90, 255, 0.20), transparent 55%), radial-gradient(800px 600px at 60% 85%, rgba(0, 255, 220, 0.10), transparent 55%), linear-gradient(180deg, #05010a 0%, #110018 55%, #08000f 100%)";

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: bg,
      }}
    >
      <div
        style={{
          width: "min(1100px, 100%)",
          borderRadius: 28,
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(10, 6, 18, 0.55)",
          backdropFilter: "blur(18px)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.35fr 1fr",
            gap: 0,
          }}
        >
          {/* LEFT: big brand / artwork area */}
          <section
            style={{
              position: "relative",
              minHeight: 520,
              padding: 42,
              background:
                "radial-gradient(700px 500px at 30% 20%, rgba(255, 70, 200, 0.22), transparent 60%), radial-gradient(650px 520px at 70% 80%, rgba(90, 70, 255, 0.22), transparent 60%), linear-gradient(135deg, rgba(10,5,18,0.75), rgba(10,5,18,0.35))",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0.22,
                background:
                  "radial-gradient(circle at 18% 22%, rgba(255,255,255,0.35), transparent 24%), radial-gradient(circle at 78% 18%, rgba(255,255,255,0.22), transparent 22%), radial-gradient(circle at 88% 78%, rgba(255,255,255,0.18), transparent 26%)",
              }}
            />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ marginBottom: 20, opacity: 0.9, color: "rgba(255,255,255,0.85)" }}>
                <div style={{ fontSize: 14, letterSpacing: 1.6, textTransform: "uppercase" }}>FrugalFetishes</div>
              </div>

              {/* BIG branding image */}
              <div
                style={{
                  width: "min(520px, 100%)",
                  aspectRatio: "16/9",
                  borderRadius: 22,
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.06)",
                  boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
                }}
              >
                {/* Update this path to your actual brand asset if different */}
                <img
                  src="/public/frugalfetishes.png"
                  alt="FrugalFetishes"
                  style={{ width: "100%", height: "100%", objectFit: "contain", padding: 18 }}
                />
              </div>

              <div style={{ marginTop: 18, color: "rgba(255,255,255,0.80)", maxWidth: 520 }}>
                <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
                  Find your match — the FrugalFetishes way.
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.9 }}>
                  Swipe, connect, and chat. This is a working prototype — styling first, wiring next.
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT: auth controls */}
          <section
            style={{
              padding: 42,
              background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
              display: "grid",
              alignContent: "center",
              gap: 18,
            }}
          >
            <div>
              <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.0, color: "rgba(255,255,255,0.95)" }}>
                Welcome
              </div>
              <div style={{ marginTop: 8, color: "rgba(255,255,255,0.70)" }}>
                Sign in with email OTP (for now).
              </div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase" }}>
                  Email
                </div>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={onKeyDownEmail}
                  placeholder="you@example.com"
                  style={{
                    height: 44,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(0,0,0,0.20)",
                    color: "white",
                    padding: "0 12px",
                    outline: "none",
                  }}
                />
              </label>

              <button
                onClick={onSend}
                disabled={!canSend}
                style={{
                  height: 44,
                  borderRadius: 12,
                  border: "none",
                  cursor: canSend ? "pointer" : "not-allowed",
                  background: canSend ? "linear-gradient(90deg, #ff4bd6, #7b5cff)" : "rgba(255,255,255,0.10)",
                  color: "white",
                  fontWeight: 700,
                }}
              >
                {sending ? "Sending…" : "Send OTP"}
              </button>

              <label style={{ display: "grid", gap: 6 }}>
                <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase" }}>
                  OTP code
                </div>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  onKeyDown={onKeyDownOtp}
                  placeholder="123456"
                  style={{
                    height: 44,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(0,0,0,0.20)",
                    color: "white",
                    padding: "0 12px",
                    outline: "none",
                  }}
                />
              </label>

              <button
                onClick={onVerify}
                disabled={!canVerify}
                style={{
                  height: 44,
                  borderRadius: 12,
                  border: "none",
                  cursor: canVerify ? "pointer" : "not-allowed",
                  background: canVerify ? "linear-gradient(90deg, #00ffd5, #7b5cff)" : "rgba(255,255,255,0.10)",
                  color: "#0b0612",
                  fontWeight: 800,
                }}
              >
                {verifying ? "Verifying…" : "Verify • Sign In"}
              </button>

              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12, marginTop: 4 }}>
                <div style={{ height: 1, background: "rgba(255,255,255,0.12)" }} />
                <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>OR</div>
                <div style={{ height: 1, background: "rgba(255,255,255,0.12)" }} />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-start" }}>
                <button
                  onClick={() => onAltSignIn("google")}
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.06)",
                    cursor: "pointer",
                    color: "white",
                    fontWeight: 800,
                  }}
                  aria-label="Google (dummy)"
                  title="Google (dummy)"
                >
                  G
                </button>
                <button
                  onClick={() => onAltSignIn("facebook")}
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.06)",
                    cursor: "pointer",
                    color: "white",
                    fontWeight: 800,
                  }}
                  aria-label="Facebook (dummy)"
                  title="Facebook (dummy)"
                >
                  f
                </button>
                <button
                  onClick={() => onAltSignIn("apple")}
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.06)",
                    cursor: "pointer",
                    color: "white",
                    fontWeight: 800,
                  }}
                  aria-label="Apple (dummy)"
                  title="Apple (dummy)"
                >
                  
                </button>

                <div style={{ flex: 1 }} />

                <button
                  onClick={onReset}
                  style={{
                    height: 46,
                    padding: "0 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.06)",
                    cursor: "pointer",
                    color: "rgba(255,255,255,0.85)",
                    fontWeight: 700,
                  }}
                >
                  Reset
                </button>
              </div>

              {status ? (
                <div
                  style={{
                    marginTop: 6,
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: "rgba(0,0,0,0.22)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    color: "rgba(255,255,255,0.85)",
                    fontSize: 13,
                    lineHeight: 1.4,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {status}
                </div>
              ) : null}
            </div>

            <div style={{ color: "rgba(255,255,255,0.50)", fontSize: 12, lineHeight: 1.5 }}>
              Tip: Press <b>Enter</b> in Email to Send OTP, and <b>Enter</b> in OTP to Verify.
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
