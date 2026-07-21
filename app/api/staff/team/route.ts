import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  configuredAdminEmails,
  getStaffRole,
  listStaffAccounts,
  updateStaffAccount,
  upsertStaffAccount,
  type StaffRole,
} from "@/db/orders";

const roles = new Set<StaffRole>(["admin", "moderator", "worker"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireAdmin() {
  const user = await getChatGPTUser();
  if (!user) return { error: Response.json({ error: "Authentication required" }, { status: 401 }) };
  const role = await getStaffRole(user.email);
  if (role !== "admin") return { error: Response.json({ error: "Admin access required" }, { status: 403 }) };
  return { user };
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  return Response.json({ accounts: await listStaffAccounts() });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const body = await request.json() as { email?: string; role?: StaffRole };
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!emailPattern.test(email) || !body.role || !roles.has(body.role)) {
    return Response.json({ error: "Valid email and role are required" }, { status: 400 });
  }
  if (configuredAdminEmails().includes(email)) {
    return Response.json({ error: "This owner is managed through the environment allowlist" }, { status: 409 });
  }
  const account = await upsertStaffAccount(email, body.role);
  return Response.json({ account }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const body = await request.json() as { email?: string; role?: StaffRole; active?: boolean };
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!emailPattern.test(email)) return Response.json({ error: "Valid email is required" }, { status: 400 });
  if (configuredAdminEmails().includes(email)) {
    return Response.json({ error: "Environment owners cannot be changed here" }, { status: 409 });
  }
  if (email === auth.user?.email.toLowerCase()) {
    return Response.json({ error: "You cannot change or disable your own account" }, { status: 409 });
  }
  if (body.role !== undefined && !roles.has(body.role)) {
    return Response.json({ error: "Invalid role" }, { status: 400 });
  }
  if (body.active !== undefined && typeof body.active !== "boolean") {
    return Response.json({ error: "Invalid active state" }, { status: 400 });
  }
  const account = await updateStaffAccount(email, { role: body.role, active: body.active });
  if (!account) return Response.json({ error: "Staff account not found" }, { status: 404 });
  return Response.json({ account });
}
