import { describe, expect, it } from "vitest";

import {
  validateApproveAllocation,
  validateGenerateAllocation,
} from "../src/validators/allocationValidator.js";

describe("allocation validation", () => {
  it("accepts the agreed generation and approval bodies", () => {
    expect(validateGenerateAllocation({})).toBeUndefined();
    expect(validateApproveAllocation({ all: true })).toEqual({ all: true });
    expect(validateApproveAllocation({ rowIds: ["alc_01", "alc_01", "alc_02"] })).toEqual({
      all: false,
      rowIds: ["alc_01", "alc_02"],
    });
    expect(validateApproveAllocation({ requestId: " req_01 " })).toEqual({
      all: false,
      requestId: "req_01",
    });
  });

  it("rejects ambiguous approval input", () => {
    expect(() => validateApproveAllocation({ all: true, rowIds: ["alc_01"] })).toThrow(
      "Provide either",
    );
    expect(() => validateApproveAllocation({ requestId: "req_01", rowIds: ["alc_01"] })).toThrow(
      "Provide",
    );
  });
});
