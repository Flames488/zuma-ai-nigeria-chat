/**
 * Loads active niche configs for a business. Server-only — uses the admin
 * client because it runs inside the Twilio webhook (no user session).
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { NicheConfigRow, NicheType } from "./types";

export async function loadActiveNiches(businessId: string): Promise<NicheConfigRow[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("niche_configs")
      .select("id, business_id, niche_type, active, config")
      .eq("business_id", businessId)
      .eq("active", true);
    if (error) {
      console.error("[niche-loader] failed", { businessId, error: error.message });
      return [];
    }
    return (data ?? []) as NicheConfigRow[];
  } catch (e) {
    console.error("[niche-loader] threw", e);
    return [];
  }
}

export async function loadNiche(
  businessId: string,
  type: NicheType,
): Promise<NicheConfigRow | null> {
  const all = await loadActiveNiches(businessId);
  return all.find((n) => n.niche_type === type) ?? null;
}
