import { env } from "cloudflare:workers";

import {
  exportExpenses,
  exportOrders,
  exportPurchases,
  type AnalyticsCursor,
  type AnalyticsStream,
} from "@/db/analytics-export";

const MAX_WINDOW_MS = 370 * 24 * 60 * 60 * 1000;
const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store",
};

function unauthorized() {
  return Response.json(
    { error: "Unauthorized" },
    { status: 401, headers: PRIVATE_HEADERS },
  );
}

function configuredSecret() {
  const value = (env as unknown as Record<string, unknown>).ANALYTICS_EXPORT_SECRET;
  return typeof value === "string" && value.length >= 24 ? value : null;
}

function isIsoDate(value: string | null): value is string {
  return Boolean(value && !Number.isNaN(Date.parse(value)));
}

function isStream(value: string | null): value is AnalyticsStream {
  return value === "orders" || value === "purchases" || value === "expenses";
}

export async function GET(request: Request) {
  const secret = configuredSecret();
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) return unauthorized();

  const url = new URL(request.url);
  const stream = url.searchParams.get("stream");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const cursorUpdatedAt = url.searchParams.get("cursor_updated_at") || from;
  const cursorId = url.searchParams.get("cursor_id") ?? "";
  const requestedLimit = Number(url.searchParams.get("limit") ?? 200);
  const limit = Number.isInteger(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 200)
    : 200;

  if (!isStream(stream) || !isIsoDate(from) || !isIsoDate(to) || !isIsoDate(cursorUpdatedAt)) {
    return Response.json(
      { error: "Use a valid stream, from, to and cursor" },
      { status: 400, headers: PRIVATE_HEADERS },
    );
  }

  const fromTime = Date.parse(from);
  const toTime = Date.parse(to);
  if (fromTime > toTime || toTime - fromTime > MAX_WINDOW_MS) {
    return Response.json(
      { error: "The export window must be ordered and no longer than 370 days" },
      { status: 400, headers: PRIVATE_HEADERS },
    );
  }

  const cursor: AnalyticsCursor = { updatedAt: cursorUpdatedAt, id: cursorId };
  const input = { from, to, cursor, limit };
  const page = stream === "orders"
    ? await exportOrders(input)
    : stream === "purchases"
      ? await exportPurchases(input)
      : await exportExpenses(input);

  return Response.json(
    {
      project: "quality-import",
      stream,
      reportingCurrency: "MDL",
      window: { from, to },
      ...page,
    },
    { headers: PRIVATE_HEADERS },
  );
}
