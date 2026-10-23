import { buildAllocationPlan } from "../core/allocation.js";
import { AppError } from "../errors/AppError.js";
import {
  findActiveRoadBlocks,
  findSavedAllocations,
  insertApprovedAllocations,
  insertDispatchLogs,
  updateInventoryQuantity,
  updateRequestItemAllocation,
  updateRequestStatus,
} from "../repositories/allocationRepository.js";
import { findRequestsForScoring } from "../repositories/scoringRepository.js";
import {
  findTimeOffsetHours,
  findWeights,
} from "../repositories/settingsRepository.js";
import { listDepots } from "./inventoryService.js";
import { listRequests } from "./requestService.js";
import { scoreAndSortRequests } from "./scoringService.js";
import {
  validateApproveAllocation,
  validateGenerateAllocation,
} from "../validators/allocationValidator.js";

let pendingPlan = null;

function mapBlock(row) {
  return {
    id: row.id,
    lat: row.lat,
    lng: row.lng,
    radiusKm: row.radius_km,
    active: row.active,
  };
}

export async function getPlanningContext() {
  const [requestRows, weights, timeOffsetHours, depots, blockRows] =
    await Promise.all([
      findRequestsForScoring(),
      findWeights(),
      findTimeOffsetHours(),
      listDepots(),
      findActiveRoadBlocks(),
    ]);
  const blocks = blockRows.map(mapBlock);
  const adjustedRows = requestRows.map((row) => ({
    ...row,
    accessibility: blocks.some((block) => {
      const latKm = (row.lat - block.lat) * 111;
      const lngKm =
        (row.lng - block.lng) * 111 * Math.cos((block.lat * Math.PI) / 180);
      return Math.hypot(latKm, lngKm) <= block.radiusKm;
    })
      ? "hard"
      : row.accessibility,
  }));

  return {
    requests: scoreAndSortRequests(adjustedRows, weights, { timeOffsetHours }),
    depots,
    blocks,
    weights,
  };
}

export function setPendingAllocationPlan(plan) {
  pendingPlan = structuredClone(plan);
}

export function clearPendingAllocationPlan() {
  pendingPlan = null;
}

export async function generateAllocation(input = {}) {
  validateGenerateAllocation(input);
  const plan = buildAllocationPlan(await getPlanningContext());
  setPendingAllocationPlan(plan);
  return plan;
}

function insufficientStock() {
  return new AppError({
    code: "INSUFFICIENT_STOCK",
    message: "Stock changed after this recommendation. Regenerate the allocation.",
    statusCode: 409,
  });
}

function invalidState(message) {
  return new AppError({ code: "INVALID_STATE", message, statusCode: 409 });
}

function groupSelected(rows, keyFactory) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFactory(row);
    const group = groups.get(key) ?? { rows: [], qty: 0 };
    group.rows.push(row);
    group.qty += row.qty;
    groups.set(key, group);
  }
  return groups;
}

export async function approveAllocation(input) {
  const selection = validateApproveAllocation(input);
  if (!pendingPlan) {
    throw invalidState("Generate an allocation before approving it");
  }
  const selectedIds = selection.rowIds ? new Set(selection.rowIds) : null;
  const matchingRows = pendingPlan.rows.filter((row) => (
    selection.all ||
    (selection.requestId && row.requestId === selection.requestId) ||
    selectedIds?.has(row.id)
  ));
  if (!selection.all && matchingRows.length === 0) {
    throw new AppError({
      code: "NOT_FOUND",
      message: selection.requestId
        ? "Request was not found in the current allocation plan"
        : "One or more allocation rows were not found in the current plan",
      statusCode: 404,
    });
  }
  if (selectedIds && matchingRows.length !== selectedIds.size) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "One or more allocation rows were not found in the current plan",
      statusCode: 404,
    });
  }
  const selectedRows = matchingRows.filter((row) => row.qty > 0);
  if (selectedRows.length === 0) {
    throw invalidState("The selected request has no supplies available to approve");
  }

  // Every depot-to-request allocation uses one truck for all of its supply rows.
  for (const group of groupSelected(selectedRows, (row) => `${row.requestId}:${row.depotId}`).values()) {
    const vehicleId = group.rows.find((row) => row.vehicleId)?.vehicleId;
    if (!vehicleId) throw invalidState("No truck is available for this allocation");
    group.rows.forEach((row) => { row.vehicleId = vehicleId; });
  }

  const context = await getPlanningContext();
  const stockGroups = groupSelected(
    selectedRows,
    (row) => `${row.depotId}:${row.item}`,
  );
  const inventoryUpdates = [];
  for (const [key, group] of stockGroups) {
    const [depotId, item] = key.split(":");
    const stock = context.depots
      .find((depot) => depot.id === depotId)
      ?.stock.find((entry) => entry.item === item);
    if (!stock || stock.qty < group.qty) throw insufficientStock();
    inventoryUpdates.push({
      depotId,
      item,
      oldQty: stock.qty,
      newQty: stock.qty - group.qty,
    });
  }

  // Each update targets a different (depot, item) row, so they can run together instead of one network
  // round trip after another (this used to take many seconds against a hosted database).
  const inventoryResults = await Promise.all(inventoryUpdates.map((update) => updateInventoryQuantity(update)));
  if (inventoryResults.some((applied) => !applied)) throw insufficientStock();
  await insertApprovedAllocations(selectedRows);
  await insertDispatchLogs(selectedRows);

  const requestItemGroups = groupSelected(
    selectedRows,
    (row) => `${row.requestId}:${row.item}`,
  );
  // Different request/item rows: write them in parallel.
  await Promise.all([...requestItemGroups].flatMap(([key, group]) => {
    const separator = key.lastIndexOf(":");
    const requestId = key.slice(0, separator);
    const item = key.slice(separator + 1);
    const request = context.requests.find((entry) => entry.id === requestId);
    const current = request?.items.find((entry) => entry.item === item);
    if (!current) return [];
    return [updateRequestItemAllocation({
      requestId,
      item,
      qtyAllocated: Math.min(current.qtyNeeded, current.qtyAllocated + group.qty),
    })];
  }));

  await Promise.all([...new Set(selectedRows.map((row) => row.requestId))].flatMap((requestId) => {
    const request = context.requests.find((entry) => entry.id === requestId);
    if (!request) return [];
    const extra = selectedRows
      .filter((row) => row.requestId === requestId)
      .reduce((total, row) => total + row.qty, 0);
    const needed = request.items.reduce((total, item) => total + item.qtyNeeded, 0);
    const allocated =
      request.items.reduce((total, item) => total + item.qtyAllocated, 0) + extra;
    const status = allocated === 0 ? "pending" : allocated >= needed ? "allocated" : "partially_allocated";
    return [updateRequestStatus(requestId, status)];
  }));

  const consumedIds = new Set(matchingRows.map((row) => row.id));
  const remainingRows = pendingPlan.rows.filter((row) => !consumedIds.has(row.id));
  pendingPlan = selection.all || !remainingRows.some((row) => row.qty > 0)
    ? null
    : { ...pendingPlan, rows: remainingRows };
  const [requests, depots] = await Promise.all([listRequests(), listDepots()]);
  return {
    approved: selectedRows.length,
    approvedRequests: [...new Set(selectedRows.map((row) => row.requestId))].length,
    requests,
    depots,
  };
}

export function mapSavedAllocationRows(rows) {
  const totals = new Map();
  for (const row of rows) {
    const key = `${row.request_id}:${row.item}`;
    totals.set(key, (totals.get(key) ?? 0) + row.qty);
  }
  return rows.map((row) => {
    const request = Array.isArray(row.requests) ? row.requests[0] : row.requests;
    const depot = Array.isArray(row.depots) ? row.depots[0] : row.depots;
    const items = request?.request_items ?? [];
    const requestItem = items.find((entry) => entry.item === row.item);
    const qtyNeeded = requestItem?.qty_needed ?? row.qty;
    const allocated = totals.get(`${row.request_id}:${row.item}`) ?? row.qty;
    return {
      id: row.id,
      requestId: row.request_id,
      area: request?.area ?? "Unknown area",
      depotId: row.depot_id,
      depotName: depot?.name ?? "Unknown depot",
      vehicleId: row.vehicle_id,
      item: row.item,
      qty: row.qty,
      qtyNeeded,
      unfulfilled: Math.max(0, qtyNeeded - allocated),
      fulfilmentPct: qtyNeeded ? Math.round((allocated / qtyNeeded) * 100) : 0,
      distanceKm: row.distance_km,
      etaMin: row.eta_min,
      status: row.status,
      reason: row.reason,
    };
  });
}

export async function getAllocation() {
  return mapSavedAllocationRows(await findSavedAllocations());
}
