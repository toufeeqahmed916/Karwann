import { findRequestsForScoring } from "../repositories/scoringRepository.js";
import {
  findTimeOffsetHours,
  findWeights,
  saveTimeOffsetHours,
} from "../repositories/settingsRepository.js";
import { validateAdvanceTime } from "../validators/simulationValidator.js";
import { scoreAndSortRequests } from "./scoringService.js";

export async function advanceTime(input) {
  const { hours } = validateAdvanceTime(input);
  const [rows, weights, currentOffset] = await Promise.all([
    findRequestsForScoring(),
    findWeights(),
    findTimeOffsetHours(),
  ]);
  const timeOffsetHours = await saveTimeOffsetHours(currentOffset + hours);

  return scoreAndSortRequests(rows, weights, { timeOffsetHours });
}
