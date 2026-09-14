"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./finance.module.css";

type Product = { sku: string; name: string };

export default function FinanceManager({ products }: { products: Product[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  async function submit(event: FormEvent<HTMLFormElement>, kind: "purchase" | "expense") {
    event.preventDefault();
    setBusy(kind);
    setMessage("");
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    const response = await fetch("/api/staff/finance", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, kind }),
    });
    const result = await response.json() as { error?: string };
    if (!response.ok) setMessage(result.error ?? "The finance record could not be saved.");
    else {
      form.reset();
      setMessage(kind === "purchase" ? "Purchase cost recorded." : "Expense recorded.");
      router.refresh();
    }
    setBusy("");
  }

  return <>
    <section className={styles.forms}>
      <form onSubmit={(event) => void submit(event, "purchase")}>
        <div className={styles.formIntro}><p>PRODUCT COST</p><h2>Record a purchase</h2><span>Each purchase updates the product’s weighted-average acquisition cost.</span></div>
        <label>Product<select name="sku" required defaultValue=""><option value="" disabled>Select product</option>{products.map((product) => <option key={product.sku} value={product.sku}>{product.name} · {product.sku}</option>)}</select></label>
        <div className={styles.row}><label>Purchase date<input name="purchasedOn" type="date" required defaultValue={today} /></label><label>Quantity<input name="quantity" type="number" required min="1" step="1" /></label></div>
        <div className={styles.row}><label>Unit cost<input name="unitCost" type="number" required min="0.01" step="0.01" /></label><label>Currency<input name="currency" required defaultValue="MDL" maxLength={3} /></label><label>Rate to MDL<input name="fxRateToMdl" type="number" required min="0.000001" step="0.000001" defaultValue="1" /></label></div>
        <div className={styles.row}><label>Supplier<input name="supplier" maxLength={120} /></label><label>Invoice/reference<input name="reference" maxLength={120} /></label></div>
        <label>Notes<textarea name="notes" maxLength={500} rows={3} /></label>
        <button disabled={Boolean(busy)}>{busy === "purchase" ? "Saving…" : "Save purchase cost"}</button>
      </form>

      <form onSubmit={(event) => void submit(event, "expense")}>
        <div className={styles.formIntro}><p>BUSINESS COST</p><h2>Record an expense</h2><span>Use actual invoices or accounting records. Advertising imported from ad platforms is not entered here twice.</span></div>
        <div className={styles.row}><label>Date<input name="occurredOn" type="date" required defaultValue={today} /></label><label>Cost group<select name="scope" required defaultValue="physical"><option value="physical">Physical</option><option value="software">Software</option><option value="general">General</option></select></label></div>
        <label>Category<input name="category" required maxLength={80} placeholder="Shipping, tax, hosting, software…" /></label>
        <label>Description<input name="description" required maxLength={240} /></label>
        <div className={styles.row}><label>Amount<input name="amount" type="number" required min="0.01" step="0.01" /></label><label>Currency<input name="currency" required defaultValue="MDL" maxLength={3} /></label><label>Rate to MDL<input name="fxRateToMdl" type="number" required min="0.000001" step="0.000001" defaultValue="1" /></label></div>
        <label>Invoice/reference<input name="reference" maxLength={120} /></label>
        <button disabled={Boolean(busy)}>{busy === "expense" ? "Saving…" : "Save expense"}</button>
      </form>
    </section>
    {message && <p className={styles.message} role="status">{message}</p>}
  </>;
}
