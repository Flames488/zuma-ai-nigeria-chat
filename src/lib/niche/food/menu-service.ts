/**
 * Menu service — read/write menu_items and run fuzzy item matching.
 *
 * Fuzzy matching is intentionally simple (lowercased substring + token overlap
 * + Levenshtein distance) so it runs cheaply inside the webhook without an
 * external dependency.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { MenuItem } from "./types";

export async function listMenu(businessId: string, opts: { availableOnly?: boolean } = {}): Promise<MenuItem[]> {
  try {
    let q = supabaseAdmin
      .from("menu_items")
      .select("id, business_id, name, description, category, price_kobo, available, sort_order")
      .eq("business_id", businessId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (opts.availableOnly) q = q.eq("available", true);
    const { data, error } = await q;
    if (error) {
      console.error("[menu-service] listMenu", error.message);
      return [];
    }
    return (data ?? []) as MenuItem[];
  } catch (e) {
    console.error("[menu-service] listMenu threw", e);
    return [];
  }
}

/** Levenshtein distance — small inputs, good enough. */
function lev(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = Array(n + 1)
    .fill(0)
    .map((_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j - 1], dp[j]);
      prev = tmp;
    }
  }
  return dp[n];
}

export interface FuzzyMatch {
  item: MenuItem;
  score: number; // higher = better
}

/** Returns the top-N menu matches for a free-text query. */
export function fuzzyMatchMenu(items: MenuItem[], query: string, topN = 3): FuzzyMatch[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const qTokens = new Set(q.split(/\s+/).filter(Boolean));
  const scored = items.map<FuzzyMatch>((item) => {
    const name = item.name.toLowerCase();
    let score = 0;
    if (name === q) score += 100;
    if (name.includes(q)) score += 50;
    for (const t of qTokens) {
      if (name.includes(t)) score += 10;
    }
    const distance = lev(name, q);
    score += Math.max(0, 20 - distance);
    return { item, score };
  });
  return scored
    .filter((s) => s.score > 5)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

export function naira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
