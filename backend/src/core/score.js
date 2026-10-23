const FACTOR_ORDER = [
  "urgency",
  "population",
  "vulnerability",
  "waiting",
  "accessibility",
];

const URGENCY_SCALE = Object.freeze({
  low: 0,
  medium: 1 / 3,
  high: 2 / 3,
  critical: 1,
});

const ACCESSIBILITY_SCALE = Object.freeze({
  easy: 0,
  medium: 0.5,
  hard: 1,
});

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function roundPartsToTotal(rawParts) {
  const total = Math.round(
    FACTOR_ORDER.reduce((sum, factor) => sum + rawParts[factor], 0),
  );
  const parts = Object.fromEntries(
    FACTOR_ORDER.map((factor) => [factor, Math.floor(rawParts[factor])]),
  );
  let remaining = total - Object.values(parts).reduce((sum, value) => sum + value, 0);

  const factorsByRemainder = [...FACTOR_ORDER].sort((left, right) => {
    const rightRemainder = rawParts[right] - Math.floor(rawParts[right]);
    const leftRemainder = rawParts[left] - Math.floor(rawParts[left]);
    return rightRemainder - leftRemainder;
  });

  for (let index = 0; index < remaining; index += 1) {
    parts[factorsByRemainder[index]] += 1;
  }

  return { total, parts };
}

export function calculatePriorityScore(request, context) {
  const { maxPopulation, hoursWaiting, weights } = context;
  const normalized = {
    urgency: URGENCY_SCALE[request.urgency] ?? 0,
    population:
      maxPopulation > 0 ? clamp(request.population / maxPopulation, 0, 1) : 0,
    vulnerability: request.vulnerable ? 1 : 0,
    waiting: clamp(hoursWaiting / 48, 0, 1),
    accessibility: ACCESSIBILITY_SCALE[request.accessibility] ?? 0,
  };

  const rawParts = Object.fromEntries(
    FACTOR_ORDER.map((factor) => [
      factor,
      normalized[factor] * weights[factor] * 100,
    ]),
  );

  return roundPartsToTotal(rawParts);
}

export const scoreScales = Object.freeze({
  urgency: URGENCY_SCALE,
  accessibility: ACCESSIBILITY_SCALE,
});
