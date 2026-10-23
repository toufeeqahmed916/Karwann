import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";

describe("application foundation", () => {
  it("reports that the HTTP process is live", async () => {
    const response = await request(createApp()).get("/health/live");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        status: "ok",
        service: "karwan-backend",
      },
    });
    expect(response.headers["x-request-id"]).toBeTruthy();
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("DENY");
  });

  it("preserves a safe caller request id for service-to-service tracing", async () => {
    const response = await request(createApp())
      .get("/health/live")
      .set("X-Request-Id", "ai-chat-req_01");

    expect(response.headers["x-request-id"]).toBe("ai-chat-req_01");
  });

  it("returns the agreed error envelope for unknown routes", async () => {
    const response = await request(createApp()).get("/api/not-a-route");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Route not found: GET /api/not-a-route",
      },
      requestId: response.headers["x-request-id"],
    });
  });
});
