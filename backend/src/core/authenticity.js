const EARTH_RADIUS_KM = 6371;
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;
const DUPLICATE_DISTANCE_KM = 2;

export function normalizeComplaintText(value = "") {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bigrams(value) {
  const normalized = normalizeComplaintText(value);
  if (normalized.length < 2) return normalized ? [normalized] : [];
  return Array.from({ length: normalized.length - 1 }, (_, index) => normalized.slice(index, index + 2));
}

export function complaintSimilarity(left, right) {
  const leftText = normalizeComplaintText(left);
  const rightText = normalizeComplaintText(right);
  if (!leftText || !rightText) return 0;
  if (leftText === rightText) return 1;

  const leftPairs = bigrams(leftText);
  const remaining = new Map();
  bigrams(rightText).forEach((pair) => remaining.set(pair, (remaining.get(pair) ?? 0) + 1));

  let overlap = 0;
  leftPairs.forEach((pair) => {
    const count = remaining.get(pair) ?? 0;
    if (count > 0) {
      overlap += 1;
      remaining.set(pair, count - 1);
    }
  });

  return (2 * overlap) / (leftPairs.length + bigrams(rightText).length);
}

export function distanceKm(from, to) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const dLat = radians(to.lat - from.lat);
  const dLng = radians(to.lng - from.lng);
  const lat1 = radians(from.lat);
  const lat2 = radians(to.lat);
  const value = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function bandFor(score) {
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

export function reviewAuthenticity(current, candidates, now = new Date()) {
  const flags = new Set();
  const reasons = [];
  const matches = new Set();
  let score = 0;

  const recent = candidates.filter((candidate) => {
    const age = now.getTime() - new Date(candidate.createdAt).getTime();
    return age >= 0 && age <= DUPLICATE_WINDOW_MS;
  });

  const currentArea = normalizeComplaintText(current.area);
  const nearby = recent.filter((candidate) => {
    const distance = distanceKm(current, candidate);
    const sameArea = currentArea && normalizeComplaintText(candidate.area) === currentArea;
    return distance <= 0.5 || (sameArea && distance <= DUPLICATE_DISTANCE_KM);
  });
  if (nearby.length) {
    score += 35;
    flags.add("nearby_duplicate");
    reasons.push(`${nearby.length} similar location request${nearby.length === 1 ? "" : "s"} submitted within 24 hours`);
    nearby.forEach((candidate) => matches.add(candidate.id));
  }

  const textMatches = recent
    .map((candidate) => ({ candidate, similarity: complaintSimilarity(current.complaintText, candidate.complaintText) }))
    .filter(({ similarity }) => similarity >= 0.72)
    .sort((left, right) => right.similarity - left.similarity);
  if (textMatches.length) {
    const best = textMatches[0];
    const percentage = Math.round(best.similarity * 100);
    score += best.similarity >= 0.9 ? 40 : 25;
    flags.add(best.similarity >= 0.9 ? "copied_text" : "similar_text");
    reasons.push(`Complaint text is ${percentage}% similar to a request from ${best.candidate.area}`);
    textMatches.forEach(({ candidate }) => matches.add(candidate.id));
  }

  const sameIp = recent.filter((candidate) => current.ipHash && candidate.ipHash === current.ipHash);

  if (sameIp.length >= 4) {
    score += 30;
    flags.add("repeated_network");
    reasons.push(`The same network submitted ${sameIp.length + 1} requests within 24 hours`);
    sameIp.forEach((candidate) => matches.add(candidate.id));
  }

  score = Math.min(100, score);
  return {
    score,
    band: bandFor(score),
    flags: [...flags],
    reasons,
    matchedRequestIds: [...matches],
    verificationStatus: score >= 30 ? "needs_review" : "ok",
  };
}

