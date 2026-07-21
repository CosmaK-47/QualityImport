import inventoryData from "@/content/inventory.json";

export type Category = "outerwear" | "tops" | "bottoms" | "shoes";
export type Availability = "stock" | "preorder";
export type ProductArt = "jacket" | "trousers" | "shoe" | "knit" | "set" | "vest";
export type ProductTone = "graphite" | "silver" | "chalk";

export type InventoryProduct = {
  id: string;
  sku: string;
  image?: string;
  category: Category;
  price: number;
  currency: "MDL";
  availability: Availability;
  stockQuantity: number;
  art: ProductArt;
  tone: ProductTone;
  website: {
    enabled: boolean;
    name: string;
    description: string;
  };
  telegram: {
    enabled: boolean;
    name: string;
    message: string;
  };
};

const inventory = inventoryData as {
  version: number;
  updatedAt: string;
  products: InventoryProduct[];
};

export function formatPrice(price: number, currency: string) {
  return `${new Intl.NumberFormat("ro-MD").format(price)} ${currency}`;
}

export function getWebsiteProducts() {
  return inventory.products
    .filter((product) => product.website.enabled)
    .map((product) => ({
      id: product.id,
      sku: product.sku,
      image: product.image || null,
      name: product.website.name,
      description: product.website.description,
      category: product.category,
      price: formatPrice(product.price, product.currency),
      availability: product.availability,
      stockQuantity: product.stockQuantity,
      art: product.art,
      tone: product.tone,
    }));
}

export function getTelegramProducts() {
  return inventory.products
    .filter((product) => product.telegram.enabled)
    .map((product) => ({
      id: product.id,
      sku: product.sku,
      image: product.image || null,
      name: product.telegram.name,
      message: product.telegram.message,
      category: product.category,
      price: product.price,
      currency: product.currency,
      availability: product.availability,
      stockQuantity: product.stockQuantity,
    }));
}

export function getInventoryMetadata() {
  return { version: inventory.version, updatedAt: inventory.updatedAt };
}
