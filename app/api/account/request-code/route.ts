import { env } from "cloudflare:workers";

export async function POST(request: Request) {
  const body = await request.json() as { email?: string };
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 160);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  const values = env as unknown as Record<string, unknown>;
  const url = typeof values.SUPABASE_URL === "string" ? values.SUPABASE_URL.replace(/\/$/, "") : "";
  const key = typeof values.SUPABASE_ANON_KEY === "string" ? values.SUPABASE_ANON_KEY : "";
  if (!url || !key) return Response.json({ error: "Customer email access is prepared but not connected yet." }, { status: 503 });
  const response = await fetch(`${url}/auth/v1/otp`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify({ email, create_user: true }) });
  if (!response.ok) return Response.json({ error: "The verification email could not be sent. Try again shortly." }, { status: 502 });
  return Response.json({ ok: true });
}
