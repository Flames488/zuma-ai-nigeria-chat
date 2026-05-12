/**
 * Niche router.
 *
 * Called by the Twilio webhook AFTER the inbound message has been persisted
 * but BEFORE the generic AI fallback. Iterates the active niche configs for
 * the business and returns the first handler result that claims the turn.
 *
 * If no niche handles the message, the webhook falls back to the existing
 * generic Lovable-AI response flow — preserving the current behaviour for
 * every business that hasn't activated a niche.
 */
import type { NicheConfigRow, NicheContext, NicheHandlerResult, NicheType } from "./types";
import { handleHospital } from "./hospital/hospital-intent-handler";
import { handleFood } from "./food/food-intent-handler";

type Handler = (ctx: NicheContext) => Promise<NicheHandlerResult>;

const HANDLERS: Record<NicheType, Handler> = {
  hospital: handleHospital,
  food: handleFood,
};

export async function routeToNiche(
  niches: NicheConfigRow[],
  ctxBase: Omit<NicheContext, "config">,
): Promise<NicheHandlerResult> {
  for (const niche of niches) {
    const handler = HANDLERS[niche.niche_type];
    if (!handler) continue;
    try {
      const result = await handler({ ...ctxBase, config: niche.config ?? {} });
      if (result.handled) {
        console.info("[niche-router] handled", {
          businessId: ctxBase.businessId,
          niche: niche.niche_type,
        });
        return result;
      }
    } catch (e) {
      console.error("[niche-router] handler threw", {
        niche: niche.niche_type,
        error: e instanceof Error ? e.message : String(e),
      });
      // Fall through to next niche / generic AI.
    }
  }
  return { handled: false };
}

export { HANDLERS as __HANDLERS_FOR_TEST };
