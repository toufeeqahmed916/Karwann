import { AppError } from "../errors/AppError.js";
import {
  createRequestWithItems,
  findTrackingByRequestId,
  updateRequestById,
} from "../repositories/requestRepository.js";
import { findRequestsForScoring } from "../repositories/scoringRepository.js";
import { findAuthenticityReviewsByRequestIds } from "../repositories/authenticityReviewRepository.js";
import {
  findTimeOffsetHours,
  findWeights,
} from "../repositories/settingsRepository.js";
import { scoreAndSortRequests } from "./scoringService.js";
import { analyseAndSaveAuthenticity } from "./authenticityReviewService.js";
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
  const requests = scoreAndSortRequests(rows, weights, { timeOffsetHours });
  let reviews = [];
  try {
    reviews = await findAuthenticityReviewsByRequestIds(requests.map((request) => request.id));
  } catch (error) {
    console.warn("Authenticity reviews unavailable; run backend/sql/request_authenticity_review.sql", error.message);
  }
  const reviewByRequestId = new Map(reviews.map((review) => [review.request_id, review]));
  const areaByRequestId = new Map(requests.map((request) => [request.id, request.area]));

  return requests.map((request) => {
    const review = reviewByRequestId.get(request.id);
    const matchedRequestIds = review?.matched_request_ids ?? [];
    const reasons = (review?.credibility_reasons ?? []).map((reason) =>
      matchedRequestIds.reduce(
        (text, matchedId) => text.replaceAll(matchedId, areaByRequestId.get(matchedId) ?? "another area"),
        reason,
      ));
    return {
      ...request,
      authenticity: review ? {
        score: review.credibility_score ?? 0,
        band: review.credibility_band ?? "low",
        flags: review.credibility_flags ?? [],
        reasons,
        matchedAreas: matchedRequestIds.map((id) => areaByRequestId.get(id)).filter(Boolean),
        verificationStatus: review.verification_status ?? "ok",
      } : null,
    };
  });
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

export async function createRequest(input, context = {}) {
  const validInput = validateCreateRequest(input);
  const id = await createRequestWithItems(validInput);
  try {
    await analyseAndSaveAuthenticity(id, validInput, context);
  } catch (error) {
    // Authenticity review is advisory and must never block an emergency request.
    console.error(`Authenticity review failed for ${id}`, error);
  }
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
