import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PLANS, type PlanId } from "@/lib/plan";

/**
 * Paystack webhook receiver.
 * Verifies the x-paystack-signature header (HMAC-SHA512 of the raw body
 * with the Zuma secret key).
 *
 * Activates subscriptions or marks orders as paid only on charge.success.
 */
export const Route = createFileRoute("/api/public/paystack-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sk = process.env.ZUMA_PAYSTACK_SECRET_KEY;
        if (!sk) {
          console.error("ZUMA_PAYSTACK_SECRET_KEY not configured");
          return new Response("Not configured", { status: 503 });
        }

        const signature = request.headers.get("x-paystack-signature");
        const body = await request.text();
        if (!signature) return new Response("Missing signature", { status: 401 });

        const expected = createHmac("sha512", sk).update(body).digest("hex");
        const a = Buffer.from(signature, "hex");
        const b = Buffer.from(expected, "hex");
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: { event?: string; data?: Record<string, unknown> };
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        if (payload.event !== "charge.success") {
          // Acknowledge other events without acting.
          return new Response("ok", { status: 200 });
        }

        const data = payload.data ?? {};
        const reference = String(data.reference ?? "");
        const metadata = (data.metadata ?? {}) as Record<string, unknown>;
        const kind = String(metadata.kind ?? "");

        if (kind === "zuma_subscription") {
          const planId = String(metadata.plan_id ?? "") as PlanId;
          const businessId = String(metadata.business_id ?? "");
          if (!planId || !(planId in PLANS) || !businessId) {
            return new Response("Bad metadata", { status: 400 });
          }
          const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          // Update existing pre-created row, or insert if not present.
          const { data: existing } = await supabaseAdmin
            .from("subscriptions")
            .select("id")
            .eq("paystack_reference", reference)
            .maybeSingle();
          if (existing) {
            await supabaseAdmin
              .from("subscriptions")
              .update({
                status: "active",
                trial_ends_at: null,
                current_period_end: periodEnd,
              })
              .eq("id", existing.id);
          } else {
            await supabaseAdmin.from("subscriptions").insert({
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
          const { data: order } = await supabaseAdmin
            .from("orders")
            .select("id, business_id, conversation_id, customer_number, amount_naira")
            .eq("paystack_reference", reference)
            .maybeSingle();
          if (order) {
            await supabaseAdmin
              .from("orders")
              .update({ status: "paid", paid_at: new Date().toISOString() })
              .eq("id", order.id);

            // If the order came from a WhatsApp conversation, send confirmation.
            if (order.conversation_id) {
              const { data: convo } = await supabaseAdmin
                .from("conversations")
                .select("customer_number, business_id")
                .eq("id", order.conversation_id)
                .maybeSingle();
              if (convo) {
                const { data: wa } = await supabaseAdmin
                  .from("whatsapp_config")
                  .select("dialog_api_key")
                  .eq("business_id", convo.business_id)
                  .maybeSingle();
                if (wa?.dialog_api_key) {
                  const text =
                    "Payment received! Thank you for your order. We'll process it right away 🎉";
                  try {
                    await fetch("https://waba-v2.360dialog.io/messages", {
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
                    await supabaseAdmin.from("messages").insert({
                      conversation_id: order.conversation_id,
                      role: "assistant",
                      content: text,
                    });
                    await supabaseAdmin
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
      },
      GET: async () => new Response("ok", { status: 200 }),
    },
  },
});
