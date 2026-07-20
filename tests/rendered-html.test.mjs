import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the QI storefront", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>QI Quality Imports — Authentic fashion for Moldova<\/title>/i);
  assert.match(html, /Quality Imports/i);
  assert.match(html, /Modă autentică, selectată cu grijă\./i);
  assert.match(html, /6 000 MDL/i);
  assert.match(html, /Pentru reselleri/i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("removes the disposable starter experience", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /QI INSPECTED/);
  assert.match(page, /type Language = "RO" \| "RU" \| "EN"/);
  assert.match(layout, /\/og\.png/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
});

test("publishes channel-specific inventory feeds", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("inventory-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const environment = {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  };
  const context = { waitUntil() {}, passThroughOnException() {} };

  const [websiteResponse, telegramResponse] = await Promise.all([
    worker.fetch(new Request("http://localhost/api/inventory/website"), environment, context),
    worker.fetch(new Request("http://localhost/api/inventory/telegram"), environment, context),
  ]);

  assert.equal(websiteResponse.status, 200);
  assert.equal(telegramResponse.status, 200);

  const website = await websiteResponse.json();
  const telegram = await telegramResponse.json();

  assert.equal(website.channel, "website");
  assert.equal(telegram.channel, "telegram");
  assert.equal(website.products.length, 6);
  assert.equal(telegram.products.length, 6);
  assert.equal(website.products[0].stockQuantity, telegram.products[0].stockQuantity);
  assert.equal(website.products[0].message, undefined);
  assert.equal(telegram.products[0].description, undefined);
});
