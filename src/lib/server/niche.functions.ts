/**
 * Authed server functions for the niche module dashboard.
 * All RLS-aware: they use the request's bearer token (requireSupabaseAuth).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const NicheTypeSchema = z.enum(["hospital", "food"]);

async function getOwnedBusinessId(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();
  return data?.id ?? null;
}

// ---------- Niche configs ----------

export const listMyNiches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const businessId = await getOwnedBusinessId(supabase, userId);
    if (!businessId) return { businessId: null, niches: [] as Array<{ id: string; niche_type: "hospital" | "food"; active: boolean; config: Record<string, unknown> }> };
    const { data, error } = await supabase
      .from("niche_configs")
      .select("id, niche_type, active, config")
      .eq("business_id", businessId);
    if (error) throw new Error(error.message);
    return { businessId, niches: (data ?? []) as any };
  });

export const upsertNiche = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      niche_type: NicheTypeSchema,
      active: z.boolean(),
      config: z.record(z.string(), z.unknown()).default({}),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const businessId = await getOwnedBusinessId(supabase, userId);
    if (!businessId) throw new Error("No business profile yet — finish onboarding first.");
    const { error } = await supabase
      .from("niche_configs")
      .upsert(
        { business_id: businessId, niche_type: data.niche_type, active: data.active, config: data.config as any },
        { onConflict: "business_id,niche_type" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Menu items ----------

export const listMyMenu = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const businessId = await getOwnedBusinessId(supabase, userId);
    if (!businessId) return [];
    const { data, error } = await supabase
      .from("menu_items")
      .select("id, name, description, category, price_kobo, available, sort_order")
      .eq("business_id", businessId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createMenuItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      name: z.string().min(1),
      description: z.string().default(""),
      category: z.string().default("General"),
      price_kobo: z.number().int().nonnegative(),
      available: z.boolean().default(true),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const businessId = await getOwnedBusinessId(supabase, userId);
    if (!businessId) throw new Error("No business profile yet.");
    const { error } = await supabase.from("menu_items").insert([{ business_id: businessId, ...data }] as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateMenuItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      patch: z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        price_kobo: z.number().int().nonnegative().optional(),
        available: z.boolean().optional(),
      }),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { error } = await supabase.from("menu_items").update(data.patch as any).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMenuItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { error } = await supabase.from("menu_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Food orders ----------

export const listMyFoodOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const businessId = await getOwnedBusinessId(supabase, userId);
    if (!businessId) return [];
    const { data, error } = await supabase
      .from("food_orders")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setFoodOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      status: z.enum(["pending", "paid", "preparing", "out_for_delivery", "delivered", "cancelled"]),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { error } = await supabase.from("food_orders").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
