import { describe, expect, it } from "vitest";

import { compareAllocationPlans } from "../src/services/scenarioService.js";

function plan(qty) {
  return {
    rows: [
      {
        requestId: "req_01",
        area: "Dadu",
        item: "water",
        qty,
        qtyNeeded: 500,
      },
    ],
    summary: { overallFulfilmentPct: Math.round((qty / 500) * 100) },
  };
}

describe("scenario comparison", () => {
  it("marks requests that lose fulfilment and reports overall change", () => {
    const result = compareAllocationPlans(
      plan(400),
      plan(200),
      { action: "reduce_stock" },
    );
    expect(result.overallChangePct).toBe(-40);
    expect(result.requests[0]).toMatchObject({
      requestId: "req_01",
      tag: "lost",
      fulfilmentBeforePct: 80,
      fulfilmentAfterPct: 40,
    });
  });
});
