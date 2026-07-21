import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { categories, escapeHtml, formatPrice, selectProducts } from "./catalog.mjs";

async function loadLocalEnvironment() {
  try {
    const contents = await readFile(resolve(process.cwd(), ".env"), "utf8");
    for (const rawLine of contents.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separator = line.indexOf("=");
      if (separator < 1) continue;
      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

await loadLocalEnvironment();

const token = process.env.TELEGRAM_BOT_TOKEN;
const inventoryUrl = process.env.INVENTORY_API_URL ?? "http://localhost:3000/api/inventory/telegram";

if (!token) {
  console.error("Missing TELEGRAM_BOT_TOKEN. Add it to telegram-bot/.env and restart the bot.");
  process.exit(1);
}

const copy = {
  RO: {
    welcome: "Bine ai venit la Quality Imports. Alege ce dorești să vezi:",
    chooseLanguage: "Alege limba / Выберите язык / Choose a language:",
    stock: "În stoc",
    preorder: "Precomandă",
    categories: "Categorii",
    all: "Toate produsele",
    back: "Meniul principal",
    empty: "Nu există produse în această selecție.",
    availability: { stock: "În stoc", preorder: "Precomandă" },
    categoryNames: { outerwear: "Jachete", tops: "Topuri", bottoms: "Pantaloni", shoes: "Încălțăminte" },
  },
  RU: {
    welcome: "Добро пожаловать в Quality Imports. Выберите, что хотите посмотреть:",
    chooseLanguage: "Alege limba / Выберите язык / Choose a language:",
    stock: "В наличии",
    preorder: "Предзаказ",
    categories: "Категории",
    all: "Все товары",
    back: "Главное меню",
    empty: "В этой подборке пока нет товаров.",
    availability: { stock: "В наличии", preorder: "Предзаказ" },
    categoryNames: { outerwear: "Куртки", tops: "Верх", bottoms: "Брюки", shoes: "Обувь" },
  },
  EN: {
    welcome: "Welcome to Quality Imports. Choose what you would like to see:",
    chooseLanguage: "Alege limba / Выберите язык / Choose a language:",
    stock: "In stock",
    preorder: "Preorder",
    categories: "Categories",
    all: "All products",
    back: "Main menu",
    empty: "There are no products in this selection.",
    availability: { stock: "In stock", preorder: "Preorder" },
    categoryNames: { outerwear: "Outerwear", tops: "Tops", bottoms: "Trousers", shoes: "Shoes" },
  },
};

const userLanguages = new Map();
let offset = 0;
let stopping = false;

async function telegram(method, payload = {}, timeoutMs = 15000) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.description ?? `Telegram ${method} failed with ${response.status}`);
  }
  return result.result;
}

async function fetchProducts() {
  const response = await fetch(inventoryUrl, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Inventory request failed with ${response.status}`);
  const inventory = await response.json();
  if (!Array.isArray(inventory.products)) throw new Error("Inventory feed has an invalid products field");
  return inventory.products;
}

function languageKeyboard() {
  return { inline_keyboard: [[
    { text: "Română", callback_data: "lang:RO" },
    { text: "Русский", callback_data: "lang:RU" },
    { text: "English", callback_data: "lang:EN" },
  ]] };
}

function mainKeyboard(language) {
  const t = copy[language];
  return { inline_keyboard: [
    [
      { text: `✅ ${t.stock}`, callback_data: "filter:stock" },
      { text: `🕓 ${t.preorder}`, callback_data: "filter:preorder" },
    ],
    [{ text: `▦ ${t.categories}`, callback_data: "menu:categories" }],
    [{ text: t.all, callback_data: "filter:all" }],
    [{ text: "RO · RU · EN", callback_data: "menu:language" }],
  ] };
}

function categoryKeyboard(language) {
  const t = copy[language];
  return { inline_keyboard: [
    ...categories.map((category) => [{ text: t.categoryNames[category], callback_data: `filter:${category}` }]),
    [{ text: `← ${t.back}`, callback_data: "menu:main" }],
  ] };
}

async function sendMessage(chatId, text, replyMarkup) {
  return telegram("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

async function sendMainMenu(chatId, language) {
  await sendMessage(chatId, copy[language].welcome, mainKeyboard(language));
}

async function sendCatalog(chatId, language, filter) {
  const t = copy[language];
  const products = selectProducts(await fetchProducts(), filter);
  if (!products.length) {
    await sendMessage(chatId, t.empty, mainKeyboard(language));
    return;
  }

  for (const product of products) {
    const quantity = product.availability === "stock" ? `\n📦 ${product.stockQuantity}` : "";
    const text = [
      `<b>${escapeHtml(product.name)}</b>`,
      `<code>${escapeHtml(product.sku)}</code>`,
      `\n${escapeHtml(product.message)}`,
      `\n<b>${escapeHtml(formatPrice(product.price, product.currency))}</b>`,
      `${escapeHtml(t.availability[product.availability] ?? product.availability)}${quantity}`,
    ].join("\n");
    await sendMessage(chatId, text);
  }

  await sendMessage(chatId, t.back, mainKeyboard(language));
}

async function handleMessage(message) {
  const chatId = message.chat.id;
  const command = (message.text ?? "").split(/\s+/)[0].split("@")[0].toLowerCase();
  const language = userLanguages.get(chatId) ?? "RO";

  if (command === "/start" || command === "/language") {
    await sendMessage(chatId, copy[language].chooseLanguage, languageKeyboard());
  } else if (command === "/stock") {
    await sendCatalog(chatId, language, "stock");
  } else if (command === "/categories") {
    await sendMessage(chatId, copy[language].categories, categoryKeyboard(language));
  } else if (command === "/help") {
    await sendMainMenu(chatId, language);
  } else {
    await sendMainMenu(chatId, language);
  }
}

async function handleCallback(callback) {
  const chatId = callback.message?.chat.id;
  if (!chatId) return;
  await telegram("answerCallbackQuery", { callback_query_id: callback.id });
  const [action, value] = callback.data.split(":", 2);
  const language = userLanguages.get(chatId) ?? "RO";

  if (action === "lang" && copy[value]) {
    userLanguages.set(chatId, value);
    await sendMainMenu(chatId, value);
  } else if (action === "filter") {
    await sendCatalog(chatId, language, value);
  } else if (callback.data === "menu:categories") {
    await sendMessage(chatId, copy[language].categories, categoryKeyboard(language));
  } else if (callback.data === "menu:language") {
    await sendMessage(chatId, copy[language].chooseLanguage, languageKeyboard());
  } else {
    await sendMainMenu(chatId, language);
  }
}

async function handleUpdate(update) {
  if (update.message) await handleMessage(update.message);
  if (update.callback_query) await handleCallback(update.callback_query);
}

async function start() {
  await telegram("deleteWebhook", { drop_pending_updates: false });
  const bot = await telegram("getMe");
  await telegram("setMyCommands", { commands: [
    { command: "start", description: "Open the Quality Imports shop" },
    { command: "stock", description: "Browse products in stock" },
    { command: "categories", description: "Browse product categories" },
    { command: "language", description: "RO · RU · EN" },
    { command: "help", description: "Show the main menu" },
  ] });
  console.log(`QI Telegram bot @${bot.username} is running. Press Ctrl+C to stop.`);

  while (!stopping) {
    try {
      const updates = await telegram("getUpdates", {
        offset,
        timeout: 25,
        allowed_updates: ["message", "callback_query"],
      }, 35000);
      for (const update of updates) {
        offset = update.update_id + 1;
        try {
          await handleUpdate(update);
        } catch (error) {
          console.error(`Could not handle Telegram update ${update.update_id}: ${error.message}`);
        }
      }
    } catch (error) {
      if (stopping) break;
      console.error(`Telegram connection error: ${error.message}. Retrying in 3 seconds.`);
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 3000));
    }
  }
}

process.once("SIGINT", () => { stopping = true; });
process.once("SIGTERM", () => { stopping = true; });

start().catch((error) => {
  console.error(`Bot startup failed: ${error.message}`);
  process.exitCode = 1;
});
