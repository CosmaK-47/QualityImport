import { env } from "cloudflare:workers";

export type StaffRole = "admin" | "moderator" | "worker";
export type OrderSource = "website" | "telegram";
export type OrderStatus = "new" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled";

type D1ResultRow = Record<string, string | number | null>;

function d1(): D1Database {
  if (!env.DB) throw new Error("D1 binding DB is unavailable");
  return env.DB;
}

export async function ensureOrdersSchema() {
  const db = d1();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS staff_accounts (
      email TEXT PRIMARY KEY,
      role TEXT NOT NULL CHECK(role IN ('admin','moderator','worker')),
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT NOT NULL UNIQUE,
      source TEXT NOT NULL CHECK(source IN ('website','telegram')),
      status TEXT NOT NULL CHECK(status IN ('new','confirmed','preparing','ready','delivered','cancelled')),
      customer_name TEXT NOT NULL,
      customer_reference TEXT NOT NULL,
      customer_username TEXT,
      currency TEXT NOT NULL,
      total INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      sku TEXT NOT NULL,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS order_events (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      event TEXT NOT NULL,
      actor TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at DESC)"),
    db.prepare("CREATE INDEX IF NOT EXISTS orders_source_idx ON orders(source)"),
    db.prepare("CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id)"),
  ]);
}

export function configuredAdminEmails() {
  const value = (env as unknown as Record<string, unknown>).STAFF_ADMIN_EMAILS;
  return typeof value === "string"
    ? value.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean)
    : [];
}

export type StaffAccount = {
  email: string;
  role: StaffRole;
  active: boolean;
  createdAt: string;
  managedByEnvironment: boolean;
};

export async function listStaffAccounts(): Promise<StaffAccount[]> {
  await ensureOrdersSchema();
  const result = await d1().prepare(
    "SELECT email, role, active, created_at FROM staff_accounts ORDER BY created_at ASC",
  ).all<{ email: string; role: StaffRole; active: number; created_at: string }>();
  const databaseAccounts = result.results.map((row) => ({
    email: row.email,
    role: row.role,
    active: Boolean(row.active),
    createdAt: row.created_at,
    managedByEnvironment: false,
  }));
  const existingEmails = new Set(databaseAccounts.map((account) => account.email));
  const environmentAccounts = configuredAdminEmails()
    .filter((email) => !existingEmails.has(email))
    .map((email) => ({
      email,
      role: "admin" as const,
      active: true,
      createdAt: "",
      managedByEnvironment: true,
    }));
  return [...environmentAccounts, ...databaseAccounts];
}

export async function upsertStaffAccount(email: string, role: StaffRole) {
  await ensureOrdersSchema();
  const normalizedEmail = email.trim().toLowerCase();
  const now = new Date().toISOString();
  await d1().prepare(`INSERT INTO staff_accounts (email, role, active, created_at)
    VALUES (?, ?, 1, ?)
    ON CONFLICT(email) DO UPDATE SET role = excluded.role, active = 1`)
    .bind(normalizedEmail, role, now).run();
  return { email: normalizedEmail, role, active: true };
}

export async function updateStaffAccount(email: string, changes: { role?: StaffRole; active?: boolean }) {
  await ensureOrdersSchema();
  const normalizedEmail = email.trim().toLowerCase();
  const current = await d1().prepare("SELECT role, active FROM staff_accounts WHERE email = ?")
    .bind(normalizedEmail).first<{ role: StaffRole; active: number }>();
  if (!current) return null;
  const role = changes.role ?? current.role;
  const active = changes.active ?? Boolean(current.active);
  await d1().prepare("UPDATE staff_accounts SET role = ?, active = ? WHERE email = ?")
    .bind(role, active ? 1 : 0, normalizedEmail).run();
  return { email: normalizedEmail, role, active };
}

export async function getStaffRole(email: string): Promise<StaffRole | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (configuredAdminEmails().includes(normalizedEmail)) return "admin";
  await ensureOrdersSchema();
  const row = await d1().prepare(
    "SELECT role FROM staff_accounts WHERE email = ? AND active = 1 LIMIT 1",
  ).bind(normalizedEmail).first<{ role: StaffRole }>();
  return row?.role ?? null;
}

export async function createOrder(input: {
  source: OrderSource;
  customerName: string;
  customerReference: string;
  customerUsername?: string | null;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  currency: string;
}) {
  await ensureOrdersSchema();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const orderNumber = `QI-${now.slice(2, 10).replaceAll("-", "")}-${id.slice(0, 6).toUpperCase()}`;
  const total = input.quantity * input.unitPrice;
  const db = d1();
  await db.batch([
    db.prepare(`INSERT INTO orders
      (id, order_number, source, status, customer_name, customer_reference, customer_username, currency, total, created_at, updated_at)
      VALUES (?, ?, ?, 'new', ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, orderNumber, input.source, input.customerName, input.customerReference, input.customerUsername ?? null, input.currency, total, now, now),
    db.prepare(`INSERT INTO order_items
      (id, order_id, sku, name, quantity, unit_price) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), id, input.sku, input.name, input.quantity, input.unitPrice),
    db.prepare(`INSERT INTO order_events
      (id, order_id, event, actor, created_at) VALUES (?, ?, 'created', ?, ?)`)
      .bind(crypto.randomUUID(), id, `${input.source}:${input.customerReference}`, now),
  ]);
  return { id, orderNumber, total, status: "new" as const };
}

export async function listOrders() {
  await ensureOrdersSchema();
  const result = await d1().prepare(`SELECT
      o.id, o.order_number, o.source, o.status, o.customer_name,
      o.customer_reference, o.customer_username, o.currency, o.total,
      o.created_at, o.updated_at,
      i.sku, i.name AS item_name, i.quantity, i.unit_price
    FROM orders o
    LEFT JOIN order_items i ON i.order_id = o.id
    ORDER BY o.created_at DESC
    LIMIT 250`).all<D1ResultRow>();
  return result.results;
}
