import { beforeEach, describe, expect, it, vi } from "vitest";

const { deleteMetadata, from, not, rpc } = vi.hoisted(() => {
  const not = vi.fn();
  const deleteMetadata = vi.fn(() => ({ not }));
  const from = vi.fn(() => ({ delete: deleteMetadata }));
  const rpc = vi.fn();
  return { deleteMetadata, from, not, rpc };
});

vi.mock("../src/config/supabase.js", () => ({
  supabaseAdmin: { from, rpc },
}));

import { resetDemoData } from "../src/repositories/resetRepository.js";

describe("reset repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockResolvedValue({ data: null, error: null });
    not.mockResolvedValue({ data: null, error: null });
  });

  it("clears AI metadata after the operational reset succeeds", async () => {
    await resetDemoData();

    expect(rpc).toHaveBeenCalledWith("reset_demo");
    expect(from).toHaveBeenCalledWith("request_ai_metadata");
    expect(deleteMetadata).toHaveBeenCalledOnce();
    expect(not).toHaveBeenCalledWith("request_id", "is", null);
    expect(rpc.mock.invocationCallOrder[0]).toBeLessThan(from.mock.invocationCallOrder[0]);
  });

  it("does not clear metadata when the operational reset fails", async () => {
    rpc.mockResolvedValue({ data: null, error: new Error("reset failed") });

    await expect(resetDemoData()).rejects.toMatchObject({ code: "DATABASE_ERROR" });
    expect(from).not.toHaveBeenCalled();
  });

  it("reports a metadata cleanup failure", async () => {
    not.mockResolvedValue({ data: null, error: new Error("cleanup failed") });

    await expect(resetDemoData()).rejects.toMatchObject({ code: "DATABASE_ERROR" });
  });
});
