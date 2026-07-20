import { getInventoryMetadata, getTelegramProducts } from "@/lib/inventory";

export function GET() {
  return Response.json({
    ...getInventoryMetadata(),
    channel: "telegram",
    products: getTelegramProducts(),
  });
}
