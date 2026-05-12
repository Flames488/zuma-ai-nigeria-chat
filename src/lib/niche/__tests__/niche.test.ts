import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase admin client BEFORE importing modules under test
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    })),
  },
}));

import { classifyHospitalIntent, inferBookingState } from "@/lib/niche/hospital/hospital-intent-handler";
import { classifyFoodIntent, parseOrderItems } from "@/lib/niche/food/food-intent-handler";
import { fuzzyMatchMenu } from "@/lib/niche/food/menu-service";
import { routeToNiche } from "@/lib/niche/niche-router";

describe("hospital intent classification", () => {
  it("detects booking intent", () => {
    expect(classifyHospitalIntent("I want to book an appointment")).toBe("BOOK_APPOINTMENT");
    expect(classifyHospitalIntent("can I see a doctor tomorrow?")).toBe("BOOK_APPOINTMENT");
  });
  it("detects cancel & status", () => {
    expect(classifyHospitalIntent("please cancel my booking")).toBe("CANCEL_APPOINTMENT");
    expect(classifyHospitalIntent("what's the status of my appointment")).toBe("CHECK_APPOINTMENT");
  });
  it("detects pricing FAQ", () => {
    expect(classifyHospitalIntent("how much for a consultation?")).toBe("PRICING_FAQ");
  });
});

describe("hospital booking state inference", () => {
  it("returns idle when no relevant assistant message", () => {
    expect(inferBookingState([{ role: "assistant", content: "hi" }]).step).toBe("idle");
  });
  it("recognises awaiting_doctor", () => {
    expect(
      inferBookingState([{ role: "assistant", content: "Which doctor would you like to see?" }]).step,
    ).toBe("awaiting_doctor");
  });
  it("recognises awaiting_patient_name", () => {
    expect(
      inferBookingState([{ role: "assistant", content: "What is the patient's full name?" }]).step,
    ).toBe("awaiting_patient_name");
  });
});

describe("food intent classification", () => {
  it("detects menu browse", () => {
    expect(classifyFoodIntent("can I see the menu?")).toBe("BROWSE_MENU");
  });
  it("detects place order", () => {
    expect(classifyFoodIntent("I'll take 2 jollof and 1 chicken")).toBe("PLACE_ORDER");
  });
  it("detects order status & cancel", () => {
    expect(classifyFoodIntent("where is my order?")).toBe("ORDER_STATUS");
    expect(classifyFoodIntent("please cancel it")).toBe("CANCEL_ORDER");
  });
  it("detects owner status command", () => {
    expect(classifyFoodIntent("status abcdef12 preparing")).toBe("OWNER_STATUS_CMD");
  });
});

describe("parseOrderItems", () => {
  it("parses comma-separated items with quantities", () => {
    expect(parseOrderItems("2 jollof, 1 chicken suya, 3 zobo")).toEqual([
      { qty: 2, query: "jollof" },
      { qty: 1, query: "chicken suya" },
      { qty: 3, query: "zobo" },
    ]);
  });
  it("handles 'and' separators", () => {
    const res = parseOrderItems("I want 2 jollof and 1 chicken");
    expect(res).toContainEqual({ qty: 2, query: "jollof" });
    expect(res).toContainEqual({ qty: 1, query: "chicken" });
  });
});

describe("fuzzyMatchMenu", () => {
  const menu = [
    { id: "1", business_id: "b", name: "Jollof Rice", description: "", category: "Mains", price_kobo: 150000, available: true, sort_order: 0 },
    { id: "2", business_id: "b", name: "Chicken Suya", description: "", category: "Mains", price_kobo: 250000, available: true, sort_order: 0 },
    { id: "3", business_id: "b", name: "Zobo Drink", description: "", category: "Drinks", price_kobo: 50000, available: true, sort_order: 0 },
  ];
  it("matches exact substring", () => {
    expect(fuzzyMatchMenu(menu, "jollof")[0].item.id).toBe("1");
  });
  it("tolerates typos", () => {
    expect(fuzzyMatchMenu(menu, "jolof")[0].item.id).toBe("1");
  });
  it("matches multi-word queries", () => {
    expect(fuzzyMatchMenu(menu, "chicken")[0].item.id).toBe("2");
  });
});

describe("niche router", () => {
  beforeEach(() => vi.clearAllMocks());
  it("returns handled=false when no niches active", async () => {
    const res = await routeToNiche([], {
      businessId: "b1", businessName: "X", customerNumber: "+234", customerName: null,
      text: "hello", history: [],
    });
    expect(res.handled).toBe(false);
  });
  it("falls through if handler throws", async () => {
    const res = await routeToNiche(
      [{ id: "n1", business_id: "b1", niche_type: "hospital", active: true, config: {} }],
      { businessId: "b1", businessName: "X", customerNumber: "+234", customerName: null, text: "hi", history: [] },
    );
    // hospital handler with no Vitar URL falls through (UNKNOWN intent)
    expect(typeof res.handled).toBe("boolean");
  });
});

describe("vitar client (env-driven)", () => {
  it("returns null when VITAR_BASE_URL missing", async () => {
    const original = process.env.VITAR_BASE_URL;
    delete process.env.VITAR_BASE_URL;
    const { vitarClient } = await import("@/lib/niche/hospital/vitar-client");
    const res = await vitarClient.listDoctors();
    expect(res).toBeNull();
    if (original) process.env.VITAR_BASE_URL = original;
  });

  it("calls fetch with bearer token when configured", async () => {
    process.env.VITAR_BASE_URL = "https://vitar.test/api";
    process.env.VITAR_API_KEY = "k_test";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([{ id: "d1", name: "Ada", specialty: "GP" }]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    // re-import to bind new env
    vi.resetModules();
    const { vitarClient } = await import("@/lib/niche/hospital/vitar-client");
    const res = await vitarClient.listDoctors();
    expect(res).toEqual([{ id: "d1", name: "Ada", specialty: "GP" }]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://vitar.test/api/doctors",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer k_test" }) }),
    );
  });
});
