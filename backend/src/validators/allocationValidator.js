import { AppError } from "../errors/AppError.js";

function invalid(message) {
  throw new AppError({
    code: "VALIDATION_ERROR",
    message,
    statusCode: 400,
  });
}

export function validateGenerateAllocation(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    invalid("Request body must be a JSON object");
  }
  if (Object.keys(input).length > 0) {
    invalid("Allocation generation body must be empty");
  }
}

export function validateApproveAllocation(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    invalid("Request body must be a JSON object");
  }
  const unknown = Object.keys(input).filter(
    (key) => !["all", "rowIds", "requestId"].includes(key),
  );
  if (unknown.length > 0) invalid(`Unknown field: ${unknown[0]}`);

  if (input.all === true && input.rowIds === undefined) {
    return { all: true };
  }
  if (
    input.all === undefined && input.requestId === undefined &&
    Array.isArray(input.rowIds) &&
    input.rowIds.length > 0 &&
    input.rowIds.every((id) => typeof id === "string" && id.trim())
  ) {
    const rowIds = [...new Set(input.rowIds.map((id) => id.trim()))];
    return { all: false, rowIds };
  }
  if (
    input.all === undefined && input.rowIds === undefined &&
    typeof input.requestId === "string" && input.requestId.trim()
  ) {
    return { all: false, requestId: input.requestId.trim() };
  }
  invalid('Provide either { "all": true }, one requestId, or a non-empty rowIds array');
}
