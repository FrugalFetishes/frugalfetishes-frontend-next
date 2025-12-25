"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { startOTP, verifyOTP } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Dev OTP support: some backends return { devOtp: "123456" } in dev mode.
  const [devOtp, setDevOtp] = useState<string>("");

  const canSend = useMemo(() => email.trim().length > 3 && email.includes("@"), [email]);
  const canVerify = useMemo(() => email.trim().length > 3 && otp.trim().length >= 4, [email, otp]);

  async function onSendOtp() {
    if (!canSend || sending) return;
    setSending(true);
    setStatus("");
    setDevOtp("");

    try {
      const res: any = await startOTP(email.trim());
      if (res?.ok) {
        setStatus("OTP sent. Check your email. If DEV mode is enabled, the code may appear below.");
        if (res?.devOtp) setDevOtp(String(res.devOtp));
      } else {
        setStatus(res?.error ? String(res.error) : "Could not start OTP.");
      }
    } catch (e: any) {
      setStatus(e?.message ? String(e.message) : "Network error starting OTP.");
    } finally {
      setSending(false);
    }
  }

  async function onVerify() {
    if (!canVerify || verifying) return;
    setVerifying(true);
    setStatus("");

    try {
      const res: any = await verifyOTP(email.trim(), otp.trim());
      if (res?.ok) {
        setStatus("Verified. Redirecting…");
        router.push("/discover");
      } else {
        setStatus(res?.error ? String(res.error) : "Invalid OTP.");
      }
    } catch (e: any) {
      setStatus(e?.message ? String(e.message) : "Network error verifying OTP.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <main style={styles.page}>
      {/* Background glow layers */}
      <div aria-hidden style={styles.bgGlowA} />
      <div aria-hidden style={styles.bgGlowB} />
      <div aria-hidden style={styles.bgGlowC} />

      {/* Center stage */}
      <section style={styles.stage}>
        {/* Decorative corner rings */}
        <div aria-hidden style={{ ...styles.ring, ...styles.ringTL }} />
        <div aria-hidden style={{ ...styles.ring, ...styles.ringBR }} />

        {/* Big art / brand side */}
        <div style={styles.artSide}>
          <div style={styles.brandBlock}>
            {/* IMPORTANT:
               In Next.js, anything inside /public is referenced WITHOUT "/public".
               So this must be "/frugalfetishes.png" (NOT "/public/frugalfetishes.png"). */}
            <img
              src="/frugalfetishes.png"
              alt="FrugalFetishes"
              style={styles.brandImg}
              onError={(e) => {
                // If the image path is wrong, make it obvious without crashing.
                (e.currentTarget as HTMLImageElement).style.display = "none";
                setStatus("Brand image not found. Confirm it exists at /public/frugalfetishes.png");
              }}
            />

            <p style={styles.tagline}>Find your match — the FrugalFetishes way.</p>
          </div>

          {/* Subtle “scene” overlays to feel more organic */}
          <div aria-hidden style={styles.sceneFade} />
          <div aria-hidden style={styles.sceneSparkles} />
        </div>

        {/* Form side */}
        <div style={styles.formSide}>
          <div style={styles.formWrap}>
            <h1 style={styles.title}>Welcome</h1>
            <p style={styles.subtitle}>Sign in with your email to continue.</p>

            <label style={styles.label}>
              Email
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                autoComplete="email"
                inputMode="email"
                style={styles.input}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSendOtp();
                }}
              />
            </label>

            <button
              type="button"
              onClick={onSendOtp}
              disabled={!canSend || sending}
              style={{
                ...styles.primaryBtn,
                opacity: !canSend || sending ? 0.6 : 1,
                cursor: !canSend || sending ? "not-allowed" : "pointer",
              }}
            >
              {sending ? "Sending…" : "Send OTP"}
            </button>

            <label style={{ ...styles.label, marginTop: 14 }}>
              OTP code
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                autoComplete="one-time-code"
                inputMode="numeric"
                style={styles.input}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onVerify();
                }}
              />
            </label>

            <button
              type="button"
              onClick={onVerify}
              disabled={!canVerify || verifying}
              style={{
                ...styles.secondaryBtn,
                opacity: !canVerify || verifying ? 0.6 : 1,
                cursor: !canVerify || verifying ? "not-allowed" : "pointer",
              }}
            >
              {verifying ? "Verifying…" : "Verify + Sign in"}
            </button>

            {/* DEV OTP helper */}
            {!!devOtp && (
              <div style={styles.devOtpBox}>
                <div style={styles.devOtpTitle}>DEV OTP (testing)</div>
                <div style={styles.devOtpCode}>{devOtp}</div>
                <button
                  type="button"
                  onClick={() => setOtp(devOtp)}
                  style={styles.devOtpUse}
                >
                  Use this code
                </button>
              </div>
            )}

            {!!status && <div style={styles.status}>{status}</div>}

            {/* Divider */}
            <div style={styles.dividerRow}>
              <div style={styles.dividerLine} />
              <div style={styles.dividerText}>or</div>
              <div style={styles.dividerLine} />
            </div>

            {/* Alternate sign-ins (dummies for now) */}
            <div style={styles.altRow}>
              <button
                type="button"
                style={styles.altBtn}
                onClick={() => setStatus("Google sign-in is not wired yet (placeholder).")}
              >
                Continue with Google
              </button>
              <button
                type="button"
                style={styles.altBtn}
                onClick={() => setStatus("Facebook sign-in is not wired yet (placeholder).")}
              >
                Continue with Facebook
              </button>
              <button
                type="button"
                style={styles.altBtn}
                onClick={() => setStatus("Apple sign-in is not wired yet (placeholder).")}
              >
                Continue with Apple
              </button>
            </div>

            <p style={styles.smallNote}>
              By continuing, you agree to our Terms and acknowledge our Privacy Policy.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 24,
    position: "relative",
    overflow: "hidden",
    background:
      "radial-gradient(1200px 600px at 20% 25%, rgba(255, 64, 180, 0.25), transparent 60%)," +
      "radial-gradient(900px 520px at 78% 30%, rgba(122, 64, 255, 0.18), transparent 60%)," +
      "radial-gradient(1000px 700px at 55% 85%, rgba(255, 0, 120, 0.12), transparent 60%)," +
      "linear-gradient(135deg, #120012, #070013 55%, #0d0018)",
    color: "white",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  },

  bgGlowA: {
    position: "absolute",
    inset: -200,
    background:
      "radial-gradient(closest-side at 25% 30%, rgba(255, 64, 180, 0.22), transparent 65%)",
    filter: "blur(18px)",
    pointerEvents: "none",
  },
  bgGlowB: {
    position: "absolute",
    inset: -200,
    background:
      "radial-gradient(closest-side at 80% 35%, rgba(130, 80, 255, 0.18), transparent 65%)",
    filter: "blur(22px)",
    pointerEvents: "none",
  },
  bgGlowC: {
    position: "absolute",
    inset: -200,
    background:
      "radial-gradient(closest-side at 55% 90%, rgba(255, 0, 140, 0.12), transparent 70%)",
    filter: "blur(26px)",
    pointerEvents: "none",
  },

  stage: {
    width: "min(1120px, 96vw)",
    minHeight: "min(620px, 86vh)",
    display: "grid",
    gridTemplateColumns: "1.15fr 0.85fr",
    borderRadius: 24,
    position: "relative",
    overflow: "hidden",
    background:
      "linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))",
    boxShadow:
      "0 24px 70px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.10)",
    backdropFilter: "blur(10px)",
  },

  ring: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 999,
    border: "10px solid rgba(255,255,255,0.22)",
    filter: "blur(0px)",
    pointerEvents: "none",
  },
  ringTL: { top: 18, left: 18 },
  ringBR: { bottom: 18, right: 18 },

  artSide: {
    position: "relative",
    padding: 34,
    display: "grid",
    alignItems: "center",
    justifyItems: "center",
    background:
      "radial-gradient(900px 520px at 35% 35%, rgba(255, 64, 180, 0.24), transparent 60%)," +
      "radial-gradient(840px 520px at 70% 55%, rgba(122, 64, 255, 0.16), transparent 65%)",
  },

  brandBlock: {
    width: "100%",
    maxWidth: 560,
    display: "grid",
    gap: 14,
    justifyItems: "center",
    textAlign: "center",
    zIndex: 2,
  },

  // Make this BIG, as requested
  brandImg: {
    width: "min(520px, 90%)",
    height: "auto",
    maxHeight: 320,
    objectFit: "contain",
    filter: "drop-shadow(0 18px 28px rgba(0,0,0,0.35))",
  },

  tagline: {
    margin: 0,
    fontSize: 14,
    opacity: 0.85,
    letterSpacing: 0.3,
  },

  sceneFade: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.20) 55%, rgba(0,0,0,0.30))",
    pointerEvents: "none",
  },

  sceneSparkles: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(2px 2px at 22% 30%, rgba(255,255,255,0.22), transparent 55%)," +
      "radial-gradient(2px 2px at 35% 55%, rgba(255,255,255,0.18), transparent 55%)," +
      "radial-gradient(2px 2px at 62% 26%, rgba(255,255,255,0.18), transparent 55%)," +
      "radial-gradient(2px 2px at 70% 62%, rgba(255,255,255,0.16), transparent 55%)," +
      "radial-gradient(2px 2px at 82% 40%, rgba(255,255,255,0.14), transparent 55%)",
    opacity: 0.7,
    pointerEvents: "none",
  },

  formSide: {
    position: "relative",
    padding: 30,
    display: "grid",
    alignItems: "center",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
  },

  // Not a “boxy card” — more like a soft glass panel
  formWrap: {
    width: "100%",
    maxWidth: 420,
    marginInline: "auto",
    padding: "6px 8px",
    display: "grid",
  },

  title: {
    margin: "0 0 6px 0",
    fontSize: 40,
    letterSpacing: -0.5,
    lineHeight: 1.05,
  },
  subtitle: {
    margin: "0 0 18px 0",
    opacity: 0.85,
    fontSize: 14,
  },

  label: {
    display: "grid",
    gap: 8,
    fontSize: 12,
    opacity: 0.95,
  },

  // Still inputs, but not “boxed-in cards”
  input: {
    width: "100%",
    borderRadius: 14,
    padding: "12px 14px",
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.22)",
    color: "white",
    outline: "none",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
  },

  primaryBtn: {
    marginTop: 12,
    borderRadius: 14,
    padding: "12px 14px",
    border: "none",
    color: "white",
    fontWeight: 700,
    letterSpacing: 0.2,
    background:
      "linear-gradient(90deg, rgba(255,64,180,0.95), rgba(170,90,255,0.92))",
    boxShadow: "0 12px 30px rgba(255,64,180,0.15)",
  },

  secondaryBtn: {
    marginTop: 10,
    borderRadius: 14,
    padding: "12px 14px",
    border: "1px solid rgba(255,255,255,0.20)",
    color: "white",
    fontWeight: 700,
    letterSpacing: 0.2,
    background: "rgba(255,255,255,0.06)",
    boxShadow: "0 10px 24px rgba(0,0,0,0.25)",
  },

  status: {
    marginTop: 10,
    fontSize: 12,
    opacity: 0.9,
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.20)",
  },

  devOtpBox: {
    marginTop: 12,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.18)",
    background:
      "linear-gradient(180deg, rgba(255,64,180,0.12), rgba(0,0,0,0.18))",
    padding: 12,
  },
  devOtpTitle: { fontSize: 12, opacity: 0.85, marginBottom: 6 },
  devOtpCode: {
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: 2,
    marginBottom: 8,
  },
  devOtpUse: {
    borderRadius: 12,
    padding: "10px 12px",
    border: "1px solid rgba(255,255,255,0.22)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
  },

  dividerRow: {
    marginTop: 18,
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: 10,
    opacity: 0.85,
  },
  dividerLine: { height: 1, background: "rgba(255,255,255,0.16)" },
  dividerText: { fontSize: 12 },

  altRow: {
    marginTop: 12,
    display: "grid",
    gap: 10,
  },
  altBtn: {
    borderRadius: 14,
    padding: "11px 14px",
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.18)",
    color: "white",
    textAlign: "left",
    cursor: "pointer",
  },

  smallNote: {
    marginTop: 14,
    fontSize: 11,
    opacity: 0.7,
    lineHeight: 1.4,
  },
};
