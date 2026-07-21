import inventoryData from "@/content/inventory.json";
import { createOrder } from "@/db/orders";
import { env } from "cloudflare:workers";

type TelegramCheckoutItem = { sku?: string; quantity?: number };

function authorized(request: Request) {
  const configuredSecret = (env as unknown as Record<string, unknown>).ORDER_SERVICE_SECRET;
  const suppliedSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return typeof configuredSecret === "string" && configuredSecret.length >= 24 && suppliedSecret === configuredSecret;
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as {
    items?: TelegramCheckoutItem[];
    telegramUserId?: string;
    telegramUsername?: string;
    customerName?: string;
    email?: string;
    phone?: string;
    language?: "ro" | "ru" | "en";
  };
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 160);
  const phone = String(body.phone ?? "").trim().slice(0, 50);
  const phoneDigits = phone.replace(/\D/g, "");
  if (!body.telegramUserId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      phoneDigits.length < 8 || phoneDigits.length > 15 || !Array.isArray(body.items) || body.items.length < 1 || body.items.length > 20) {
    return Response.json({ error: "Invalid order" }, { status: 400 });
  }
  const items = [];
  const seenSkus = new Set<string>();
  for (const requestedItem of body.items) {
    const quantity = Number(requestedItem.quantity);
    const product = inventoryData.products.find((item) => item.sku === requestedItem.sku && item.telegram.enabled);
    if (!product || seenSkus.has(product.sku) || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      return Response.json({ error: "A product in the bag is invalid" }, { status: 400 });
    }
    if (product.availability === "stock" && product.stockQuantity < quantity) {
      return Response.json({ error: `${product.telegram.name} does not have enough stock` }, { status: 409 });
    }
    seenSkus.add(product.sku);
    items.push({ sku: product.sku, name: product.telegram.name, quantity, unitPrice: product.price });
  }
  const order = await createOrder({
    source: "telegram",
    customerName: String(body.customerName || body.telegramUsername || "Telegram customer").slice(0, 120),
    customerReference: String(body.telegramUserId),
    customerUsername: body.telegramUsername ? String(body.telegramUsername).slice(0, 80) : null,
    customerEmail: email,
    customerPhone: phone,
    customerLanguage: body.language === "ru" || body.language === "en" ? body.language : "ro",
    items,
    currency: "MDL",
  });
  return Response.json({ ...order, paymentPendingConfirmation: true }, { status: 201 });
}
