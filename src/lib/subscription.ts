import { PLANS, type PlanId, type PlanInfo } from "./plan";

export type ActiveSubscription = {
  planId: PlanId;
  status: "trial" | "active";
  startedAt: number; // ms epoch
  trialEndsAt?: number; // ms epoch — only when status === "trial"
  paymentRef?: string;
};

const KEY = "zuma_subscription";
export const TRIAL_DAYS = 7;

export function getSubscription(): ActiveSubscription | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveSubscription;
    if (!parsed.planId || !(parsed.planId in PLANS)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSubscription(sub: ActiveSubscription) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(sub));
  // Keep the legacy zuma_plan key in sync so older code paths still work.
  localStorage.setItem("zuma_plan", sub.planId);
}

export function clearSubscription() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  localStorage.removeItem("zuma_plan");
}

export function getActivePlan(): PlanInfo | null {
  const sub = getSubscription();
  if (!sub) return null;
  return PLANS[sub.planId];
}

export function trialDaysLeft(sub: ActiveSubscription): number {
  if (sub.status !== "trial" || !sub.trialEndsAt) return 0;
  const ms = sub.trialEndsAt - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function isTrialExpired(sub: ActiveSubscription): boolean {
  return sub.status === "trial" && !!sub.trialEndsAt && Date.now() > sub.trialEndsAt;
}

export function startTrialSubscription(planId: PlanId): ActiveSubscription {
  const now = Date.now();
  const sub: ActiveSubscription = {
    planId,
    status: "trial",
    startedAt: now,
    trialEndsAt: now + TRIAL_DAYS * 24 * 60 * 60 * 1000,
  };
  saveSubscription(sub);
  return sub;
}

export function activatePaidSubscription(planId: PlanId, paymentRef: string): ActiveSubscription {
  const sub: ActiveSubscription = {
    planId,
    status: "active",
    startedAt: Date.now(),
    paymentRef,
  };
  saveSubscription(sub);
  return sub;
}
