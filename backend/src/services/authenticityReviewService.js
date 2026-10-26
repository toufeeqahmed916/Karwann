import { createHmac } from "node:crypto";
import { env } from "../config/env.js";
import { reviewAuthenticity } from "../core/authenticity.js";
import {
  findRecentAuthenticityCandidates,
  saveAuthenticityReview,
} from "../repositories/authenticityReviewRepository.js";

const REVIEW_WINDOW_MS = 24 * 60 * 60 * 1000;

function sensitiveHash(namespace, value) {
  if (!value) return null;
  return createHmac("sha256", env.supabaseSecretKey)
    .update(`${namespace}:${value}`)
    .digest("hex");
}

export function buildReviewSource(input, context = {}) {
  return {
    complaintText: input.complaintText?.trim() ?? "",
    ipHash: sensitiveHash("ip", context.ip?.trim()),
  };
}

export async function analyseAndSaveAuthenticity(requestId, input, context = {}) {
  const now = new Date();
  const source = buildReviewSource(input, context);
  const candidates = (await findRecentAuthenticityCandidates(new Date(now.getTime() - REVIEW_WINDOW_MS)))
    .filter((candidate) => candidate.id !== requestId);
  const review = reviewAuthenticity({
    id: requestId,
    area: input.area,
    lat: input.lat,
    lng: input.lng,
    complaintText: source.complaintText,
    ...source,
  }, candidates, now);

  await saveAuthenticityReview(requestId, source, review);
  return review;
}

