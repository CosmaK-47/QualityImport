import inventoryData from "@/content/inventory.json";
import { createOrder } from "@/db/orders";
import { env } from "cloudflare:workers";

function authorized(request: Request) {
  const configuredSecret = (env as unknown as Record<string, unknown>).ORDER_SERVICE_SECRET;
  const suppliedSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return typeof configuredSecret === "string" && configuredSecret.length >= 24 && suppliedSecret === configuredSecret;
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as {
    sku?: string;
    telegramUserId?: string;
    telegramUsername?: string;
    customerName?: string;
    email?: string;
    phone?: string;
    quantity?: number;
    language?: "ro" | "ru" | "en";
  };
  const quantity = Number(body.quantity ?? 1);
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 160);
  const phone = String(body.phone ?? "").trim().slice(0, 50);
  const phoneDigits = phone.replace(/\D/g, "");
  if (!body.sku || !body.telegramUserId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      phoneDigits.length < 8 || phoneDigits.length > 15 || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
    return Response.json({ error: "Invalid order" }, { status: 400 });
  }
  const product = inventoryData.products.find((item) => item.sku === body.sku && item.telegram.enabled);
  if (!product) return Response.json({ error: "Product unavailable" }, { status: 404 });
  if (product.availability === "stock" && product.stockQuantity < quantity) {
    return Response.json({ error: "Insufficient stock" }, { status: 409 });
  }
  const order = await createOrder({
    source: "telegram",
    customerName: String(body.customerName || body.telegramUsername || "Telegram customer").slice(0, 120),
    customerReference: String(body.telegramUserId),
    customerUsername: body.telegramUsername ? String(body.telegramUsername).slice(0, 80) : null,
    customerEmail: email,
    customerPhone: phone,
    customerLanguage: body.language === "ru" || body.language === "en" ? body.language : "ro",
    items: [{ sku: product.sku, name: product.telegram.name, quantity, unitPrice: product.price }],
    currency: product.currency,
  });
  return Response.json({ ...order, paymentPendingConfirmation: true }, { status: 201 });
}
