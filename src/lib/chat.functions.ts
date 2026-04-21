import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ChatInput = z.object({
  businessName: z.string().min(1).max(200),
  businessType: z.string().min(1).max(100),
  productsList: z.string().max(5000),
  businessHours: z.string().max(200),
  tone: z.enum(["Professional", "Friendly", "Pidgin"]),
  customMessage: z.string().max(1000).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(50),
});

export const chatWithAI = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { reply: null, error: "AI is not configured. Please add LOVABLE_API_KEY." };
    }

    const systemPrompt = `You are an AI business assistant for ${data.businessName}, a ${data.businessType} business in Nigeria. Your job is to respond to customer WhatsApp messages. Always be helpful, answer questions about their products:

${data.productsList}

Business hours are ${data.businessHours}. Your tone should be ${data.tone}. If a customer wants to order, collect their details (name, delivery address, phone) and send a Paystack payment link placeholder like https://paystack.com/pay/zuma-order-XXXX. Never make up products not listed. If asked something you don't know, say you'll check with the team.${
      data.customMessage ? `\n\nAlways remember: ${data.customMessage}` : ""
    }

Keep replies short, warm, and WhatsApp-style. Use emojis sparingly.`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: systemPrompt }, ...data.messages],
        }),
      });

      if (res.status === 429) {
        return { reply: null, error: "Too many requests. Please wait a moment and try again." };
      }
      if (res.status === 402) {
        return {
          reply: null,
          error: "AI credits exhausted. Top up in Settings > Workspace > Usage.",
        };
      }
      if (!res.ok) {
        const t = await res.text();
        console.error("AI gateway error", res.status, t);
        return { reply: null, error: "AI service error. Please try again." };
      }

      const json = await res.json();
      const reply: string = json.choices?.[0]?.message?.content ?? "";
      return { reply, error: null as string | null };
    } catch (e) {
      console.error("chat error", e);
      return { reply: null, error: "Network error. Please try again." };
    }
  });
