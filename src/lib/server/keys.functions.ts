import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PaystackInput = z.object({
  publicKey: z.string().regex(/^pk_(test|live)_[A-Za-z0-9]{10,}$/, "Invalid Paystack public key"),
  secretKey: z.string().regex(/^sk_(test|live)_[A-Za-z0-9]{10,}$/, "Invalid Paystack secret key"),
});

export const getPaystackStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: biz } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!biz) return { connected: false, publicKey: null as string | null };
    // Read only public_key — never return secret_key to client
    const { data } = await supabase
      .from("paystack_keys")
      .select("public_key")
      .eq("business_id", biz.id)
      .maybeSingle();
    return { connected: !!data, publicKey: data?.public_key ?? null };
  });

export const savePaystackKeys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PaystackInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: biz } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!biz) return { ok: false, error: "Set up your business profile first." };
    const { error } = await supabase
      .from("paystack_keys")
      .upsert(
        { business_id: biz.id, public_key: data.publicKey, secret_key: data.secretKey },
        { onConflict: "business_id" },
      );
    if (error) return { ok: false, error: error.message };
    return { ok: true, error: null as string | null };
  });

const WhatsAppInput = z.object({
  apiKey: z.string().min(10).max(500),
  businessNumber: z.string().regex(/^\+?\d[\d\s-]{6,30}$/, "Invalid WhatsApp number"),
});

export const getWhatsAppStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: biz } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!biz) return { connected: false, businessNumber: null as string | null };
    const { data } = await supabase
      .from("whatsapp_config")
      .select("business_number")
      .eq("business_id", biz.id)
      .maybeSingle();
    return { connected: !!data, businessNumber: data?.business_number ?? null };
  });

export const saveWhatsAppConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => WhatsAppInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: biz } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!biz) return { ok: false, error: "Set up your business profile first." };
    const cleanNumber = data.businessNumber.replace(/[\s-]/g, "");
    const { error } = await supabase
      .from("whatsapp_config")
      .upsert(
        { business_id: biz.id, dialog_api_key: data.apiKey, business_number: cleanNumber },
        { onConflict: "business_id" },
      );
    if (error) return { ok: false, error: error.message };
    return { ok: true, error: null as string | null };
  });
