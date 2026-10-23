import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/repositories/inventoryRepository.js", () => ({
  createDepotVehicle: vi.fn(),
  createDepotWithInventory: vi.fn(),
  deleteDepotVehicleById: vi.fn(),
  findDepotById: vi.fn(),
  findDepotVehicle: vi.fn(),
  findDepots: vi.fn(),
  findInventoryItem: vi.fn(),
  findStockLog: vi.fn(),
  updateDepotById: vi.fn(),
  updateDepotVehicleById: vi.fn(),
  updateInventoryAndLog: vi.fn(),
}));

import {
  createDepotWithInventory,
  findDepotById,
  findDepots,
  findInventoryItem,
  findStockLog,
  updateInventoryAndLog,
} from "../src/repositories/inventoryRepository.js";
import {
  adjustInventory,
  createDepot,
  listDepots,
  listStockLog,
} from "../src/services/inventoryService.js";

const depotRows = {
  depots: [
    {
      id: "dep_01",
      name: "Hyderabad Depot",
      lat: 25.396,
      lng: 68.3578,
      daily_capacity: 2000,
    },
  ],
  stock: [
    {
      depot_id: "dep_01",
      item: "water",
      qty: 1200,
      low_threshold: 300,
      is_low: false,
    },
  ],
  vehicles: [
    {
      id: "veh_01",
      depot_id: "dep_01",
      name: "Truck 1",
      capacity: 400,
      status: "available",
      current_lat: 25.396,
      current_lng: 68.3578,
    },
  ],
};

describe("inventory service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findDepots.mockResolvedValue(depotRows);
    findDepotById.mockResolvedValue(depotRows.depots[0]);
  });

  it("returns contract-shaped depots with stock and vehicles", async () => {
    await expect(listDepots()).resolves.toEqual([
      {
        id: "dep_01",
        name: "Hyderabad Depot",
        lat: 25.396,
        lng: 68.3578,
        dailyCapacity: 2000,
        stock: [
          {
            item: "water",
            qty: 1200,
            lowThreshold: 300,
            isLow: false,
          },
        ],
        vehicles: [
          {
            id: "veh_01",
            name: "Truck 1",
            capacity: 400,
            status: "available",
            lat: 25.396,
            lng: 68.3578,
          },
        ],
      },
    ]);
  });

  it("creates the fixed Hyderabad depot with four items and trucks", async () => {
    createDepotWithInventory.mockResolvedValue(depotRows.depots[0]);
    const input = {
      name: "Hyderabad Depot",
      lat: 25.396,
      lng: 68.3578,
      dailyCapacity: 2000,
      inventory: [
        { item: "food", qty: 900, lowThreshold: 250 },
        { item: "water", qty: 1200, lowThreshold: 300 },
        { item: "medicine", qty: 100, lowThreshold: 40 },
        { item: "shelter", qty: 250, lowThreshold: 60 },
      ],
      vehicles: [{ name: "Truck 1", capacity: 400 }],
    };

    await createDepot(input);

    expect(createDepotWithInventory).toHaveBeenCalledWith({
      depot: {
        name: "Hyderabad Depot",
        lat: 25.396,
        lng: 68.3578,
        daily_capacity: 2000,
      },
      inventory: [
        { item: "food", qty: 900, low_threshold: 250 },
        { item: "water", qty: 1200, low_threshold: 300 },
        { item: "medicine", qty: 100, low_threshold: 40 },
        { item: "shelter", qty: 250, low_threshold: 60 },
      ],
      vehicles: [{ name: "Truck 1", capacity: 400 }],
    });
  });

  it("adjusts inventory, selects the correct log action, and returns the depot", async () => {
    findInventoryItem.mockResolvedValue({ qty: 1200 });
    updateInventoryAndLog.mockResolvedValue(true);

    const result = await adjustInventory("dep_01", {
      item: "water",
      change: -500,
      reason: "manual adjustment",
    });

    expect(updateInventoryAndLog).toHaveBeenCalledWith({
      depotId: "dep_01",
      item: "water",
      oldQty: 1200,
      newQty: 700,
      action: "adjusted",
    });
    expect(result.id).toBe("dep_01");
  });

  it("rejects a stock reduction that would go below zero", async () => {
    findInventoryItem.mockResolvedValue({ qty: 100 });

    await expect(
      adjustInventory("dep_01", {
        item: "water",
        change: -101,
        reason: "manual adjustment",
      }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK", statusCode: 409 });
    expect(updateInventoryAndLog).not.toHaveBeenCalled();
  });

  it("maps stock-log rows to the agreed API shape", async () => {
    findStockLog.mockResolvedValue([
      {
        id: "log_01",
        depot_id: "dep_01",
        request_id: null,
        item: "water",
        qty: 500,
        action: "adjusted",
        created_at: "2026-10-13T10:00:00Z",
      },
    ]);

    await expect(listStockLog({ depotId: "dep_01" })).resolves.toEqual([
      {
        id: "log_01",
        depotId: "dep_01",
        requestId: null,
        item: "water",
        qty: 500,
        action: "adjusted",
        createdAt: "2026-10-13T10:00:00Z",
      },
    ]);
  });
});
