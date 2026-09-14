import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("defines the QI storefront and verification experience", async () => {
  const [page, layout, styles] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /QI Quality Imports — Selected fashion for Moldova/i);
  assert.match(page, /Quality Imports/i);
  assert.match(page, /Modă selectată cu grijă\./i);
  assert.match(page, /6 000 MDL/i);
  assert.match(page, /Pentru reselleri/i);
  assert.match(page, /All → QI verified|verificationLabel/);
  assert.match(styles, /\.verification-cycle/);
  assert.doesNotMatch(page, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("removes the disposable starter experience", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /QI INSPECTED/);
  assert.match(page, /verification-cycle/);
  assert.match(page, /product\.verificationStatus === "verified"/);
  assert.match(page, /type Language = "RO" \| "RU" \| "EN"/);
  assert.match(layout, /\/og\.png/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
});

test("publishes channel-specific inventory with explicit verification states", async () => {
  const [inventoryText, inventoryModule, websiteRoute, telegramRoute, decapConfig] = await Promise.all([
    readFile(new URL("../content/inventory.json", import.meta.url), "utf8"),
    readFile(new URL("../lib/inventory.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/inventory/website/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/inventory/telegram/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/admin/config.yml", import.meta.url), "utf8"),
  ]);
  const inventory = JSON.parse(inventoryText);

  assert.equal(inventory.products.length, 9);
  assert.equal(inventory.products.filter((product) => product.verificationStatus === "verified").length, 6);
  assert.equal(inventory.products.filter((product) => product.verificationStatus === "unverified").length, 3);
  assert.match(inventoryModule, /verificationStatus: product\.verificationStatus/);
  assert.match(websiteRoute, /channel: "website"/);
  assert.match(telegramRoute, /channel: "telegram"/);
  assert.match(decapConfig, /name: verificationStatus/);
  assert.match(decapConfig, /value: verified/);
  assert.match(decapConfig, /value: unverified/);
});

test("routes Decap GitHub login through the QI OAuth bridge", async () => {
  const [decapConfig, authRoute, callbackRoute, oauthModule] = await Promise.all([
    readFile(new URL("../public/admin/config.yml", import.meta.url), "utf8"),
    readFile(new URL("../app/api/decap/auth/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/decap/callback/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/decap-oauth.ts", import.meta.url), "utf8"),
  ]);

  assert.match(decapConfig, /base_url: https:\/\/qi-quality-imports\.cosmak-47\.chatgpt\.site/);
  assert.match(decapConfig, /auth_endpoint: api\/decap\/auth/);
  assert.match(authRoute, /beginGitHubAuthorization/);
  assert.match(callbackRoute, /completeGitHubAuthorization/);
  assert.match(oauthModule, /scope", "public_repo"/);
  assert.match(oauthModule, /STATE_COOKIE_PREFIX/);
  assert.match(oauthModule, /stateCookieName\(state\)/);
  assert.match(oauthModule, /DECAP_GITHUB_ALLOWED_USERS/);
  assert.doesNotMatch(oauthModule, /console\.log/);
});
