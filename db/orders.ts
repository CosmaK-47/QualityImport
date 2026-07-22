import { env } from "cloudflare:workers";

export type StaffRole = "admin" | "moderator" | "worker";
export type OrderSource = "website" | "telegram";
export type OrderStatus = "new" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled";
export type PaymentStatus = "setup_required" | "awaiting_payment" | "paid" | "failed" | "expired" | "refunded";
export type ResellerStatus = "pending" | "more_information" | "approved" | "rejected" | "suspended";
export type ResellerPackage = "none" | "starter" | "growth" | "strategic";

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
      customer_email TEXT,
      customer_phone TEXT,
      customer_language TEXT,
      delivery_details TEXT,
      currency TEXT NOT NULL,
      total INTEGER NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'setup_required',
      payment_provider TEXT,
      payment_reference TEXT,
      payment_url TEXT,
      payment_method TEXT,
      payment_expires_at TEXT,
      paid_at TEXT,
      confirmation_email_status TEXT NOT NULL DEFAULT 'not_configured',
      confirmation_email_id TEXT,
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
    db.prepare(`CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      marketing_consent INTEGER NOT NULL DEFAULT 0,
      marketing_consent_at TEXT,
      first_order_at TEXT NOT NULL,
      last_order_at TEXT NOT NULL,
      order_count INTEGER NOT NULL DEFAULT 1
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS reseller_applications (
      id TEXT PRIMARY KEY,
      contact_name TEXT NOT NULL,
      business_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      country TEXT NOT NULL,
      city TEXT NOT NULL,
      business_type TEXT NOT NULL,
      website TEXT,
      monthly_volume TEXT NOT NULL,
      categories TEXT NOT NULL,
      registration_id TEXT,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','more_information','approved','rejected','suspended')),
      reseller_package TEXT NOT NULL DEFAULT 'none' CHECK(reseller_package IN ('none','starter','growth','strategic')),
      custom_discount INTEGER,
      internal_notes TEXT,
      reviewed_by TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS reseller_events (
      id TEXT PRIMARY KEY,
      reseller_id TEXT NOT NULL REFERENCES reseller_applications(id) ON DELETE CASCADE,
      event TEXT NOT NULL,
      actor TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at DESC)"),
    db.prepare("CREATE INDEX IF NOT EXISTS orders_source_idx ON orders(source)"),
    db.prepare("CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS customers_last_order_at_idx ON customers(last_order_at DESC)"),
    db.prepare("CREATE INDEX IF NOT EXISTS reseller_applications_status_idx ON reseller_applications(status, created_at DESC)"),
    db.prepare("CREATE INDEX IF NOT EXISTS reseller_applications_email_idx ON reseller_applications(email)"),
    db.prepare("CREATE INDEX IF NOT EXISTS reseller_events_reseller_idx ON reseller_events(reseller_id, created_at DESC)"),
  ]);

  const columns = await db.prepare("PRAGMA table_info(orders)").all<{ name: string }>();
  const existingColumns = new Set(columns.results.map((column) => column.name));
  const missingColumns: Array<[string, string]> = [
    ["payment_status", "ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'setup_required'"],
    ["payment_provider", "ALTER TABLE orders ADD COLUMN payment_provider TEXT"],
    ["payment_reference", "ALTER TABLE orders ADD COLUMN payment_reference TEXT"],
    ["payment_url", "ALTER TABLE orders ADD COLUMN payment_url TEXT"],
    ["payment_method", "ALTER TABLE orders ADD COLUMN payment_method TEXT"],
    ["payment_expires_at", "ALTER TABLE orders ADD COLUMN payment_expires_at TEXT"],
    ["paid_at", "ALTER TABLE orders ADD COLUMN paid_at TEXT"],
    ["customer_email", "ALTER TABLE orders ADD COLUMN customer_email TEXT"],
    ["customer_phone", "ALTER TABLE orders ADD COLUMN customer_phone TEXT"],
    ["customer_language", "ALTER TABLE orders ADD COLUMN customer_language TEXT"],
    ["delivery_details", "ALTER TABLE orders ADD COLUMN delivery_details TEXT"],
    ["confirmation_email_status", "ALTER TABLE orders ADD COLUMN confirmation_email_status TEXT NOT NULL DEFAULT 'not_configured'"],
    ["confirmation_email_id", "ALTER TABLE orders ADD COLUMN confirmation_email_id TEXT"],
  ];
  for (const [name, sql] of missingColumns) {
    if (!existingColumns.has(name)) await db.prepare(sql).run();
  }
  await db.prepare("CREATE INDEX IF NOT EXISTS orders_payment_status_idx ON orders(payment_status)").run();
}

export type ResellerApplication = {
  id: string; contactName: string; businessName: string; email: string; phone: string;
  country: string; city: string; businessType: string; website: string | null;
  monthlyVolume: string; categories: string; registrationId: string | null; message: string | null;
  status: ResellerStatus; resellerPackage: ResellerPackage; customDiscount: number | null;
  internalNotes: string | null; reviewedBy: string | null; reviewedAt: string | null;
  createdAt: string; updatedAt: string;
};

function resellerFromRow(row: Record<string, unknown>): ResellerApplication {
  return {
    id: String(row.id), contactName: String(row.contact_name), businessName: String(row.business_name),
    email: String(row.email), phone: String(row.phone), country: String(row.country), city: String(row.city),
    businessType: String(row.business_type), website: row.website ? String(row.website) : null,
    monthlyVolume: String(row.monthly_volume), categories: String(row.categories),
    registrationId: row.registration_id ? String(row.registration_id) : null,
    message: row.message ? String(row.message) : null, status: row.status as ResellerStatus,
    resellerPackage: row.reseller_package as ResellerPackage,
    customDiscount: row.custom_discount === null || row.custom_discount === undefined ? null : Number(row.custom_discount),
    internalNotes: row.internal_notes ? String(row.internal_notes) : null,
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

export async function createResellerApplication(input: Omit<ResellerApplication, "id" | "status" | "resellerPackage" | "customDiscount" | "internalNotes" | "reviewedBy" | "reviewedAt" | "createdAt" | "updatedAt">) {
  await ensureOrdersSchema();
  const db = d1();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const duplicate = await db.prepare("SELECT id FROM reseller_applications WHERE email = ? AND status IN ('pending','more_information','approved') LIMIT 1")
    .bind(input.email).first<{ id: string }>();
  if (duplicate) return { duplicate: true, id: duplicate.id };
  await db.batch([
    db.prepare(`INSERT INTO reseller_applications
      (id, contact_name, business_name, email, phone, country, city, business_type, website,
       monthly_volume, categories, registration_id, message, status, reseller_package, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'none', ?, ?)`)
      .bind(id, input.contactName, input.businessName, input.email, input.phone, input.country, input.city,
        input.businessType, input.website, input.monthlyVolume, input.categories, input.registrationId, input.message, now, now),
    db.prepare("INSERT INTO reseller_events (id, reseller_id, event, actor, created_at) VALUES (?, ?, 'application_submitted', ?, ?)")
      .bind(crypto.randomUUID(), id, `applicant:${input.email}`, now),
  ]);
  return { duplicate: false, id };
}

export async function listResellerApplications(): Promise<ResellerApplication[]> {
  await ensureOrdersSchema();
  const result = await d1().prepare("SELECT * FROM reseller_applications ORDER BY created_at DESC LIMIT 500").all<Record<string, unknown>>();
  return result.results.map(resellerFromRow);
}

export async function updateResellerApplication(input: { id: string; status: ResellerStatus; resellerPackage: ResellerPackage; customDiscount: number | null; internalNotes: string; actor: string }) {
  await ensureOrdersSchema();
  const db = d1();
  const now = new Date().toISOString();
  const existing = await db.prepare("SELECT id FROM reseller_applications WHERE id = ? LIMIT 1").bind(input.id).first();
  if (!existing) return false;
  await db.batch([
    db.prepare(`UPDATE reseller_applications SET status = ?, reseller_package = ?, custom_discount = ?,
      internal_notes = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?`)
      .bind(input.status, input.resellerPackage, input.customDiscount, input.internalNotes || null, input.actor, now, now, input.id),
    db.prepare("INSERT INTO reseller_events (id, reseller_id, event, actor, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), input.id, `status:${input.status};package:${input.resellerPackage};discount:${input.customDiscount ?? 'default'}`, input.actor, now),
  ]);
  return true;
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
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerLanguage?: string | null;
  deliveryDetails?: string | null;
  marketingConsent?: boolean;
  items: Array<{ sku: string; name: string; quantity: number; unitPrice: number }>;
  currency: string;
  paymentStatus?: PaymentStatus;
}) {
  await ensureOrdersSchema();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const orderNumber = `QI-${now.slice(2, 10).replaceAll("-", "")}-${id.slice(0, 6).toUpperCase()}`;
  const total = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const db = d1();
  const statements = [
    db.prepare(`INSERT INTO orders
      (id, order_number, source, status, customer_name, customer_reference, customer_username,
       customer_email, customer_phone, customer_language, delivery_details, currency, total, payment_status,
       confirmation_email_status, created_at, updated_at)
      VALUES (?, ?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'not_configured', ?, ?)`)
      .bind(id, orderNumber, input.source, input.customerName, input.customerReference, input.customerUsername ?? null,
        input.customerEmail ?? null, input.customerPhone ?? null, input.customerLanguage ?? null, input.deliveryDetails ?? null,
        input.currency, total, input.paymentStatus ?? "setup_required", now, now),
    ...input.items.map((item) => db.prepare(`INSERT INTO order_items
      (id, order_id, sku, name, quantity, unit_price) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), id, item.sku, item.name, item.quantity, item.unitPrice)),
    db.prepare(`INSERT INTO order_events
      (id, order_id, event, actor, created_at) VALUES (?, ?, 'created', ?, ?)`)
      .bind(crypto.randomUUID(), id, `${input.source}:${input.customerReference}`, now),
  ];
  if (input.customerEmail && input.customerPhone) {
    statements.push(db.prepare(`INSERT INTO customers
      (id, name, email, phone, marketing_consent, marketing_consent_at, first_order_at, last_order_at, order_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      ON CONFLICT(email) DO UPDATE SET
        name = excluded.name,
        phone = excluded.phone,
        marketing_consent = CASE WHEN excluded.marketing_consent = 1 THEN 1 ELSE customers.marketing_consent END,
        marketing_consent_at = CASE WHEN excluded.marketing_consent = 1 THEN excluded.marketing_consent_at ELSE customers.marketing_consent_at END,
        last_order_at = excluded.last_order_at,
        order_count = customers.order_count + 1`)
      .bind(crypto.randomUUID(), input.customerName, input.customerEmail, input.customerPhone,
        input.marketingConsent ? 1 : 0, input.marketingConsent ? now : null, now, now));
  }
  await db.batch(statements);
  return { id, orderNumber, total, currency: input.currency, status: "new" as const, paymentStatus: input.paymentStatus ?? "setup_required" };
}

export async function recordConfirmationEmail(orderId: string, result: { status: "sent" | "failed"; messageId?: string | null }) {
  await ensureOrdersSchema();
  const now = new Date().toISOString();
  await d1().batch([
    d1().prepare("UPDATE orders SET confirmation_email_status = ?, confirmation_email_id = ?, updated_at = ? WHERE id = ?")
      .bind(result.status, result.messageId ?? null, now, orderId),
    d1().prepare(`INSERT INTO order_events (id, order_id, event, actor, created_at)
      VALUES (?, ?, ?, 'resend', ?)`)
      .bind(crypto.randomUUID(), orderId, `confirmation_email_${result.status}`, now),
  ]);
}

export async function listCustomers() {
  await ensureOrdersSchema();
  const result = await d1().prepare(`SELECT id, name, email, phone, marketing_consent,
    marketing_consent_at, first_order_at, last_order_at, order_count
    FROM customers ORDER BY last_order_at DESC LIMIT 500`).all<D1ResultRow>();
  return result.results;
}

export async function attachPaymentSession(input: {
  orderId: string;
  provider: string;
  reference: string;
  url: string;
  expiresAt?: string | null;
}) {
  await ensureOrdersSchema();
  const now = new Date().toISOString();
  await d1().batch([
    d1().prepare(`UPDATE orders SET payment_status = 'awaiting_payment', payment_provider = ?,
      payment_reference = ?, payment_url = ?, payment_expires_at = ?, updated_at = ? WHERE id = ?`)
      .bind(input.provider, input.reference, input.url, input.expiresAt ?? null, now, input.orderId),
    d1().prepare(`INSERT INTO order_events (id, order_id, event, actor, created_at)
      VALUES (?, ?, 'payment_session_created', ?, ?)`)
      .bind(crypto.randomUUID(), input.orderId, input.provider, now),
  ]);
}

export async function getOrderForPayment(orderNumber: string) {
  await ensureOrdersSchema();
  return d1().prepare(`SELECT id, order_number, total, currency, payment_status, payment_reference
    FROM orders WHERE order_number = ? LIMIT 1`).bind(orderNumber).first<{
      id: string;
      order_number: string;
      total: number;
      currency: string;
      payment_status: PaymentStatus;
      payment_reference: string | null;
    }>();
}

export async function markOrderPaid(input: {
  orderId: string;
  provider: string;
  reference: string;
  paymentMethod?: string | null;
  paidAt: string;
  actor?: string;
}) {
  await ensureOrdersSchema();
  const current = await d1().prepare("SELECT payment_status FROM orders WHERE id = ? LIMIT 1")
    .bind(input.orderId).first<{ payment_status: PaymentStatus }>();
  if (!current || current.payment_status === "paid") return false;
  const now = new Date().toISOString();
  await d1().batch([
    d1().prepare(`UPDATE orders SET payment_status = 'paid', payment_provider = ?,
      payment_reference = ?, payment_method = ?, paid_at = ?, updated_at = ?
      WHERE id = ? AND payment_status != 'paid'`)
      .bind(input.provider, input.reference, input.paymentMethod ?? null, input.paidAt, now, input.orderId),
    d1().prepare(`INSERT INTO order_events (id, order_id, event, actor, created_at)
      VALUES (?, ?, 'payment_confirmed', ?, ?)`)
      .bind(crypto.randomUUID(), input.orderId, input.actor ?? input.provider, now),
  ]);
  return true;
}

export async function getOrderWorkflow(orderId: string) {
  await ensureOrdersSchema();
  return d1().prepare("SELECT id, status, payment_status FROM orders WHERE id = ? LIMIT 1")
    .bind(orderId).first<{ id: string; status: OrderStatus; payment_status: PaymentStatus }>();
}

export async function getOrderForConfirmation(orderId: string) {
  await ensureOrdersSchema();
  const order = await d1().prepare(`SELECT id, order_number, source, status, customer_name,
    customer_reference, customer_email, customer_phone, customer_language, currency, total,
    payment_status, payment_url, created_at
    FROM orders WHERE id = ? LIMIT 1`).bind(orderId).first<{
      id: string; order_number: string; source: OrderSource; status: OrderStatus;
      customer_name: string; customer_reference: string; customer_email: string | null;
      customer_phone: string | null; customer_language: string | null; currency: string;
      total: number; payment_status: PaymentStatus; payment_url: string | null; created_at: string;
    }>();
  if (!order) return null;
  const items = await d1().prepare(`SELECT sku, name, quantity, unit_price
    FROM order_items WHERE order_id = ? ORDER BY rowid`).bind(orderId).all<{
      sku: string; name: string; quantity: number; unit_price: number;
    }>();
  return { ...order, items: items.results.map((item) => ({
    sku: item.sku, name: item.name, quantity: item.quantity, unitPrice: item.unit_price,
  })) };
}

export async function updateOrderStatus(input: {
  orderId: string;
  status: OrderStatus;
  actor: string;
}) {
  await ensureOrdersSchema();
  const now = new Date().toISOString();
  await d1().batch([
    d1().prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?")
      .bind(input.status, now, input.orderId),
    d1().prepare(`INSERT INTO order_events (id, order_id, event, actor, created_at)
      VALUES (?, ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), input.orderId, `status_${input.status}`, input.actor, now),
  ]);
}

export async function markPaymentRequested(input: { orderId: string; actor: string }) {
  await ensureOrdersSchema();
  const now = new Date().toISOString();
  await d1().batch([
    d1().prepare(`UPDATE orders SET payment_status = 'awaiting_payment',
      payment_provider = 'manual', updated_at = ? WHERE id = ?`)
      .bind(now, input.orderId),
    d1().prepare(`INSERT INTO order_events (id, order_id, event, actor, created_at)
      VALUES (?, ?, 'manual_payment_requested', ?, ?)`)
      .bind(crypto.randomUUID(), input.orderId, input.actor, now),
  ]);
}

export async function listOrders() {
  await ensureOrdersSchema();
  const result = await d1().prepare(`SELECT
      o.id, o.order_number, o.source, o.status, o.customer_name,
      o.customer_reference, o.customer_username, o.currency, o.total,
      o.payment_status, o.payment_provider, o.payment_reference, o.payment_method,
      o.payment_expires_at, o.paid_at,
      o.customer_email, o.customer_phone, o.customer_language, o.delivery_details,
      o.confirmation_email_status,
      o.created_at, o.updated_at,
      GROUP_CONCAT(i.sku, ', ') AS sku,
      GROUP_CONCAT(i.name || ' ×' || i.quantity, ', ') AS item_name,
      SUM(i.quantity) AS quantity
    FROM orders o
    LEFT JOIN order_items i ON i.order_id = o.id
    GROUP BY o.id
    ORDER BY o.created_at DESC
    LIMIT 250`).all<D1ResultRow>();
  return result.results;
}
