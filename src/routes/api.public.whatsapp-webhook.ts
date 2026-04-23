import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * 360Dialog WhatsApp webhook.
 *
 * Receives incoming customer messages, looks up the matching business by the
 * receiving WhatsApp number, runs the message through Lovable AI with the
 * business profile, and sends the reply back via 360Dialog.
 *
 * Auth: 360Dialog cannot HMAC-sign payloads in the standard tier, so we use
 * a shared secret in the URL via WHATSAPP_WEBHOOK_TOKEN. Configure the URL as
 * https://<your-app>/api/public/whatsapp-webhook?token=<WHATSAPP_WEBHOOK_TOKEN>
 */
export const Route = createFileRoute("/api/public/whatsapp-webhook")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Used for 360Dialog/Meta verification
        const url = new URL(request.url);
        const challenge = url.searchParams.get("hub.challenge");
        if (challenge) return new Response(challenge, { status: 200 });
        return new Response("ok", { status: 200 });
      },
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const expectedToken = process.env.WHATSAPP_WEBHOOK_TOKEN;
        if (expectedToken && url.searchParams.get("token") !== expectedToken) {
          return new Response("Unauthorized", { status: 401 });
        }

        let payload: any;
        try {
          payload = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        // Walk the standard WhatsApp Cloud / 360Dialog payload shape.
        const entries = payload.entry ?? [];
        for (const entry of entries) {
          const changes = entry.changes ?? [];
          for (const change of changes) {
            const value = change.value ?? {};
            const businessNumber: string | undefined =
              value?.metadata?.display_phone_number;
            const messages = value.messages ?? [];
            const contacts = value.contacts ?? [];
            if (!businessNumber || messages.length === 0) continue;

            // Match the receiving number to a business.
            const cleanNumber = "+" + String(businessNumber).replace(/[^\d]/g, "");
            const { data: wa } = await supabaseAdmin
              .from("whatsapp_config")
              .select("business_id, dialog_api_key, business_number")
              .or(`business_number.eq.${cleanNumber},business_number.eq.${businessNumber}`)
              .maybeSingle();
            if (!wa) {
              console.warn("No business matched WhatsApp number", businessNumber);
              continue;
            }

            const { data: biz } = await supabaseAdmin
              .from("businesses")
              .select(
                "id, name, type, products_list, open_time, close_time, tone, custom_message",
              )
              .eq("id", wa.business_id)
              .maybeSingle();
            if (!biz) continue;

            for (const msg of messages) {
              if (msg.type !== "text" || !msg.text?.body) continue;
              const customerNumber: string = msg.from;
              const customerName: string | null =
                contacts.find((c: any) => c.wa_id === customerNumber)?.profile?.name ?? null;
              const text: string = msg.text.body;

              await handleIncomingMessage({
                business: biz,
                wa,
                customerNumber,
                customerName,
                text,
              });
            }
          }
        }
        return new Response("ok", { status: 200 });
      },
    },
  },
});

async function handleIncomingMessage(args: {
  business: {
    id: string;
    name: string;
    type: string;
    products_list: string;
    open_time: string;
    close_time: string;
    tone: string;
    custom_message: string | null;
  };
  wa: { dialog_api_key: string; business_id: string };
  customerNumber: string;
  customerName: string | null;
  text: string;
}) {
  // 1. Upsert conversation
  const { data: existingConvo } = await supabaseAdmin
    .from("conversations")
    .select("id")
    .eq("business_id", args.business.id)
    .eq("customer_number", args.customerNumber)
    .maybeSingle();

  let conversationId = existingConvo?.id;
  if (!conversationId) {
    const { data: newConvo, error: convoErr } = await supabaseAdmin
      .from("conversations")
      .insert({
        business_id: args.business.id,
        customer_number: args.customerNumber,
        customer_name: args.customerName,
        last_message_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (convoErr || !newConvo) {
      console.error("convo create failed", convoErr);
      return;
    }
    conversationId = newConvo.id;
  } else {
    await supabaseAdmin
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        customer_name: args.customerName ?? undefined,
      })
      .eq("id", conversationId);
  }

  // 2. Persist incoming user message
  await supabaseAdmin.from("messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: args.text,
  });

  // 3. Build chat history
  const { data: history } = await supabaseAdmin
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(30);

  // 4. Call Lovable AI
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!lovableKey) {
    console.error("LOVABLE_API_KEY missing");
    return;
  }
  const systemPrompt = buildSystemPrompt(args.business);
  let reply = "Thanks for your message! We'll get back to you shortly.";
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });
    if (res.ok) {
      const json = await res.json();
      reply = json.choices?.[0]?.message?.content ?? reply;
    } else {
      console.error("AI gateway error", res.status, await res.text());
    }
  } catch (e) {
    console.error("AI call failed", e);
  }

  // 5. Persist assistant reply
  await supabaseAdmin.from("messages").insert({
    conversation_id: conversationId,
    role: "assistant",
    content: reply,
  });

  // 6. Send reply via 360Dialog
  try {
    await fetch("https://waba-v2.360dialog.io/messages", {
      method: "POST",
      headers: {
        "D360-API-KEY": args.wa.dialog_api_key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: args.customerNumber,
        type: "text",
        text: { body: reply },
      }),
    });
  } catch (e) {
    console.error("360Dialog send failed", e);
  }
}

function buildSystemPrompt(b: {
  name: string;
  type: string;
  products_list: string;
  open_time: string;
  close_time: string;
  tone: string;
  custom_message: string | null;
}) {
  return `You are an AI WhatsApp business assistant for ${b.name}, a ${b.type} business in Nigeria.

Your job is to reply to customer messages on WhatsApp. Be helpful and ${b.tone}.

Products and prices:
${b.products_list}

Business hours: ${b.open_time} – ${b.close_time}.

If a customer wants to place an order, collect their name, delivery address, and confirm the items.
When the order is confirmed, reply with: "I'll send your payment link now. Pay with the link, then send 'PAID' once you've paid! 🙏"

Never invent products that aren't listed. Keep replies short, warm, WhatsApp-style. Use emojis sparingly.${
    b.custom_message ? `\n\nAlways remember: ${b.custom_message}` : ""
  }`;
}
