import { env } from "cloudflare:workers";

type MaibEnvironment = Record<string, unknown>;

function configuration() {
  const values = env as unknown as MaibEnvironment;
  const clientId = typeof values.MAIB_CLIENT_ID === "string" ? values.MAIB_CLIENT_ID : "";
  const clientSecret = typeof values.MAIB_CLIENT_SECRET === "string" ? values.MAIB_CLIENT_SECRET : "";
  const signatureKey = typeof values.MAIB_SIGNATURE_KEY === "string" ? values.MAIB_SIGNATURE_KEY : "";
  const apiBaseUrl = typeof values.MAIB_API_BASE_URL === "string"
    ? values.MAIB_API_BASE_URL.replace(/\/$/, "")
    : "https://sandbox.maibmerchants.md";
  return { clientId, clientSecret, signatureKey, apiBaseUrl };
}

export function maibCheckoutConfigured() {
  const config = configuration();
  return Boolean(config.clientId && config.clientSecret && config.signatureKey);
}

async function accessToken() {
  const config = configuration();
  const response = await fetch(`${config.apiBaseUrl}/v2/auth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ clientId: config.clientId, clientSecret: config.clientSecret }),
  });
  const body = await response.json() as {
    ok?: boolean;
    result?: { accessToken?: string; tokenType?: string };
    errors?: Array<{ errorMessage?: string }>;
  };
  if (!response.ok || !body.ok || !body.result?.accessToken) {
    throw new Error(body.errors?.[0]?.errorMessage || "maib authentication failed");
  }
  return `${body.result.tokenType || "Bearer"} ${body.result.accessToken}`;
}

export async function createMaibCheckout(input: {
  orderId: string;
  orderNumber: string;
  total: number;
  currency: string;
  createdAt: string;
  items: Array<{ sku: string; name: string; quantity: number; unitPrice: number }>;
  customer: { name: string; email?: string; phone?: string; ip?: string; userAgent?: string };
  language: "ro" | "ru" | "en";
  publicOrigin: string;
}) {
  const config = configuration();
  const authorization = await accessToken();
  const response = await fetch(`${config.apiBaseUrl}/v2/checkouts`, {
    method: "POST",
    headers: { authorization, "content-type": "application/json" },
    body: JSON.stringify({
      amount: input.total,
      currency: input.currency,
      orderInfo: {
        id: input.orderNumber,
        description: `Quality Imports order ${input.orderNumber}`,
        date: input.createdAt,
        orderAmount: input.total,
        orderCurrency: input.currency,
        deliveryAmount: 0,
        deliveryCurrency: input.currency,
        items: input.items.map((item, index) => ({
          externalId: item.sku,
          title: item.name,
          amount: item.unitPrice,
          currency: input.currency,
          quantity: item.quantity,
          displayOrder: index + 1,
        })),
      },
      payerInfo: {
        name: input.customer.name,
        email: input.customer.email,
        phone: input.customer.phone,
        ip: input.customer.ip,
        userAgent: input.customer.userAgent,
      },
      language: input.language,
      callbackUrl: `${input.publicOrigin}/api/payments/maib/callback`,
      successUrl: `${input.publicOrigin}/payment/return?result=success&order=${encodeURIComponent(input.orderNumber)}`,
      failUrl: `${input.publicOrigin}/payment/return?result=failed&order=${encodeURIComponent(input.orderNumber)}`,
    }),
  });
  const body = await response.json() as {
    ok?: boolean;
    result?: { checkoutId?: string; checkoutUrl?: string };
    errors?: Array<{ errorMessage?: string }> | { errorMessage?: string };
  };
  const errorMessage = Array.isArray(body.errors) ? body.errors[0]?.errorMessage : body.errors?.errorMessage;
  if (!response.ok || !body.ok || !body.result?.checkoutId || !body.result.checkoutUrl) {
    throw new Error(errorMessage || "maib checkout creation failed");
  }
  return { reference: body.result.checkoutId, url: body.result.checkoutUrl };
}

function decodeSignature(value: string) {
  const normalized = value.replace(/^sha256=/i, "").trim();
  if (/^[a-f0-9]{64}$/i.test(normalized)) {
    return Uint8Array.from(normalized.match(/.{2}/g)!.map((byte) => Number.parseInt(byte, 16)));
  }
  try {
    return Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
  } catch {
    return new Uint8Array();
  }
}

export async function verifyMaibCallback(rawBody: string, timestamp: string, suppliedSignature: string) {
  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber) || Math.abs(Date.now() - timestampNumber) > 5 * 60 * 1000) return false;
  const secret = configuration().signatureKey;
  if (!secret) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${rawBody}.${timestamp}`)));
  const supplied = decodeSignature(suppliedSignature);
  if (expected.length !== supplied.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) difference |= expected[index] ^ supplied[index];
  return difference === 0;
}
