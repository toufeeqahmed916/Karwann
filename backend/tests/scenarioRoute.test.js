import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/scenarioService.js", () => ({
  applyScenario: vi.fn(),
  deleteRoadBlock: vi.fn(),
  listRoadBlocks: vi.fn(),
  recalculateScenario: vi.fn(),
  undoScenario: vi.fn(),
}));

import { createApp } from "../src/app.js";
import {
  applyScenario,
  deleteRoadBlock,
  listRoadBlocks,
  recalculateScenario,
  undoScenario,
} from "../src/services/scenarioService.js";

describe("scenario endpoints", () => {
  beforeEach(() => vi.clearAllMocks());

  it("recalculates a scenario", async () => {
    recalculateScenario.mockResolvedValue({ before: {}, after: {}, diff: {} });
    const body = { action: "add_stock", depotId: "dep_01", item: "water", qty: 100 };
    const response = await request(createApp()).post("/api/simulate/recalculate").send(body);
    expect(response.status).toBe(200);
    expect(recalculateScenario).toHaveBeenCalledWith(body);
  });

  it("applies and undoes scenarios", async () => {
    applyScenario.mockResolvedValue({ ok: true });
    undoScenario.mockResolvedValue({ ok: true });
    expect((await request(createApp()).post("/api/simulate/apply").send({})).status).toBe(200);
    expect((await request(createApp()).post("/api/simulate/undo").send({})).status).toBe(200);
  });

  it("lists and deletes road blocks", async () => {
    listRoadBlocks.mockResolvedValue([{ id: "blk_01" }]);
    deleteRoadBlock.mockResolvedValue({ ok: true });
    expect((await request(createApp()).get("/api/simulate/blocks")).body.data).toEqual([{ id: "blk_01" }]);
    expect((await request(createApp()).delete("/api/simulate/blocks/blk_01")).body.data).toEqual({ ok: true });
  });
});
