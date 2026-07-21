import Link from "next/link";

export default async function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string; order?: string }>;
}) {
  const values = await searchParams;
  const succeeded = values.result === "success";
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#0a0a0b", color: "#f4f4f2" }}>
      <section style={{ width: "min(620px, 100%)", border: "1px solid #444", padding: "48px", background: "#17181b" }}>
        <p style={{ color: "#aeb4bc", letterSpacing: ".16em", fontSize: 11 }}>QI / PAYMENT</p>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 46, margin: "18px 0" }}>
          {succeeded ? "Payment received." : "Payment was not completed."}
        </h1>
        <p style={{ color: "#d9dde2", lineHeight: 1.7 }}>
          {succeeded
            ? "The bank is securely confirming the transaction. Your order will appear as paid for our staff after verification."
            : "Your order has not been paid. You can return to the shop and try again."}
        </p>
        {values.order && <p style={{ color: "#aeb4bc" }}>Order: <b>{values.order.slice(0, 40)}</b></p>}
        <Link href="/" style={{ display: "inline-block", marginTop: 24, padding: "14px 20px", background: "#f4f4f2", color: "#0a0a0b" }}>Return to Quality Imports</Link>
      </section>
    </main>
  );
}
