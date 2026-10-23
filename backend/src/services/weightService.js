import { AppError } from "../errors/AppError.js";
import {
  findRequestsForScoring,
} from "../repositories/scoringRepository.js";
import {
  findTimeOffsetHours,
  findWeights,
  saveWeights,
} from "../repositories/settingsRepository.js";
import { scoreAndSortRequests } from "./scoringService.js";

export const WEIGHT_KEYS = Object.freeze([
  "urgency",
  "population",
  "vulnerability",
  "waiting",
  "accessibility",
]);

const SUM_TOLERANCE = 0.01;

function validationError(message, details) {
  return new AppError({
    code: "VALIDATION_ERROR",
    message,
    statusCode: 400,
    details,
  });
}

export function validateAndNormalizeWeights(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw validationError("Priority weights must be a JSON object");
  }

  const providedKeys = Object.keys(input);
  const missingKeys = WEIGHT_KEYS.filter((key) => !(key in input));
  const unknownKeys = providedKeys.filter((key) => !WEIGHT_KEYS.includes(key));

  if (missingKeys.length > 0 || unknownKeys.length > 0) {
    throw validationError("Provide exactly the five priority weights", {
      missing: missingKeys,
      unknown: unknownKeys,
    });
  }

  const values = Object.fromEntries(
    WEIGHT_KEYS.map((key) => [key, Number(input[key])]),
  );

  for (const [key, value] of Object.entries(values)) {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw validationError(`${key} weight must be a number from 0 to 1`);
    }
  }

  const sum = Object.values(values).reduce((total, value) => total + value, 0);

  if (sum <= 0 || Math.abs(sum - 1) > SUM_TOLERANCE) {
    throw validationError("Priority weights must add up to 1");
  }

  const normalized = Object.fromEntries(
    WEIGHT_KEYS.map((key) => [key, Number((values[key] / sum).toFixed(8))]),
  );
  const normalizedSum = Object.values(normalized).reduce(
    (total, value) => total + value,
    0,
  );
  normalized.accessibility = Number(
    (normalized.accessibility + (1 - normalizedSum)).toFixed(8),
  );

  return normalized;
}

export async function getWeights() {
  return findWeights();
}

export async function updateWeights(input) {
  const weights = validateAndNormalizeWeights(input);
  const [requestRows, timeOffsetHours] = await Promise.all([
    findRequestsForScoring(),
    findTimeOffsetHours(),
  ]);
  const savedWeights = await saveWeights(weights);
  const requests = scoreAndSortRequests(requestRows, savedWeights, {
    timeOffsetHours,
  });

  return { weights: savedWeights, requests };
}
