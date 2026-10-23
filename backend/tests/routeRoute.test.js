import request from "supertest";
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/services/routeService.js", () => ({ getRoute: vi.fn() }));

import { createApp } from "../src/app.js";
import { getRoute } from "../src/services/routeService.js";

describe("route endpoint", () => {
  it("returns a route preview", async () => {
    getRoute.mockResolvedValue({
      depotId: "dep_01",
      requestId: "req_01",
      polyline: [[25.39, 68.37], [26.73, 67.78]],
      distanceKm: 142.5,
      durationMin: 190,
      estimated: false,
    });
    const response = await request(createApp()).get(
      "/api/routes?depotId=dep_01&requestId=req_01",
    );
    expect(response.status).toBe(200);
    expect(getRoute).toHaveBeenCalledWith({ depotId: "dep_01", requestId: "req_01" });
  });
});
