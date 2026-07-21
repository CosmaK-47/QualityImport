"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./order-actions.module.css";

type Props = {
  orderId: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  canManagePayment: boolean;
};

export default function OrderActions({ orderId, orderNumber, status, paymentStatus, canManagePayment }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function update(action: string, extra: Record<string, string> = {}) {
    if (action === "cancel" && !window.confirm(`Cancel ${orderNumber}?`)) return;
    setBusy(action); setError("");
    const response = await fetch("/api/staff/orders", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId, action, ...extra }),
    });
    const result = await response.json() as { error?: string };
    if (!response.ok) setError(result.error ?? "The order could not be updated.");
    else router.refresh();
    setBusy("");
  }

  function markPaid(paymentMethod: "mia" | "bank_transfer") {
    const reference = window.prompt(`Enter the bank transaction/reference number for ${orderNumber}:`);
    if (!reference?.trim()) return;
    void update("mark_paid", { paymentMethod, paymentReference: reference.trim() });
  }

  if (status === "cancelled" || status === "delivered") return <span className={styles.finished}>Workflow complete</span>;
  return <div className={styles.actions}>
    {status === "new" && <button disabled={Boolean(busy)} onClick={() => void update("confirm")}>Confirm availability</button>}
    {canManagePayment && paymentStatus === "setup_required" && <button disabled={Boolean(busy)} onClick={() => void update("payment_requested")}>Payment instructions sent</button>}
    {canManagePayment && paymentStatus === "awaiting_payment" && <>
      <button disabled={Boolean(busy)} onClick={() => markPaid("mia")}>Verify MIA payment</button>
      <button disabled={Boolean(busy)} onClick={() => markPaid("bank_transfer")}>Verify bank transfer</button>
    </>}
    {status === "confirmed" && paymentStatus === "paid" && <button disabled={Boolean(busy)} onClick={() => void update("preparing")}>Start preparing</button>}
    {status === "preparing" && paymentStatus === "paid" && <button disabled={Boolean(busy)} onClick={() => void update("ready")}>Ready to ship</button>}
    {status === "ready" && paymentStatus === "paid" && <button disabled={Boolean(busy)} onClick={() => void update("delivered")}>Mark delivered</button>}
    {canManagePayment && <button className={styles.danger} disabled={Boolean(busy)} onClick={() => void update("cancel")}>Cancel</button>}
    {error && <small className={styles.error}>{error}</small>}
  </div>;
}
