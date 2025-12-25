"use client";

import { useState } from "react";
import { startOTP, verifyOTP } from "@/lib/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [status, setStatus] = useState("");

  async function submitEmail() {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setStatus("Please enter a valid email.");
      return;
    }

    setStatus("Sending OTP…");

    const res = await startOTP(cleanEmail);

    if (!res?.ok) {
      setStatus(res?.error || "OTP failed.");
      return;
    }

    setStage("code");
    setStatus("OTP sent. Enter the code.");
  }

  async function submitCode() {
    const cleanCode = code.trim();
    if (!cleanCode) {
      setStatus("Enter the code.");
      return;
    }

    const res = await verifyOTP(email.trim().toLowerCase(), cleanCode);

    if (!res?.ok) {
      setStatus(res?.error || "Verification failed.");
      return;
    }

    location.href = "/discover";
  }

  return (
    <main style={{ padding: 32 }}>
      <h1>Login</h1>

      {stage === "email" && (
        <>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ padding: 10, width: 280 }}
          />
          <br /><br />
          <button onClick={submitEmail}>Send OTP</button>
        </>
      )}

      {stage === "code" && (
        <>
          <input
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="OTP code"
            style={{ padding: 10, width: 140 }}
          />
          <br /><br />
          <button onClick={submitCode}>Verify</button>
        </>
      )}

      <p>{status}</p>
    </main>
  );
}
