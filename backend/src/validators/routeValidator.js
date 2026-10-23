import { AppError } from "../errors/AppError.js";

const FIELDS = new Set(["depotId", "requestId"]);

function invalid(message) {
  throw new AppError({ code: "VALIDATION_ERROR", message, statusCode: 400 });
}

export function validateRouteQuery(query = {}) {
  const unknown = Object.keys(query).find((key) => !FIELDS.has(key));
  if (unknown) invalid(`Unknown field: ${unknown}`);

  const depotId = typeof query.depotId === "string" ? query.depotId.trim() : "";
  const requestId = typeof query.requestId === "string" ? query.requestId.trim() : "";
  if (!depotId) invalid("depotId is required");
  if (!requestId) invalid("requestId is required");
  return { depotId, requestId };
}
