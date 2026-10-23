import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/repositories/routeRepository.js", () => ({
  findCachedRoute: vi.fn(),
  findRouteEndpoints: vi.fn(),
  saveCachedRoute: vi.fn(),
}));

import {
  findCachedRoute,
  findRouteEndpoints,
  saveCachedRoute,
} from "../src/repositories/routeRepository.js";
import { getRoute } from "../src/services/routeService.js";

const endpoints = {
  depot: { id: "dep_01", lat: 25.396, lng: 68.3578 },
  request: { id: "req_01", lat: 26.7319, lng: 67.775 },
};

describe("route service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    findCachedRoute.mockResolvedValue(null);
    findRouteEndpoints.mockResolvedValue(endpoints);
  });

  it("returns a cached route without calling OSRM", async () => {
    findCachedRoute.mockResolvedValue({
      depot_id: "dep_01",
      request_id: "req_01",
      polyline: [[25.396, 68.3578], [26.7319, 67.775]],
      distance_km: 150,
      duration_min: 190,
      estimated: false,
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await getRoute({ depotId: "dep_01", requestId: "req_01" });

    expect(result.distanceKm).toBe(150);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("converts OSRM GeoJSON coordinates and caches the route", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          code: "Ok",
          routes: [
            {
              distance: 142500,
              duration: 11400,
              geometry: { coordinates: [[68.3578, 25.396], [67.775, 26.7319]] },
            },
          ],
        }),
      }),
    );

    const result = await getRoute({ depotId: "dep_01", requestId: "req_01" });

    expect(result).toMatchObject({ distanceKm: 142.5, durationMin: 190, estimated: false });
    expect(result.polyline[0]).toEqual([25.396, 68.3578]);
    expect(saveCachedRoute).toHaveBeenCalledWith(result);
  });

  it("uses and caches an estimated route when OSRM fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const result = await getRoute({ depotId: "dep_01", requestId: "req_01" });
    expect(result.estimated).toBe(true);
    expect(result.polyline).toHaveLength(2);
    expect(saveCachedRoute).toHaveBeenCalledWith(result);
  });
});
