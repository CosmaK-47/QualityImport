# Central inventory behavior

`content/inventory.json` is the only source of truth for stock, availability,
price and channel presentation.

## Editing rules

- Change `stockQuantity`, `availability` or `price` to update every enabled channel.
- Change fields inside `website` to update only the storefront.
- Change fields inside `telegram` to update only the bot.
- Set `website.enabled` to `false` to remove a product only from the website.
- Set `telegram.enabled` to `false` to remove a product only from Telegram.
- Delete the complete product only when it must disappear everywhere.

## Channel feeds

- `/api/inventory/website` contains only website-enabled products.
- `/api/inventory/telegram` contains only Telegram-enabled products.

Decap is available at `/admin/`. Its production Git backend still needs to be
connected to the repository provider that will own inventory edits.
