import { randomUUID } from "node:crypto";

const ITEMS = Object.freeze(["water", "food", "medicine", "shelter"]);

function radians(degrees) {
  return (degrees * Math.PI) / 180;
}

export function haversineKm(from, to) {
  const dLat = radians(to.lat - from.lat);
  const dLng = radians(to.lng - from.lng);
  const lat1 = radians(from.lat);
  const lat2 = radians(to.lat);
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function insideBlock(request, blocks) {
  return blocks.some(
    (block) => block.active !== false && haversineKm(block, request) <= block.radiusKm,
  );
}

function weightedTargets(entries, available) {
  const targets = new Map(entries.map((entry) => [entry.request.id, 0]));
  let remaining = Math.min(
    available,
    entries.reduce((sum, entry) => sum + entry.need, 0),
  );
  let open = entries.map((entry) => ({ ...entry }));

  while (remaining > 0 && open.length > 0) {
    const totalWeight = open.reduce(
      (sum, entry) => sum + Math.max(1, entry.request.score.total) * entry.need,
      0,
    );
    const shares = open.map((entry) => {
      const current = targets.get(entry.request.id);
      const room = entry.need - current;
      const raw =
        totalWeight > 0
          ? (remaining * Math.max(1, entry.request.score.total) * entry.need) /
            totalWeight
          : remaining / open.length;
      return { entry, room, raw, amount: Math.min(room, Math.floor(raw)) };
    });

    let distributed = shares.reduce((sum, share) => sum + share.amount, 0);
    if (distributed === 0) {
      shares
        .sort(
          (left, right) =>
            right.raw - Math.floor(right.raw) - (left.raw - Math.floor(left.raw)) ||
            right.entry.request.score.total - left.entry.request.score.total,
        )
        .slice(0, remaining)
        .forEach((share) => {
          if (share.room > 0) {
            share.amount = 1;
            distributed += 1;
          }
        });
    }

    for (const share of shares) {
      targets.set(
        share.entry.request.id,
        targets.get(share.entry.request.id) + share.amount,
      );
    }
    remaining -= distributed;
    open = open.filter(
      (entry) => targets.get(entry.request.id) < entry.need,
    );
    if (distributed === 0) break;
  }

  return targets;
}

function firstComeTargets(entries, available) {
  const targets = new Map();
  let remaining = available;
  for (const entry of [...entries].sort(
    (left, right) =>
      new Date(left.request.createdAt) - new Date(right.request.createdAt),
  )) {
    const qty = Math.min(entry.need, remaining);
    targets.set(entry.request.id, qty);
    remaining -= qty;
  }
  return targets;
}

function summary(rows, requests) {
  const needByKey = new Map();
  const allocatedByKey = new Map();
  for (const row of rows) {
    const key = `${row.requestId}:${row.item}`;
    needByKey.set(key, Math.max(needByKey.get(key) ?? 0, row.qtyNeeded));
    allocatedByKey.set(key, (allocatedByKey.get(key) ?? 0) + row.qty);
  }

  const criticalIds = new Set(
    requests
      .filter((request) => request.urgency === "critical")
      .map((request) => request.id),
  );
  let totalNeeded = 0;
  let totalAllocated = 0;
  let criticalNeeded = 0;
  let criticalAllocated = 0;
  for (const [key, needed] of needByKey) {
    const allocated = Math.min(needed, allocatedByKey.get(key) ?? 0);
    totalNeeded += needed;
    totalAllocated += allocated;
    if (criticalIds.has(key.split(":")[0])) {
      criticalNeeded += needed;
      criticalAllocated += allocated;
    }
  }

  return {
    overallFulfilmentPct: totalNeeded
      ? Math.round((totalAllocated / totalNeeded) * 100)
      : 0,
    criticalFulfilmentPct: criticalNeeded
      ? Math.round((criticalAllocated / criticalNeeded) * 100)
      : 0,
    totalAllocated,
    totalNeeded,
  };
}

function makeReason({ item, qty, need, depot, distanceKm, limited, blocked, trips }) {
  const label = item[0].toUpperCase() + item.slice(1);
  const pct = need ? Math.round((qty / need) * 100) : 0;
  const limits = [];
  if (limited === "capacity") limits.push("Depot daily capacity was reached.");
  if (limited === "stock") limits.push("Stock is short, so supply was shared by priority score.");
  if (blocked) limits.push("A blocked zone added a distance penalty.");
  if (trips > 1) limits.push(`${trips} vehicle trips are required.`);
  if (limits.length === 0) limits.push("The nearest available depot can meet this share.");
  return `${label}: ${qty} of ${need} (${pct}%). ${depot.name} is nearest (${Math.round(distanceKm)} km). ${limits.join(" ")}`;
}

export function buildAllocationRows(
  { requests, depots, blocks = [] },
  { strategy = "priority", idFactory = () => `alc_${randomUUID()}` } = {},
) {
  const workingDepots = structuredClone(depots).map((depot) => ({
    ...depot,
    remainingCapacity: depot.dailyCapacity,
  }));
  const rows = [];

  for (const item of ITEMS) {
    const entries = requests
      .map((request) => {
        const requested = request.items.find((entry) => entry.item === item);
        return {
          request,
          need: requested
            ? Math.max(0, requested.qtyNeeded - requested.qtyAllocated)
            : 0,
        };
      })
      .filter((entry) => entry.need > 0);
    if (entries.length === 0) continue;

    const available = workingDepots.reduce(
      (total, depot) =>
        total + (depot.stock.find((entry) => entry.item === item)?.qty ?? 0),
      0,
    );
    const targets =
      strategy === "baseline"
        ? firstComeTargets(entries, available)
        : weightedTargets(entries, available);

    for (const { request, need } of entries) {
      let remaining = targets.get(request.id) ?? 0;
      let allocated = 0;
      const blocked = insideBlock(request, blocks);
      const candidates = workingDepots
        .map((depot) => ({
          depot,
          stock: depot.stock.find((entry) => entry.item === item),
          vehicle: depot.vehicles.find((vehicle) => vehicle.status === "available"),
          distanceKm: haversineKm(depot, request) * (blocked ? 1.5 : 1),
        }))
        .filter(
          (candidate) =>
            candidate.stock?.qty > 0 &&
            candidate.depot.remainingCapacity > 0 &&
            candidate.vehicle,
        )
        .sort((left, right) => left.distanceKm - right.distanceKm);

      for (const candidate of candidates) {
        if (remaining <= 0) break;
        const qty = Math.min(
          remaining,
          candidate.stock.qty,
          candidate.depot.remainingCapacity,
        );
        if (qty <= 0) continue;
        candidate.stock.qty -= qty;
        candidate.depot.remainingCapacity -= qty;
        remaining -= qty;
        allocated += qty;
        const trips = Math.ceil(qty / candidate.vehicle.capacity);
        const limited =
          allocated < need
            ? candidate.depot.remainingCapacity === 0
              ? "capacity"
              : "stock"
            : null;
        rows.push({
          id: idFactory(),
          requestId: request.id,
          area: request.area,
          depotId: candidate.depot.id,
          depotName: candidate.depot.name,
          vehicleId: candidate.vehicle.id,
          item,
          qty,
          qtyNeeded: need,
          unfulfilled: Math.max(0, need - allocated),
          fulfilmentPct: Math.round((allocated / need) * 100),
          distanceKm: Number(candidate.distanceKm.toFixed(1)),
          etaMin: Math.round((candidate.distanceKm / 45) * 60 + 20),
          status: "recommended",
          reason: makeReason({
            item,
            qty: allocated,
            need,
            depot: candidate.depot,
            distanceKm: candidate.distanceKm,
            limited,
            blocked,
            trips,
          }),
        });
      }

      if (allocated === 0) {
        rows.push({
          id: idFactory(),
          requestId: request.id,
          area: request.area,
          depotId: null,
          depotName: "No depot available",
          vehicleId: null,
          item,
          qty: 0,
          qtyNeeded: need,
          unfulfilled: need,
          fulfilmentPct: 0,
          distanceKm: null,
          etaMin: null,
          status: "recommended",
          reason: `No usable ${item} stock, depot capacity, or available vehicle.`,
        });
      }
    }
  }

  return { rows, summary: summary(rows, requests) };
}

export function buildAllocationPlan(context, options = {}) {
  const optimized = buildAllocationRows(context, options);
  const baseline = buildAllocationRows(context, {
    ...options,
    strategy: "baseline",
  });
  return {
    ...optimized,
    baseline: {
      overallFulfilmentPct: baseline.summary.overallFulfilmentPct,
      criticalFulfilmentPct: baseline.summary.criticalFulfilmentPct,
    },
  };
}
