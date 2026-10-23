import { AppError } from "../errors/AppError.js";
import { resetDemoData } from "../repositories/resetRepository.js";
import { clearPendingAllocationPlan } from "./allocationService.js";
import { stopAllDeliverySimulators } from "./deliveryService.js";

function validateEmptyBody(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AppError({ code: "VALIDATION_ERROR", message: "Request body must be an empty JSON object", statusCode: 400 });
  }
  if (Object.keys(input).length > 0) {
    throw new AppError({ code: "VALIDATION_ERROR", message: "Demo reset body must be empty", statusCode: 400 });
  }
}

export async function resetDemo(input = {}) {
  validateEmptyBody(input);
  stopAllDeliverySimulators();
  await resetDemoData();
  clearPendingAllocationPlan();
  return { ok: true };
}
