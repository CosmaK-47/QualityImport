import inventoryData from "@/content/inventory.json";
import { attachPaymentSession, createOrder } from "@/db/orders";
import { createMaibCheckout, maibCheckoutConfigured } from "@/lib/payments/maib";

type CheckoutItem = { sku?: string; quantity?: number };

export async function POST(request: Request) {
  const body = await request.json() as {
    customerName?: string;
    email?: string;
    phone?: string;
    delivery?: string;
    items?: CheckoutItem[];
    company?: string;
  };

  if (body.company) return Response.json({ error: "Invalid checkout" }, { status: 400 });
  const customerName = String(body.customerName ?? "").trim().slice(0, 120);
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 160);
  const phone = String(body.phone ?? "").trim().slice(0, 50);
  const delivery = String(body.delivery ?? "").trim().slice(0, 300);
  if (customerName.length < 2 || !email.includes("@") || phone.length < 6 || delivery.length < 4) {
    return Response.json({ error: "Complete all customer and delivery fields" }, { status: 400 });
  }
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 20) {
    return Response.json({ error: "The bag is empty or invalid" }, { status: 400 });
  }

  const items = [];
  for (const requestedItem of body.items) {
    const quantity = Number(requestedItem.quantity);
    const product = inventoryData.products.find((item) => item.sku === requestedItem.sku && item.website.enabled);
    if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      return Response.json({ error: "A product in the bag is invalid" }, { status: 400 });
    }
    if (product.availability === "stock" && product.stockQuantity < quantity) {
      return Response.json({ error: `${product.website.name} does not have enough stock` }, { status: 409 });
    }
    items.push({ sku: product.sku, name: product.website.name, quantity, unitPrice: product.price });
  }

  const order = await createOrder({
    source: "website",
    customerName,
    customerReference: `${email} · ${phone} · ${delivery}`,
    customerUsername: null,
    items,
    currency: "MDL",
  });
  if (!maibCheckoutConfigured()) {
    return Response.json({ ...order, paymentSetupRequired: true }, { status: 202 });
  }
  try {
    const origin = new URL(request.url).origin;
    const checkout = await createMaibCheckout({
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: order.total,
      currency: order.currency,
      createdAt: new Date().toISOString(),
      items,
      customer: {
        name: customerName,
        email,
        phone,
        ip: request.headers.get("cf-connecting-ip") ?? undefined,
        userAgent: request.headers.get("user-agent") ?? undefined,
      },
      language: "ro",
      publicOrigin: origin,
    });
    await attachPaymentSession({ orderId: order.id, provider: "maib", ...checkout });
    return Response.json({ ...order, paymentStatus: "awaiting_payment", checkoutUrl: checkout.url }, { status: 201 });
  } catch (error) {
    console.error("Could not create maib checkout", error);
    return Response.json({ ...order, paymentSetupRequired: true }, { status: 202 });
  }
}
