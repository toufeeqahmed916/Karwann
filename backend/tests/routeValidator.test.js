import { describe, expect, it } from "vitest";

import { validateRouteQuery } from "../src/validators/routeValidator.js";

describe("route validation", () => {
  it("accepts and trims both endpoint ids", () => {
    expect(validateRouteQuery({ depotId: " dep_01 ", requestId: " req_01 " })).toEqual({
      depotId: "dep_01",
      requestId: "req_01",
    });
  });

  it("requires both ids", () => {
    expect(() => validateRouteQuery({ depotId: "dep_01" })).toThrow(
      "requestId is required",
    );
  });
});
