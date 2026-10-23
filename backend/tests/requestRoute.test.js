import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/requestService.js", () => ({
  createRequest: vi.fn(),
  getRequestById: vi.fn(),
  listRequests: vi.fn(),
  updateRequest: vi.fn(),
}));

import { createApp } from "../src/app.js";
import {
  createRequest,
  getRequestById,
  listRequests,
  updateRequest,
} from "../src/services/requestService.js";

const requestRecord = {
  id: "req_01",
  area: "Dadu",
  score: { total: 87, parts: {} },
};

describe("request endpoints", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists requests with query filters", async () => {
    listRequests.mockResolvedValue([requestRecord]);

    const response = await request(createApp()).get(
      "/api/requests?status=pending&item=water&urgency=critical",
    );

    expect(response.status).toBe(200);
    expect(listRequests).toHaveBeenCalledWith({
      status: "pending",
      item: "water",
      urgency: "critical",
    });
    expect(response.body).toEqual({ data: [requestRecord] });
  });

  it("creates a request with HTTP 201", async () => {
    createRequest.mockResolvedValue(requestRecord);
    const body = {
      area: "Dadu",
      lat: 26.73,
      lng: 67.78,
      population: 4200,
      urgency: "critical",
      vulnerable: true,
      accessibility: "hard",
      items: [{ item: "water", qtyNeeded: 500 }],
    };

    const response = await request(createApp()).post("/api/requests").send(body);

    expect(response.status).toBe(201);
    expect(createRequest).toHaveBeenCalledWith(body);
    expect(response.body).toEqual({ data: requestRecord });
  });

  it("returns one request with tracking", async () => {
    getRequestById.mockResolvedValue({ ...requestRecord, tracking: [] });

    const response = await request(createApp()).get("/api/requests/req_01");

    expect(response.status).toBe(200);
    expect(getRequestById).toHaveBeenCalledWith("req_01");
    expect(response.body.data.tracking).toEqual([]);
  });

  it("updates a request", async () => {
    updateRequest.mockResolvedValue({ ...requestRecord, population: 6000 });

    const response = await request(createApp())
      .patch("/api/requests/req_01")
      .send({ population: 6000 });

    expect(response.status).toBe(200);
    expect(updateRequest).toHaveBeenCalledWith("req_01", { population: 6000 });
    expect(response.body.data.population).toBe(6000);
  });
});
