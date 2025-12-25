"use client";

import { useState } from "react";
import { startOTP, verifyOTP } from "@/lib/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"email" | "otp">("email");
  const [status, setStatus] = useState("");
  const [devOtp, setDevOtp] = useState("");

  async function onSendOtp() {
    setStatus("");
    setDevOtp("");

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setStatus("Enter a valid email address, then click Send OTP.");
      return;
    }

    try {
      const res = await startOTP(cleanEmail);
      if (!res?.ok) {
        setStatus(res?.error ? String(res.error) : "OTP start failed.");
        return;
      }
      if (res?.devOtp) setDevOtp(String(res.devOtp));
      setStage("otp");
      setStatus("OTP started. Enter the code.");
    } catch (e: any) {
      setStatus(String(e?.message || e));
    }
  }

  async function onVerify() {
    setStatus("");
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    if (!cleanOtp) {
      setStatus("Enter the OTP code, then click Verify.");
      return;
    }

    try {
      const res = await verifyOTP(cleanEmail, cleanOtp);
      if (!res?.ok) {
        setStatus(res?.error ? String(res.error) : "Verify failed.");
        return;
      }
      setStatus("Verified. Redirecting…");
      window.location.href = "/discover";
    } catch (e: any) {
      setStatus(String(e?.message || e));
    }
  }

  return (
    <main style={{ padding: 32, maxWidth: 520 }}>
      <h1 style={{ marginTop: 0 }}>Login</h1>

      <div style={{ display: "grid", gap: 10 }}>
        <label>
          <div style={{ marginBottom: 6, opacity: 0.85 }}>Email</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSendOtp();
              }
            }}
            placeholder="you@example.com"
            autoComplete="email"
            style={{ width: "100%", padding: 10 }}
          />
        </label>

        {stage === "email" ? (
          <button onClick={onSendOtp} style={{ padding: "10px 14px" }}>
            Send OTP
          </button>
        ) : (
          <>
            {devOtp ? (
              <div style={{ padding: 10, border: "1px solid rgba(255,255,255,.2)", borderRadius: 8 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>DEV OTP (testing)</div>
                <div style={{ fontSize: 22, letterSpacing: 2 }}>{devOtp}</div>
              </div>
            ) : null}

            <label>
              <div style={{ marginBottom: 6, opacity: 0.85 }}>OTP Code</div>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onVerify();
              }
            }}
                placeholder="6-digit code"
                autoComplete="one-time-code"
                inputMode="numeric"
                style={{ width: "100%", padding: 10 }}
              />
            </label>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onVerify} style={{ padding: "10px 14px" }}>
                Verify
              </button>
              <button
                onClick={() => {
                  setStage("email");
                  setOtp("");
                  setStatus("");
                  setDevOtp("");
                }}
                style={{ padding: "10px 14px" }}
              >
                Back
              </button>
            </div>
          </>
        )}

        {status ? <div style={{ opacity: 0.9 }}><em>{status}</em></div> : null}
      </div>
    </main>
  );
}
