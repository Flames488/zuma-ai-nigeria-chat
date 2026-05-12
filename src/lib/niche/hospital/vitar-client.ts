/**
 * Typed Vitar REST client.
 *
 * Vitar remains an independent FastAPI service. Wabizz only talks to it via
 * REST. All calls are wrapped in try/catch and return null on failure so the
 * niche handler can degrade gracefully (and fall back to a friendly message
 * instead of crashing the webhook).
 *
 * Credentials are read from runtime secrets:
 *   VITAR_BASE_URL  – e.g. https://vitar.example.com/api
 *   VITAR_API_KEY   – bearer token (sent as Authorization: Bearer …)
 *
 * The per-business `vitar_base_url` config field overrides the env base URL.
 */
import type { VitarAppointment, VitarDoctor, VitarSlot } from "./types";

interface CallArgs {
  path: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  baseOverride?: string;
}

async function vitarCall<T>({ path, method = "GET", body, baseOverride }: CallArgs): Promise<T | null> {
  const base = baseOverride || process.env.VITAR_BASE_URL;
  const key = process.env.VITAR_API_KEY;
  if (!base) {
    console.warn("[vitar-client] VITAR_BASE_URL not configured");
    return null;
  }
  const url = `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[vitar-client] non-ok", { url, status: res.status, body: text.slice(0, 200) });
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.error("[vitar-client] threw", { url, error: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

export const vitarClient = {
  listDoctors: (baseOverride?: string) =>
    vitarCall<VitarDoctor[]>({ path: "/doctors", baseOverride }),

  getSlots: (doctorId: string, baseOverride?: string) =>
    vitarCall<VitarSlot[]>({ path: `/doctors/${encodeURIComponent(doctorId)}/slots`, baseOverride }),

  bookAppointment: (
    args: { doctor_id: string; slot_id: string; patient_name: string; patient_phone: string },
    baseOverride?: string,
  ) => vitarCall<VitarAppointment>({ path: "/appointments", method: "POST", body: args, baseOverride }),

  getAppointment: (id: string, baseOverride?: string) =>
    vitarCall<VitarAppointment>({ path: `/appointments/${encodeURIComponent(id)}`, baseOverride }),

  cancelAppointment: (id: string, baseOverride?: string) =>
    vitarCall<VitarAppointment>({
      path: `/appointments/${encodeURIComponent(id)}/cancel`,
      method: "POST",
      baseOverride,
    }),

  /** Lookup the most recent appointment for a phone number (used by CHECK_APPOINTMENT). */
  findAppointmentByPhone: (phone: string, baseOverride?: string) =>
    vitarCall<VitarAppointment[]>({
      path: `/appointments?phone=${encodeURIComponent(phone)}`,
      baseOverride,
    }),
};

export type VitarClient = typeof vitarClient;
