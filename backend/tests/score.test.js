import { describe, expect, it } from "vitest";

import { calculatePriorityScore } from "../src/core/score.js";

const defaultWeights = {
  urgency: 0.35,
  population: 0.25,
  vulnerability: 0.15,
  waiting: 0.15,
  accessibility: 0.1,
};

function score(overrides = {}, contextOverrides = {}) {
  return calculatePriorityScore(
    {
      urgency: "medium",
      population: 500,
      vulnerable: false,
      accessibility: "easy",
      ...overrides,
    },
    {
      maxPopulation: 1000,
      hoursWaiting: 0,
      weights: defaultWeights,
      ...contextOverrides,
    },
  );
}

describe("priority scoring", () => {
  it("gives critical requests more urgency points than high requests", () => {
    expect(score({ urgency: "critical" }).parts.urgency).toBeGreaterThan(
      score({ urgency: "high" }).parts.urgency,
    );
  });

  it("caps waiting time at 48 hours", () => {
    expect(score({}, { hoursWaiting: 48 }).parts.waiting).toBe(
      score({}, { hoursWaiting: 96 }).parts.waiting,
    );
  });

  it("uses the maximum population as the population scale", () => {
    expect(score({ population: 1000 }).parts.population).toBe(25);
    expect(score({ population: 500 }).parts.population).toBeLessThan(25);
  });

  it("returns weighted integer parts that add up to the total", () => {
    const result = score(
      {
        urgency: "critical",
        population: 777,
        vulnerable: true,
        accessibility: "hard",
      },
      { hoursWaiting: 17 },
    );

    expect(Object.values(result.parts).reduce((sum, part) => sum + part, 0)).toBe(
      result.total,
    );
    expect(result.parts.accessibility).toBeLessThanOrEqual(10);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
  });
});
