import { AppError } from "../errors/AppError.js";
import {
  createRequestWithItems,
  findTrackingByRequestId,
  updateRequestById,
} from "../repositories/requestRepository.js";
import { findRequestsForScoring } from "../repositories/scoringRepository.js";
import {
  findTimeOffsetHours,
  findWeights,
} from "../repositories/settingsRepository.js";
import { scoreAndSortRequests } from "./scoringService.js";
import {
  validateCreateRequest,
  validateRequestFilters,
  validateUpdateRequest,
} from "../validators/requestValidator.js";

function notFound(id) {
  return new AppError({
    code: "NOT_FOUND",
    message: `Request not found: ${id}`,
    statusCode: 404,
  });
}

async function getScoredRequests() {
  const [rows, weights, timeOffsetHours] = await Promise.all([
    findRequestsForScoring(),
    findWeights(),
    findTimeOffsetHours(),
  ]);
  return scoreAndSortRequests(rows, weights, { timeOffsetHours });
}

function mapTracking(row) {
  const vehicle = Array.isArray(row.vehicles) ? row.vehicles[0] : row.vehicles;
  const progressPct = row.progress_pct ?? 0;
  const etaMin =
    row.eta_min == null
      ? null
      : row.status === "in_transit"
        ? Math.max(0, Math.round(row.eta_min * (1 - progressPct / 100)))
        : row.eta_min;

  return {
    allocationId: row.id,
    item: row.item,
    status: row.status,
    progressPct,
    etaMin,
    lat: vehicle?.current_lat ?? null,
    lng: vehicle?.current_lng ?? null,
  };
}

export async function listRequests(query = {}) {
  const filters = validateRequestFilters(query);
  const requests = await getScoredRequests();

  return requests.filter(
    (request) =>
      (!filters.status || request.status === filters.status) &&
      (!filters.urgency || request.urgency === filters.urgency) &&
      (!filters.item || request.items.some((entry) => entry.item === filters.item)),
  );
}

export async function createRequest(input) {
  const validInput = validateCreateRequest(input);
  const id = await createRequestWithItems(validInput);
  const requests = await getScoredRequests();
  return requests.find((request) => request.id === id);
}

export async function updateRequest(id, input) {
  const changes = validateUpdateRequest(input);
  const updated = await updateRequestById(id, changes);
  if (!updated) {
    throw notFound(id);
  }

  const requests = await getScoredRequests();
  return requests.find((request) => request.id === id);
}

export async function getRequestById(id) {
  const requests = await getScoredRequests();
  const request = requests.find((entry) => entry.id === id);
  if (!request) {
    throw notFound(id);
  }

  const trackingRows = await findTrackingByRequestId(id);
  return {
    ...request,
    tracking: trackingRows.map(mapTracking),
  };
}
