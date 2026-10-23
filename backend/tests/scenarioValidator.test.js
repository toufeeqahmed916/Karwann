import { describe, expect, it } from "vitest";

import { validateScenarioAction } from "../src/validators/scenarioValidator.js";

describe("scenario validation", () => {
  it.each([
    { action: "reduce_stock", depotId: "dep_01", item: "water", percent: 50 },
    { action: "add_stock", depotId: "dep_01", item: "food", qty: 100 },
    { action: "increase_population", requestId: "req_01", percent: 40 },
    { action: "change_capacity", depotId: "dep_01", dailyCapacity: 800 },
    { action: "block_zone", lat: 26.2, lng: 68.1, radiusKm: 15 },
  ])("accepts $action", (input) => {
    expect(validateScenarioAction(input)).toEqual(input);
  });

  it("normalizes the frontend-compatible single-item request", () => {
    const result = validateScenarioAction({
      action: "add_request",
      request: {
        area: "New area",
        lat: 26.3,
        lng: 68.2,
        population: 1800,
        urgency: "high",
        vulnerable: false,
        accessibility: "medium",
        item: "water",
        qtyNeeded: 300,
      },
    });
    expect(result.request.items).toEqual([{ item: "water", qtyNeeded: 300 }]);
    expect(result.request.item).toBeUndefined();
  });

  it("rejects an invalid percentage", () => {
    expect(() =>
      validateScenarioAction({
        action: "reduce_stock",
        depotId: "dep_01",
        item: "water",
        percent: 101,
      }),
    ).toThrow("percent must be at most 100");
  });
});
