import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Twilio WhatsApp inbound webhook.
 *
 * Twilio posts application/x-www-form-urlencoded with fields like:
 *   From=whatsapp:+234...    (the customer)
 *   To=whatsapp:+234...      (your Twilio WhatsApp business number)
 *   Body=...                 (message text)
 *   ProfileName=...          (customer display name, optional)
 *   MessageSid=...
 *
 * Configure this URL in the Twilio console as the "WHEN A MESSAGE COMES IN"
 * webhook for your WhatsApp sender:
 *   https://<your-app>/api/public/twilio-webhook
 *
 * Security: We verify Twilio's X-Twilio-Signature header using TWILIO_AUTH_TOKEN.
 * See https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
export const Route = createFileRoute("/api/public/twilio-webhook")({
  server: {
    handlers: {
      GET: async () => new Response("ok", { status: 200 }),
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const params = new URLSearchParams(rawBody);

        // --- Twilio signature verification ---
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const signature = request.headers.get("x-twilio-signature");
        if (!authToken) {
          console.error("TWILIO_AUTH_TOKEN missing");
          return new Response("Server misconfigured", { status: 500 });
        }
        if (!signature) {
          return new Response("Missing signature", { status: 401 });
        }
        // Twilio computes HMAC-SHA1 over the full URL + sorted form fields concatenated as key+value.
        const fullUrl = request.headers.get("x-forwarded-proto")
          ? `${request.headers.get("x-forwarded-proto")}://${request.headers.get("host")}${new URL(request.url).pathname}${new URL(request.url).search}`
          : request.url;
        if (!verifyTwilioSignature(authToken, fullUrl, params, signature)) {
          // Some proxies rewrite the URL — try the raw request.url as a fallback.
          if (!verifyTwilioSignature(authToken, request.url, params, signature)) {
            return new Response("Invalid signature", { status: 401 });
          }
        }

        const from = params.get("From") ?? ""; // e.g. "whatsapp:+234..."
        const to = params.get("To") ?? "";
        const body = params.get("Body") ?? "";
        const profileName = params.get("ProfileName");

        if (!from || !to || !body) {
          return twimlResponse(""); // Nothing to do, but ack to Twilio.
        }

        const customerNumber = stripWhatsappPrefix(from);
        const businessNumber = stripWhatsappPrefix(to);

        // Match the receiving Twilio number to a business.
        const { data: wa } = await supabaseAdmin
          .from("whatsapp_config")
          .select("business_id, business_number")
          .or(
            `business_number.eq.${businessNumber},business_number.eq.${businessNumber.replace(/^\+/, "")}`,
          )
          .maybeSingle();
        if (!wa) {
          console.warn("No business matched Twilio number", businessNumber);
          return twimlResponse("");
        }

        const { data: biz } = await supabaseAdmin
          .from("businesses")
          .select(
            "id, name, type, products_list, open_time, close_time, tone, custom_message",
          )
          .eq("id", wa.business_id)
          .maybeSingle();
        if (!biz) return twimlResponse("");

        const reply = await handleIncomingMessage({
          business: biz,
          customerNumber,
          customerName: profileName,
          text: body,
        });

        // Send the reply back via the Twilio API (so it goes from the same WA sender).
        if (reply) {
          await sendTwilioWhatsapp({ to: from, from: to, body: reply });
        }

        // Respond with empty TwiML — we already sent the reply via the REST API.
        return twimlResponse("");
      },
    },
  },
});

// ---------- helpers ----------

function stripWhatsappPrefix(n: string) {
  return n.replace(/^whatsapp:/i, "").trim();
}

function twimlResponse(message: string) {
  const xml = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response/>`;
  return new Response(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function verifyTwilioSignature(
  authToken: string,
  url: string,
  params: URLSearchParams,
  signature: string,
): boolean {
  const keys = Array.from(new Set(Array.from(params.keys()))).sort();
  let data = url;
  for (const key of keys) {
    // For repeated keys, Twilio concatenates all values in order.
    for (const value of params.getAll(key)) {
      data += key + value;
    }
  }
  const expected = createHmac("sha1", authToken).update(data).digest("base64");
  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function sendTwilioWhatsapp(args: { to: string; from: string; body: string }) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const twilioKey = process.env.TWILIO_API_KEY;
  if (!lovableKey || !twilioKey) {
    console.error("Twilio gateway credentials missing");
    return;
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
        To: args.to,
        From: args.from,
        Body: args.body,
      }),
    });
    if (!res.ok) {
      console.error("Twilio send failed", res.status, await res.text());
    }
  } catch (e) {
    console.error("Twilio send error", e);
  }
}

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
  customerNumber: string;
  customerName: string | null;
  text: string;
}): Promise<string> {
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
      return "";
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
  let reply = "Thanks for your message! We'll get back to you shortly.";
  if (lovableKey) {
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
            { role: "system", content: buildSystemPrompt(args.business) },
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
  }

  // 5. Persist assistant reply
  await supabaseAdmin.from("messages").insert({
    conversation_id: conversationId,
    role: "assistant",
    content: reply,
  });

  return reply;
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
