import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/repositories/requestRepository.js", () => ({
  createRequestWithItems: vi.fn(),
  findTrackingByRequestId: vi.fn(),
  updateRequestById: vi.fn(),
}));
vi.mock("../src/repositories/scoringRepository.js", () => ({
  findRequestsForScoring: vi.fn(),
}));
vi.mock("../src/repositories/settingsRepository.js", () => ({
  findTimeOffsetHours: vi.fn(),
  findWeights: vi.fn(),
}));

import { findTrackingByRequestId } from "../src/repositories/requestRepository.js";
import { findRequestsForScoring } from "../src/repositories/scoringRepository.js";
import {
  findTimeOffsetHours,
  findWeights,
} from "../src/repositories/settingsRepository.js";
import {
  getRequestById,
  listRequests,
} from "../src/services/requestService.js";

const weights = {
  urgency: 0.35,
  population: 0.25,
  vulnerability: 0.15,
  waiting: 0.15,
  accessibility: 0.1,
};

const requestRows = [
  {
    id: "req_01",
    area: "Dadu",
    lat: 26.73,
    lng: 67.78,
    population: 4200,
    urgency: "critical",
    vulnerable: true,
    accessibility: "hard",
    status: "in_transit",
    created_at: new Date(Date.now() - 18 * 3_600_000).toISOString(),
    request_items: [
      { item: "water", qty_needed: 500, qty_allocated: 320 },
    ],
  },
  {
    id: "req_02",
    area: "Larkana",
    lat: 27.55,
    lng: 68.21,
    population: 3500,
    urgency: "high",
    vulnerable: true,
    accessibility: "medium",
    status: "pending",
    created_at: new Date(Date.now() - 10 * 3_600_000).toISOString(),
    request_items: [
      { item: "food", qty_needed: 350, qty_allocated: 0 },
    ],
  },
];

describe("request service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findRequestsForScoring.mockResolvedValue(requestRows);
    findWeights.mockResolvedValue(weights);
    findTimeOffsetHours.mockResolvedValue(0);
  });

  it("filters the scored request list", async () => {
    const result = await listRequests({
      urgency: "critical",
      status: "in_transit",
      item: "water",
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("req_01");
  });

  it("adds contract-shaped tracking with remaining ETA", async () => {
    findTrackingByRequestId.mockResolvedValue([
      {
        id: "alc_01",
        item: "water",
        status: "in_transit",
        progress_pct: 50,
        eta_min: 190,
        vehicles: { current_lat: 25.9, current_lng: 68.1 },
      },
    ]);

    const result = await getRequestById("req_01");

    expect(result.tracking).toEqual([
      {
        allocationId: "alc_01",
        item: "water",
        status: "in_transit",
        progressPct: 50,
        etaMin: 95,
        lat: 25.9,
        lng: 68.1,
      },
    ]);
  });

  it("returns NOT_FOUND when the request does not exist", async () => {
    await expect(getRequestById("req_missing")).rejects.toMatchObject({
      code: "NOT_FOUND",
      statusCode: 404,
    });
    expect(findTrackingByRequestId).not.toHaveBeenCalled();
  });
});
