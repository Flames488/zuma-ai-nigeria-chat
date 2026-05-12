import type { FoodConfig, MenuItem } from "./types";
import { naira } from "./menu-service";

export function foodPromptAddition(cfg: FoodConfig, menu: MenuItem[]): string {
  const currency = cfg.currency || "NGN";
  const fee = cfg.delivery_fee_kobo ?? 0;
  const min = cfg.min_order_kobo ?? 0;
  const menuLines = menu
    .filter((m) => m.available)
    .slice(0, 30)
    .map((m) => `- ${m.name} — ${naira(m.price_kobo)}${m.description ? ` (${m.description})` : ""}`)
    .join("\n");
  return `
You are also taking food orders over WhatsApp.

Current menu (${currency}):
${menuLines || "(menu currently empty — apologise and ask the customer to try later)"}

Delivery fee: ${naira(fee)}${min > 0 ? `. Minimum order: ${naira(min)}.` : ""}

Rules:
- Never invent items not on the menu — if the customer asks for something missing, suggest the closest match.
- Always confirm items, quantities, and the delivery address before sending the payment link.
- Once a Paystack payment link is sent, ask the customer to reply "PAID" after paying.
${cfg.delivery_faq ? `\nDelivery FAQ:\n${cfg.delivery_faq}` : ""}
`.trim();
}
