import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Generate a real Paystack checkout URL for an order, using the business's
 * own Paystack secret key (stored server-side, never exposed to the browser).
 */
export const generateOrderPaymentLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        amountNaira: z.number().int().positive().max(100_000_000),
        customerNumber: z.string().max(40).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: biz } = await supabase
      .from("businesses")
      .select("id, name, email")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!biz) return { ok: false, error: "Business not found", url: null };

    const { data: keys } = await supabase
      .from("paystack_keys")
      .select("secret_key")
      .eq("business_id", biz.id)
      .maybeSingle();
    if (!keys?.secret_key) {
      return { ok: false, error: "Connect Paystack in Settings to enable this", url: null };
    }

    const reference = `zuma_ord_${biz.id.slice(0, 8)}_${Date.now().toString(36)}`;
    try {
      const res = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${keys.secret_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: biz.email,
          amount: data.amountNaira * 100,
          currency: "NGN",
          reference,
          metadata: {
            kind: "zuma_order",
            business_id: biz.id,
            customer_number: data.customerNumber ?? null,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.status) {
        console.error("Paystack order init failed", res.status, json);
        return { ok: false, error: json.message ?? "Paystack error", url: null };
      }

      await supabase.from("orders").insert({
        business_id: biz.id,
        customer_number: data.customerNumber ?? "manual",
        amount_naira: data.amountNaira,
        paystack_reference: reference,
        status: "pending",
      });

      return { ok: true, error: null as string | null, url: json.data.authorization_url as string };
    } catch (e) {
      console.error("Paystack order init error", e);
      return { ok: false, error: "Couldn't reach Paystack", url: null };
    }
  });
