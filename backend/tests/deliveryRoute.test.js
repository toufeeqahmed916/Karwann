import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/deliveryService.js", () => ({
  completeDelivery: vi.fn(),
  listDeliveries: vi.fn(),
  startDeliveries: vi.fn(),
}));

import { createApp } from "../src/app.js";
import {
  completeDelivery,
  listDeliveries,
  startDeliveries,
} from "../src/services/deliveryService.js";

describe("delivery endpoints", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists deliveries with a vehicle filter", async () => {
    listDeliveries.mockResolvedValue([{ allocationId: "alc_01" }]);
    const response = await request(createApp()).get("/api/deliveries?vehicleId=veh_01");
    expect(response.status).toBe(200);
    expect(listDeliveries).toHaveBeenCalledWith({ vehicleId: "veh_01" });
  });

  it("starts deliveries", async () => {
    startDeliveries.mockResolvedValue({ started: 1 });
    const body = { allocationIds: ["alc_01"] };
    const response = await request(createApp()).post("/api/deliveries/start").send(body);
    expect(response.status).toBe(200);
    expect(startDeliveries).toHaveBeenCalledWith(body);
  });

  it("completes a delivery", async () => {
    completeDelivery.mockResolvedValue({
      allocationId: "alc_01",
      status: "delivered",
      requestStatus: "delivered",
    });
    const response = await request(createApp()).post("/api/deliveries/alc_01/complete").send({});
    expect(response.status).toBe(200);
    expect(completeDelivery).toHaveBeenCalledWith("alc_01", {});
  });
});
