import { env } from "cloudflare:workers";

export async function POST(request: Request) {
  const body = await request.json() as { email?: string; code?: string };
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 160);
  const code = String(body.code ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(code)) return Response.json({ error: "Enter the six-digit code from your email." }, { status: 400 });
  const values = env as unknown as Record<string, unknown>;
  const url = typeof values.SUPABASE_URL === "string" ? values.SUPABASE_URL.replace(/\/$/, "") : "";
  const key = typeof values.SUPABASE_ANON_KEY === "string" ? values.SUPABASE_ANON_KEY : "";
  if (!url || !key) return Response.json({ error: "Customer email access is not connected yet." }, { status: 503 });
  const response = await fetch(`${url}/auth/v1/verify`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify({ email, token: code, type: "email" }) });
  if (!response.ok) return Response.json({ error: "That code is invalid or has expired. Request a new one." }, { status: 401 });
  const session = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!session.access_token || !session.refresh_token) return Response.json({ error: "A secure session could not be created." }, { status: 502 });
  const headers = new Headers({ "content-type": "application/json" });
  headers.append("set-cookie", `qi_customer_access=${encodeURIComponent(session.access_token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.max(300, Number(session.expires_in ?? 3600))}`);
  headers.append("set-cookie", `qi_customer_refresh=${encodeURIComponent(session.refresh_token)}; Path=/api/account; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`);
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
