"use client";

import { FormEvent, useState } from "react";

export default function AccountAccessModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState(""); const [code, setCode] = useState(""); const [step, setStep] = useState<"email"|"code"|"done">("email"); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  if (!open) return null;
  async function requestCode(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const response = await fetch("/api/account/request-code", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    const result = await response.json(); if(response.ok){setStep("code");setMessage("Check your email for the six-digit Quality Imports code.")}else setMessage(result.error??"Could not send the code.");setBusy(false);
  }
  async function verifyCode(event: FormEvent){event.preventDefault();setBusy(true);setMessage("");const response=await fetch("/api/account/verify-code",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,code})});const result=await response.json();if(response.ok){setStep("done");setMessage("Your email is verified and this device is now signed in.")}else setMessage(result.error??"The code could not be verified.");setBusy(false)}
  return <div className="account-modal-backdrop" onMouseDown={onClose}><section className="account-modal" role="dialog" aria-modal="true" aria-labelledby="account-title" onMouseDown={(event) => event.stopPropagation()}>
    <button type="button" className="business-modal-close" onClick={onClose}>×</button><p>QI / CUSTOMER ACCOUNT</p><h2 id="account-title">Your orders, one secure code away.</h2><span>Enter the email used for your orders or reseller application. We never ask for your email password.</span>
    {step==="email"&&<form onSubmit={requestCode}><label>Email address<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><button disabled={busy}>{busy ? "Sending…" : "Send six-digit code"}</button></form>}
    {step==="code"&&<form onSubmit={verifyCode}><label>Six-digit code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event)=>setCode(event.target.value.replace(/\D/g,"").slice(0,6))} placeholder="000000" /></label><button disabled={busy}>{busy?"Verifying…":"Verify and sign in"}</button><button type="button" className="account-secondary" onClick={()=>{setStep("email");setCode("");setMessage("")}}>Use another email</button></form>}
    {step==="done"&&<button className="account-done" type="button" onClick={onClose}>Continue</button>}
    {message && <p className="account-message" role="status">{message}</p>}<small>The code is single-use and expires shortly. A different device can request a new code at any time.</small>
  </section></div>;
}
