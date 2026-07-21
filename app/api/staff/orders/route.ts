import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  attachPaymentSession,
  getOrderForConfirmation,
  getOrderWorkflow,
  getStaffRole,
  markOrderPaid,
  markPaymentRequested,
  updateOrderStatus,
} from "@/db/orders";
import { createMaibCheckout, maibCheckoutConfigured } from "@/lib/payments/maib";
import { sendTelegramOrderConfirmed } from "@/lib/telegram/order-notifications";

type StaffAction = "confirm" | "payment_requested" | "mark_paid" | "preparing" | "ready" | "delivered" | "cancel";

export async function PATCH(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  const role = await getStaffRole(user.email);
  if (!role) return Response.json({ error: "Staff access required" }, { status: 403 });

  const body = await request.json() as {
    orderId?: string;
    action?: StaffAction;
    paymentReference?: string;
    paymentMethod?: "mia" | "bank_transfer";
  };
  const orderId = String(body.orderId ?? "");
  const action = body.action;
  if (!orderId || !action) return Response.json({ error: "Order and action are required" }, { status: 400 });
  const order = await getOrderWorkflow(orderId);
  if (!order) return Response.json({ error: "Order not found" }, { status: 404 });
  const actor = `staff:${user.email.toLowerCase()}`;
  const canManagePayment = role === "admin" || role === "moderator";

  if (action === "confirm") {
    if (order.status !== "new") return invalidTransition();
    await updateOrderStatus({ orderId, status: "confirmed", actor });
    const confirmedOrder = await getOrderForConfirmation(orderId);
    if (confirmedOrder?.source === "telegram") {
      let checkoutUrl = confirmedOrder.payment_url;
      let paymentReady = Boolean(checkoutUrl);
      if (!checkoutUrl && maibCheckoutConfigured()) {
        try {
          const checkout = await createMaibCheckout({
            orderId: confirmedOrder.id, orderNumber: confirmedOrder.order_number,
            total: confirmedOrder.total, currency: confirmedOrder.currency,
            createdAt: confirmedOrder.created_at, items: confirmedOrder.items,
            customer: { name: confirmedOrder.customer_name, email: confirmedOrder.customer_email ?? undefined, phone: confirmedOrder.customer_phone ?? undefined },
            language: confirmedOrder.customer_language === "ru" || confirmedOrder.customer_language === "en" ? confirmedOrder.customer_language : "ro",
            publicOrigin: new URL(request.url).origin,
          });
          await attachPaymentSession({ orderId, provider: "maib", ...checkout });
          checkoutUrl = checkout.url;
          paymentReady = true;
        } catch (error) {
          console.error("Could not create payment after confirmation", error);
        }
      }
      try {
        const notification = await sendTelegramOrderConfirmed({ chatId: confirmedOrder.customer_reference, orderNumber: confirmedOrder.order_number, language: confirmedOrder.customer_language, checkoutUrl });
        return Response.json({ ok: true, notice: notification.status === "not_configured"
          ? "Availability confirmed, but Telegram notifications need TELEGRAM_BOT_TOKEN in the website environment."
          : paymentReady ? "Customer notified with the payment button." : "Customer notified. Add maib credentials to enable the payment button." });
      } catch (error) {
        console.error("Could not notify Telegram customer", error);
        return Response.json({ ok: true, notice: "Availability confirmed, but the Telegram notification failed. Check the bot connection." });
      }
    }
  } else if (action === "payment_requested") {
    if (!canManagePayment) return Response.json({ error: "Admin or moderator access required" }, { status: 403 });
    if (order.status === "cancelled" || order.status === "delivered" || order.payment_status === "paid") return invalidTransition();
    await markPaymentRequested({ orderId, actor });
  } else if (action === "mark_paid") {
    if (!canManagePayment) return Response.json({ error: "Admin or moderator access required" }, { status: 403 });
    const reference = String(body.paymentReference ?? "").trim().slice(0, 120);
    if (reference.length < 3 || (body.paymentMethod !== "mia" && body.paymentMethod !== "bank_transfer")) {
      return Response.json({ error: "Payment method and bank reference are required" }, { status: 400 });
    }
    if (order.status === "cancelled" || order.payment_status === "paid") return invalidTransition();
    await markOrderPaid({
      orderId,
      provider: "manual",
      reference,
      paymentMethod: body.paymentMethod,
      paidAt: new Date().toISOString(),
      actor,
    });
  } else if (action === "preparing") {
    if (order.status !== "confirmed" || order.payment_status !== "paid") {
      return Response.json({ error: "Confirm the order and verify payment before preparation" }, { status: 409 });
    }
    await updateOrderStatus({ orderId, status: "preparing", actor });
  } else if (action === "ready") {
    if (order.status !== "preparing" || order.payment_status !== "paid") return invalidTransition();
    await updateOrderStatus({ orderId, status: "ready", actor });
  } else if (action === "delivered") {
    if (order.status !== "ready" || order.payment_status !== "paid") return invalidTransition();
    await updateOrderStatus({ orderId, status: "delivered", actor });
  } else if (action === "cancel") {
    if (!canManagePayment) return Response.json({ error: "Admin or moderator access required" }, { status: 403 });
    if (order.status === "cancelled" || order.status === "delivered") return invalidTransition();
    await updateOrderStatus({ orderId, status: "cancelled", actor });
  } else {
    return Response.json({ error: "Unknown action" }, { status: 400 });
  }

  return Response.json({ ok: true });
}

function invalidTransition() {
  return Response.json({ error: "This action is not available at the current order stage" }, { status: 409 });
}
