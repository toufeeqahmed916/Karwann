import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/allocationService.js", () => ({
  approveAllocation: vi.fn(),
  generateAllocation: vi.fn(),
  getAllocation: vi.fn(),
}));

import { createApp } from "../src/app.js";
import {
  approveAllocation,
  generateAllocation,
  getAllocation,
} from "../src/services/allocationService.js";

describe("allocation endpoints", () => {
  beforeEach(() => vi.clearAllMocks());

  it("generates an allocation plan", async () => {
    generateAllocation.mockResolvedValue({ rows: [], summary: {}, baseline: {} });
    const response = await request(createApp()).post("/api/allocation/generate").send({});
    expect(response.status).toBe(200);
    expect(generateAllocation).toHaveBeenCalledWith({});
  });

  it("approves an allocation plan", async () => {
    approveAllocation.mockResolvedValue({ approved: 2, requests: [], depots: [] });
    const response = await request(createApp())
      .post("/api/allocation/approve")
      .send({ all: true });
    expect(response.status).toBe(200);
    expect(response.body.data.approved).toBe(2);
  });

  it("approves a single request allocation", async () => {
    approveAllocation.mockResolvedValue({ approved: 3, approvedRequests: 1, requests: [], depots: [] });
    const response = await request(createApp())
      .post("/api/allocation/approve")
      .send({ requestId: "req_01" });
    expect(response.status).toBe(200);
    expect(approveAllocation).toHaveBeenCalledWith({ requestId: "req_01" });
    expect(response.body.data.approvedRequests).toBe(1);
  });

  it("returns saved allocation rows", async () => {
    getAllocation.mockResolvedValue([{ id: "alc_01" }]);
    const response = await request(createApp()).get("/api/allocation");
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([{ id: "alc_01" }]);
  });
});
