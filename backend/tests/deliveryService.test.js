import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/repositories/deliveryRepository.js", () => ({
  findDeliveryRows: vi.fn(),
  findRequestDeliveryState: vi.fn(),
  updateAllocationProgress: vi.fn(),
  updateDeliveryRequestStatus: vi.fn(),
  updateVehicleState: vi.fn(),
  vehicleHasInTransitAllocations: vi.fn(),
}));
vi.mock("../src/services/routeService.js", () => ({ getRoute: vi.fn() }));

import {
  findDeliveryRows,
  findRequestDeliveryState,
  updateAllocationProgress,
  updateDeliveryRequestStatus,
  updateVehicleState,
  vehicleHasInTransitAllocations,
} from "../src/repositories/deliveryRepository.js";
import { completeDelivery, listDeliveries } from "../src/services/deliveryService.js";
import { getRoute } from "../src/services/routeService.js";

const rows = [
  {
    id: "alc_01",
    request_id: "req_01",
    depot_id: "dep_01",
    vehicle_id: "veh_01",
    item: "water",
    qty: 320,
    status: "in_transit",
    progress_pct: 40,
    requests: { area: "Dadu", lat: 26.73, lng: 67.78 },
    depots: { name: "Hyderabad Depot", lat: 25.39, lng: 68.37 },
    vehicles: { status: "busy", current_lat: 25.9, current_lng: 68.1 },
  },
  {
    id: "alc_02",
    request_id: "req_01",
    depot_id: "dep_01",
    vehicle_id: "veh_01",
    item: "food",
    qty: 300,
    status: "in_transit",
    progress_pct: 40,
    requests: { area: "Dadu", lat: 26.73, lng: 67.78 },
    depots: { name: "Hyderabad Depot", lat: 25.39, lng: 68.37 },
    vehicles: { status: "busy", current_lat: 25.9, current_lng: 68.1 },
  },
];

describe("delivery service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findDeliveryRows.mockResolvedValue(rows);
    getRoute.mockResolvedValue({
      polyline: [[25.39, 68.37], [26.73, 67.78]],
      distanceKm: 142.5,
      durationMin: 190,
      estimated: false,
    });
  });

  it("groups allocation rows into one driver delivery", async () => {
    const result = await listDeliveries({ vehicleId: "veh_01" });
    expect(findDeliveryRows).toHaveBeenCalledWith("veh_01");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      allocationId: "alc_01",
      allocationIds: ["alc_01", "alc_02"],
      status: "in_transit",
      progressPct: 40,
      items: [{ item: "water", qty: 320 }, { item: "food", qty: 300 }],
    });
    expect(result[0].etaMin).toBe(190);
  });

  it("completes the whole grouped load and frees its vehicle", async () => {
    findRequestDeliveryState.mockResolvedValue({
      request: { request_items: [{ qty_needed: 620, qty_allocated: 620 }] },
      allocations: [{ status: "delivered" }, { status: "delivered" }],
    });
    vehicleHasInTransitAllocations.mockResolvedValue(false);

    const result = await completeDelivery("alc_01", {});

    expect(updateAllocationProgress).toHaveBeenCalledWith(
      ["alc_01", "alc_02"],
      { status: "delivered", progress_pct: 100 },
    );
    expect(updateDeliveryRequestStatus).toHaveBeenCalledWith("req_01", "delivered");
    expect(updateVehicleState).toHaveBeenCalledWith("veh_01", {
      status: "available",
      current_lat: 26.73,
      current_lng: 67.78,
    });
    expect(result).toEqual({ allocationId: "alc_01", status: "delivered", requestStatus: "delivered" });
  });
});
