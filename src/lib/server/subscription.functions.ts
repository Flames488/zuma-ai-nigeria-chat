import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLANS, type PlanId } from "@/lib/plan";

const PlanIdSchema = z.enum(["starter", "growth", "pro"]);

export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: biz } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!biz) return { subscription: null };
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("business_id", biz.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { subscription: data };
  });

/** Start the 7-day free trial for the Growth plan. */
export const startTrial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ planId: PlanIdSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: biz } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!biz) return { ok: false, error: "Set up your business first." };
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("subscriptions").insert({
      business_id: biz.id,
      plan_id: data.planId,
      status: "trial",
      trial_ends_at: trialEndsAt,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, error: null as string | null };
  });

/**
 * Initialise a Paystack subscription transaction server-side.
 * Returns an authorization_url the user is redirected to.
 * Plan is NOT activated until charge.success arrives at the webhook.
 */
export const initSubscriptionCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ planId: PlanIdSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: biz } = await supabase
      .from("businesses")
      .select("id, name, email")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!biz) return { ok: false, error: "Set up your business first.", url: null };
    if (!biz.email) return { ok: false, error: "Add an email in onboarding.", url: null };

    const plan = PLANS[data.planId as PlanId];
    const zumaSk = process.env.ZUMA_PAYSTACK_SECRET_KEY;
    if (!zumaSk) {
      return {
        ok: false,
        error: "Payments aren't fully set up yet. Try again shortly.",
        url: null,
      };
    }

    const reference = `zuma_sub_${biz.id.slice(0, 8)}_${Date.now().toString(36)}`;

    // Build callback URL pointing back to dashboard
    const origin = process.env.APP_URL ?? "https://" + (process.env.SUPABASE_URL?.replace(/^https?:\/\//, "").split(".")[0] ?? "app") + ".lovable.app";

    try {
      const res = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${zumaSk}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: biz.email,
          amount: plan.amountNaira * 100, // kobo
          currency: "NGN",
          reference,
          callback_url: `${origin}/dashboard`,
          metadata: {
            kind: "zuma_subscription",
            business_id: biz.id,
            plan_id: plan.id,
            plan_name: plan.name,
            business_name: biz.name,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.status) {
        console.error("Paystack init failed", res.status, json);
        return { ok: false, error: json.message ?? "Paystack init failed", url: null };
      }

      // Pre-create a pending subscription row tied to this reference.
      await supabase.from("subscriptions").insert({
        business_id: biz.id,
        plan_id: plan.id,
        status: "trial", // placeholder; webhook will flip to active
        trial_ends_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30-min hold
        paystack_reference: reference,
      });

      return { ok: true, error: null as string | null, url: json.data.authorization_url as string };
    } catch (e) {
      console.error("Paystack init error", e);
      return { ok: false, error: "Couldn't reach Paystack. Try again.", url: null };
    }
  });
