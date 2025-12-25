"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { startOTP, verifyOTP } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [devOtp, setDevOtp] = useState<string>("");

  const canSend = useMemo(() => email.trim().length > 3 && email.includes("@"), [email]);
  const canVerify = useMemo(() => canSend && otp.trim().length >= 4, [canSend, otp]);

  // If you later standardize a token key in /src/lib/session.ts, you can redirect here.
  // For now we keep login deterministic (no guessing token storage keys).
  useEffect(() => {
    // noop
  }, []);

  async function onSendOTP() {
    if (!canSend || sending) return;

    setSending(true);
    setStatus("");
    setDevOtp("");

    try {
      const res: any = await startOTP(email.trim());

      if (res?.ok) {
        setStatus("OTP sent. Enter the code.");
        if (res?.devOtp) {
          setDevOtp(String(res.devOtp));
          setStatus("DEV OTP (testing) shown below. Enter it to sign in.");
        }
      } else {
        setStatus(res?.error ? String(res.error) : "Could not start OTP.");
      }
    } catch (e: any) {
      setStatus(e?.message ? String(e.message) : "Could not start OTP.");
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
        router.push("/discover");
        return;
      }
      setStatus(res?.error ? String(res.error) : "Verify failed.");
    } catch (e: any) {
      setStatus(e?.message ? String(e.message) : "Verify failed.");
    } finally {
      setVerifying(false);
    }
  }

  function onEmailKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      onSendOTP();
    }
  }

  function onOtpKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      onVerify();
    }
  }

  function dummyAltSignin(provider: string) {
    setStatus(`${provider} sign-in is not wired yet (placeholder).`);
  }

  return (
    <main style={styles.page}>
      {/* Soft “art” lights */}
      <div aria-hidden style={styles.glowA} />
      <div aria-hidden style={styles.glowB} />
      <div aria-hidden style={styles.glowC} />

      <section style={styles.shell}>
        {/* Left artwork / brand */}
        <div style={styles.brandPane}>
          <div aria-hidden style={styles.decorRing} />
          <div aria-hidden style={styles.decorBlob} />

          <img
            src="/frugalfetishes.png"
            alt="Frugal Fetishes"
            style={styles.brandImg}
            onError={(e) => {
              // If the file path is wrong, show a text fallback instead of a broken image icon.
              (e.currentTarget as HTMLImageElement).style.display = "none";
              setStatus('Brand image not found at /public/frugalfetishes.png (served as "/frugalfetishes.png").');
            }}
          />

          <div style={styles.brandCopy}>
            <div style={styles.taglineSmall}>Find your match — the FrugalFetishes way.</div>
            <div style={styles.taglineTiny}>
              By continuing, you agree to our Terms &amp; acknowledge our Privacy Policy.
            </div>
          </div>
        </div>

        {/* Right login UI */}
        <div style={styles.formPane}>
          <h1 style={styles.h1}>Welcome</h1>
          <p style={styles.sub}>Sign in with your email to continue.</p>

          <div style={styles.form}>
            <label style={styles.label}>Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={onEmailKeyDown}
              placeholder="you@domain.com"
              inputMode="email"
              autoComplete="email"
              style={styles.input}
            />

            <button
              onClick={onSendOTP}
              disabled={!canSend || sending}
              style={{
                ...styles.primaryBtn,
                opacity: !canSend || sending ? 0.6 : 1,
                cursor: !canSend || sending ? "not-allowed" : "pointer",
              }}
            >
              {sending ? "Sending..." : "Send OTP"}
            </button>

            <div style={styles.dividerRow}>
              <div style={styles.dividerLine} />
              <div style={styles.dividerText}>OTP</div>
              <div style={styles.dividerLine} />
            </div>

            <label style={styles.label}>OTP code</label>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              onKeyDown={onOtpKeyDown}
              placeholder="123456"
              inputMode="numeric"
              autoComplete="one-time-code"
              style={styles.input}
            />

            <button
              onClick={onVerify}
              disabled={!canVerify || verifying}
              style={{
                ...styles.secondaryBtn,
                opacity: !canVerify || verifying ? 0.6 : 1,
                cursor: !canVerify || verifying ? "not-allowed" : "pointer",
              }}
            >
              {verifying ? "Verifying..." : "Verify • Sign in"}
            </button>

            {devOtp ? (
              <div style={styles.devOtpBox}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>DEV OTP (testing)</div>
                <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                  {devOtp}
                </div>
              </div>
            ) : null}

            {status ? <div style={styles.status}>{status}</div> : null}

            <div style={styles.orRow}>
              <span style={styles.orLine} />
              <span style={styles.orText}>or</span>
              <span style={styles.orLine} />
            </div>

            <div style={styles.altGrid}>
              <button onClick={() => dummyAltSignin("Google")} style={styles.altBtn}>
                Continue with Google
              </button>
              <button onClick={() => dummyAltSignin("Facebook")} style={styles.altBtn}>
                Continue with Facebook
              </button>
              <button onClick={() => dummyAltSignin("Apple")} style={styles.altBtn}>
                Continue with Apple
              </button>
            </div>

            <div style={styles.helpRow}>
              <button onClick={() => setStatus("Registration is not wired yet (placeholder).")} style={styles.linkBtn}>
                Don&apos;t have an account? Register
              </button>
            </div>
          </div>

          <div aria-hidden style={styles.cornerFlower} />
          <div aria-hidden style={styles.cornerDot} />
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
    overflow: "hidden",
    background:
      "radial-gradient(1200px 700px at 20% 15%, rgba(255, 110, 199, 0.22), transparent 60%)," +
      "radial-gradient(900px 600px at 85% 30%, rgba(137, 84, 255, 0.22), transparent 55%)," +
      "radial-gradient(700px 500px at 55% 90%, rgba(255, 56, 156, 0.18), transparent 60%)," +
      "linear-gradient(135deg, #0d0612 0%, #13041d 40%, #080010 100%)",
    color: "rgba(255,255,255,0.92)",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  },

  glowA: {
    position: "fixed",
    inset: "auto auto 10% -10%",
    width: 520,
    height: 520,
    borderRadius: 9999,
    background: "radial-gradient(circle at 30% 30%, rgba(255, 66, 176, 0.35), transparent 60%)",
    filter: "blur(25px)",
    pointerEvents: "none",
  },
  glowB: {
    position: "fixed",
    inset: "-10% -10% auto auto",
    width: 620,
    height: 620,
    borderRadius: 9999,
    background: "radial-gradient(circle at 30% 30%, rgba(155, 100, 255, 0.35), transparent 60%)",
    filter: "blur(30px)",
    pointerEvents: "none",
  },
  glowC: {
    position: "fixed",
    inset: "auto 10% -15% auto",
    width: 520,
    height: 520,
    borderRadius: 9999,
    background: "radial-gradient(circle at 30% 30%, rgba(255, 130, 210, 0.22), transparent 60%)",
    filter: "blur(28px)",
    pointerEvents: "none",
  },

  shell: {
    width: "min(1100px, 96vw)",
    minHeight: 520,
    display: "grid",
    gridTemplateColumns: "1.25fr 1fr",
    borderRadius: 28,
    overflow: "hidden",
    boxShadow: "0 18px 80px rgba(0,0,0,0.55)",
    background: "rgba(255,255,255,0.06)",
    backdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.10)",
  },

  brandPane: {
    position: "relative",
    display: "grid",
    alignContent: "center",
    justifyItems: "center",
    padding: 34,
    background:
      "radial-gradient(900px 520px at 40% 40%, rgba(255, 72, 182, 0.18), transparent 70%)," +
      "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
  },

  decorRing: {
    position: "absolute",
    left: 28,
    top: 26,
    width: 120,
    height: 120,
    borderRadius: 9999,
    border: "2px solid rgba(255,255,255,0.14)",
    boxShadow: "0 0 0 10px rgba(255, 56, 170, 0.06)",
    transform: "rotate(-8deg)",
    pointerEvents: "none",
  },
  decorBlob: {
    position: "absolute",
    right: -60,
    bottom: -70,
    width: 220,
    height: 220,
    borderRadius: 9999,
    background:
      "radial-gradient(circle at 30% 30%, rgba(255, 88, 196, 0.22), rgba(121, 76, 255, 0.10) 50%, transparent 70%)",
    filter: "blur(1px)",
    pointerEvents: "none",
  },

  brandImg: {
    width: "min(520px, 42vw)",
    maxWidth: 520,
    height: "auto",
    display: "block",
    filter: "drop-shadow(0 14px 24px rgba(0,0,0,0.55))",
    transform: "translateY(-4px)",
  },

  brandCopy: {
    marginTop: 16,
    textAlign: "center",
    maxWidth: 520,
    padding: "0 8px",
  },
  taglineSmall: {
    fontSize: 14,
    letterSpacing: 0.2,
    color: "rgba(255,255,255,0.85)",
  },
  taglineTiny: {
    marginTop: 10,
    fontSize: 12,
    color: "rgba(255,255,255,0.62)",
    lineHeight: 1.4,
  },

  formPane: {
    position: "relative",
    padding: 34,
    display: "grid",
    alignContent: "center",
    background:
      "radial-gradient(900px 520px at 70% 20%, rgba(148, 96, 255, 0.20), transparent 62%)," +
      "linear-gradient(180deg, rgba(10, 6, 14, 0.25) 0%, rgba(10, 6, 14, 0.55) 100%)",
  },

  h1: {
    margin: 0,
    fontSize: 34,
    letterSpacing: -0.4,
  },
  sub: {
    marginTop: 8,
    marginBottom: 18,
    fontSize: 13,
    color: "rgba(255,255,255,0.72)",
  },

  form: {
    display: "grid",
    gap: 10,
  },

  label: {
    fontSize: 12,
    color: "rgba(255,255,255,0.72)",
    marginTop: 6,
  },

  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 9999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.92)",
    outline: "none",
  },

  primaryBtn: {
    marginTop: 6,
    padding: "12px 14px",
    borderRadius: 9999,
    border: "1px solid rgba(255, 88, 196, 0.42)",
    background:
      "linear-gradient(90deg, rgba(255, 66, 176, 0.85) 0%, rgba(126, 72, 255, 0.70) 100%)",
    color: "white",
    fontWeight: 700,
    letterSpacing: 0.2,
  },

  secondaryBtn: {
    padding: "12px 14px",
    borderRadius: 9999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.92)",
    fontWeight: 700,
  },

  dividerRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  dividerLine: {
    height: 1,
    background: "rgba(255,255,255,0.12)",
  },
  dividerText: {
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.55)",
  },

  devOtpBox: {
    marginTop: 6,
    padding: 12,
    borderRadius: 16,
    border: "1px dashed rgba(255, 180, 235, 0.45)",
    background: "rgba(255, 120, 220, 0.08)",
    color: "rgba(255,255,255,0.92)",
  },

  status: {
    marginTop: 2,
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.25)",
    color: "rgba(255,255,255,0.86)",
    fontSize: 12,
    lineHeight: 1.35,
  },

  orRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  orLine: {
    height: 1,
    background: "rgba(255,255,255,0.12)",
  },
  orText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },

  altGrid: {
    display: "grid",
    gap: 8,
    marginTop: 2,
  },
  altBtn: {
    padding: "12px 14px",
    borderRadius: 9999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    color: "rgba(255,255,255,0.92)",
    textAlign: "left",
    cursor: "pointer",
  },

  helpRow: {
    marginTop: 8,
    display: "flex",
    justifyContent: "center",
  },
  linkBtn: {
    border: "none",
    background: "transparent",
    color: "rgba(255, 180, 235, 0.92)",
    cursor: "pointer",
    fontSize: 12,
    textDecoration: "underline",
    textUnderlineOffset: 3,
  },

  cornerFlower: {
    position: "absolute",
    right: -70,
    top: -70,
    width: 220,
    height: 220,
    borderRadius: 9999,
    background:
      "radial-gradient(circle at 30% 30%, rgba(255, 88, 196, 0.16), rgba(126, 72, 255, 0.08) 55%, transparent 70%)",
    filter: "blur(1px)",
    pointerEvents: "none",
  },
  cornerDot: {
    position: "absolute",
    left: 18,
    bottom: 18,
    width: 90,
    height: 90,
    borderRadius: 9999,
    border: "2px solid rgba(255,255,255,0.10)",
    pointerEvents: "none",
    transform: "rotate(8deg)",
  },
};
