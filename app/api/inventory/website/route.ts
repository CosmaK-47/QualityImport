import { getInventoryMetadata, getWebsiteProducts } from "@/lib/inventory";

export function GET() {
  return Response.json({
    ...getInventoryMetadata(),
    channel: "website",
    products: getWebsiteProducts(),
  });
}
