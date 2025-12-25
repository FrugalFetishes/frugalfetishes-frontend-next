"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { startOTP, verifyOTP } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [devOtp, setDevOtp] = useState<string>("");

  const canSend = useMemo(() => email.trim().length > 3 && email.includes("@"), [email]);
  const canVerify = useMemo(() => email.trim().length > 3 && otp.trim().length >= 4, [email, otp]);

  const onSend = useCallback(async () => {
    if (!canSend || sending) return;
    setError("");
    setMessage("");
    setDevOtp("");
    setSending(true);
    try {
      const res: any = await startOTP(email.trim());
      if (res?.ok) {
        setMessage("OTP sent. Enter the code.");
        if (res?.devOtp) {
          setDevOtp(String(res.devOtp));
          setMessage("DEV OTP enabled (testing). Enter the code below.");
        }
      } else {
        setError(res?.error || res?.message || "Auth start failed.");
      }
    } catch (e: any) {
      setError(e?.message || "Auth start failed.");
    } finally {
      setSending(false);
    }
  }, [canSend, sending, email]);

  const onVerify = useCallback(async () => {
    if (!canVerify || verifying) return;
    setError("");
    setMessage("");
    setVerifying(true);
    try {
      const res: any = await verifyOTP(email.trim(), otp.trim());
      if (res?.ok) {
        router.push("/discover");
      } else {
        setError(res?.error || res?.message || "Verify failed.");
      }
    } catch (e: any) {
      setError(e?.message || "Verify failed.");
    } finally {
      setVerifying(false);
    }
  }, [canVerify, verifying, email, otp, router]);

  return (
    <main style={styles.page}>
      <div style={styles.bgGlow} aria-hidden />
      <div style={styles.shell}>
        {/* Left: Branding */}
        <section style={styles.brandPanel}>
          <div style={styles.brandImageWrap}>
            <Image
              src="/frugalfetishes.png"
              alt="FrugalFetishes"
              fill
              priority
              sizes="(max-width: 900px) 60vw, 520px"
              style={{ objectFit: "contain" }}
            />
          </div>
          <div style={styles.brandTagline}>
            Find your match — the FrugalFetishes way.
          </div>
        </section>

        {/* Right: Login */}
        <section style={styles.card} aria-label="Login">
          <h1 style={styles.h1}>Welcome</h1>
          <p style={styles.sub}>Log in with your email to continue.</p>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="email">Email</label>
            <input
              id="email"
              style={styles.input}
              placeholder="test@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSend();
                }
              }}
              autoComplete="email"
              inputMode="email"
            />
          </div>

          <button
            type="button"
            style={{ ...styles.btn, ...(sending ? styles.btnDisabled : null) }}
            disabled={!canSend || sending}
            onClick={onSend}
          >
            {sending ? "Sending..." : "Send OTP"}
          </button>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="otp">OTP code</label>
            <input
              id="otp"
              style={styles.input}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onVerify();
                }
              }}
              autoComplete="one-time-code"
              inputMode="numeric"
            />
          </div>

          <button
            type="button"
            style={{ ...styles.btnSecondary, ...(verifying ? styles.btnDisabled : null) }}
            disabled={!canVerify || verifying}
            onClick={onVerify}
          >
            {verifying ? "Verifying..." : "Verify + Sign In"}
          </button>

          {devOtp ? (
            <div style={styles.devBox} role="note">
              <div style={styles.devTitle}>DEV OTP (testing)</div>
              <div style={styles.devCode}>{devOtp}</div>
            </div>
          ) : null}

          {message ? <div style={styles.msg}>{message}</div> : null}
          {error ? <div style={styles.err}>{error}</div> : null}

          <div style={styles.hint}>
            Tip: you can press <b>Enter</b> in Email to send OTP, and <b>Enter</b> in OTP to verify.
          </div>
        </section>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 24,
    background:
      "radial-gradient(1200px 800px at 20% 20%, rgba(255,0,126,0.20), transparent 55%), radial-gradient(900px 700px at 70% 40%, rgba(124,58,237,0.22), transparent 60%), radial-gradient(1000px 900px at 40% 85%, rgba(0,255,209,0.12), transparent 60%), #07020a",
    color: "white",
    position: "relative",
    overflow: "hidden",
  },
  bgGlow: {
    position: "absolute",
    inset: -60,
    background:
      "radial-gradient(600px 500px at 15% 30%, rgba(255,58,120,0.18), transparent 60%), radial-gradient(650px 520px at 80% 35%, rgba(124,58,237,0.16), transparent 62%), radial-gradient(700px 600px at 35% 85%, rgba(34,211,238,0.10), transparent 60%)",
    filter: "blur(12px)",
    pointerEvents: "none",
  },
  shell: {
    width: "min(980px, 100%)",
    display: "grid",
    gridTemplateColumns: "1.1fr 0.9fr",
    gap: 18,
    padding: 18,
    borderRadius: 22,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 30px 90px rgba(0,0,0,0.55)",
    backdropFilter: "blur(10px)",
  },
  brandPanel: {
    minHeight: 420,
    borderRadius: 18,
    background: "rgba(0,0,0,0.20)",
    border: "1px solid rgba(255,255,255,0.10)",
    padding: 18,
    display: "grid",
    gridTemplateRows: "1fr auto",
    gap: 10,
    overflow: "hidden",
  },
  brandImageWrap: {
    position: "relative",
    width: "100%",
    height: 320,
    borderRadius: 16,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
  },
  brandTagline: {
    fontSize: 12,
    opacity: 0.8,
    paddingLeft: 6,
  },
  card: {
    borderRadius: 18,
    background: "linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.05))",
    border: "1px solid rgba(255,255,255,0.14)",
    padding: 18,
    display: "grid",
    gap: 10,
    alignContent: "start",
    minHeight: 420,
  },
  h1: { margin: 0, fontSize: 22, letterSpacing: 0.2 },
  sub: { margin: 0, opacity: 0.8, fontSize: 13 },
  field: { display: "grid", gap: 6, marginTop: 6 },
  label: { fontSize: 12, opacity: 0.85 },
  input: {
    height: 40,
    padding: "0 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.16)",
    outline: "none",
    background: "rgba(0,0,0,0.25)",
    color: "white",
  },
  btn: {
    height: 40,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "linear-gradient(90deg, rgba(255,0,126,0.92), rgba(124,58,237,0.92))",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 8,
  },
  btnSecondary: {
    height: 40,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.08)",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 6,
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  devBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    border: "1px dashed rgba(255,255,255,0.20)",
    background: "rgba(0,0,0,0.25)",
  },
  devTitle: { fontSize: 12, opacity: 0.85 },
  devCode: { fontSize: 20, fontWeight: 800, letterSpacing: 2, marginTop: 4 },
  msg: { marginTop: 8, fontSize: 12, opacity: 0.9 },
  err: { marginTop: 8, fontSize: 12, color: "#ff9ab8" },
  hint: { marginTop: 10, fontSize: 11, opacity: 0.75, lineHeight: 1.35 },
};

