import inventoryData from "@/content/inventory.json";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  createFinanceExpense,
  createFinancePurchase,
  getFinanceOverview,
  listFinanceExpenses,
  listFinancePurchases,
  type ExpenseScope,
} from "@/db/finance";
import { getStaffRole } from "@/db/orders";

function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function positiveNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function validCurrency(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z]{3}$/.test(value);
}

async function requireFinanceAdmin() {
  const user = await getChatGPTUser();
  if (!user) return null;
  const role = await getStaffRole(user.email);
  return role === "admin" ? user : null;
}

export async function GET() {
  const user = await requireFinanceAdmin();
  if (!user) return Response.json({ error: "Admin access required" }, { status: 403 });
  const [overview, purchases, expenses] = await Promise.all([
    getFinanceOverview(),
    listFinancePurchases(),
    listFinanceExpenses(),
  ]);
  return Response.json({ overview, purchases, expenses });
}

export async function POST(request: Request) {
  const user = await requireFinanceAdmin();
  if (!user) return Response.json({ error: "Admin access required" }, { status: 403 });
  const body = await request.json() as Record<string, unknown>;
  const kind = body.kind;
  const currency = String(body.currency ?? "").trim().toUpperCase();
  const suppliedFx = positiveNumber(body.fxRateToMdl);
  const fxRateToMdl = currency === "MDL" ? 1 : suppliedFx;

  if (!validCurrency(currency) || fxRateToMdl === null) {
    return Response.json({ error: "Enter a valid currency and MDL exchange rate" }, { status: 400 });
  }

  if (kind === "purchase") {
    const sku = String(body.sku ?? "").trim();
    const product = inventoryData.products.find((item) => item.sku === sku);
    const purchasedOn = body.purchasedOn;
    const quantity = Number(body.quantity);
    const unitCost = positiveNumber(body.unitCost);
    if (!product || !validDate(purchasedOn) || !Number.isInteger(quantity) || quantity < 1 || unitCost === null) {
      return Response.json({ error: "Complete the product, date, quantity and unit cost" }, { status: 400 });
    }
    const result = await createFinancePurchase({
      sku: product.sku,
      productName: product.website.name,
      purchasedOn,
      quantity,
      unitCost,
      currency,
      fxRateToMdl,
      supplier: String(body.supplier ?? "").trim().slice(0, 120) || null,
      reference: String(body.reference ?? "").trim().slice(0, 120) || null,
      notes: String(body.notes ?? "").trim().slice(0, 500) || null,
      actor: user.email,
    });
    return Response.json(result, { status: 201 });
  }

  if (kind === "expense") {
    const occurredOn = body.occurredOn;
    const scope = body.scope;
    const amount = positiveNumber(body.amount);
    const category = String(body.category ?? "").trim().slice(0, 80);
    const description = String(body.description ?? "").trim().slice(0, 240);
    const validScope = scope === "physical" || scope === "software" || scope === "general";
    if (!validDate(occurredOn) || !validScope || amount === null || !category || !description) {
      return Response.json({ error: "Complete the date, cost group, category, description and amount" }, { status: 400 });
    }
    const result = await createFinanceExpense({
      occurredOn,
      scope: scope as ExpenseScope,
      category,
      description,
      amount,
      currency,
      fxRateToMdl,
      reference: String(body.reference ?? "").trim().slice(0, 120) || null,
      actor: user.email,
    });
    return Response.json(result, { status: 201 });
  }

  return Response.json({ error: "Unknown finance record type" }, { status: 400 });
}
