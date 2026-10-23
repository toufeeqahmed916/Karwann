import { describe, expect, it } from "vitest";

import { validateAdvanceTime } from "../src/validators/simulationValidator.js";

describe("advance-time validation", () => {
  it("accepts a positive integer number of hours", () => {
    expect(validateAdvanceTime({ hours: 6 })).toEqual({ hours: 6 });
  });

  it.each([
    [{}, "hours must be a positive integer"],
    [{ hours: 0 }, "hours must be a positive integer"],
    [{ hours: 1.5 }, "hours must be a positive integer"],
    [{ hours: 6, extra: true }, "Unknown field: extra"],
  ])("rejects invalid advance-time input", (input, message) => {
    expect(() => validateAdvanceTime(input)).toThrow(message);
  });
});
