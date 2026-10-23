import { positionAlongRoute } from "../core/truckProgress.js";
import { AppError } from "../errors/AppError.js";
import {
  findDeliveryRows,
  findRequestDeliveryState,
  updateAllocationProgress,
  updateDeliveryRequestStatus,
  updateVehicleState,
  vehicleHasInTransitAllocations,
} from "../repositories/deliveryRepository.js";
import {
  validateCompleteDeliveryBody,
  validateDeliveryFilters,
  validateStartDeliveries,
} from "../validators/deliveryValidator.js";
import { getRoute } from "./routeService.js";

const TICK_MS = 1000;
const PROGRESS_PER_TICK = 4;
const ARRIVAL_PROGRESS = 96;

function one(relation) {
  return Array.isArray(relation) ? relation[0] : relation;
}

function groupRows(rows) {
  const groups = new Map();
  for (const row of rows.filter((entry) => entry.vehicle_id)) {
    const key = `${row.request_id}:${row.depot_id}:${row.vehicle_id}`;
    const group = groups.get(key) ?? {
      key,
      requestId: row.request_id,
      depotId: row.depot_id,
      vehicleId: row.vehicle_id,
      rows: [],
    };
    group.rows.push(row);
    groups.set(key, group);
  }
  return [...groups.values()];
}

function groupStatus(rows) {
  if (rows.every((row) => row.status === "delivered")) return "delivered";
  if (rows.some((row) => row.status === "in_transit")) return "in_transit";
  return "approved";
}

async function mapDelivery(group) {
  const first = group.rows[0];
  const request = one(first.requests);
  const depot = one(first.depots);
  const vehicle = one(first.vehicles);
  const route = await getRoute({
    depotId: group.depotId,
    requestId: group.requestId,
  });
  const status = groupStatus(group.rows);
  const storedProgress = Math.max(...group.rows.map((row) => row.progress_pct ?? 0));
  const startedAt = group.rows
    .map((row) => row.started_at)
    .filter(Boolean)
    .sort()[0];
  const elapsedTicks = startedAt
    ? Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / TICK_MS))
    : 0;
  const progressPct = status === "in_transit"
    ? Math.min(ARRIVAL_PROGRESS, Math.max(storedProgress, elapsedTicks * PROGRESS_PER_TICK))
    : storedProgress;
  const startPoint = route.polyline[0];
  const endPoint = route.polyline.at(-1);
  const currentPoint = status === "in_transit"
    ? positionAlongRoute(route.polyline, progressPct)
    : null;

  // Vercel functions cannot keep an in-memory interval alive after a request.
  // Persist elapsed-time progress whenever a client polls this endpoint.
  if (status === "in_transit" && progressPct > storedProgress) {
    await Promise.all([
      updateAllocationProgress(group.rows.map((row) => row.id), {
        progress_pct: progressPct,
      }),
      updateVehicleState(group.vehicleId, {
        current_lat: Number(currentPoint.lat.toFixed(6)),
        current_lng: Number(currentPoint.lng.toFixed(6)),
      }),
    ]);
  }

  return {
    allocationId: first.id,
    allocationIds: group.rows.map((row) => row.id),
    vehicleId: group.vehicleId,
    requestId: group.requestId,
    createdAt: first.created_at,
    startedAt,
    status,
    progressPct,
    lat:
      status === "in_transit"
        ? (currentPoint?.lat ?? vehicle?.current_lat ?? startPoint?.[0] ?? depot?.lat)
        : status === "delivered"
          ? (endPoint?.[0] ?? request?.lat)
          : (startPoint?.[0] ?? depot?.lat),
    lng:
      status === "in_transit"
        ? (currentPoint?.lng ?? vehicle?.current_lng ?? startPoint?.[1] ?? depot?.lng)
        : status === "delivered"
          ? (endPoint?.[1] ?? request?.lng)
          : (startPoint?.[1] ?? depot?.lng),
    area: request?.area ?? "Unknown area",
    depotId: group.depotId,
    depotName: depot?.name ?? "Unknown depot",
    items: Object.entries(
      group.rows.reduce((items, row) => {
        items[row.item] = (items[row.item] ?? 0) + row.qty;
        return items;
      }, {}),
    ).map(([item, qty]) => ({ item, qty })),
    distanceKm: route.distanceKm,
    etaMin: route.durationMin,
    route: route.polyline,
    estimated: route.estimated,
  };
}

export async function listDeliveries(query = {}) {
  const { vehicleId } = validateDeliveryFilters(query);
  const rows = await findDeliveryRows(vehicleId);
  return Promise.all(groupRows(rows).map(mapDelivery));
}

function notFound(id) {
  return new AppError({
    code: "NOT_FOUND",
    message: `Delivery not found: ${id}`,
    statusCode: 404,
  });
}

function invalidState(message) {
  return new AppError({ code: "INVALID_STATE", message, statusCode: 409 });
}

async function calculateRequestStatus(requestId) {
  const state = await findRequestDeliveryState(requestId);
  const items = state.request?.request_items ?? [];
  const needed = items.reduce((total, item) => total + item.qty_needed, 0);
  const allocated = items.reduce((total, item) => total + item.qty_allocated, 0);
  if (state.allocations.some((allocation) => allocation.status === "in_transit")) {
    return "in_transit";
  }
  if (
    needed > 0 &&
    allocated >= needed &&
    state.allocations.length > 0 &&
    state.allocations.every((allocation) => allocation.status === "delivered")
  ) {
    return "delivered";
  }
  if (allocated >= needed && needed > 0) return "allocated";
  if (allocated > 0) return "partially_allocated";
  return "pending";
}

async function finishGroup(group) {
  const ids = group.rows.map((row) => row.id);
  await updateAllocationProgress(ids, { status: "delivered", progress_pct: 100 });
  const requestStatus = await calculateRequestStatus(group.requestId);
  await updateDeliveryRequestStatus(group.requestId, requestStatus);
  if (!(await vehicleHasInTransitAllocations(group.vehicleId))) {
    const request = one(group.rows[0].requests);
    await updateVehicleState(group.vehicleId, {
      status: "available",
      current_lat: request?.lat ?? null,
      current_lng: request?.lng ?? null,
    });
  }
  return requestStatus;
}

export async function startDeliveries(input) {
  const selection = validateStartDeliveries(input);
  const groups = groupRows(await findDeliveryRows());
  const requestedIds = selection.all ? null : new Set(selection.allocationIds);
  if (requestedIds) {
    const existingIds = new Set(groups.flatMap((group) => group.rows.map((row) => row.id)));
    if ([...requestedIds].some((id) => !existingIds.has(id))) {
      throw notFound([...requestedIds].find((id) => !existingIds.has(id)));
    }
  }
  let selected = groups.filter(
    (group) =>
      groupStatus(group.rows) === "approved" &&
      (!requestedIds || group.rows.some((row) => requestedIds.has(row.id))),
  );
  if (!selection.all && selected.length === 0) {
    throw invalidState("Selected deliveries are not ready to start");
  }

  const busyVehicles = new Set(
    groups
      .filter((group) => groupStatus(group.rows) === "in_transit")
      .map((group) => group.vehicleId),
  );
  if (!selection.all && selected.some((group) => busyVehicles.has(group.vehicleId))) {
    throw invalidState("The assigned vehicle already has a delivery in transit");
  }
  selected = selected.filter((group) => !busyVehicles.has(group.vehicleId));

  const usedVehicles = new Set();
  selected = selected.filter((group) => {
    if (usedVehicles.has(group.vehicleId)) return false;
    usedVehicles.add(group.vehicleId);
    return true;
  });

  for (const group of selected) {
    const route = await getRoute({ depotId: group.depotId, requestId: group.requestId });
    const start = route.polyline[0];
    await updateAllocationProgress(
      group.rows.map((row) => row.id),
      { status: "in_transit", progress_pct: 0, started_at: new Date().toISOString() },
    );
    await updateVehicleState(group.vehicleId, {
      status: "busy",
      current_lat: start[0],
      current_lng: start[1],
    });
    await updateDeliveryRequestStatus(group.requestId, "in_transit");
  }
  return { started: selected.length };
}

export async function completeDelivery(allocationId, input = {}) {
  validateCompleteDeliveryBody(input);
  const groups = groupRows(await findDeliveryRows());
  const group = groups.find((entry) =>
    entry.rows.some((row) => row.id === allocationId),
  );
  if (!group) throw notFound(allocationId);
  if (groupStatus(group.rows) !== "in_transit") {
    throw invalidState("Start the trip before marking it delivered");
  }
  const requestStatus = await finishGroup(group);
  return { allocationId, status: "delivered", requestStatus };
}

export function stopAllDeliverySimulators() {
  // Kept for reset-service compatibility. Progress is stateless on serverless hosts.
}
