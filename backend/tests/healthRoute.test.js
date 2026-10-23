import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/repositories/databaseRepository.js", () => ({
  checkDatabaseConnection: vi.fn(),
  getSeedCounts: vi.fn(),
}));

import { createApp } from "../src/app.js";
import {
  checkDatabaseConnection,
  getSeedCounts,
} from "../src/repositories/databaseRepository.js";

describe("readiness and AI integration discovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkDatabaseConnection.mockResolvedValue(true);
    getSeedCounts.mockResolvedValue({
      depots: 3,
      requests: 12,
      aiMetadata: 0,
      vehicles: 6,
      requestItems: 41,
    });
  });

  it("publishes the stable Express contract used by FastAPI", async () => {
    const response = await request(createApp()).get("/health/ready");

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      status: "ready",
      database: "connected",
      seedCounts: { aiMetadata: 0 },
      aiIntegration: {
        version: "1",
        requestWrite: "/api/requests",
        contextReads: [
          "/api/requests",
          "/api/allocation",
          "/api/depots",
          "/api/dashboard",
          "/api/deliveries",
        ],
        responseEnvelope: "data",
        requestIdHeader: "X-Request-Id",
      },
    });
  });
});

