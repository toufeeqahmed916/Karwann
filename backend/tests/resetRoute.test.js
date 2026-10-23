import request from "supertest";
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/services/resetService.js", () => ({ resetDemo: vi.fn() }));

import { createApp } from "../src/app.js";
import { resetDemo } from "../src/services/resetService.js";

describe("demo reset endpoint", () => {
  it("resets the demo", async () => {
    resetDemo.mockResolvedValue({ ok: true });
    const response = await request(createApp()).post("/api/seed/reset").send({});
    expect(response.status).toBe(200);
    expect(resetDemo).toHaveBeenCalledWith({});
    expect(response.body).toEqual({ data: { ok: true } });
  });
});
