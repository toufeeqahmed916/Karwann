import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/repositories/dashboardRepository.js", () => ({
  findDashboardData: vi.fn(),
}));

import { findDashboardData } from "../src/repositories/dashboardRepository.js";
import {
  buildDashboard,
  getDashboard,
} from "../src/services/dashboardService.js";

const data = {
  requests: [
    {
      id: "req_01",
      population: 1000,
      status: "pending",
      request_items: [
        { item: "water", qty_needed: 500, qty_allocated: 100 },
        { item: "food", qty_needed: 200, qty_allocated: 0 },
      ],
    },
    {
      id: "req_02",
      population: 600,
      status: "delivered",
      request_items: [{ item: "water", qty_needed: 200, qty_allocated: 200 }],
    },
  ],
  inventory: [
    {
      depot_id: "dep_01",
      item: "water",
      qty: 300,
      low_threshold: 350,
      is_low: true,
    },
    {
      depot_id: "dep_01",
      item: "food",
      qty: 400,
      low_threshold: 100,
      is_low: false,
    },
  ],
  depots: [{ id: "dep_01", name: "Hyderabad Depot" }],
  allocations: [
    { status: "in_transit" },
    { status: "delivered" },
    { status: "approved" },
  ],
};

describe("dashboard service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("builds all dashboard KPIs from current operational data", () => {
    expect(buildDashboard(data)).toEqual({
      activeRequests: 1,
      peopleAwaiting: 1000,
      deliveriesInProgress: 1,
      completedDeliveries: 1,
      criticalShortages: [
        { item: "water", needed: 400, available: 300, gap: 100 },
      ],
      inventoryTotals: [
        { item: "water", qty: 300 },
        { item: "food", qty: 400 },
        { item: "medicine", qty: 0 },
        { item: "shelter", qty: 0 },
      ],
      lowStockAlerts: [
        {
          depotId: "dep_01",
          depotName: "Hyderabad Depot",
          item: "water",
          qty: 300,
          lowThreshold: 350,
        },
      ],
    });
  });

  it("loads the dashboard data through its repository", async () => {
    findDashboardData.mockResolvedValue(data);

    const result = await getDashboard();

    expect(findDashboardData).toHaveBeenCalledOnce();
    expect(result.activeRequests).toBe(1);
  });
});
