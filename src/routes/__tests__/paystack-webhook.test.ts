import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "crypto";
import { handlePaystackWebhook } from "../api.public.paystack-webhook";

const SECRET = "sk_test_dummy_secret_key";

function sign(body: string): string {
  return createHmac("sha512", SECRET).update(body).digest("hex");
}

function makeRequest(body: string, signature: string | null): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (signature) headers.set("x-paystack-signature", signature);
  return new Request("https://app.test/api/public/paystack-webhook", {
    method: "POST",
    headers,
    body,
  });
}

/**
 * Builds a chain-able mock Supabase query. Each call records the operation
 * and returns `this` so `.select().eq().maybeSingle()` works. The terminal
 * `maybeSingle`/`update`/`insert` resolves with whatever is queued.
 */
function makeDb() {
  const calls: Array<{ table: string; op: string; args: unknown[] }> = [];
  const results: Record<string, unknown> = {
    "subscriptions.maybeSingle": { data: null, error: null }, // no existing
    "orders.maybeSingle": { data: null, error: null },
    "conversations.maybeSingle": { data: null, error: null },
    "whatsapp_config.maybeSingle": { data: null, error: null },
  };
  function chain(table: string) {
    const c: any = {
      _table: table,
      select: (...a: unknown[]) => {
        calls.push({ table, op: "select", args: a });
        return c;
      },
      eq: (...a: unknown[]) => {
        calls.push({ table, op: "eq", args: a });
        return c;
      },
      maybeSingle: () => {
        calls.push({ table, op: "maybeSingle", args: [] });
        return Promise.resolve(results[`${table}.maybeSingle`] ?? { data: null, error: null });
      },
      insert: (...a: unknown[]) => {
        calls.push({ table, op: "insert", args: a });
        return Promise.resolve({ data: null, error: null });
      },
      update: (...a: unknown[]) => {
        calls.push({ table, op: "update", args: a });
        return c; // chain into eq
      },
    };
    return c;
  }
  const db = { from: (t: string) => chain(t) } as any;
  return { db, calls, results };
}

describe("paystack webhook signature verification", () => {
  it("returns 503 when secret key is not configured", async () => {
    const { db } = makeDb();
    const res = await handlePaystackWebhook(makeRequest("{}", "abc"), {
      secretKey: undefined,
      db,
    });
    expect(res.status).toBe(503);
  });

  it("returns 401 when signature header is missing", async () => {
    const { db } = makeDb();
    const res = await handlePaystackWebhook(makeRequest("{}", null), {
      secretKey: SECRET,
      db,
    });
    expect(res.status).toBe(401);
  });

  it("returns 401 for invalid signature", async () => {
    const { db } = makeDb();
    const body = JSON.stringify({ event: "charge.success", data: {} });
    const res = await handlePaystackWebhook(
      makeRequest(body, "deadbeef".repeat(16)),
      { secretKey: SECRET, db },
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when signature is malformed (non-hex)", async () => {
    const { db } = makeDb();
    const body = "{}";
    const res = await handlePaystackWebhook(makeRequest(body, "not-hex-zzz"), {
      secretKey: SECRET,
      db,
    });
    expect(res.status).toBe(401);
  });

  it("rejects forged body even if old signature is provided", async () => {
    const { db } = makeDb();
    const original = JSON.stringify({ event: "charge.success", data: { reference: "r1" } });
    const sig = sign(original);
    const tampered = JSON.stringify({ event: "charge.success", data: { reference: "r2" } });
    const res = await handlePaystackWebhook(makeRequest(tampered, sig), {
      secretKey: SECRET,
      db,
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 when body is invalid JSON", async () => {
    const { db } = makeDb();
    const body = "not-json";
    const res = await handlePaystackWebhook(makeRequest(body, sign(body)), {
      secretKey: SECRET,
      db,
    });
    expect(res.status).toBe(400);
  });

  it("acknowledges (200) non-charge.success events without any DB writes", async () => {
    const { db, calls } = makeDb();
    const body = JSON.stringify({ event: "transfer.success", data: {} });
    const res = await handlePaystackWebhook(makeRequest(body, sign(body)), {
      secretKey: SECRET,
      db,
    });
    expect(res.status).toBe(200);
    expect(calls.filter((c) => c.op === "insert" || c.op === "update")).toHaveLength(0);
  });
});

describe("subscription activation flow", () => {
  beforeEach(() => vi.useRealTimers());

  it("activates an existing pending subscription row", async () => {
    const { db, calls, results } = makeDb();
    results["subscriptions.maybeSingle"] = { data: { id: "sub-1" }, error: null };

    const body = JSON.stringify({
      event: "charge.success",
      data: {
        reference: "wabizz_sub_abc",
        metadata: {
          kind: "zuma_subscription",
          plan_id: "growth",
          business_id: "biz-1",
        },
      },
    });
    const res = await handlePaystackWebhook(makeRequest(body, sign(body)), {
      secretKey: SECRET,
      db,
    });
    expect(res.status).toBe(200);

    const update = calls.find((c) => c.table === "subscriptions" && c.op === "update");
    expect(update).toBeDefined();
    expect(update!.args[0]).toMatchObject({ status: "active", trial_ends_at: null });

    const insert = calls.find((c) => c.table === "subscriptions" && c.op === "insert");
    expect(insert).toBeUndefined();
  });

  it("inserts a new active subscription row when none pre-exists", async () => {
    const { db, calls, results } = makeDb();
    results["subscriptions.maybeSingle"] = { data: null, error: null };

    const body = JSON.stringify({
      event: "charge.success",
      data: {
        reference: "wabizz_sub_xyz",
        metadata: {
          kind: "zuma_subscription",
          plan_id: "starter",
          business_id: "biz-2",
        },
      },
    });
    const res = await handlePaystackWebhook(makeRequest(body, sign(body)), {
      secretKey: SECRET,
      db,
    });
    expect(res.status).toBe(200);

    const insert = calls.find((c) => c.table === "subscriptions" && c.op === "insert");
    expect(insert).toBeDefined();
    expect(insert!.args[0]).toMatchObject({
      business_id: "biz-2",
      plan_id: "starter",
      status: "active",
      paystack_reference: "wabizz_sub_xyz",
    });
  });

  it("rejects subscription event with unknown plan id", async () => {
    const { db } = makeDb();
    const body = JSON.stringify({
      event: "charge.success",
      data: {
        reference: "ref",
        metadata: { kind: "zuma_subscription", plan_id: "enterprise", business_id: "b" },
      },
    });
    const res = await handlePaystackWebhook(makeRequest(body, sign(body)), {
      secretKey: SECRET,
      db,
    });
    expect(res.status).toBe(400);
  });

  it("rejects subscription event missing business_id", async () => {
    const { db } = makeDb();
    const body = JSON.stringify({
      event: "charge.success",
      data: {
        reference: "ref",
        metadata: { kind: "zuma_subscription", plan_id: "growth" },
      },
    });
    const res = await handlePaystackWebhook(makeRequest(body, sign(body)), {
      secretKey: SECRET,
      db,
    });
    expect(res.status).toBe(400);
  });

  it("ignores unknown metadata kinds (no DB writes, returns 200)", async () => {
    const { db, calls } = makeDb();
    const body = JSON.stringify({
      event: "charge.success",
      data: { reference: "ref", metadata: { kind: "something_else" } },
    });
    const res = await handlePaystackWebhook(makeRequest(body, sign(body)), {
      secretKey: SECRET,
      db,
    });
    expect(res.status).toBe(200);
    expect(calls.filter((c) => c.op === "insert" || c.op === "update")).toHaveLength(0);
  });
});
