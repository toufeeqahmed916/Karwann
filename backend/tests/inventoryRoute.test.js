import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/inventoryService.js", () => ({
  addVehicle: vi.fn(),
  adjustInventory: vi.fn(),
  createDepot: vi.fn(),
  listDepots: vi.fn(),
  listStockLog: vi.fn(),
  removeVehicle: vi.fn(),
  updateDepot: vi.fn(),
  updateVehicle: vi.fn(),
}));

import { createApp } from "../src/app.js";
import {
  addVehicle,
  adjustInventory,
  createDepot,
  listDepots,
  listStockLog,
  removeVehicle,
  updateDepot,
  updateVehicle,
} from "../src/services/inventoryService.js";

const depot = {
  id: "dep_01",
  name: "Hyderabad Depot",
  dailyCapacity: 2000,
  stock: [],
  vehicles: [],
};

describe("inventory endpoints", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists depots", async () => {
    listDepots.mockResolvedValue([depot]);

    const response = await request(createApp()).get("/api/depots");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [depot] });
  });

  it("creates Hyderabad depot inventory and trucks", async () => {
    createDepot.mockResolvedValue(depot);
    const body = {
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

    const response = await request(createApp()).post("/api/depots").send(body);

    expect(response.status).toBe(201);
    expect(createDepot).toHaveBeenCalledWith(body);
    expect(response.body).toEqual({ data: depot });
  });

  it("adjusts depot inventory", async () => {
    adjustInventory.mockResolvedValue(depot);
    const body = { item: "water", change: -50, reason: "manual adjustment" };

    const response = await request(createApp())
      .patch("/api/depots/dep_01/inventory")
      .send(body);

    expect(response.status).toBe(200);
    expect(adjustInventory).toHaveBeenCalledWith("dep_01", body);
    expect(response.body).toEqual({ data: depot });
  });

  it("updates depot capacity", async () => {
    updateDepot.mockResolvedValue({ ...depot, dailyCapacity: 1500 });

    const response = await request(createApp())
      .patch("/api/depots/dep_01")
      .send({ dailyCapacity: 1500 });

    expect(response.status).toBe(200);
    expect(updateDepot).toHaveBeenCalledWith("dep_01", { dailyCapacity: 1500 });
  });

  it("lists stock log entries for a depot", async () => {
    listStockLog.mockResolvedValue([]);

    const response = await request(createApp()).get(
      "/api/stock-log?depotId=dep_01",
    );

    expect(response.status).toBe(200);
    expect(listStockLog).toHaveBeenCalledWith({ depotId: "dep_01" });
    expect(response.body).toEqual({ data: [] });
  });

  it("creates, updates and removes depot vehicles", async () => {
    addVehicle.mockResolvedValue(depot);
    updateVehicle.mockResolvedValue(depot);
    removeVehicle.mockResolvedValue(depot);

    expect(
      (await request(createApp()).post("/api/depots/dep_01/vehicles").send({ name: "Truck 7", capacity: 300 })).status,
    ).toBe(201);
    expect(
      (await request(createApp()).patch("/api/depots/dep_01/vehicles/veh_07").send({ status: "busy" })).status,
    ).toBe(200);
    expect(
      (await request(createApp()).delete("/api/depots/dep_01/vehicles/veh_07")).status,
    ).toBe(200);
  });
});
