// Zuma AI's own Paystack public key for collecting subscription fees.
// REPLACE this test key with your real Zuma Paystack public key in production.
export const ZUMA_PAYSTACK_PUBLIC_KEY = "pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

import type { PlanInfo } from "./plan";

const SCRIPT_SRC = "https://js.paystack.co/v1/inline.js";

type PaystackPop = {
  setup: (opts: {
    key: string;
    email: string;
    amount: number; // kobo
    currency?: string;
    ref?: string;
    metadata?: Record<string, unknown>;
    callback: (response: { reference: string }) => void;
    onClose: () => void;
  }) => { openIframe: () => void };
};

declare global {
  interface Window {
    PaystackPop?: PaystackPop;
  }
}

function loadPaystackScript(): Promise<PaystackPop> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Not in browser"));
      return;
    }
    if (window.PaystackPop) {
      resolve(window.PaystackPop);
      return;
    }
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.PaystackPop) resolve(window.PaystackPop);
        else reject(new Error("Paystack failed to load"));
      });
      existing.addEventListener("error", () => reject(new Error("Paystack script error")));
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => {
      if (window.PaystackPop) resolve(window.PaystackPop);
      else reject(new Error("Paystack failed to load"));
    };
    s.onerror = () => reject(new Error("Paystack script error"));
    document.head.appendChild(s);
  });
}

export async function payForSubscription(opts: {
  plan: PlanInfo;
  email: string;
  businessName: string;
  onSuccess: (reference: string) => void;
  onClose?: () => void;
}) {
  const Paystack = await loadPaystackScript();
  const handler = Paystack.setup({
    key: ZUMA_PAYSTACK_PUBLIC_KEY,
    email: opts.email,
    amount: opts.plan.amountNaira * 100, // kobo
    currency: "NGN",
    ref: `zuma_sub_${Date.now().toString(36)}`,
    metadata: {
      plan_id: opts.plan.id,
      plan_name: opts.plan.name,
      business_name: opts.businessName,
    },
    callback: (response) => opts.onSuccess(response.reference),
    onClose: () => opts.onClose?.(),
  });
  handler.openIframe();
}
