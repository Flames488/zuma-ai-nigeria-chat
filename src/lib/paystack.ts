export type PaystackKeys = {
  publicKey: string;
  secretKey: string;
};

const KEY = "zuma_paystack_keys";

export function getPaystackKeys(): PaystackKeys | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PaystackKeys;
    if (!parsed.publicKey || !parsed.secretKey) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function savePaystackKeys(keys: PaystackKeys) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(keys));
}

export function clearPaystackKeys() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

/**
 * Extract the largest naira amount mentioned in a conversation/text.
 * Looks for ₦12,000 / NGN 12000 / N12000 / "12,000 naira" patterns.
 */
export function extractAmount(text: string): number | null {
  const matches = [
    ...text.matchAll(/(?:₦|NGN\s*|N(?=\d))\s*([\d,]+(?:\.\d+)?)/gi),
    ...text.matchAll(/([\d,]+(?:\.\d+)?)\s*(?:naira|NGN)/gi),
  ];
  const values = matches
    .map((m) => Number(m[1].replace(/,/g, "")))
    .filter((n) => !isNaN(n) && n > 0);
  if (!values.length) return null;
  return Math.max(...values);
}

/**
 * Build a shareable Paystack-style payment link.
 * Without a backend transaction init, we use a deterministic reference
 * and the public key so it can be opened/handled client-side or shared.
 */
export function buildPaymentLink(opts: {
  publicKey: string;
  amountNaira: number;
  businessName: string;
}): string {
  const ref = `zuma_${Date.now().toString(36)}`;
  const params = new URLSearchParams({
    key: opts.publicKey,
    amount: String(Math.round(opts.amountNaira * 100)), // kobo
    currency: "NGN",
    ref,
    business: opts.businessName,
  });
  return `https://paystack.com/pay/zuma?${params.toString()}`;
}
