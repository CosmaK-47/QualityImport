import inventoryData from "@/content/inventory.json";
import { env } from "cloudflare:workers";

import { ensureFinanceSchema } from "@/db/finance";
import { ensureOrdersSchema } from "@/db/orders";

export type AnalyticsStream = "orders" | "purchases" | "expenses";

export type AnalyticsCursor = {
  updatedAt: string;
  id: string;
};

type ExportWindow = {
  from: string;
  to: string;
  cursor: AnalyticsCursor;
  limit: number;
};

type ExportPage<T> = {
  records: T[];
  nextCursor: AnalyticsCursor;
  hasMore: boolean;
};

type ExportRow = Record<string, string | number | null>;

const sourceProductIdBySku = new Map(
  inventoryData.products.map((product) => [product.sku, product.id]),
);

function d1(): D1Database {
  if (!env.DB) throw new Error("D1 binding DB is unavailable");
  return env.DB;
}

function fromMinor(value: unknown) {
  return Number(value ?? 0) / 100;
}

function pageRows<T extends { id: string; updatedAt: string }>(
  rows: T[],
  input: ExportWindow,
): ExportPage<T> {
  const hasMore = rows.length > input.limit;
  const records = rows.slice(0, input.limit);
  const last = records.at(-1);
  return {
    records,
    hasMore,
    nextCursor: last
      ? { updatedAt: last.updatedAt, id: last.id }
      : input.cursor,
  };
}

export async function exportOrders(input: ExportWindow) {
  await ensureOrdersSchema();
  const result = await d1().prepare(`SELECT id, order_number, source, status,
    payment_status, currency, total, created_at, updated_at
    FROM orders
    WHERE updated_at >= ? AND updated_at <= ?
      AND (updated_at > ? OR (updated_at = ? AND id > ?))
    ORDER BY updated_at ASC, id ASC
    LIMIT ?`)
    .bind(
      input.from,
      input.to,
      input.cursor.updatedAt,
      input.cursor.updatedAt,
      input.cursor.id,
      input.limit + 1,
    )
    .all<ExportRow>();

  const selected = result.results.slice(0, input.limit);
  const orderIds = selected.map((row) => String(row.id));
  const itemsByOrder = new Map<string, Array<Record<string, unknown>>>();

  if (orderIds.length > 0) {
    const placeholders = orderIds.map(() => "?").join(",");
    const items = await d1().prepare(`SELECT id, order_id, sku, name, quantity, unit_price
      FROM order_items WHERE order_id IN (${placeholders}) ORDER BY order_id, id`)
      .bind(...orderIds)
      .all<ExportRow>();
    for (const row of items.results) {
      const orderId = String(row.order_id);
      const sku = String(row.sku);
      const current = itemsByOrder.get(orderId) ?? [];
      current.push({
        id: String(row.id),
        sourceProductId: sourceProductIdBySku.get(sku) ?? sku,
        sku,
        name: String(row.name),
        quantity: Number(row.quantity),
        unitPrice: fromMinor(row.unit_price),
      });
      itemsByOrder.set(orderId, current);
    }
  }

  const rows = result.results.map((row) => ({
    id: String(row.id),
    orderNumber: String(row.order_number),
    channel: String(row.source),
    status: String(row.status),
    paymentStatus: String(row.payment_status),
    currency: String(row.currency),
    total: fromMinor(row.total),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    items: itemsByOrder.get(String(row.id)) ?? [],
  }));

  return pageRows(rows, input);
}

export async function exportPurchases(input: ExportWindow) {
  await ensureFinanceSchema();
  const result = await d1().prepare(`SELECT id, sku, product_name, purchased_on,
    quantity, unit_cost_minor, currency, fx_rate_to_mdl, unit_cost_mdl_minor,
    created_at, updated_at
    FROM finance_purchases
    WHERE updated_at >= ? AND updated_at <= ?
      AND (updated_at > ? OR (updated_at = ? AND id > ?))
    ORDER BY updated_at ASC, id ASC
    LIMIT ?`)
    .bind(
      input.from,
      input.to,
      input.cursor.updatedAt,
      input.cursor.updatedAt,
      input.cursor.id,
      input.limit + 1,
    )
    .all<ExportRow>();

  const rows = result.results.map((row) => {
    const sku = String(row.sku);
    return {
      id: String(row.id),
      sourceProductId: sourceProductIdBySku.get(sku) ?? sku,
      sku,
      productName: String(row.product_name),
      purchasedOn: String(row.purchased_on),
      quantity: Number(row.quantity),
      unitCost: fromMinor(row.unit_cost_minor),
      currency: String(row.currency),
      fxRateToMdl: Number(row.fx_rate_to_mdl),
      unitCostMdl: fromMinor(row.unit_cost_mdl_minor),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  });

  return pageRows(rows, input);
}

export async function exportExpenses(input: ExportWindow) {
  await ensureFinanceSchema();
  const result = await d1().prepare(`SELECT id, occurred_on, scope, category,
    description, amount_minor, currency, fx_rate_to_mdl, amount_mdl_minor,
    created_at, updated_at
    FROM finance_expenses
    WHERE updated_at >= ? AND updated_at <= ?
      AND (updated_at > ? OR (updated_at = ? AND id > ?))
    ORDER BY updated_at ASC, id ASC
    LIMIT ?`)
    .bind(
      input.from,
      input.to,
      input.cursor.updatedAt,
      input.cursor.updatedAt,
      input.cursor.id,
      input.limit + 1,
    )
    .all<ExportRow>();

  const rows = result.results.map((row) => ({
    id: String(row.id),
    occurredOn: String(row.occurred_on),
    scope: String(row.scope),
    category: String(row.category),
    description: String(row.description),
    amount: fromMinor(row.amount_minor),
    currency: String(row.currency),
    fxRateToMdl: Number(row.fx_rate_to_mdl),
    amountMdl: fromMinor(row.amount_mdl_minor),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));

  return pageRows(rows, input);
}
