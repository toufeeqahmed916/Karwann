import { describe, expect, it } from "vitest";

import {
  validateCreateRequest,
  validateRequestFilters,
  validateUpdateRequest,
} from "../src/validators/requestValidator.js";

const validRequest = {
  area: "Thatta",
  lat: 24.75,
  lng: 67.92,
  population: 1500,
  urgency: "high",
  vulnerable: false,
  accessibility: "medium",
  items: [
    { item: "water", qtyNeeded: 400 },
    { item: "medicine", qtyNeeded: 60 },
  ],
};

describe("request validation", () => {
  it("accepts and trims a valid request", () => {
    const result = validateCreateRequest({ ...validRequest, area: "  Thatta  " });
    expect(result.area).toBe("Thatta");
    expect(result.items).toHaveLength(2);
  });

  it.each([
    ["invalid population", { population: 0 }, "population must be a positive integer"],
    ["invalid latitude", { lat: 91 }, "lat must be between -90 and 90"],
    ["invalid urgency", { urgency: "urgent" }, "urgency must be one of"],
    ["invalid accessibility", { accessibility: "blocked" }, "accessibility must be one of"],
    ["no items", { items: [] }, "At least one supply item is required"],
  ])("rejects %s", (_label, change, message) => {
    expect(() => validateCreateRequest({ ...validRequest, ...change })).toThrow(message);
  });

  it("rejects duplicate supply items", () => {
    expect(() =>
      validateCreateRequest({
        ...validRequest,
        items: [
          { item: "water", qtyNeeded: 100 },
          { item: "water", qtyNeeded: 200 },
        ],
      }),
    ).toThrow("Duplicate supply item: water");
  });

  it("allows only population and urgency updates", () => {
    expect(validateUpdateRequest({ population: 6000, urgency: "critical" })).toEqual({
      population: 6000,
      urgency: "critical",
    });
    expect(() => validateUpdateRequest({ area: "Changed" })).toThrow(
      "Unknown field: area",
    );
  });

  it("validates the agreed request filters", () => {
    expect(
      validateRequestFilters({
        status: "pending",
        item: "water",
        urgency: "critical",
      }),
    ).toEqual({ status: "pending", item: "water", urgency: "critical" });
    expect(() => validateRequestFilters({ status: "waiting" })).toThrow(
      "status must be one of",
    );
  });
});
