import { randomUUID } from "node:crypto";

import { buildAllocationPlan, haversineKm } from "../core/allocation.js";
import { calculatePriorityScore } from "../core/score.js";
import { AppError } from "../errors/AppError.js";
import {
  deleteRoadBlockById,
  findPendingScenario,
  findRoadBlocks,
  insertRoadBlock,
  savePendingScenario,
  setScenarioStatus,
} from "../repositories/simulationRepository.js";
import {
  getPlanningContext,
  setPendingAllocationPlan,
} from "./allocationService.js";
import { adjustInventory, updateDepot } from "./inventoryService.js";
import { createRequest, updateRequest } from "./requestService.js";
import { validateScenarioAction } from "../validators/scenarioValidator.js";

function notFound(resource, id) {
  return new AppError({
    code: "NOT_FOUND",
    message: `${resource} not found: ${id}`,
    statusCode: 404,
  });
}

function invalidState(message) {
  return new AppError({ code: "INVALID_STATE", message, statusCode: 409 });
}

function rescore(requests, weights) {
  const maxPopulation = requests.reduce(
    (maximum, request) => Math.max(maximum, request.population),
    0,
  );
  return requests
    .map((request) => ({
      ...request,
      score: calculatePriorityScore(request, {
        maxPopulation,
        hoursWaiting: request.hoursWaiting,
        weights,
      }),
    }))
    .sort(
      (left, right) =>
        right.score.total - left.score.total ||
        new Date(left.createdAt) - new Date(right.createdAt) ||
        left.id.localeCompare(right.id),
    );
}

function applyPreviewAction(context, change) {
  if (["reduce_stock", "add_stock"].includes(change.action)) {
    const depot = context.depots.find((entry) => entry.id === change.depotId);
    if (!depot) throw notFound("Depot", change.depotId);
    const stock = depot.stock.find((entry) => entry.item === change.item);
    if (!stock) throw notFound("Inventory item", `${change.depotId}/${change.item}`);
    stock.qty =
      change.action === "reduce_stock"
        ? Math.max(0, Math.round(stock.qty * (1 - change.percent / 100)))
        : stock.qty + change.qty;
    stock.isLow = stock.qty < stock.lowThreshold;
  } else if (change.action === "increase_population") {
    const request = context.requests.find((entry) => entry.id === change.requestId);
    if (!request) throw notFound("Request", change.requestId);
    request.population = Math.round(request.population * (1 + change.percent / 100));
  } else if (change.action === "add_request") {
    context.requests.push({
      id: `req_preview_${randomUUID()}`,
      ...change.request,
      status: "pending",
      hoursWaiting: 0,
      createdAt: new Date().toISOString(),
      fulfilmentPct: 0,
      items: change.request.items.map((entry) => ({ ...entry, qtyAllocated: 0 })),
    });
  } else if (change.action === "change_capacity") {
    const depot = context.depots.find((entry) => entry.id === change.depotId);
    if (!depot) throw notFound("Depot", change.depotId);
    depot.dailyCapacity = change.dailyCapacity;
  } else if (change.action === "block_zone") {
    const block = {
      id: `blk_preview_${randomUUID()}`,
      lat: change.lat,
      lng: change.lng,
      radiusKm: change.radiusKm,
      active: true,
    };
    context.blocks.push(block);
    for (const request of context.requests) {
      if (haversineKm(block, request) <= block.radiusKm) {
        request.accessibility = "hard";
      }
    }
  }
  context.requests = rescore(context.requests, context.weights);
}

function groupPlan(plan) {
  const grouped = new Map();
  for (const row of plan.rows) {
    const current = grouped.get(row.requestId) ?? {
      area: row.area,
      items: new Map(),
    };
    const item = current.items.get(row.item) ?? { needed: 0, allocated: 0 };
    item.needed = Math.max(item.needed, row.qtyNeeded);
    item.allocated += row.qty;
    current.items.set(row.item, item);
    grouped.set(row.requestId, current);
  }
  return grouped;
}

function scenarioReason(change) {
  return {
    reduce_stock: "Reduced stock changes how limited supplies are shared.",
    add_stock: "Additional stock allows more requests to be fulfilled.",
    increase_population: "Higher affected population changes demand priority.",
    add_request: "The new request competes for the same limited resources.",
    change_capacity: "Depot capacity changes the amount that can be dispatched today.",
    block_zone: "The blocked zone increases access difficulty and travel distance.",
  }[change.action];
}

export function compareAllocationPlans(before, after, change) {
  const oldGroups = groupPlan(before);
  const newGroups = groupPlan(after);
  const ids = new Set([...oldGroups.keys(), ...newGroups.keys()]);
  const requests = [...ids]
    .map((requestId) => {
      const oldValue = oldGroups.get(requestId) ?? { area: newGroups.get(requestId)?.area, items: new Map() };
      const newValue = newGroups.get(requestId) ?? { area: oldValue.area, items: new Map() };
      const itemNames = new Set([...oldValue.items.keys(), ...newValue.items.keys()]);
      const items = [...itemNames].map((item) => ({
        item,
        before: oldValue.items.get(item)?.allocated ?? 0,
        after: newValue.items.get(item)?.allocated ?? 0,
      }));
      const oldNeeded = [...oldValue.items.values()].reduce((sum, item) => sum + item.needed, 0);
      const newNeeded = [...newValue.items.values()].reduce((sum, item) => sum + item.needed, 0);
      const oldAllocated = items.reduce((sum, item) => sum + item.before, 0);
      const newAllocated = items.reduce((sum, item) => sum + item.after, 0);
      const fulfilmentBeforePct = oldNeeded ? Math.round((oldAllocated / oldNeeded) * 100) : 0;
      const fulfilmentAfterPct = newNeeded ? Math.round((newAllocated / newNeeded) * 100) : 0;
      return {
        requestId,
        area: newValue.area ?? oldValue.area,
        tag:
          fulfilmentAfterPct > fulfilmentBeforePct
            ? "gained"
            : fulfilmentAfterPct < fulfilmentBeforePct
              ? "lost"
              : "same",
        fulfilmentBeforePct,
        fulfilmentAfterPct,
        items,
        reason: scenarioReason(change),
      };
    })
    .sort(
      (left, right) =>
        Math.abs(right.fulfilmentAfterPct - right.fulfilmentBeforePct) -
          Math.abs(left.fulfilmentAfterPct - left.fulfilmentBeforePct) ||
        left.area.localeCompare(right.area),
    );

  return {
    overallChangePct:
      after.summary.overallFulfilmentPct - before.summary.overallFulfilmentPct,
    requests,
  };
}

export async function recalculateScenario(input) {
  const change = validateScenarioAction(input);
  const context = await getPlanningContext();
  const before = buildAllocationPlan(context);
  const changedContext = structuredClone(context);
  applyPreviewAction(changedContext, change);
  const after = buildAllocationPlan(changedContext);
  const diff = compareAllocationPlans(before, after, change);
  await savePendingScenario({ changes: change, before, after });
  return { before, after, diff };
}

async function applyChange(change) {
  if (["reduce_stock", "add_stock"].includes(change.action)) {
    const context = await getPlanningContext();
    const stock = context.depots
      .find((depot) => depot.id === change.depotId)
      ?.stock.find((entry) => entry.item === change.item);
    if (!stock) throw notFound("Inventory item", `${change.depotId}/${change.item}`);
    const target =
      change.action === "reduce_stock"
        ? Math.max(0, Math.round(stock.qty * (1 - change.percent / 100)))
        : stock.qty + change.qty;
    const difference = target - stock.qty;
    if (difference !== 0) {
      await adjustInventory(change.depotId, {
        item: change.item,
        change: difference,
        reason: `Applied simulator action: ${change.action}`,
      });
    }
  } else if (change.action === "increase_population") {
    const context = await getPlanningContext();
    const request = context.requests.find((entry) => entry.id === change.requestId);
    if (!request) throw notFound("Request", change.requestId);
    await updateRequest(change.requestId, {
      population: Math.round(request.population * (1 + change.percent / 100)),
    });
  } else if (change.action === "add_request") {
    await createRequest(change.request);
  } else if (change.action === "change_capacity") {
    await updateDepot(change.depotId, { dailyCapacity: change.dailyCapacity });
  } else if (change.action === "block_zone") {
    await insertRoadBlock(change);
  }
}

export async function applyScenario() {
  const scenario = await findPendingScenario();
  if (!scenario) throw invalidState("Recalculate a scenario before applying it");
  await applyChange(scenario.changes);
  await setScenarioStatus(scenario.id, "applied");
  const currentPlan = buildAllocationPlan(await getPlanningContext());
  setPendingAllocationPlan(currentPlan);
  return { ok: true };
}

export async function undoScenario() {
  const scenario = await findPendingScenario();
  if (!scenario) throw invalidState("There is no pending scenario to undo");
  await setScenarioStatus(scenario.id, "undone");
  return { ok: true };
}

function mapBlock(row) {
  return {
    id: row.id,
    lat: row.lat,
    lng: row.lng,
    radiusKm: row.radius_km,
    active: row.active,
  };
}

export async function listRoadBlocks() {
  return (await findRoadBlocks()).map(mapBlock);
}

export async function deleteRoadBlock(id) {
  if (!(await deleteRoadBlockById(id))) throw notFound("Road block", id);
  return { ok: true };
}
