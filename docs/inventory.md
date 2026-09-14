# Central inventory behavior

`content/inventory.json` is the only source of truth for stock, availability,
price and channel presentation.

## Editing rules

- Change `stockQuantity`, `availability` or `price` to update every enabled channel.
- Set `verificationStatus` to `verified` only after the QI verification process is complete; otherwise keep `unverified`.
- Change fields inside `website` to update only the storefront.
- Change fields inside `telegram` to update only the bot.
- Upload or replace `image` in Decap to update the product image used by both channels.
- Set `website.enabled` to `false` to remove a product only from the website.
- Set `telegram.enabled` to `false` to remove a product only from Telegram.
- Delete the complete product only when it must disappear everywhere.

## Channel feeds

- `/api/inventory/website` contains only website-enabled products.
- `/api/inventory/telegram` contains only Telegram-enabled products.

Decap is available at `/admin/` and commits inventory edits to
`CosmaK-47/QualityImport` on the `main` branch. Its GitHub OAuth application's
callback is `https://qi-quality-imports.cosmak-47.chatgpt.site/api/decap/callback`.
Store the client ID and secret as `GITHUB_OAUTH_CLIENT_ID` and
`GITHUB_OAUTH_CLIENT_SECRET` in the hosted environment, never in Git. The
server allows only the comma-separated GitHub users in
`DECAP_GITHUB_ALLOWED_USERS` (currently `CosmaK-47`). Because the repository is
public, the login flow requests the narrower `public_repo` scope.

Product images uploaded through Decap are stored in `public/uploads/products/`.
The bot uploads these files directly during local testing and uses their public
website URL after deployment.

## Orders

Private order and staff data is stored in D1, never in this inventory file.
Telegram creates orders through the protected `/api/orders/telegram` service;
staff review combined Website and Telegram orders at `/staff/orders`. Configure
`STAFF_ADMIN_EMAILS` and `ORDER_SERVICE_SECRET` as protected runtime values.
