"use client";

import { FormEvent, useEffect, useState } from "react";

export default function ResellerApplicationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [completed, setCompleted] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden"; window.addEventListener("keydown", close);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", close); };
  }, [open, onClose]);
  if (!open) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setResult("");
    const form = event.currentTarget; const data = new FormData(form);
    const response = await fetch("/api/resellers/apply", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(data.entries())) });
    const responseBody = await response.json();
    if (response.ok) { setCompleted(true); form.reset(); }
    else setResult(responseBody.error ?? "The application could not be submitted.");
    setBusy(false);
  }

  return <div className="business-modal-backdrop" onMouseDown={onClose}>
    <section className="business-modal" role="dialog" aria-modal="true" aria-labelledby="reseller-form-title" onMouseDown={(event) => event.stopPropagation()}>
      <button className="business-modal-close" type="button" onClick={onClose} aria-label="Close">×</button>
      <div className="business-modal-intro"><p>QI / BUSINESS ACCESS</p><h2 id="reseller-form-title">Build your next selection with us.</h2><span>Tell us about your business. Applications are reviewed by the Quality Imports team before wholesale prices are activated.</span><dl><div><dt>Review</dt><dd>24–72 hours</dd></div><div><dt>Minimum order</dt><dd>6 000 MDL</dd></div></dl></div>
      {completed ? <div className="business-complete"><span>APPLICATION RECEIVED</span><h3>Thank you. Your reseller request is now pending review.</h3><p>We will contact you using the email or telephone number supplied in the application.</p><button type="button" onClick={onClose}>Return to Quality Imports</button></div> :
      <form className="business-form" onSubmit={submit}>
        <input className="form-honeypot" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <div className="business-form-grid">
          <label>Contact person *<input name="contactName" required minLength={2} /></label>
          <label>Business or store name *<input name="businessName" required minLength={2} /></label>
          <label>Email *<input name="email" type="email" required /></label>
          <label>Telephone / WhatsApp *<input name="phone" type="tel" required /></label>
          <label>Country *<input name="country" defaultValue="Moldova" required /></label>
          <label>City *<input name="city" required /></label>
          <label>Business type *<select name="businessType" required defaultValue=""><option value="" disabled>Select</option><option>Online store</option><option>Physical boutique</option><option>Online and physical store</option><option>Marketplace seller</option><option>Other</option></select></label>
          <label>Estimated monthly purchases *<select name="monthlyVolume" required defaultValue=""><option value="" disabled>Select</option><option>Under 10 000 MDL</option><option>10 000–25 000 MDL</option><option>25 000–60 000 MDL</option><option>Over 60 000 MDL</option></select></label>
          <label>Website or social page<input name="website" type="url" placeholder="https://" /></label>
          <label>Company ID / IDNO<input name="registrationId" /></label>
        </div>
        <label>Product categories of interest *<input name="categories" required placeholder="Outerwear, shoes, accessories…" /></label>
        <label>Tell us about your business<textarea name="message" rows={4} /></label>
        <label className="business-consent"><input name="acceptedTerms" type="checkbox" value="true" required /><span>I confirm that the information is accurate and accept the <a href="/terms" target="_blank">terms</a> and <a href="/privacy" target="_blank">privacy notice</a>.</span></label>
        {result && <p className="business-form-error" role="alert">{result}</p>}
        <button className="business-submit" disabled={busy}>{busy ? "Submitting…" : "Submit reseller application"}</button>
      </form>}
    </section>
  </div>;
}
