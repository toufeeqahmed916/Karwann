import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/dashboardService.js", () => ({
  getDashboard: vi.fn(),
}));
vi.mock("../src/services/timeSimulationService.js", () => ({
  advanceTime: vi.fn(),
}));

import { createApp } from "../src/app.js";
import { getDashboard } from "../src/services/dashboardService.js";
import { advanceTime } from "../src/services/timeSimulationService.js";

const dashboard = {
  activeRequests: 12,
  peopleAwaiting: 31400,
  deliveriesInProgress: 3,
  completedDeliveries: 5,
  criticalShortages: [],
  inventoryTotals: [],
  lowStockAlerts: [],
};

describe("dashboard and time endpoints", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the dashboard summary", async () => {
    getDashboard.mockResolvedValue(dashboard);

    const response = await request(createApp()).get("/api/dashboard");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: dashboard });
  });

  it("advances demo time and returns re-scored requests", async () => {
    advanceTime.mockResolvedValue([{ id: "req_01", hoursWaiting: 24 }]);

    const response = await request(createApp())
      .post("/api/simulate/advance-time")
      .send({ hours: 6 });

    expect(response.status).toBe(200);
    expect(advanceTime).toHaveBeenCalledWith({ hours: 6 });
    expect(response.body).toEqual({
      data: [{ id: "req_01", hoursWaiting: 24 }],
    });
  });
});
