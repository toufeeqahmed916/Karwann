import { describe, expect, it } from "vitest";

import { positionAlongRoute } from "../src/core/truckProgress.js";

describe("truck route interpolation", () => {
  it("returns route endpoints at zero and full progress", () => {
    const route = [[25, 68], [26, 69], [27, 70]];
    expect(positionAlongRoute(route, 0)).toEqual({ lat: 25, lng: 68 });
    expect(positionAlongRoute(route, 100)).toEqual({ lat: 27, lng: 70 });
  });

  it("interpolates a point along the route distance", () => {
    const point = positionAlongRoute([[0, 0], [0, 1]], 50);
    expect(point.lat).toBeCloseTo(0);
    expect(point.lng).toBeCloseTo(0.5);
  });
});
