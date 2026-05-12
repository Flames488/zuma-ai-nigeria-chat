/**
 * Order service — create food orders, generate Paystack payment links,
 * push status updates back over WhatsApp via the existing Twilio gateway.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { FoodOrder, FoodOrderStatus, OrderItem } from "./types";

export async function createFoodOrder(args: {
  businessId: string;
  customerNumber: string;
  customerName: string | null;
  items: OrderItem[];
  deliveryFeeKobo: number;
  deliveryAddress: string | null;
  notes?: string | null;
}): Promise<FoodOrder | null> {
  const subtotal = args.items.reduce((s, i) => s + i.line_total_kobo, 0);
  const total = subtotal + args.deliveryFeeKobo;
  try {
    const { data, error } = await supabaseAdmin
      .from("food_orders")
      .insert([{
        business_id: args.businessId,
        customer_number: args.customerNumber,
        customer_name: args.customerName,
        items: args.items as unknown as never,
        subtotal_kobo: subtotal,
        delivery_fee_kobo: args.deliveryFeeKobo,
        total_kobo: total,
        delivery_address: args.deliveryAddress,
        notes: args.notes ?? null,
        status: "pending",
      }])
      .select("*")
      .single();
    if (error || !data) {
      console.error("[order-service] createFoodOrder", error?.message);
      return null;
    }
    return data as unknown as FoodOrder;
  } catch (e) {
    console.error("[order-service] createFoodOrder threw", e);
    return null;
  }
}

export async function updateOrderStatus(orderId: string, status: FoodOrderStatus): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from("food_orders")
      .update({ status })
      .eq("id", orderId);
    if (error) {
      console.error("[order-service] updateOrderStatus", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[order-service] updateOrderStatus threw", e);
    return false;
  }
}

export async function findOrderByReference(ref: string): Promise<FoodOrder | null> {
  const { data, error } = await supabaseAdmin
    .from("food_orders")
    .select("*")
    .eq("paystack_reference", ref)
    .maybeSingle();
  if (error) {
    console.error("[order-service] findOrderByReference", error.message);
    return null;
  }
  return (data as unknown as FoodOrder) ?? null;
}

export async function findActiveOrderForCustomer(
  businessId: string,
  customerNumber: string,
): Promise<FoodOrder | null> {
  const { data } = await supabaseAdmin
    .from("food_orders")
    .select("*")
    .eq("business_id", businessId)
    .eq("customer_number", customerNumber)
    .in("status", ["pending", "paid", "preparing", "out_for_delivery"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as unknown as FoodOrder) ?? null;
}

/**
 * Generate a Paystack payment link for an order. Returns the hosted authorization URL.
 * Re-uses the per-business Paystack secret stored in `paystack_keys` (existing infra).
 */
export async function createPaystackLink(args: {
  businessId: string;
  amountKobo: number;
  email: string;
  reference: string;
  metadata: Record<string, unknown>;
}): Promise<string | null> {
  try {
    const { data: keys } = await supabaseAdmin
      .from("paystack_keys")
      .select("secret_key")
      .eq("business_id", args.businessId)
      .maybeSingle();
    const sk = keys?.secret_key || process.env.ZUMA_PAYSTACK_SECRET_KEY;
    if (!sk) {
      console.warn("[order-service] no Paystack secret for business", args.businessId);
      return null;
    }
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sk}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: args.amountKobo,
        email: args.email,
        reference: args.reference,
        metadata: args.metadata,
      }),
    });
    if (!res.ok) {
      console.error("[order-service] paystack init failed", res.status, await res.text().catch(() => ""));
      return null;
    }
    const json = (await res.json()) as { data?: { authorization_url?: string } };
    return json.data?.authorization_url ?? null;
  } catch (e) {
    console.error("[order-service] paystack init threw", e);
    return null;
  }
}

/** Send a WhatsApp message via the connector gateway (re-used from twilio-webhook). */
export async function sendWhatsappUpdate(args: {
  toCustomerNumber: string;
  fromBusinessNumber: string;
  body: string;
}): Promise<boolean> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const twilioKey = process.env.TWILIO_API_KEY;
  if (!lovableKey || !twilioKey) {
    console.warn("[order-service] WhatsApp credentials missing");
    return false;
  }
  try {
    const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": twilioKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: `whatsapp:${args.toCustomerNumber}`,
        From: `whatsapp:${args.fromBusinessNumber}`,
        Body: args.body,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error("[order-service] sendWhatsappUpdate threw", e);
    return false;
  }
}
