import { findDashboardData } from "../repositories/dashboardRepository.js";

const ITEM_ORDER = Object.freeze(["water", "food", "medicine", "shelter"]);

function sumByItem(rows, quantity) {
  const totals = Object.fromEntries(ITEM_ORDER.map((item) => [item, 0]));
  for (const row of rows) {
    totals[row.item] = (totals[row.item] ?? 0) + quantity(row);
  }
  return totals;
}

export function buildDashboard({ requests, inventory, depots, allocations }) {
  const activeRequests = requests.filter((request) => request.status !== "delivered");
  const remainingNeeds = activeRequests.flatMap((request) =>
    (request.request_items ?? []).map((item) => ({
      item: item.item,
      qty: Math.max(0, item.qty_needed - item.qty_allocated),
    })),
  );
  const neededByItem = sumByItem(remainingNeeds, (entry) => entry.qty);
  const availableByItem = sumByItem(inventory, (entry) => entry.qty);
  const depotNames = new Map(depots.map((depot) => [depot.id, depot.name]));

  return {
    activeRequests: activeRequests.length,
    peopleAwaiting: activeRequests.reduce(
      (total, request) => total + request.population,
      0,
    ),
    deliveriesInProgress: allocations.filter(
      (allocation) => allocation.status === "in_transit",
    ).length,
    completedDeliveries: allocations.filter(
      (allocation) => allocation.status === "delivered",
    ).length,
    criticalShortages: ITEM_ORDER.map((item) => ({
      item,
      needed: neededByItem[item],
      available: availableByItem[item],
      gap: Math.max(0, neededByItem[item] - availableByItem[item]),
    })).filter((entry) => entry.gap > 0),
    inventoryTotals: ITEM_ORDER.map((item) => ({
      item,
      qty: availableByItem[item],
    })),
    lowStockAlerts: inventory
      .filter((entry) => entry.is_low)
      .map((entry) => ({
        depotId: entry.depot_id,
        depotName: depotNames.get(entry.depot_id) ?? entry.depot_id,
        item: entry.item,
        qty: entry.qty,
        lowThreshold: entry.low_threshold,
      }))
      .sort(
        (left, right) =>
          left.depotName.localeCompare(right.depotName) ||
          left.item.localeCompare(right.item),
      ),
  };
}

export async function getDashboard() {
  return buildDashboard(await findDashboardData());
}
