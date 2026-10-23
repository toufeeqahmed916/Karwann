import { calculatePriorityScore } from "../core/score.js";

function calculateHoursWaiting(createdAt, now, timeOffsetHours) {
  const createdTime = new Date(createdAt).getTime();
  const elapsedHours = (now.getTime() - createdTime) / 3_600_000;
  return Math.max(0, Math.floor(elapsedHours + timeOffsetHours));
}

function mapRequestItem(row) {
  return {
    item: row.item,
    qtyNeeded: row.qty_needed,
    qtyAllocated: row.qty_allocated,
  };
}

function fulfilmentPercentage(items) {
  const needed = items.reduce((total, item) => total + item.qtyNeeded, 0);
  const allocated = items.reduce((total, item) => total + item.qtyAllocated, 0);
  return needed > 0 ? Math.round((allocated / needed) * 100) : 0;
}

export function scoreAndSortRequests(
  rows,
  weights,
  { now = new Date(), timeOffsetHours = 0 } = {},
) {
  const maxPopulation = rows.reduce(
    (maximum, row) => Math.max(maximum, row.population),
    0,
  );

  return rows
    .map((row) => {
      const hoursWaiting = calculateHoursWaiting(
        row.created_at,
        now,
        timeOffsetHours,
      );
      const items = (row.request_items ?? [])
        .map(mapRequestItem)
        .sort((left, right) => left.item.localeCompare(right.item));
      const score = calculatePriorityScore(row, {
        maxPopulation,
        hoursWaiting,
        weights,
      });

      return {
        id: row.id,
        area: row.area,
        lat: row.lat,
        lng: row.lng,
        population: row.population,
        urgency: row.urgency,
        vulnerable: row.vulnerable,
        accessibility: row.accessibility,
        status: row.status,
        hoursWaiting,
        createdAt: row.created_at,
        items,
        fulfilmentPct: fulfilmentPercentage(items),
        score,
      };
    })
    .sort(
      (left, right) =>
        right.score.total - left.score.total ||
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime() ||
        left.id.localeCompare(right.id),
    );
}
