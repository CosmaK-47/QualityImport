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
  currency: text("currency").notNull(),
  total: integer("total").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
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
