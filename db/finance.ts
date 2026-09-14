import { env } from "cloudflare:workers";

export type ExpenseScope = "physical" | "software" | "general";

export type FinancePurchase = {
  id: string;
  sku: string;
  productName: string;
  purchasedOn: string;
  quantity: number;
  unitCost: number;
  currency: string;
  fxRateToMdl: number;
  unitCostMdl: number;
  supplier: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: string;
};

export type FinanceExpense = {
  id: string;
  occurredOn: string;
  scope: ExpenseScope;
  category: string;
  description: string;
  amount: number;
  currency: string;
  fxRateToMdl: number;
  amountMdl: number;
  reference: string | null;
  createdAt: string;
};

function d1(): D1Database {
  if (!env.DB) throw new Error("D1 binding DB is unavailable");
  return env.DB;
}

function fromMinor(value: unknown) {
  return Number(value ?? 0) / 100;
}

function toMinor(value: number) {
  return Math.round(value * 100);
}

export async function ensureFinanceSchema() {
  const db = d1();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS finance_purchases (
      id TEXT PRIMARY KEY,
      sku TEXT NOT NULL,
      product_name TEXT NOT NULL,
      purchased_on TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      unit_cost_minor INTEGER NOT NULL CHECK(unit_cost_minor >= 0),
      currency TEXT NOT NULL,
      fx_rate_to_mdl REAL NOT NULL CHECK(fx_rate_to_mdl > 0),
      unit_cost_mdl_minor INTEGER NOT NULL CHECK(unit_cost_mdl_minor >= 0),
      supplier TEXT,
      reference TEXT,
      notes TEXT,
      actor TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS finance_expenses (
      id TEXT PRIMARY KEY,
      occurred_on TEXT NOT NULL,
      scope TEXT NOT NULL CHECK(scope IN ('physical','software','general')),
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount_minor INTEGER NOT NULL CHECK(amount_minor >= 0),
      currency TEXT NOT NULL,
      fx_rate_to_mdl REAL NOT NULL CHECK(fx_rate_to_mdl > 0),
      amount_mdl_minor INTEGER NOT NULL CHECK(amount_mdl_minor >= 0),
      reference TEXT,
      actor TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_finance_purchases_sku_date ON finance_purchases(sku, purchased_on DESC)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_finance_purchases_updated ON finance_purchases(updated_at, id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_finance_expenses_date_scope ON finance_expenses(occurred_on DESC, scope)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_finance_expenses_updated ON finance_expenses(updated_at, id)"),
  ]);
}

export async function createFinancePurchase(input: {
  sku: string;
  productName: string;
  purchasedOn: string;
  quantity: number;
  unitCost: number;
  currency: string;
  fxRateToMdl: number;
  supplier?: string | null;
  reference?: string | null;
  notes?: string | null;
  actor: string;
}) {
  await ensureFinanceSchema();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const unitCostMinor = toMinor(input.unitCost);
  const unitCostMdlMinor = Math.round(unitCostMinor * input.fxRateToMdl);
  await d1().prepare(`INSERT INTO finance_purchases
    (id, sku, product_name, purchased_on, quantity, unit_cost_minor, currency,
     fx_rate_to_mdl, unit_cost_mdl_minor, supplier, reference, notes, actor, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      id,
      input.sku,
      input.productName,
      input.purchasedOn,
      input.quantity,
      unitCostMinor,
      input.currency,
      input.fxRateToMdl,
      unitCostMdlMinor,
      input.supplier || null,
      input.reference || null,
      input.notes || null,
      input.actor,
      now,
      now,
    ).run();
  return { id };
}

export async function createFinanceExpense(input: {
  occurredOn: string;
  scope: ExpenseScope;
  category: string;
  description: string;
  amount: number;
  currency: string;
  fxRateToMdl: number;
  reference?: string | null;
  actor: string;
}) {
  await ensureFinanceSchema();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const amountMinor = toMinor(input.amount);
  const amountMdlMinor = Math.round(amountMinor * input.fxRateToMdl);
  await d1().prepare(`INSERT INTO finance_expenses
    (id, occurred_on, scope, category, description, amount_minor, currency,
     fx_rate_to_mdl, amount_mdl_minor, reference, actor, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      id,
      input.occurredOn,
      input.scope,
      input.category,
      input.description,
      amountMinor,
      input.currency,
      input.fxRateToMdl,
      amountMdlMinor,
      input.reference || null,
      input.actor,
      now,
      now,
    ).run();
  return { id };
}

export async function listFinancePurchases(limit = 100): Promise<FinancePurchase[]> {
  await ensureFinanceSchema();
  const result = await d1().prepare(`SELECT id, sku, product_name, purchased_on, quantity,
    unit_cost_minor, currency, fx_rate_to_mdl, unit_cost_mdl_minor, supplier,
    reference, notes, created_at
    FROM finance_purchases ORDER BY purchased_on DESC, created_at DESC LIMIT ?`)
    .bind(Math.min(Math.max(limit, 1), 500)).all<Record<string, unknown>>();
  return result.results.map((row) => ({
    id: String(row.id),
    sku: String(row.sku),
    productName: String(row.product_name),
    purchasedOn: String(row.purchased_on),
    quantity: Number(row.quantity),
    unitCost: fromMinor(row.unit_cost_minor),
    currency: String(row.currency),
    fxRateToMdl: Number(row.fx_rate_to_mdl),
    unitCostMdl: fromMinor(row.unit_cost_mdl_minor),
    supplier: row.supplier ? String(row.supplier) : null,
    reference: row.reference ? String(row.reference) : null,
    notes: row.notes ? String(row.notes) : null,
    createdAt: String(row.created_at),
  }));
}

export async function listFinanceExpenses(limit = 100): Promise<FinanceExpense[]> {
  await ensureFinanceSchema();
  const result = await d1().prepare(`SELECT id, occurred_on, scope, category, description,
    amount_minor, currency, fx_rate_to_mdl, amount_mdl_minor, reference, created_at
    FROM finance_expenses ORDER BY occurred_on DESC, created_at DESC LIMIT ?`)
    .bind(Math.min(Math.max(limit, 1), 500)).all<Record<string, unknown>>();
  return result.results.map((row) => ({
    id: String(row.id),
    occurredOn: String(row.occurred_on),
    scope: row.scope as ExpenseScope,
    category: String(row.category),
    description: String(row.description),
    amount: fromMinor(row.amount_minor),
    currency: String(row.currency),
    fxRateToMdl: Number(row.fx_rate_to_mdl),
    amountMdl: fromMinor(row.amount_mdl_minor),
    reference: row.reference ? String(row.reference) : null,
    createdAt: String(row.created_at),
  }));
}

export async function getFinanceOverview() {
  await ensureFinanceSchema();
  const db = d1();
  const [purchaseTotals, expenseTotals, weightedCosts] = await Promise.all([
    db.prepare(`SELECT COALESCE(SUM(quantity * unit_cost_mdl_minor), 0) AS total_minor,
      COALESCE(SUM(quantity), 0) AS units FROM finance_purchases`)
      .first<{ total_minor: number; units: number }>(),
    db.prepare(`SELECT
      COALESCE(SUM(amount_mdl_minor), 0) AS total_minor,
      COALESCE(SUM(CASE WHEN scope = 'physical' THEN amount_mdl_minor ELSE 0 END), 0) AS physical_minor,
      COALESCE(SUM(CASE WHEN scope = 'software' THEN amount_mdl_minor ELSE 0 END), 0) AS software_minor,
      COALESCE(SUM(CASE WHEN scope = 'general' THEN amount_mdl_minor ELSE 0 END), 0) AS general_minor
      FROM finance_expenses`)
      .first<{ total_minor: number; physical_minor: number; software_minor: number; general_minor: number }>(),
    db.prepare(`SELECT sku, MAX(product_name) AS product_name, SUM(quantity) AS units,
      ROUND(CAST(SUM(quantity * unit_cost_mdl_minor) AS REAL) / SUM(quantity)) AS average_minor
      FROM finance_purchases GROUP BY sku ORDER BY product_name`)
      .all<{ sku: string; product_name: string; units: number; average_minor: number }>(),
  ]);
  return {
    purchaseValueMdl: fromMinor(purchaseTotals?.total_minor),
    purchasedUnits: Number(purchaseTotals?.units ?? 0),
    expenseValueMdl: fromMinor(expenseTotals?.total_minor),
    physicalExpensesMdl: fromMinor(expenseTotals?.physical_minor),
    softwareExpensesMdl: fromMinor(expenseTotals?.software_minor),
    generalExpensesMdl: fromMinor(expenseTotals?.general_minor),
    weightedCosts: weightedCosts.results.map((row) => ({
      sku: row.sku,
      productName: row.product_name,
      purchasedUnits: Number(row.units),
      averageUnitCostMdl: fromMinor(row.average_minor),
    })),
  };
}
