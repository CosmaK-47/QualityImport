import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getStaffRole, listResellerApplications, updateResellerApplication, type ResellerPackage, type ResellerStatus } from "@/db/orders";

const statuses = new Set<ResellerStatus>(["pending", "more_information", "approved", "rejected", "suspended"]);
const packages = new Set<ResellerPackage>(["none", "starter", "growth", "strategic"]);

async function authorize() {
  const user = await getChatGPTUser();
  if (!user) return { error: Response.json({ error: "Authentication required" }, { status: 401 }) };
  const role = await getStaffRole(user.email);
  if (role !== "admin" && role !== "moderator") return { error: Response.json({ error: "Admin or moderator access required" }, { status: 403 }) };
  return { user, role };
}

export async function GET() {
  const auth = await authorize();
  if (auth.error) return auth.error;
  return Response.json({ applications: await listResellerApplications() });
}

export async function PATCH(request: Request) {
  const auth = await authorize();
  if (auth.error) return auth.error;
  const body = await request.json() as { id?: string; status?: ResellerStatus; resellerPackage?: ResellerPackage; customDiscount?: number | null; internalNotes?: string };
  if (!body.id || !body.status || !statuses.has(body.status) || !body.resellerPackage || !packages.has(body.resellerPackage)) {
    return Response.json({ error: "Application, status and package are required" }, { status: 400 });
  }
  if (body.status === "approved" && body.resellerPackage === "none") {
    return Response.json({ error: "Approved resellers must have a package" }, { status: 400 });
  }
  const discount = body.customDiscount === null || body.customDiscount === undefined ? null : Number(body.customDiscount);
  if (discount !== null && (!Number.isInteger(discount) || discount < 0 || discount > 60)) {
    return Response.json({ error: "Custom discount must be between 0 and 60 percent" }, { status: 400 });
  }
  const ok = await updateResellerApplication({
    id: body.id, status: body.status, resellerPackage: body.resellerPackage,
    customDiscount: discount, internalNotes: String(body.internalNotes ?? "").trim().slice(0, 2000),
    actor: `staff:${auth.user!.email.toLowerCase()}`,
  });
  return ok ? Response.json({ ok: true }) : Response.json({ error: "Application not found" }, { status: 404 });
}
