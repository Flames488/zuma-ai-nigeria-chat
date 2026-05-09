import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PLANS, type PlanId } from "@/lib/plan";

/**
 * Paystack webhook receiver.
 * Verifies the x-paystack-signature header (HMAC-SHA512 of the raw body
 * with the Wabizz platform Paystack secret key).
 *
 * Activates subscriptions or marks orders as paid only on charge.success.
 */
export type WebhookDeps = {
  secretKey: string | undefined;
  db: typeof supabaseAdmin;
  fetchImpl?: typeof fetch;
};

export async function handlePaystackWebhook(
  request: Request,
  deps: WebhookDeps,
): Promise<Response> {
  const sk = deps.secretKey;
  if (!sk) {
    console.error("ZUMA_PAYSTACK_SECRET_KEY not configured");
    return new Response("Not configured", { status: 503 });
  }

  const signature = request.headers.get("x-paystack-signature");
  const body = await request.text();
  if (!signature) return new Response("Missing signature", { status: 401 });

  const expected = createHmac("sha512", sk).update(body).digest("hex");
  let valid = false;
  try {
    const a = Buffer.from(signature, "hex");
    const b = Buffer.from(expected, "hex");
    valid = a.length === b.length && timingSafeEqual(a, b);
  } catch {
    valid = false;
  }
  if (!valid) return new Response("Invalid signature", { status: 401 });

  let payload: { event?: string; data?: Record<string, unknown> };
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (payload.event !== "charge.success") {
    return new Response("ok", { status: 200 });
  }

  const data = payload.data ?? {};
  const reference = String(data.reference ?? "");
  const metadata = (data.metadata ?? {}) as Record<string, unknown>;
  const kind = String(metadata.kind ?? "");
  const db = deps.db;
  const fetchImpl = deps.fetchImpl ?? fetch;

  if (kind === "zuma_subscription") {
    const planId = String(metadata.plan_id ?? "") as PlanId;
    const businessId = String(metadata.business_id ?? "");
    if (!planId || !(planId in PLANS) || !businessId) {
      return new Response("Bad metadata", { status: 400 });
    }
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await db
      .from("subscriptions")
      .select("id")
      .eq("paystack_reference", reference)
      .maybeSingle();
    if (existing) {
      await db
        .from("subscriptions")
        .update({
          status: "active",
          trial_ends_at: null,
          current_period_end: periodEnd,
        })
        .eq("id", existing.id);
    } else {
      await db.from("subscriptions").insert({
        business_id: businessId,
        plan_id: planId,
        status: "active",
        current_period_end: periodEnd,
        paystack_reference: reference,
      });
    }
    return new Response("ok", { status: 200 });
  }

  if (kind === "zuma_order") {
    const { data: order } = await db
      .from("orders")
      .select("id, business_id, conversation_id, customer_number, amount_naira")
      .eq("paystack_reference", reference)
      .maybeSingle();
    if (order) {
      await db
        .from("orders")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", order.id);

      if (order.conversation_id) {
        const { data: convo } = await db
          .from("conversations")
          .select("customer_number, business_id")
          .eq("id", order.conversation_id)
          .maybeSingle();
        if (convo) {
          const { data: wa } = await db
            .from("whatsapp_config")
            .select("dialog_api_key")
            .eq("business_id", convo.business_id)
            .maybeSingle();
          if (wa?.dialog_api_key) {
            const text =
              "Payment received! Thank you for your order. We'll process it right away 🎉";
            try {
              await fetchImpl("https://waba-v2.360dialog.io/messages", {
                method: "POST",
                headers: {
                  "D360-API-KEY": wa.dialog_api_key,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  messaging_product: "whatsapp",
                  to: convo.customer_number,
                  type: "text",
                  text: { body: text },
                }),
              });
              await db.from("messages").insert({
                conversation_id: order.conversation_id,
                role: "assistant",
                content: text,
              });
              await db
                .from("conversations")
                .update({
                  status: "order_placed",
                  last_message_at: new Date().toISOString(),
                })
                .eq("id", order.conversation_id);
            } catch (e) {
              console.error("Confirmation send failed", e);
            }
          }
        }
      }
    }
    return new Response("ok", { status: 200 });
  }

  return new Response("ok", { status: 200 });
}

export const Route = createFileRoute("/api/public/paystack-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handlePaystackWebhook(request, {
          secretKey: process.env.ZUMA_PAYSTACK_SECRET_KEY,
          db: supabaseAdmin,
        }),
      GET: async () => new Response("ok", { status: 200 }),
    },
  },
});
