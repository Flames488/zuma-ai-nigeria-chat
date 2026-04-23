import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ToneEnum = z.enum(["Professional", "Friendly", "Pidgin"]);

const BusinessInput = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  whatsapp: z.string().trim().min(7).max(40),
  open_time: z.string().regex(/^\d{2}:\d{2}$/),
  close_time: z.string().regex(/^\d{2}:\d{2}$/),
  products_list: z.string().max(10000).default(""),
  tone: ToneEnum.default("Friendly"),
  custom_message: z.string().max(2000).optional().default(""),
});

export const getMyBusiness = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("businesses")
      .select("*")
      .maybeSingle();
    if (error) return { business: null, error: error.message };
    return { business: data, error: null as string | null };
  });

export const upsertMyBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => BusinessInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("businesses")
      .upsert(
        { ...data, owner_id: userId, custom_message: data.custom_message ?? "" },
        { onConflict: "owner_id" },
      )
      .select()
      .single();
    if (error) return { business: null, error: error.message };
    return { business: row, error: null as string | null };
  });

const UpdateBusinessInput = BusinessInput.partial();
export const updateMyBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateBusinessInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("businesses")
      .update(data)
      .eq("owner_id", userId)
      .select()
      .single();
    if (error) return { business: null, error: error.message };
    return { business: row, error: null as string | null };
  });
