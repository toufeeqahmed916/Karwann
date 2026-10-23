import { describe, expect, it, vi } from "vitest";

vi.mock("../src/repositories/resetRepository.js", () => ({ resetDemoData: vi.fn() }));
vi.mock("../src/services/allocationService.js", () => ({ clearPendingAllocationPlan: vi.fn() }));
vi.mock("../src/services/deliveryService.js", () => ({ stopAllDeliverySimulators: vi.fn() }));

import { resetDemoData } from "../src/repositories/resetRepository.js";
import { clearPendingAllocationPlan } from "../src/services/allocationService.js";
import { stopAllDeliverySimulators } from "../src/services/deliveryService.js";
import { resetDemo } from "../src/services/resetService.js";

describe("demo reset service", () => {
  it("stops runtime state and calls the agreed reset function", async () => {
    await expect(resetDemo({})).resolves.toEqual({ ok: true });
    expect(stopAllDeliverySimulators).toHaveBeenCalledOnce();
    expect(resetDemoData).toHaveBeenCalledOnce();
    expect(clearPendingAllocationPlan).toHaveBeenCalledOnce();
  });

  it("rejects non-empty reset input", async () => {
    await expect(resetDemo({ confirm: true })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });
});
