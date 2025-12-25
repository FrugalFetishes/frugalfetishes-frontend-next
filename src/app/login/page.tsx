"use client";

import { useState } from "react";
import { startOTP, verifyOTP } from "@/lib/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");

  async function submitEmail() {
    await startOTP(email);
    setStage("code");
  }

  async function submitCode() {
    const res = await verifyOTP(email, code);
    if (res?.ok) location.href = "/discover";
  }

  return (
    <main style={{ padding: 32 }}>
      <h1>Login</h1>

      {stage === "email" && (
        <>
          <input placeholder="email" value={email} onChange={e => setEmail(e.target.value)} />
          <button onClick={submitEmail}>Send OTP</button>
        </>
      )}

      {stage === "code" && (
        <>
          <input placeholder="OTP code" value={code} onChange={e => setCode(e.target.value)} />
          <button onClick={submitCode}>Verify</button>
        </>
      )}
    </main>
  );
}
