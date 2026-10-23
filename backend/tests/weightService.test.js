import { describe, expect, it } from "vitest";

import { validateAndNormalizeWeights } from "../src/services/weightService.js";

describe("weight validation", () => {
  it("accepts the agreed default weights", () => {
    expect(
      validateAndNormalizeWeights({
        urgency: 0.35,
        population: 0.25,
        vulnerability: 0.15,
        waiting: 0.15,
        accessibility: 0.1,
      }),
    ).toEqual({
      urgency: 0.35,
      population: 0.25,
      vulnerability: 0.15,
      waiting: 0.15,
      accessibility: 0.1,
    });
  });

  it("normalizes a close floating-point total", () => {
    const result = validateAndNormalizeWeights({
      urgency: 0.35,
      population: 0.25,
      vulnerability: 0.15,
      waiting: 0.15,
      accessibility: 0.099,
    });

    expect(
      Object.values(result).reduce((sum, value) => sum + value, 0),
    ).toBeCloseTo(1, 10);
  });

  it("rejects a total that is not close to one", () => {
    expect(() =>
      validateAndNormalizeWeights({
        urgency: 0.1,
        population: 0.1,
        vulnerability: 0.1,
        waiting: 0.1,
        accessibility: 0.1,
      }),
    ).toThrow("Priority weights must add up to 1");
  });

  it("rejects missing and unknown factors", () => {
    expect(() =>
      validateAndNormalizeWeights({
        urgency: 0.4,
        population: 0.3,
        vulnerability: 0.2,
        waiting: 0.1,
        other: 0,
      }),
    ).toThrow("Provide exactly the five priority weights");
  });

  it("rejects negative weights", () => {
    expect(() =>
      validateAndNormalizeWeights({
        urgency: 0.5,
        population: 0.3,
        vulnerability: 0.2,
        waiting: 0.1,
        accessibility: -0.1,
      }),
    ).toThrow("accessibility weight must be a number from 0 to 1");
  });
});
