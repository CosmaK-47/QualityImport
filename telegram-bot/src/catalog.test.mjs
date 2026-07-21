import assert from "node:assert/strict";
import test from "node:test";
import { escapeHtml, formatPrice, selectProducts } from "./catalog.mjs";

const products = [
  { id: "jacket", category: "outerwear", availability: "stock" },
  { id: "shoes", category: "shoes", availability: "preorder" },
];

test("filters the centralized feed by availability and category", () => {
  assert.deepEqual(selectProducts(products, "stock").map((item) => item.id), ["jacket"]);
  assert.deepEqual(selectProducts(products, "shoes").map((item) => item.id), ["shoes"]);
  assert.equal(selectProducts(products, "all").length, 2);
});

test("formats prices and safely escapes Telegram HTML", () => {
  assert.match(formatPrice(1899, "MDL"), /1(?:[.\s\u00a0])?899 MDL/);
  assert.equal(escapeHtml('<QI & "Co">'), "&lt;QI &amp; &quot;Co&quot;&gt;");
});
