import { describe, expect, it } from "vitest";

import {
  validateCompleteDeliveryBody,
  validateDeliveryFilters,
  validateStartDeliveries,
} from "../src/validators/deliveryValidator.js";

describe("delivery validation", () => {
  it("validates list, start and completion inputs", () => {
    expect(validateDeliveryFilters({ vehicleId: " veh_01 " })).toEqual({ vehicleId: "veh_01" });
    expect(validateStartDeliveries({ all: true })).toEqual({ all: true });
    expect(validateStartDeliveries({ allocationIds: ["alc_01", "alc_01"] })).toEqual({
      all: false,
      allocationIds: ["alc_01"],
    });
    expect(validateCompleteDeliveryBody({})).toBeUndefined();
  });

  it("rejects ambiguous start input", () => {
    expect(() => validateStartDeliveries({ all: true, allocationIds: ["alc_01"] })).toThrow(
      "Provide either",
    );
  });
});
