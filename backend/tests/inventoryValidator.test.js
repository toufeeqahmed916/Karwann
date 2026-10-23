import { describe, expect, it } from "vitest";

import {
  validateDepotUpdate,
  validateCreateDepot,
  validateInventoryAdjustment,
  validateStockLogFilters,
  validateCreateVehicle,
  validateUpdateVehicle,
} from "../src/validators/inventoryValidator.js";

describe("inventory validation", () => {
  it("accepts exactly the four supported items and one or more trucks", () => {
    const input = {
      name: "Hyderabad Depot",
      lat: 25.396,
      lng: 68.3578,
      dailyCapacity: 2000,
      inventory: [
        { item: "food", qty: 900, lowThreshold: 250 },
        { item: "water", qty: 1200, lowThreshold: 300 },
        { item: "medicine", qty: 100, lowThreshold: 40 },
        { item: "shelter", qty: 250, lowThreshold: 60 },
      ],
      vehicles: [{ name: "Truck 1", capacity: 400 }],
    };

    expect(validateCreateDepot(input)).toEqual({
      depot: {
        name: "Hyderabad Depot",
        lat: 25.396,
        lng: 68.3578,
        daily_capacity: 2000,
      },
      inventory: [
        { item: "food", qty: 900, low_threshold: 250 },
        { item: "water", qty: 1200, low_threshold: 300 },
        { item: "medicine", qty: 100, low_threshold: 40 },
        { item: "shelter", qty: 250, low_threshold: 60 },
      ],
      vehicles: [{ name: "Truck 1", capacity: 400 }],
    });
  });

  it("rejects missing or duplicate depot inventory items", () => {
    const vehicles = [{ name: "Truck 1", capacity: 400 }];
    const depot = { name: "Hyderabad Depot", lat: 25.396, lng: 68.3578, dailyCapacity: 2000 };
    expect(() => validateCreateDepot({ ...depot, inventory: [], vehicles })).toThrow("exactly");
    expect(() => validateCreateDepot({
      ...depot,
      inventory: [
        { item: "food", qty: 1, lowThreshold: 0 },
        { item: "food", qty: 1, lowThreshold: 0 },
        { item: "water", qty: 1, lowThreshold: 0 },
        { item: "medicine", qty: 1, lowThreshold: 0 },
      ],
      vehicles,
    })).toThrow("each item once");
  });

  it("accepts a valid stock adjustment and trims its reason", () => {
    expect(
      validateInventoryAdjustment({
        item: "water",
        change: -50,
        reason: "  damaged containers  ",
      }),
    ).toEqual({ item: "water", change: -50, reason: "damaged containers" });
  });

  it.each([
    [{ item: "fuel", change: 10, reason: "restock" }, "item must be one of"],
    [{ item: "water", change: 0, reason: "restock" }, "change must be a non-zero integer"],
    [{ item: "water", change: 10, reason: " " }, "reason must contain"],
  ])("rejects an invalid stock adjustment", (input, message) => {
    expect(() => validateInventoryAdjustment(input)).toThrow(message);
  });

  it("validates depot capacity", () => {
    expect(validateDepotUpdate({ dailyCapacity: 1500 })).toEqual({
      daily_capacity: 1500,
    });
    expect(() => validateDepotUpdate({ dailyCapacity: -1 })).toThrow(
      "dailyCapacity must be a non-negative integer",
    );
  });

  it("accepts an optional depot stock-log filter", () => {
    expect(validateStockLogFilters({})).toEqual({});
    expect(validateStockLogFilters({ depotId: " dep_01 " })).toEqual({
      depotId: "dep_01",
    });
    expect(() => validateStockLogFilters({ item: "water" })).toThrow(
      "Unknown field: item",
    );
  });

  it("validates dynamic vehicle input", () => {
    expect(validateCreateVehicle({ name: " Rescue Truck ", capacity: 450 })).toEqual({
      name: "Rescue Truck",
      capacity: 450,
    });
    expect(validateUpdateVehicle({ status: "busy" })).toEqual({ status: "busy" });
    expect(() => validateCreateVehicle({ name: "X", capacity: 0 })).toThrow();
    expect(() => validateUpdateVehicle({ status: "offline" })).toThrow();
  });
});
