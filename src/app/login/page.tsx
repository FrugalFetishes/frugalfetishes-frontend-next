"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { startOTP, verifyOTP } from "@/lib/auth";
import { getSession, clearSession } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [status, setStatus] = useState<string>("");
  const [devOtp, setDevOtp] = useState<string>("");

  // If you're already logged in, skip login.
  useEffect(() => {
    const token = getSession();
    if (token) router.replace("/discover");
  }, [router]);

  const canSend = useMemo(() => email.trim().length > 3 && email.includes("@"), [email]);
  const canVerify = useMemo(() => canSend && otp.trim().length >= 4, [canSend, otp]);

  async function onSendOtp() {
    if (!canSend || sending) return;
    setSending(true);
    setStatus("");
    setDevOtp("");

    try {
      const res = await startOTP(email.trim());

      if (res?.ok) {
        setStatus("OTP sent. Enter the code.");
        if (res?.devOtp) setDevOtp(String(res.devOtp));
      } else {
        const msg = res?.error || res?.message || "Failed to start OTP.";
        setStatus(String(msg));
      }
    } catch (e: any) {
      setStatus(e?.message ? String(e.message) : "Failed to start OTP.");
    } finally {
      setSending(false);
    }
  }

  async function onVerify() {
    if (!canVerify || verifying) return;
    setVerifying(true);
    setStatus("");

    try {
      const res = await verifyOTP(email.trim(), otp.trim());

      if (res?.ok) {
        setStatus("Signed in.");
        router.replace("/discover");
      } else {
        const msg = res?.error || res?.message || "Verify failed.";
        setStatus(String(msg));
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
      onSendOtp();
    }
  }

  function onKeyDownOtp(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      onVerify();
    }
  }

  // Dummy alternate sign-in handlers (UI only for now)
  function onAltSignin(provider: string) {
    setStatus(`${provider} sign-in coming soon.`);
  }

  function onClear() {
    clearSession();
    setEmail("");
    setOtp("");
    setDevOtp("");
    setStatus("Cleared session.");
  }

  return (
    <div style={styles.page}>
      <div style={styles.bgGlow1} />
      <div style={styles.bgGlow2} />

      <div style={styles.shell}>
        <div style={styles.hero}>
          <div style={styles.brandWrap}>
            <img
              src="/public/frugalfetishes.png"
              alt="FrugalFetishes"
              style={styles.brandImg}
              onError={(e) => {
                // fallback if your logo is at /frugalfetishes.png (common in Next public/)
                (e.currentTarget as HTMLImageElement).src = "/frugalfetishes.png";
              }}
            />
          </div>

          <div style={styles.heroCopy}>
            <div style={styles.heroTitle}>Find your match — the FrugalFetishes way</div>
            <div style={styles.heroSub}>
              Fast OTP login for now. We’ll add real providers (Google/Apple/etc) after the core flow is solid.
            </div>

            <div style={styles.heroFooter}>
              <button type="button" style={styles.smallGhost} onClick={onClear}>
                Clear session
              </button>
            </div>
          </div>
        </div>

        <div style={styles.formSide}>
          <div style={styles.formHeader}>
            <div style={styles.welcome}>Welcome</div>
            <div style={styles.welcomeSub}>Enter your email to receive a one-time code.</div>
          </div>

          <div style={styles.form}>
            <label style={styles.label}>Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={onKeyDownEmail}
              placeholder="you@example.com"
              style={styles.input}
              autoComplete="email"
              inputMode="email"
            />

            <button
              type="button"
              onClick={onSendOtp}
              disabled={!canSend || sending}
              style={{
                ...styles.primaryBtn,
                ...(canSend && !sending ? {} : styles.btnDisabled),
              }}
            >
              {sending ? "Sending…" : "Send OTP"}
            </button>

            <div style={styles.dividerRow}>
              <div style={styles.dividerLine} />
              <div style={styles.dividerText}>then</div>
              <div style={styles.dividerLine} />
            </div>

            <label style={styles.label}>OTP code</label>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              onKeyDown={onKeyDownOtp}
              placeholder="123456"
              style={styles.input}
              autoComplete="one-time-code"
              inputMode="numeric"
            />

            <button
              type="button"
              onClick={onVerify}
              disabled={!canVerify || verifying}
              style={{
                ...styles.secondaryBtn,
                ...(canVerify && !verifying ? {} : styles.btnDisabled),
              }}
            >
              {verifying ? "Verifying…" : "Verify / Sign In"}
            </button>

            {devOtp ? (
              <div style={styles.devBox}>
                <div style={styles.devTitle}>DEV OTP (testing)</div>
                <div style={styles.devCode}>{devOtp}</div>
                <div style={styles.devHint}>Use this code if email delivery isn’t configured yet.</div>
              </div>
            ) : null}

            {status ? <div style={styles.status}>{status}</div> : null}

            <div style={styles.altRow}>
              <div style={styles.altOr}>OR</div>
              <div style={styles.altButtons}>
                <button type="button" style={styles.altBtn} onClick={() => onAltSignin("Google")}>
                  <span style={styles.altIcon}>G</span> Google
                </button>
                <button type="button" style={styles.altBtn} onClick={() => onAltSignin("Apple")}>
                  <span style={styles.altIcon}></span> Apple
                </button>
                <button type="button" style={styles.altBtn} onClick={() => onAltSignin("Facebook")}>
                  <span style={styles.altIcon}>f</span> Facebook
                </button>
              </div>
            </div>

            <div style={styles.miniNote}>
              Don’t have an account? (We’ll add registration UI next — right now you can create users in Firebase.)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 24,
    background: "radial-gradient(1200px 700px at 20% 15%, rgba(180, 80, 255, 0.45), rgba(0,0,0,0)), radial-gradient(1000px 600px at 80% 10%, rgba(255, 80, 180, 0.35), rgba(0,0,0,0)), linear-gradient(135deg, #0a0413 0%, #150628 35%, #0b0416 100%)",
    color: "#fff",
    position: "relative",
    overflow: "hidden",
  },

  bgGlow1: {
    position: "absolute",
    inset: "-40% auto auto -30%",
    width: 700,
    height: 700,
    filter: "blur(60px)",
    background: "radial-gradient(circle at 30% 30%, rgba(255, 92, 190, 0.55), rgba(0,0,0,0) 60%)",
    pointerEvents: "none",
  },
  bgGlow2: {
    position: "absolute",
    inset: "auto -35% -45% auto",
    width: 900,
    height: 900,
    filter: "blur(70px)",
    background: "radial-gradient(circle at 60% 60%, rgba(120, 80, 255, 0.5), rgba(0,0,0,0) 60%)",
    pointerEvents: "none",
  },

  shell: {
    width: "min(1120px, 100%)",
    display: "grid",
    gridTemplateColumns: "1.2fr 0.8fr",
    gap: 18,
    padding: 18,
    borderRadius: 28,
    background: "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.05))",
    border: "1px solid rgba(255,255,255,0.14)",
    boxShadow: "0 30px 90px rgba(0,0,0,0.50)",
    backdropFilter: "blur(10px)",
  },

  hero: {
    borderRadius: 22,
    position: "relative",
    padding: 22,
    overflow: "hidden",
    background: "radial-gradient(900px 500px at 10% 30%, rgba(255, 80, 170, 0.25), rgba(0,0,0,0)), radial-gradient(800px 500px at 90% 10%, rgba(120, 80, 255, 0.22), rgba(0,0,0,0)), linear-gradient(180deg, rgba(0,0,0,0.28), rgba(0,0,0,0.42))",
    border: "1px solid rgba(255,255,255,0.10)",
    minHeight: 520,
    display: "grid",
    gridTemplateRows: "1fr auto",
  },

  brandWrap: {
    display: "grid",
    placeItems: "center",
    padding: "12px 10px 0 10px",
  },

  brandImg: {
    width: "min(520px, 92%)",
    height: "auto",
    filter: "drop-shadow(0 18px 40px rgba(0,0,0,0.55))",
    transform: "translateY(-4px)",
  },

  heroCopy: {
    padding: "18px 8px 6px 8px",
    display: "grid",
    gap: 10,
    alignContent: "end",
  },

  heroTitle: {
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: 0.2,
    color: "rgba(255,255,255,0.92)",
    textShadow: "0 10px 30px rgba(0,0,0,0.55)",
  },

  heroSub: {
    fontSize: 14,
    lineHeight: 1.45,
    color: "rgba(255,255,255,0.72)",
    maxWidth: 520,
  },

  heroFooter: {
    display: "flex",
    justifyContent: "flex-start",
    gap: 10,
    marginTop: 6,
  },

  smallGhost: {
    borderRadius: 999,
    padding: "9px 12px",
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.18)",
    color: "rgba(255,255,255,0.85)",
    cursor: "pointer",
    fontSize: 12,
  },

  formSide: {
    borderRadius: 22,
    padding: 22,
    background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.10))",
    border: "1px solid rgba(255,255,255,0.12)",
    display: "grid",
    alignContent: "start",
    minHeight: 520,
  },

  formHeader: {
    display: "grid",
    gap: 6,
    marginBottom: 14,
  },

  welcome: {
    fontSize: 34,
    fontWeight: 900,
    letterSpacing: 0.2,
    background: "linear-gradient(90deg, rgba(255, 88, 190, 0.95), rgba(160, 110, 255, 0.95))",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  },

  welcomeSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.70)",
    lineHeight: 1.4,
  },

  form: {
    display: "grid",
    gap: 10,
    marginTop: 8,
  },

  label: {
    fontSize: 12,
    color: "rgba(255,255,255,0.72)",
    marginTop: 6,
  },

  input: {
    width: "100%",
    borderRadius: 14,
    padding: "12px 14px",
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(10, 6, 18, 0.50)",
    color: "rgba(255,255,255,0.92)",
    outline: "none",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
  },

  primaryBtn: {
    borderRadius: 14,
    padding: "12px 14px",
    border: "1px solid rgba(255, 80, 170, 0.35)",
    background: "linear-gradient(90deg, rgba(255, 80, 170, 0.85), rgba(160, 110, 255, 0.85))",
    color: "#14021f",
    fontWeight: 900,
    cursor: "pointer",
    marginTop: 4,
  },

  secondaryBtn: {
    borderRadius: 14,
    padding: "12px 14px",
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.10)",
    color: "rgba(255,255,255,0.92)",
    fontWeight: 800,
    cursor: "pointer",
    marginTop: 4,
  },

  btnDisabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },

  dividerRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: 10,
    margin: "10px 0 2px 0",
  },

  dividerLine: {
    height: 1,
    background: "rgba(255,255,255,0.14)",
  },

  dividerText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  devBox: {
    marginTop: 10,
    borderRadius: 16,
    border: "1px solid rgba(255, 80, 170, 0.25)",
    background: "rgba(0,0,0,0.25)",
    padding: "12px 12px",
    display: "grid",
    gap: 6,
  },

  devTitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.78)",
    fontWeight: 800,
  },

  devCode: {
    fontSize: 22,
    fontWeight: 900,
    letterSpacing: 2,
    color: "rgba(255, 170, 225, 0.95)",
  },

  devHint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.62)",
  },

  status: {
    marginTop: 10,
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.20)",
    fontSize: 13,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 1.35,
    wordBreak: "break-word",
  },

  altRow: {
    marginTop: 10,
    display: "grid",
    gap: 10,
  },

  altOr: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    letterSpacing: 1.2,
  },

  altButtons: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 10,
  },

  altBtn: {
    borderRadius: 14,
    padding: "10px 10px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.18)",
    color: "rgba(255,255,255,0.90)",
    cursor: "pointer",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontSize: 12,
  },

  altIcon: {
    width: 18,
    height: 18,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.90)",
    fontWeight: 900,
    fontSize: 12,
    lineHeight: "18px",
  },

  miniNote: {
    marginTop: 10,
    fontSize: 12,
    color: "rgba(255,255,255,0.60)",
    lineHeight: 1.45,
  },
};
