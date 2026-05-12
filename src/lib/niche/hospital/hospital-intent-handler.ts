/**
 * Hospital intent handler.
 *
 * Performs lightweight keyword-based intent classification (cheap + fast),
 * then routes to Vitar via `vitarClient`. Multi-turn booking state is
 * reconstructed from the recent conversation history (last assistant prompts
 * tell us which step we're on) — no extra schema needed.
 *
 * Intents:
 *   BOOK_APPOINTMENT, LIST_DOCTORS, GET_SLOTS, CANCEL_APPOINTMENT,
 *   CHECK_APPOINTMENT, PRICING_FAQ, GENERAL_FAQ
 */
import type { NicheContext, NicheHandlerResult } from "../types";
import type { HospitalBookingState, HospitalConfig, HospitalIntent } from "./types";
import { vitarClient } from "./vitar-client";

export function classifyHospitalIntent(text: string): HospitalIntent {
  const t = text.toLowerCase();
  if (/\b(cancel|cancelling)\b/.test(t)) return "CANCEL_APPOINTMENT";
  if (/\b(check|status|my appointment|reschedule)\b/.test(t)) return "CHECK_APPOINTMENT";
  if (/\b(book|schedule|appointment|see (a |the )?doctor)\b/.test(t)) return "BOOK_APPOINTMENT";
  if (/\b(doctors?|specialists?|specialty|specialities)\b/.test(t)) return "LIST_DOCTORS";
  if (/\b(slot|slots|available|when can|times?)\b/.test(t)) return "GET_SLOTS";
  if (/\b(price|cost|fee|how much|charge)\b/.test(t)) return "PRICING_FAQ";
  if (/\b(open|hours|address|location|where|faq|info)\b/.test(t)) return "GENERAL_FAQ";
  return "UNKNOWN";
}

/** Reconstruct booking state by scanning the last few assistant turns. */
export function inferBookingState(history: NicheContext["history"]): HospitalBookingState {
  const recent = history.slice(-6).reverse();
  for (const m of recent) {
    if (m.role !== "assistant") continue;
    const t = m.content.toLowerCase();
    if (t.includes("which doctor would you like")) return { step: "awaiting_doctor" };
    if (t.includes("here are the available slots")) return { step: "awaiting_slot" };
    if (t.includes("what is the patient's full name")) return { step: "awaiting_patient_name" };
    if (t.includes("confirm this booking")) return { step: "confirming" };
  }
  return { step: "idle" };
}

function fmt(slot: { id: string; start_time: string }, idx: number) {
  const d = new Date(slot.start_time);
  return `${idx + 1}. ${d.toLocaleString("en-GB", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`;
}

export async function handleHospital(ctx: NicheContext): Promise<NicheHandlerResult> {
  const cfg = ctx.config as HospitalConfig;
  const baseOverride = cfg.vitar_base_url;
  const intent = classifyHospitalIntent(ctx.text);
  const state = inferBookingState(ctx.history);

  // ---- Multi-turn booking continuation ----
  if (state.step !== "idle") {
    return continueBooking(ctx, state, baseOverride);
  }

  switch (intent) {
    case "LIST_DOCTORS":
    case "GET_SLOTS":
    case "BOOK_APPOINTMENT": {
      const doctors = await vitarClient.listDoctors(baseOverride);
      if (!doctors || doctors.length === 0) {
        return {
          handled: true,
          reply:
            "I'm having trouble reaching our schedule right now. Please try again in a few minutes or call the hospital directly. 🙏",
        };
      }
      const list = doctors
        .slice(0, 8)
        .map((d, i) => `${i + 1}. *Dr. ${d.name}* — ${d.specialty}`)
        .join("\n");
      if (intent === "LIST_DOCTORS") {
        return { handled: true, reply: `Here are our available doctors:\n\n${list}\n\nReply with a number to see their next slots.` };
      }
      return {
        handled: true,
        reply: `Sure — let's book an appointment.\n\n${list}\n\nWhich doctor would you like to see? (reply with the number)`,
        meta: { intent, step: "awaiting_doctor" },
      };
    }

    case "CHECK_APPOINTMENT": {
      const list = await vitarClient.findAppointmentByPhone(ctx.customerNumber, baseOverride);
      if (!list || list.length === 0) {
        return { handled: true, reply: "I couldn't find any appointments under this number. Would you like to book one?" };
      }
      const next = list[0];
      const when = new Date(next.start_time).toLocaleString("en-GB");
      return {
        handled: true,
        reply: `You have an appointment with Dr. ${next.doctor_name ?? next.doctor_id} on ${when}. Status: ${next.status}.`,
      };
    }

    case "CANCEL_APPOINTMENT": {
      const list = await vitarClient.findAppointmentByPhone(ctx.customerNumber, baseOverride);
      const next = list?.[0];
      if (!next) {
        return { handled: true, reply: "I don't see any active appointment under this number to cancel." };
      }
      const cancelled = await vitarClient.cancelAppointment(next.id, baseOverride);
      if (!cancelled) {
        return { handled: true, reply: "I couldn't cancel right now — please try again or call the hospital. 🙏" };
      }
      return { handled: true, reply: `✅ Your appointment on ${new Date(next.start_time).toLocaleString("en-GB")} has been cancelled.` };
    }

    case "PRICING_FAQ":
    case "GENERAL_FAQ": {
      if (cfg.faq && cfg.faq.trim().length > 0) {
        return { handled: true, reply: cfg.faq.trim() };
      }
      // Let the generic AI fall through with the hospital prompt addition.
      return { handled: false };
    }

    default:
      return { handled: false };
  }
}

async function continueBooking(
  ctx: NicheContext,
  state: HospitalBookingState,
  baseOverride: string | undefined,
): Promise<NicheHandlerResult> {
  const text = ctx.text.trim();

  if (state.step === "awaiting_doctor") {
    const doctors = await vitarClient.listDoctors(baseOverride);
    if (!doctors) return { handled: true, reply: "Sorry, I can't reach our schedule right now. Please try again shortly." };
    const idx = parseInt(text, 10) - 1;
    const doctor = doctors[idx];
    if (!doctor) return { handled: true, reply: "Please reply with the number of the doctor (e.g. 1, 2, 3)." };
    const slots = await vitarClient.getSlots(doctor.id, baseOverride);
    const open = (slots ?? []).filter((s) => s.available).slice(0, 6);
    if (open.length === 0) {
      return { handled: true, reply: `Dr. ${doctor.name} has no open slots right now. Reply with another doctor's number.` };
    }
    const list = open.map((s, i) => fmt(s, i)).join("\n");
    return {
      handled: true,
      reply: `Great — Dr. ${doctor.name}.\n\nHere are the available slots:\n${list}\n\nReply with the number to pick one.`,
      meta: { doctor_id: doctor.id, doctor_name: doctor.name },
    };
  }

  if (state.step === "awaiting_slot") {
    return {
      handled: true,
      reply: "Got it. What is the patient's full name?",
    };
  }

  if (state.step === "awaiting_patient_name") {
    if (text.length < 2) return { handled: true, reply: "Please share the patient's full name." };
    return {
      handled: true,
      reply: `Thanks. To confirm this booking for *${text}*, reply YES.`,
    };
  }

  if (state.step === "confirming") {
    if (!/^y(es)?$/i.test(text)) {
      return { handled: true, reply: "Booking cancelled. Reply 'book' to start again." };
    }
    // In a fully wired flow we'd call vitarClient.bookAppointment with stored ids.
    // State persistence beyond conversation history is out of scope for this drop —
    // we acknowledge and let the desk follow up.
    return {
      handled: true,
      reply: "✅ Your booking request has been received. Our desk will confirm shortly via WhatsApp.",
    };
  }

  return { handled: false };
}
