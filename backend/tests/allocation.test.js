import { describe, expect, it } from "vitest";

import { buildAllocationPlan, buildAllocationRows } from "../src/core/allocation.js";

const request = (overrides) => ({
  id: "req_01",
  area: "Dadu",
  lat: 26.73,
  lng: 67.78,
  population: 4200,
  urgency: "critical",
  vulnerable: true,
  accessibility: "hard",
  status: "pending",
  hoursWaiting: 18,
  createdAt: "2026-10-12T10:00:00Z",
  items: [{ item: "water", qtyNeeded: 500, qtyAllocated: 0 }],
  score: { total: 90, parts: {} },
  ...overrides,
});

const depot = (overrides = {}) => ({
  id: "dep_01",
  name: "Hyderabad Depot",
  lat: 25.396,
  lng: 68.3578,
  dailyCapacity: 1000,
  stock: [
    { item: "water", qty: 600, lowThreshold: 100, isLow: false },
    { item: "food", qty: 0, lowThreshold: 100, isLow: true },
    { item: "medicine", qty: 0, lowThreshold: 10, isLow: true },
    { item: "shelter", qty: 0, lowThreshold: 10, isLow: true },
  ],
  vehicles: [
    { id: "veh_01", name: "Truck 1", capacity: 200, status: "available" },
  ],
  ...overrides,
});

describe("allocation engine", () => {
  it("uses weighted fair sharing when stock is short", () => {
    let id = 0;
    const result = buildAllocationRows(
      {
        requests: [
          request({ id: "critical", score: { total: 90, parts: {} } }),
          request({
            id: "low",
            area: "Matiari",
            urgency: "low",
            score: { total: 30, parts: {} },
          }),
        ],
        depots: [depot()],
        blocks: [],
      },
      { idFactory: () => `alc_${++id}` },
    );

    const critical = result.rows.find((row) => row.requestId === "critical");
    const low = result.rows.find((row) => row.requestId === "low");
    expect(critical.qty).toBeGreaterThan(low.qty);
    expect(result.summary.totalAllocated).toBe(600);
    expect(result.summary.totalNeeded).toBe(1000);
  });

  it("respects depot capacity and requires an available vehicle", () => {
    const result = buildAllocationRows({
      requests: [request({ items: [{ item: "water", qtyNeeded: 500, qtyAllocated: 0 }] })],
      depots: [depot({ dailyCapacity: 250 })],
      blocks: [],
    });
    expect(result.summary.totalAllocated).toBe(250);

    const noVehicle = buildAllocationRows({
      requests: [request()],
      depots: [depot({ vehicles: [] })],
      blocks: [],
    });
    expect(noVehicle.summary.totalAllocated).toBe(0);
    expect(noVehicle.rows[0].reason).toContain("available vehicle");
  });

  it("adds a blocked-zone distance penalty and creates a baseline", () => {
    const context = {
      requests: [request()],
      depots: [depot()],
      blocks: [{ lat: 26.73, lng: 67.78, radiusKm: 5, active: true }],
    };
    const plan = buildAllocationPlan(context);
    expect(plan.rows[0].reason).toContain("blocked zone");
    expect(plan.baseline).toEqual({
      overallFulfilmentPct: expect.any(Number),
      criticalFulfilmentPct: expect.any(Number),
    });
  });
});
