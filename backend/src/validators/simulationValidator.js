import { AppError } from "../errors/AppError.js";

const ADVANCE_TIME_FIELDS = new Set(["hours"]);

function invalid(message) {
  throw new AppError({
    code: "VALIDATION_ERROR",
    message,
    statusCode: 400,
  });
}

export function validateAdvanceTime(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    invalid("Request body must be a JSON object");
  }

  const unknown = Object.keys(input).filter(
    (key) => !ADVANCE_TIME_FIELDS.has(key),
  );
  if (unknown.length > 0) {
    invalid(`Unknown field: ${unknown[0]}`);
  }

  if (!Number.isInteger(input.hours) || input.hours <= 0) {
    invalid("hours must be a positive integer");
  }

  return { hours: input.hours };
}
