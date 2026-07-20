# QI Telegram Bot

This folder is reserved for the independent Telegram bot application.

The bot must treat the website's channel feed as read-only and fetch:

```text
GET /api/inventory/telegram
```

Only products with `telegram.enabled: true` are returned. Shared price, stock,
SKU and availability come from `content/inventory.json`; Telegram-specific name
and message fields do not affect the website.

## Planned environment

```text
TELEGRAM_BOT_TOKEN=
INVENTORY_API_URL=https://your-store.example/api/inventory/telegram
```

The bot code will be added here after the Telegram bot token and deployment
target are selected. Never commit the token.
