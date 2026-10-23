import { describe, expect, it } from "vitest";

import { scoreAndSortRequests } from "../src/services/scoringService.js";

const weights = {
  urgency: 0.35,
  population: 0.25,
  vulnerability: 0.15,
  waiting: 0.15,
  accessibility: 0.1,
};

const now = new Date("2026-10-13T12:00:00.000Z");

describe("request scoring service", () => {
  it("returns the API contract shape and sorts by total score", () => {
    const result = scoreAndSortRequests(
      [
        {
          id: "req_low",
          area: "Area Low",
          lat: 25,
          lng: 68,
          population: 100,
          urgency: "low",
          vulnerable: false,
          accessibility: "easy",
          status: "pending",
          created_at: "2026-10-13T11:00:00.000Z",
          request_items: [
            { item: "water", qty_needed: 100, qty_allocated: 20 },
          ],
        },
        {
          id: "req_critical",
          area: "Area Critical",
          lat: 26,
          lng: 69,
          population: 1000,
          urgency: "critical",
          vulnerable: true,
          accessibility: "hard",
          status: "partially_allocated",
          created_at: "2026-10-13T02:00:00.000Z",
          request_items: [
            { item: "water", qty_needed: 100, qty_allocated: 50 },
            { item: "food", qty_needed: 100, qty_allocated: 100 },
          ],
        },
      ],
      weights,
      { now, timeOffsetHours: 2 },
    );

    expect(result.map((request) => request.id)).toEqual([
      "req_critical",
      "req_low",
    ]);
    expect(result[0]).toMatchObject({
      id: "req_critical",
      hoursWaiting: 12,
      fulfilmentPct: 75,
      createdAt: "2026-10-13T02:00:00.000Z",
      items: [
        { item: "food", qtyNeeded: 100, qtyAllocated: 100 },
        { item: "water", qtyNeeded: 100, qtyAllocated: 50 },
      ],
    });
  });

  it("uses stable tie breaking by creation time and id", () => {
    const base = {
      area: "Same",
      lat: 25,
      lng: 68,
      population: 100,
      urgency: "medium",
      vulnerable: false,
      accessibility: "easy",
      status: "pending",
      request_items: [],
    };

    const result = scoreAndSortRequests(
      [
        { ...base, id: "req_b", created_at: "2026-10-13T10:00:00.000Z" },
        { ...base, id: "req_a", created_at: "2026-10-13T10:00:00.000Z" },
      ],
      weights,
      { now },
    );

    expect(result.map((request) => request.id)).toEqual(["req_a", "req_b"]);
  });
});
