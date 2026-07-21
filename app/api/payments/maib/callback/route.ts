import { getOrderForPayment, markOrderPaid } from "@/db/orders";
import { verifyMaibCallback } from "@/lib/payments/maib";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const timestamp = request.headers.get("x-signature-timestamp") ?? "";
  const signature = request.headers.get("x-signature") ?? "";
  if (!(await verifyMaibCallback(rawBody, timestamp, signature))) {
    return Response.json({ error: "Invalid callback signature" }, { status: 401 });
  }

  let body: {
    checkoutId?: string;
    orderId?: string;
    paymentId?: string;
    paymentAmount?: number;
    paymentCurrency?: string;
    paymentStatus?: string;
    paymentExecutedAt?: string;
    paymentMethod?: string;
  };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid callback body" }, { status: 400 });
  }

  if (!body.orderId || !body.checkoutId || !body.paymentId || body.paymentStatus !== "Executed") {
    return Response.json({ received: true });
  }
  const order = await getOrderForPayment(body.orderId);
  if (!order) return Response.json({ error: "Unknown order" }, { status: 404 });
  if (
    order.payment_reference !== body.checkoutId ||
    Number(body.paymentAmount) !== order.total ||
    body.paymentCurrency !== order.currency
  ) {
    return Response.json({ error: "Payment does not match order" }, { status: 409 });
  }

  await markOrderPaid({
    orderId: order.id,
    provider: "maib",
    reference: body.paymentId,
    paymentMethod: body.paymentMethod,
    paidAt: body.paymentExecutedAt || new Date().toISOString(),
  });
  return Response.json({ received: true });
}
