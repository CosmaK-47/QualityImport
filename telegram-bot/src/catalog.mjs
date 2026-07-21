export const categories = ["outerwear", "tops", "bottoms", "shoes"];

export function selectProducts(products, filter) {
  if (filter === "stock" || filter === "preorder") {
    return products.filter((product) => product.availability === filter);
  }

  if (categories.includes(filter)) {
    return products.filter((product) => product.category === filter);
  }

  return products;
}

export function formatPrice(price, currency) {
  return `${new Intl.NumberFormat("ro-MD").format(price)} ${currency}`;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
