import { env } from "cloudflare:workers";

function settings() {
  const values = env as unknown as Record<string, unknown>;
  return {
    apiKey: typeof values.RESEND_API_KEY === "string" ? values.RESEND_API_KEY : "",
    from: typeof values.ORDER_EMAIL_FROM === "string" ? values.ORDER_EMAIL_FROM : "",
    replyTo: typeof values.ORDER_EMAIL_REPLY_TO === "string" ? values.ORDER_EMAIL_REPLY_TO : "",
  };
}

export function orderEmailConfigured() {
  const value = settings();
  return Boolean(value.apiKey && value.from);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character]!);
}

function money(value: number, currency: string) {
  return `${new Intl.NumberFormat("ro-MD").format(value)} ${currency}`;
}

export async function sendOrderConfirmation(input: {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: Array<{ sku: string; name: string; quantity: number; unitPrice: number }>;
  total: number;
  currency: string;
  paymentUrl?: string | null;
}) {
  if (!orderEmailConfigured()) return { status: "not_configured" as const };
  const config = settings();
  const rows = input.items.map((item) => `<tr>
    <td style="padding:12px 0;border-bottom:1px solid #ddd"><strong>${escapeHtml(item.name)}</strong><br><span style="color:#666">${escapeHtml(item.sku)}</span></td>
    <td style="padding:12px 0;border-bottom:1px solid #ddd;text-align:center">${item.quantity}</td>
    <td style="padding:12px 0;border-bottom:1px solid #ddd;text-align:right">${escapeHtml(money(item.unitPrice * item.quantity, input.currency))}</td>
  </tr>`).join("");
  const paymentSection = input.paymentUrl
    ? `<p style="margin:28px 0"><a href="${escapeHtml(input.paymentUrl)}" style="display:inline-block;padding:14px 22px;background:#111;color:#fff;text-decoration:none;font-weight:700">Pay securely online</a></p>
       <p style="color:#666;font-size:13px">Your order will be prepared only after the bank confirms payment.</p>`
    : `<p style="padding:14px;background:#fff4d6;color:#684d00">Online payment is being activated. Quality Imports will contact you with payment instructions, and the order will not be shipped before payment.</p>`;
  const html = `<!doctype html><html><body style="margin:0;background:#f2f0eb;font-family:Arial,sans-serif;color:#171713">
    <div style="max-width:640px;margin:0 auto;padding:32px 18px">
      <div style="background:#111;color:#fff;padding:24px 28px"><span style="font-family:Georgia,serif;font-size:28px">QI</span><span style="margin-left:14px;letter-spacing:.18em;font-size:11px">QUALITY IMPORTS</span></div>
      <div style="background:#fff;padding:30px 28px">
        <p style="color:#777;font-size:11px;letter-spacing:.15em">ORDER RECEIVED</p>
        <h1 style="font-family:Georgia,serif;font-size:36px;margin:12px 0 8px">Thank you, ${escapeHtml(input.customerName)}.</h1>
        <p>We received order <strong>${escapeHtml(input.orderNumber)}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin-top:24px"><thead><tr><th style="text-align:left">Product</th><th>Qty</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
        <p style="font-size:20px;text-align:right"><strong>Total: ${escapeHtml(money(input.total, input.currency))}</strong></p>
        ${paymentSection}
        <p style="margin-top:32px;color:#777;font-size:12px;line-height:1.6">Keep this email for your records. Reply to this message if you need help with your order.</p>
      </div>
    </div>
  </body></html>`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
      "idempotency-key": `qi-order-${input.orderId}`,
      "user-agent": "QualityImports/1.0",
    },
    body: JSON.stringify({
      from: config.from,
      to: [input.customerEmail],
      reply_to: config.replyTo || undefined,
      subject: `Quality Imports order ${input.orderNumber}`,
      html,
      tags: [{ name: "order_id", value: input.orderId.replaceAll("-", "") }],
    }),
  });
  const body = await response.json() as { id?: string; message?: string };
  if (!response.ok || !body.id) throw new Error(body.message || "Order email could not be sent");
  return { status: "sent" as const, messageId: body.id };
}
