import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/repositories/scoringRepository.js", () => ({
  findRequestsForScoring: vi.fn(),
}));
vi.mock("../src/repositories/settingsRepository.js", () => ({
  findTimeOffsetHours: vi.fn(),
  findWeights: vi.fn(),
  saveTimeOffsetHours: vi.fn(),
}));

import { findRequestsForScoring } from "../src/repositories/scoringRepository.js";
import {
  findTimeOffsetHours,
  findWeights,
  saveTimeOffsetHours,
} from "../src/repositories/settingsRepository.js";
import { advanceTime } from "../src/services/timeSimulationService.js";

const weights = {
  urgency: 0.35,
  population: 0.25,
  vulnerability: 0.15,
  waiting: 0.15,
  accessibility: 0.1,
};

const rows = [
  {
    id: "req_01",
    area: "Dadu",
    lat: 26.73,
    lng: 67.78,
    population: 4200,
    urgency: "critical",
    vulnerable: true,
    accessibility: "hard",
    status: "pending",
    created_at: new Date().toISOString(),
    request_items: [{ item: "water", qty_needed: 500, qty_allocated: 0 }],
  },
];

describe("time simulation service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findRequestsForScoring.mockResolvedValue(rows);
    findWeights.mockResolvedValue(weights);
    findTimeOffsetHours.mockResolvedValue(12);
    saveTimeOffsetHours.mockResolvedValue(18);
  });

  it("persists the accumulated offset and returns re-scored requests", async () => {
    const result = await advanceTime({ hours: 6 });

    expect(saveTimeOffsetHours).toHaveBeenCalledWith(18);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "req_01", hoursWaiting: 18 });
  });
});
