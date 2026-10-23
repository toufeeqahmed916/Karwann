import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/weightService.js", () => ({
  getWeights: vi.fn(),
  updateWeights: vi.fn(),
}));

import { createApp } from "../src/app.js";
import { AppError } from "../src/errors/AppError.js";
import {
  getWeights,
  updateWeights,
} from "../src/services/weightService.js";

const weights = {
  urgency: 0.35,
  population: 0.25,
  vulnerability: 0.15,
  waiting: 0.15,
  accessibility: 0.1,
};

describe("priority weight endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the saved weights using the agreed success envelope", async () => {
    getWeights.mockResolvedValue(weights);

    const response = await request(createApp()).get("/api/settings/weights");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: weights });
  });

  it("updates weights and returns the rescored request list", async () => {
    updateWeights.mockResolvedValue({
      weights,
      requests: [{ id: "req_03", score: { total: 94 } }],
    });

    const response = await request(createApp())
      .put("/api/settings/weights")
      .send(weights);

    expect(response.status).toBe(200);
    expect(updateWeights).toHaveBeenCalledWith(weights);
    expect(response.body.data.requests).toHaveLength(1);
  });

  it("returns the agreed validation error response", async () => {
    updateWeights.mockRejectedValue(
      new AppError({
        code: "VALIDATION_ERROR",
        message: "Priority weights must add up to 1",
        statusCode: 400,
      }),
    );

    const response = await request(createApp())
      .put("/api/settings/weights")
      .send({ urgency: 0.1 });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        message: "Priority weights must add up to 1",
      },
    });
  });

  it("returns a validation error for malformed JSON", async () => {
    const response = await request(createApp())
      .put("/api/settings/weights")
      .set("Content-Type", "application/json")
      .send('{"urgency":');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request body must contain valid JSON",
      },
    });
  });
});
