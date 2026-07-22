import { createResellerApplication } from "@/db/orders";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

export async function POST(request: Request) {
  const body = await request.json() as Record<string, unknown>;
  if (body.company) return Response.json({ error: "Invalid application" }, { status: 400 });
  const application = {
    contactName: text(body.contactName, 120), businessName: text(body.businessName, 160),
    email: text(body.email, 160).toLowerCase(), phone: text(body.phone, 50),
    country: text(body.country, 80), city: text(body.city, 100), businessType: text(body.businessType, 80),
    website: text(body.website, 240) || null, monthlyVolume: text(body.monthlyVolume, 80),
    categories: text(body.categories, 300), registrationId: text(body.registrationId, 100) || null,
    message: text(body.message, 1200) || null,
  };
  if (application.contactName.length < 2 || application.businessName.length < 2 || !emailPattern.test(application.email) ||
      application.phone.replace(/\D/g, "").length < 8 || !application.country || !application.city ||
      !application.businessType || !application.monthlyVolume || !application.categories || (body.acceptedTerms !== true && body.acceptedTerms !== "true")) {
    return Response.json({ error: "Complete all required fields and accept the reseller terms." }, { status: 400 });
  }
  const result = await createResellerApplication(application);
  if (result.duplicate) return Response.json({ error: "An active application already exists for this email." }, { status: 409 });
  return Response.json({ id: result.id, status: "pending" }, { status: 201 });
}
