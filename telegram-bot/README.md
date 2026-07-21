# QI Telegram Bot

The bot reads the centralized Telegram channel feed from the website and offers
RO, RU and EN menus for stock, preorder and product categories.

## Local setup

1. Copy `.env.example` to `.env`.
2. Paste the BotFather token into `.env`. Never commit or share this file.
3. Start the website from the repository root so the local inventory feed is available.
4. In a second terminal, start the bot:

```bash
cd telegram-bot
npm start
```

Open the bot's username in Telegram and tap **Start**. Stop the local bot with
`Ctrl+C`.

## Inventory behavior

The bot fetches `GET /api/inventory/telegram`. Only products with
`telegram.enabled: true` are returned. Shared price, stock, SKU and availability
come from `content/inventory.json`; Telegram-specific name and message fields do
not affect the website.

For production, set `INVENTORY_API_URL` to the deployed website endpoint and
store `TELEGRAM_BOT_TOKEN` in the hosting provider's protected secret storage.
