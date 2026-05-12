/**
 * Food trader intent handler.
 *
 * Implements: BROWSE_MENU, PLACE_ORDER, ITEM_PRICE, ORDER_STATUS,
 * CANCEL_ORDER, DELIVERY_FAQ, GENERAL_FAQ, plus owner status commands.
 *
 * Owner commands (sent from cfg.owner_phone):
 *   "status <orderId> preparing|out|delivered|cancelled"
 *
 * Order placement here is intentionally a single-turn confirmation: the AI
 * fallback handles the conversational collection. Once the customer types a
 * clear "I'll take 2 jollof and 1 chicken" style message we parse, create
 * the order, return a payment link, and stop.
 */
import type { NicheContext, NicheHandlerResult } from "../types";
import {
  createFoodOrder,
  createPaystackLink,
  findActiveOrderForCustomer,
  updateOrderStatus,
} from "./order-service";
import { fuzzyMatchMenu, listMenu, naira } from "./menu-service";
import type { FoodConfig, FoodIntent, OrderItem } from "./types";

export function classifyFoodIntent(text: string): FoodIntent {
  const t = text.toLowerCase().trim();
  if (/^status\s+[a-f0-9-]{6,}/i.test(t)) return "OWNER_STATUS_CMD";
  if (/\b(cancel)\b/.test(t)) return "CANCEL_ORDER";
  if (/\b(where('|i)s)\b|\bstatus\b|\btracking\b|\bmy order\b/.test(t)) return "ORDER_STATUS";
  if (/\b(order|i'?ll take|i want|deliver|buy|please send)\b/.test(t)) return "PLACE_ORDER";
  if (/\b(menu|what (do|are) you (sell|have)|food list)\b/.test(t)) return "BROWSE_MENU";
  if (/\b(price|how much|cost)\b/.test(t)) return "ITEM_PRICE";
  if (/\b(deliver|delivery|how long|eta|when will)\b/.test(t)) return "DELIVERY_FAQ";
  if (/\b(open|hours|address|location|faq)\b/.test(t)) return "GENERAL_FAQ";
  return "UNKNOWN";
}

/** Parse "2 jollof, 1 chicken suya, 3 zobo" style messages. */
export function parseOrderItems(text: string): Array<{ qty: number; query: string }> {
  const cleaned = text.replace(/\b(please|order|i'?ll take|i want|to take|of|some)\b/gi, " ");
  const parts = cleaned.split(/[,;]| and /i).map((p) => p.trim()).filter(Boolean);
  const out: Array<{ qty: number; query: string }> = [];
  for (const part of parts) {
    const m = part.match(/^(\d+)\s*(?:x|×)?\s*(.+)$/i);
    if (m) {
      out.push({ qty: Math.max(1, parseInt(m[1], 10)), query: m[2].trim() });
    } else if (part.length > 1) {
      out.push({ qty: 1, query: part });
    }
  }
  return out;
}

export async function handleFood(ctx: NicheContext): Promise<NicheHandlerResult> {
  const cfg = ctx.config as FoodConfig;
  const intent = classifyFoodIntent(ctx.text);

  // Owner commands take priority.
  if (intent === "OWNER_STATUS_CMD" && cfg.owner_phone && ctx.customerNumber === cfg.owner_phone) {
    const m = ctx.text.trim().match(/^status\s+([a-f0-9-]{6,})\s+(\w+)/i);
    if (!m) return { handled: true, reply: "Format: status <order-id> preparing|out|delivered|cancelled" };
    const [, id, raw] = m;
    const map: Record<string, "preparing" | "out_for_delivery" | "delivered" | "cancelled"> = {
      preparing: "preparing",
      out: "out_for_delivery",
      delivered: "delivered",
      cancelled: "cancelled",
      cancel: "cancelled",
    };
    const next = map[raw.toLowerCase()];
    if (!next) return { handled: true, reply: "Unknown status. Use: preparing, out, delivered, cancelled." };
    const ok = await updateOrderStatus(id, next);
    return { handled: true, reply: ok ? `✅ Order ${id.slice(0, 8)} → ${next}` : "Couldn't update that order." };
  }

  switch (intent) {
    case "BROWSE_MENU": {
      const menu = await listMenu(ctx.businessId, { availableOnly: true });
      if (menu.length === 0) return { handled: true, reply: "Our menu is being updated — please check back shortly. 🙏" };
      const grouped = new Map<string, typeof menu>();
      for (const m of menu) {
        const arr = grouped.get(m.category) ?? [];
        arr.push(m);
        grouped.set(m.category, arr);
      }
      let reply = "*Today's menu* 🍽️\n";
      for (const [cat, items] of grouped) {
        reply += `\n_${cat}_\n` + items.map((i) => `• ${i.name} — ${naira(i.price_kobo)}`).join("\n") + "\n";
      }
      reply += `\nReply with what you'd like (e.g. "2 jollof and 1 chicken").`;
      return { handled: true, reply };
    }

    case "ITEM_PRICE": {
      const menu = await listMenu(ctx.businessId, { availableOnly: true });
      const matches = fuzzyMatchMenu(menu, ctx.text);
      if (matches.length === 0) return { handled: true, reply: "I couldn't find that item. Reply 'menu' to see what's available." };
      const lines = matches.map((m) => `• ${m.item.name} — ${naira(m.item.price_kobo)}`).join("\n");
      return { handled: true, reply: `Here's what I found:\n${lines}` };
    }

    case "ORDER_STATUS": {
      const order = await findActiveOrderForCustomer(ctx.businessId, ctx.customerNumber);
      if (!order) return { handled: true, reply: "I don't see an active order under this number." };
      return {
        handled: true,
        reply: `Your last order #${order.id.slice(0, 8)} is *${order.status.replace(/_/g, " ")}* — total ${naira(order.total_kobo)}.`,
      };
    }

    case "CANCEL_ORDER": {
      const order = await findActiveOrderForCustomer(ctx.businessId, ctx.customerNumber);
      if (!order) return { handled: true, reply: "No active order to cancel." };
      if (["out_for_delivery", "delivered"].includes(order.status)) {
        return { handled: true, reply: "Sorry, your order is already on the way and can't be cancelled. Please call us." };
      }
      const ok = await updateOrderStatus(order.id, "cancelled");
      return { handled: true, reply: ok ? "✅ Your order has been cancelled." : "Couldn't cancel — please try again or call us." };
    }

    case "PLACE_ORDER": {
      const menu = await listMenu(ctx.businessId, { availableOnly: true });
      if (menu.length === 0) return { handled: true, reply: "Our menu is empty right now — please try later. 🙏" };
      const parsed = parseOrderItems(ctx.text);
      const items: OrderItem[] = [];
      const unmatched: string[] = [];
      for (const p of parsed) {
        const matches = fuzzyMatchMenu(menu, p.query, 1);
        const m = matches[0];
        if (!m) {
          unmatched.push(p.query);
          continue;
        }
        items.push({
          menu_item_id: m.item.id,
          name: m.item.name,
          qty: p.qty,
          unit_price_kobo: m.item.price_kobo,
          line_total_kobo: m.item.price_kobo * p.qty,
        });
      }
      if (items.length === 0) {
        return { handled: true, reply: "I couldn't match anything from your message to our menu. Reply 'menu' to see options." };
      }
      const fee = cfg.delivery_fee_kobo ?? 0;
      const subtotal = items.reduce((s, i) => s + i.line_total_kobo, 0);
      if ((cfg.min_order_kobo ?? 0) > subtotal) {
        return { handled: true, reply: `Minimum order is ${naira(cfg.min_order_kobo!)}. Please add a little more 🙏` };
      }
      const order = await createFoodOrder({
        businessId: ctx.businessId,
        customerNumber: ctx.customerNumber,
        customerName: ctx.customerName,
        items,
        deliveryFeeKobo: fee,
        deliveryAddress: null,
      });
      if (!order) return { handled: true, reply: "Couldn't create your order — please try again." };

      const ref = `food-${order.id.slice(0, 8)}-${Date.now().toString(36)}`;
      const link = await createPaystackLink({
        businessId: ctx.businessId,
        amountKobo: order.total_kobo,
        email: `${ctx.customerNumber.replace(/\D/g, "")}@wabizz-customer.local`,
        reference: ref,
        metadata: { order_id: order.id, business_id: ctx.businessId, kind: "food_order" },
      });

      const itemsLine = items.map((i) => `${i.qty}× ${i.name}`).join(", ");
      let reply = `*Order confirmed* 🛒\n${itemsLine}\nSubtotal: ${naira(subtotal)}\nDelivery: ${naira(fee)}\n*Total: ${naira(order.total_kobo)}*\n`;
      if (unmatched.length > 0) reply += `\n(I couldn't find: ${unmatched.join(", ")})\n`;
      if (link) {
        reply += `\nPay here: ${link}\nReply *PAID* once payment is complete. 🙏`;
      } else {
        reply += `\nWe'll send your payment link shortly. 🙏`;
      }
      return { handled: true, reply, meta: { order_id: order.id, ref } };
    }

    case "DELIVERY_FAQ": {
      if (cfg.delivery_faq) return { handled: true, reply: cfg.delivery_faq };
      return { handled: false };
    }

    default:
      return { handled: false };
  }
}
