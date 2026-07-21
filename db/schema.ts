import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const staffAccounts = sqliteTable("staff_accounts", {
  email: text("email").primaryKey(),
  role: text("role", { enum: ["admin", "moderator", "worker"] }).notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  source: text("source", { enum: ["website", "telegram"] }).notNull(),
  status: text("status", { enum: ["new", "confirmed", "preparing", "ready", "delivered", "cancelled"] }).notNull(),
  customerName: text("customer_name").notNull(),
  customerReference: text("customer_reference").notNull(),
  customerUsername: text("customer_username"),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  customerLanguage: text("customer_language"),
  deliveryDetails: text("delivery_details"),
  currency: text("currency").notNull(),
  total: integer("total").notNull(),
  paymentStatus: text("payment_status", { enum: ["setup_required", "awaiting_payment", "paid", "failed", "expired", "refunded"] }).notNull().default("setup_required"),
  paymentProvider: text("payment_provider"),
  paymentReference: text("payment_reference"),
  paymentUrl: text("payment_url"),
  paymentMethod: text("payment_method"),
  paymentExpiresAt: text("payment_expires_at"),
  paidAt: text("paid_at"),
  confirmationEmailStatus: text("confirmation_email_status", { enum: ["not_configured", "pending", "sent", "failed"] }).notNull().default("not_configured"),
  confirmationEmailId: text("confirmation_email_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const customers = sqliteTable("customers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  marketingConsent: integer("marketing_consent", { mode: "boolean" }).notNull().default(false),
  marketingConsentAt: text("marketing_consent_at"),
  firstOrderAt: text("first_order_at").notNull(),
  lastOrderAt: text("last_order_at").notNull(),
  orderCount: integer("order_count").notNull().default(1),
});

export const orderItems = sqliteTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  sku: text("sku").notNull(),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(),
});

export const orderEvents = sqliteTable("order_events", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  actor: text("actor").notNull(),
  createdAt: text("created_at").notNull(),
});
