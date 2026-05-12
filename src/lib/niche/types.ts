/**
 * Shared niche-module types.
 *
 * A "niche module" is a vertical-specific handler (hospital, food, ...)
 * that plugs into the existing Wabizz Twilio webhook AFTER Claude/AI intent
 * parsing. The webhook continues to work for any business; niche modules only
 * activate when a business has a matching active row in `niche_configs`.
 */

export type NicheType = "hospital" | "food";

export interface NicheConfigRow {
  id: string;
  business_id: string;
  niche_type: NicheType;
  active: boolean;
  config: Record<string, unknown>;
}

/** Result returned by every niche handler. */
export interface NicheHandlerResult {
  /** True when the niche owns this turn — webhook must NOT fall through to generic AI. */
  handled: boolean;
  /** Customer-facing reply text (WhatsApp). Empty/undefined = no reply (handler decided to silently drop). */
  reply?: string;
  /** Optional structured log payload for webhook_logs.error / debugging. */
  meta?: Record<string, unknown>;
}

/** Context passed into every niche handler. */
export interface NicheContext {
  businessId: string;
  businessName: string;
  customerNumber: string;
  customerName: string | null;
  text: string;
  /** Recent conversation history, oldest first. */
  history: Array<{ role: "user" | "assistant"; content: string }>;
  /** Niche-specific config blob (typed per module). */
  config: Record<string, unknown>;
}

/** Extra system-prompt fragment that a niche contributes when active. */
export type NichePromptAddition = (config: Record<string, unknown>) => string;
