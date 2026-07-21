import { readFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
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
const ordersApiUrl = process.env.ORDERS_API_URL ?? "http://localhost:3000/api/orders/telegram";
const orderServiceSecret = process.env.ORDER_SERVICE_SECRET;

if (!token) {
  console.error("Missing TELEGRAM_BOT_TOKEN. Add it to telegram-bot/.env and restart the bot.");
  process.exit(1);
}

const copy = {
  RO: {
    welcome: "<b>QI / QUALITY IMPORTS</b>\nSelecție verificată pentru Moldova.\n\nAlege ce dorești să vezi:",
    chooseLanguage: "Alege limba / Выберите язык / Choose a language:",
    stock: "În stoc",
    preorder: "Precomandă",
    categories: "Categorii",
    all: "Toate produsele",
    back: "Meniul principal",
    empty: "Nu există produse în această selecție.",
    previous: "Înapoi",
    next: "Următorul",
    item: "Produs",
    pieces: "bucăți disponibile",
    order: "Comandă acest produs",
    confirmOrder: "Confirmă comanda",
    cancelOrder: "Anulează",
    orderQuestion: "Confirmi o comandă de 1 bucată? Echipa QI te va contacta în Telegram pentru mărime și livrare.",
    orderSuccess: "Comanda a fost înregistrată. Numărul comenzii:",
    payOrder: "Plătește securizat",
    paymentRequired: "Comanda va fi procesată numai după confirmarea plății.",
    paymentSetup: "Rezervarea a fost primită. Echipa QI va confirma disponibilitatea și îți va trimite instrucțiunile de plată. Produsul nu va fi expediat înainte de plată.",
    orderUnavailable: "Comenzile nu sunt configurate încă. Te rugăm să încerci mai târziu.",
    availability: { stock: "În stoc", preorder: "Precomandă" },
    categoryNames: { outerwear: "Jachete", tops: "Topuri", bottoms: "Pantaloni", shoes: "Încălțăminte" },
  },
  RU: {
    welcome: "<b>QI / QUALITY IMPORTS</b>\nПроверенная подборка для Молдовы.\n\nВыберите, что хотите посмотреть:",
    chooseLanguage: "Alege limba / Выберите язык / Choose a language:",
    stock: "В наличии",
    preorder: "Предзаказ",
    categories: "Категории",
    all: "Все товары",
    back: "Главное меню",
    empty: "В этой подборке пока нет товаров.",
    previous: "Назад",
    next: "Далее",
    item: "Товар",
    pieces: "штук в наличии",
    order: "Заказать товар",
    confirmOrder: "Подтвердить заказ",
    cancelOrder: "Отмена",
    orderQuestion: "Подтвердить заказ 1 штуки? Команда QI свяжется с вами в Telegram для уточнения размера и доставки.",
    orderSuccess: "Заказ зарегистрирован. Номер заказа:",
    payOrder: "Безопасная оплата",
    paymentRequired: "Заказ будет обработан только после подтверждения оплаты.",
    paymentSetup: "Заявка на резервирование получена. Команда QI подтвердит наличие и отправит инструкции для оплаты. Товар не будет отправлен до оплаты.",
    orderUnavailable: "Приём заказов ещё не настроен. Пожалуйста, попробуйте позже.",
    availability: { stock: "В наличии", preorder: "Предзаказ" },
    categoryNames: { outerwear: "Куртки", tops: "Верх", bottoms: "Брюки", shoes: "Обувь" },
  },
  EN: {
    welcome: "<b>QI / QUALITY IMPORTS</b>\nQuality-verified pieces selected for Moldova.\n\nChoose what you would like to see:",
    chooseLanguage: "Alege limba / Выберите язык / Choose a language:",
    stock: "In stock",
    preorder: "Preorder",
    categories: "Categories",
    all: "All products",
    back: "Main menu",
    empty: "There are no products in this selection.",
    previous: "Previous",
    next: "Next",
    item: "Product",
    pieces: "pieces available",
    order: "Order this product",
    confirmOrder: "Confirm order",
    cancelOrder: "Cancel",
    orderQuestion: "Confirm an order for 1 item? The QI team will contact you in Telegram about size and delivery.",
    orderSuccess: "Your order was registered. Order number:",
    payOrder: "Pay securely",
    paymentRequired: "The order will be processed only after payment is confirmed.",
    paymentSetup: "Your reservation was received. The QI team will confirm availability and send payment instructions. The product will not be shipped before payment.",
    orderUnavailable: "Ordering is not configured yet. Please try again later.",
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

async function telegramMultipart(method, fields, fileName, fileContents, mimeType) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.set(key, typeof value === "string" ? value : JSON.stringify(value));
  }
  form.set("photo", new Blob([fileContents], { type: mimeType }), fileName);
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(30000),
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
    [{ text: `◫ ${t.categories}`, callback_data: "menu:categories" }],
    [{ text: `✦ ${t.all}`, callback_data: "filter:all" }],
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

async function editMessage(chatId, messageId, text, replyMarkup) {
  return telegram("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: replyMarkup,
  });
}

function imageMimeType(filePath) {
  const extension = extname(filePath).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  return "image/jpeg";
}

async function sendPhotoCard(chatId, image, caption, replyMarkup) {
  const fields = {
    chat_id: String(chatId),
    caption,
    parse_mode: "HTML",
    reply_markup: replyMarkup,
  };

  if (/^https?:\/\//i.test(image)) {
    return telegram("sendPhoto", { ...fields, photo: image }, 30000);
  }

  const inventoryOrigin = new URL(inventoryUrl).origin;
  if (!inventoryOrigin.includes("localhost") && !inventoryOrigin.includes("127.0.0.1")) {
    return telegram("sendPhoto", { ...fields, photo: new URL(image, inventoryOrigin).href }, 30000);
  }

  const relativeImage = image.replace(/^\/+/, "");
  const localPath = resolve(process.cwd(), "..", "public", relativeImage);
  const contents = await readFile(localPath);
  return telegramMultipart("sendPhoto", fields, basename(localPath), contents, imageMimeType(localPath));
}

async function sendMainMenu(chatId, language) {
  await sendMessage(chatId, copy[language].welcome, mainKeyboard(language));
}

function productCard(product, language, position, total) {
  const t = copy[language];
  const availabilityIcon = product.availability === "stock" ? "●" : "◷";
  const quantity = product.availability === "stock"
    ? `\n📦 <b>${product.stockQuantity}</b> ${escapeHtml(t.pieces)}`
    : "";

  return [
    `<b>QI / QUALITY IMPORTS</b>`,
    `<i>${escapeHtml(t.item)} ${position + 1} / ${total}</i>`,
    "────────────",
    `<b>${escapeHtml(product.name)}</b>`,
    `<code>${escapeHtml(product.sku)}</code>`,
    "",
    escapeHtml(product.message),
    "",
    `💳 <b>${escapeHtml(formatPrice(product.price, product.currency))}</b>`,
    `${availabilityIcon} ${escapeHtml(t.availability[product.availability] ?? product.availability)}${quantity}`,
  ].join("\n");
}

function productKeyboard(language, filter, position, total) {
  const t = copy[language];
  const previous = (position - 1 + total) % total;
  const next = (position + 1) % total;
  return { inline_keyboard: [
    [{ text: `＋ ${t.order}`, callback_data: `order:${filter}:${position}` }],
    [
      { text: `‹ ${t.previous}`, callback_data: `product:${filter}:${previous}` },
      { text: `${position + 1} / ${total}`, callback_data: "noop:page" },
      { text: `${t.next} ›`, callback_data: `product:${filter}:${next}` },
    ],
    [{ text: `← ${t.back}`, callback_data: "menu:main" }],
  ] };
}

async function placeTelegramOrder(sku, telegramUser, language) {
  if (!orderServiceSecret || orderServiceSecret.length < 24) throw new Error("ORDER_SERVICE_SECRET is missing");
  const response = await fetch(ordersApiUrl, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${orderServiceSecret}` },
    body: JSON.stringify({
      sku,
      quantity: 1,
      telegramUserId: String(telegramUser.id),
      telegramUsername: telegramUser.username ?? null,
      customerName: [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(" "),
      language: language.toLowerCase(),
    }),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? `Order request failed with ${response.status}`);
  return result;
}

async function showCatalog(chatId, language, filter, requestedPosition = 0, messageId) {
  const t = copy[language];
  const products = selectProducts(await fetchProducts(), filter);
  if (!products.length) {
    if (messageId) {
      await editMessage(chatId, messageId, t.empty, mainKeyboard(language));
    } else {
      await sendMessage(chatId, t.empty, mainKeyboard(language));
    }
    return;
  }

  const position = Math.min(Math.max(Number(requestedPosition) || 0, 0), products.length - 1);
  const text = productCard(products[position], language, position, products.length);
  const keyboard = productKeyboard(language, filter, position, products.length);
  if (messageId) {
    try {
      await telegram("deleteMessage", { chat_id: chatId, message_id: messageId });
    } catch (error) {
      console.error(`Could not replace the previous product card: ${error.message}`);
    }
  }

  if (products[position].image) {
    try {
      await sendPhotoCard(chatId, products[position].image, text, keyboard);
      return;
    } catch (error) {
      console.error(`Could not send image for ${products[position].sku}: ${error.message}. Sending text card instead.`);
    }
  }
  await sendMessage(chatId, text, keyboard);
}

async function handleMessage(message) {
  const chatId = message.chat.id;
  const command = (message.text ?? "").split(/\s+/)[0].split("@")[0].toLowerCase();
  const language = userLanguages.get(chatId) ?? "RO";

  if (command === "/start" || command === "/language") {
    await sendMessage(chatId, copy[language].chooseLanguage, languageKeyboard());
  } else if (command === "/stock") {
    await showCatalog(chatId, language, "stock");
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
  const [action, value, detail] = callback.data.split(":");
  const language = userLanguages.get(chatId) ?? "RO";

  if (action === "lang" && copy[value]) {
    userLanguages.set(chatId, value);
    await sendMainMenu(chatId, value);
  } else if (action === "filter") {
    await showCatalog(chatId, language, value);
  } else if (action === "product") {
    await showCatalog(chatId, language, value, detail, callback.message.message_id);
  } else if (action === "order") {
    const products = selectProducts(await fetchProducts(), value);
    const product = products[Number(detail) || 0];
    if (!product) return;
    await sendMessage(chatId, `<b>${escapeHtml(product.name)}</b>\n${escapeHtml(copy[language].orderQuestion)}`, {
      inline_keyboard: [[
        { text: `✓ ${copy[language].confirmOrder}`, callback_data: `confirm:${product.sku}` },
        { text: copy[language].cancelOrder, callback_data: "menu:main" },
      ]],
    });
  } else if (action === "confirm") {
    try {
      const order = await placeTelegramOrder(value, callback.from, language);
      const message = `✓ <b>${escapeHtml(copy[language].orderSuccess)}</b>\n<code>${escapeHtml(order.orderNumber)}</code>\n\n${escapeHtml(order.checkoutUrl ? copy[language].paymentRequired : copy[language].paymentSetup)}`;
      const keyboard = order.checkoutUrl
        ? { inline_keyboard: [[{ text: `💳 ${copy[language].payOrder}`, url: order.checkoutUrl }], ...mainKeyboard(language).inline_keyboard] }
        : mainKeyboard(language);
      await sendMessage(chatId, message, keyboard);
    } catch (error) {
      console.error(`Could not create Telegram order: ${error.message}`);
      await sendMessage(chatId, copy[language].orderUnavailable, mainKeyboard(language));
    }
  } else if (callback.data === "menu:categories") {
    await sendMessage(chatId, copy[language].categories, categoryKeyboard(language));
  } else if (callback.data === "menu:language") {
    await sendMessage(chatId, copy[language].chooseLanguage, languageKeyboard());
  } else if (action === "noop") {
    return;
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
