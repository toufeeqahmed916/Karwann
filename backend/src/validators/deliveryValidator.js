import { AppError } from "../errors/AppError.js";

function invalid(message) {
  throw new AppError({ code: "VALIDATION_ERROR", message, statusCode: 400 });
}

export function validateDeliveryFilters(query = {}) {
  const unknown = Object.keys(query).find((key) => key !== "vehicleId");
  if (unknown) invalid(`Unknown field: ${unknown}`);
  if (query.vehicleId === undefined) return {};
  const vehicleId = typeof query.vehicleId === "string" ? query.vehicleId.trim() : "";
  if (!vehicleId) invalid("vehicleId cannot be empty");
  return { vehicleId };
}

export function validateStartDeliveries(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    invalid("Request body must be a JSON object");
  }
  const unknown = Object.keys(input).find(
    (key) => !["all", "allocationIds"].includes(key),
  );
  if (unknown) invalid(`Unknown field: ${unknown}`);
  if (input.all === true && input.allocationIds === undefined) return { all: true };
  if (
    input.all === undefined &&
    Array.isArray(input.allocationIds) &&
    input.allocationIds.length > 0 &&
    input.allocationIds.every((id) => typeof id === "string" && id.trim())
  ) {
    return {
      all: false,
      allocationIds: [...new Set(input.allocationIds.map((id) => id.trim()))],
    };
  }
  invalid('Provide either { "all": true } or a non-empty allocationIds array');
}

export function validateCompleteDeliveryBody(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    invalid("Request body must be a JSON object");
  }
  if (Object.keys(input).length > 0) invalid("Delivery completion body must be empty");
}
