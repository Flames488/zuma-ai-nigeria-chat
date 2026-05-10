import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type WebhookLogRow = {
  id: string;
  created_at: string;
  provider: string;
  business_id: string | null;
  business_name: string | null;
  from_number: string | null;
  to_number: string | null;
  inbound_message: string | null;
  ai_response: string | null;
  send_status: string;
  error: string | null;
};

export const getWebhookLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ logs: WebhookLogRow[] }> => {
    const { supabase, userId } = context;

    const { data: biz } = await supabase
      .from("businesses")
      .select("id, name")
      .eq("owner_id", userId)
      .maybeSingle();

    if (!biz) return { logs: [] };

    const { data, error } = await supabase
      .from("webhook_logs")
      .select(
        "id, created_at, provider, business_id, from_number, to_number, inbound_message, ai_response, send_status, error",
      )
      .eq("business_id", biz.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("getWebhookLogs error", error);
      return { logs: [] };
    }

    return {
      logs: (data ?? []).map((r) => ({ ...r, business_name: biz.name })),
    };
  });
