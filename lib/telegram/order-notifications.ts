import { env } from "cloudflare:workers";

const messages = {
  ro: { confirmed: "Comanda ta este disponibilă și a fost confirmată.", pay: "Apasă butonul de mai jos pentru a achita comanda în siguranță.", pending: "Plata online nu este încă disponibilă. Echipa QI îți va trimite instrucțiunile de plată.", button: "💳 Plătește comanda" },
  ru: { confirmed: "Ваш заказ доступен и подтверждён.", pay: "Нажмите кнопку ниже, чтобы безопасно оплатить заказ.", pending: "Онлайн-оплата пока недоступна. Команда QI отправит инструкции по оплате.", button: "💳 Оплатить заказ" },
  en: { confirmed: "Your order is available and has been confirmed.", pay: "Use the button below to pay for your order securely.", pending: "Online payment is not available yet. The QI team will send payment instructions.", button: "💳 Pay for order" },
} as const;

export async function sendTelegramOrderConfirmed(input: { chatId: string; orderNumber: string; language?: string | null; checkoutUrl?: string | null }) {
  const token = (env as unknown as Record<string, unknown>).TELEGRAM_BOT_TOKEN;
  if (typeof token !== "string" || token.length <= 20) return { status: "not_configured" as const };
  const language = input.language === "ru" || input.language === "en" ? input.language : "ro";
  const copy = messages[language];
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: input.chatId,
      text: `✓ <b>${copy.confirmed}</b>\n<code>${input.orderNumber}</code>\n\n${input.checkoutUrl ? copy.pay : copy.pending}`,
      parse_mode: "HTML",
      ...(input.checkoutUrl ? { reply_markup: { inline_keyboard: [[{ text: copy.button, url: input.checkoutUrl }]] } } : {}),
    }),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json() as { ok?: boolean; description?: string };
  if (!response.ok || !result.ok) throw new Error(result.description || "Telegram notification failed");
  return { status: "sent" as const };
}
