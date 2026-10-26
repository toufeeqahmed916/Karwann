// ALL network calls live here. Pages never call fetch directly (TEAM_PLAN section 4).
// Mock mode: VITE_USE_MOCKS=true. Flip a single feature to the real API with MOCK_OFF below.
import requestsMock from "../mocks/requests.json";
import depotsMock from "../mocks/depots.json";
import weightsMock from "../mocks/weights.json";
import { rescoreAll, scoreRequest } from "./mockScore.js";

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";
const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
const BASE = `${API_URL}/api`;

if (!USE_MOCKS) {
  if (!API_URL) {
    console.error("[Karwan API] Backend not configured. Add VITE_API_URL to the frontend environment.");
  } else {
    fetch(`${API_URL}/health/ready`)
      .then((response) => {
        if (!response.ok) throw new Error(`Health check returned ${response.status}`);
        return response.json();
      })
      .then(() => console.log(`[Karwan API] Backend connected: ${API_URL}`))
      .catch((error) => console.error(`[Karwan API] Backend connection failed: ${API_URL}`, error));
  }
}

// Every MVP backend phase is complete. Set VITE_USE_MOCKS=true and remove a
// feature here only when intentionally demonstrating its local mock instead.
const MOCK_OFF = new Set([
  "requests", "weights", "inventory", "dashboard", "allocation",
  "simulator", "routes", "deliveries", "reset",
]);
// VITE_MOCK_ALL=true forces every feature onto the bundled sample data (offline demos, screenshots).
const MOCK_ALL = import.meta.env.VITE_MOCK_ALL === "true";
const mocked = (feature) => USE_MOCKS && (MOCK_ALL || !MOCK_OFF.has(feature));

const inFlightGets = new Map();
const HTTP_TIMEOUT_MS = 15000;

async function performHttp(path, opts) {
  const { body, headers: suppliedHeaders, ...fetchOptions } = opts;
  const hasBody = body !== undefined && body !== null;
  const res = await fetch(BASE + path, {
    ...fetchOptions,
    headers: {
      Accept: "application/json",
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...suppliedHeaders,
    },
    body: hasBody ? JSON.stringify(body) : undefined,
    signal: fetchOptions.signal ?? AbortSignal.timeout(HTTP_TIMEOUT_MS),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(json.error?.message || "Request failed");
    e.code = json.error?.code;
    throw e;
  }
  return json.data;
}

async function http(path, opts = {}) {
  const method = (opts.method || "GET").toUpperCase();
  if (method !== "GET" || opts.body != null) return performHttp(path, opts);

  // Several screens request the same overview data at mount time. Share only
  // the active GET promise: responses are never cached or allowed to go stale.
  const key = `${method}:${path}`;
  if (inFlightGets.has(key)) return inFlightGets.get(key);
  const pending = performHttp(path, opts).finally(() => inFlightGets.delete(key));
  inFlightGets.set(key, pending);
  return pending;
}
const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));
const clone = (x) => JSON.parse(JSON.stringify(x));

// In-memory mock state (resets on page reload)
const db = {
  requests: clone(requestsMock),
  depots: clone(depotsMock),
  weights: clone(weightsMock),
  stockLog: [],
  allocations: [],
  generatedAllocation: null,
  blocks: [],
  pendingScenario: null,
  deliveries: [],
};

function makeId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function haversineKm(from, to) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const dLat = radians(to.lat - from.lat);
  const dLng = radians(to.lng - from.lng);
  const lat1 = radians(from.lat);
  const lat2 = radians(to.lat);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function dashboardSnapshot() {
  const active = db.requests.filter((request) => request.status !== "delivered");
  const inventoryTotals = {};
  const needs = {};

  db.depots.forEach((depot) => depot.stock.forEach((stock) => {
    inventoryTotals[stock.item] = (inventoryTotals[stock.item] || 0) + stock.qty;
  }));
  active.forEach((request) => request.items.forEach((item) => {
    needs[item.item] = (needs[item.item] || 0) + Math.max(0, item.qtyNeeded - item.qtyAllocated);
  }));

  return {
    activeRequests: active.length,
    peopleAwaiting: active.reduce((total, request) => total + request.population, 0),
    deliveriesInProgress: db.deliveries.filter((delivery) => delivery.status === "in_transit").length,
    completedDeliveries: db.deliveries.filter((delivery) => delivery.status === "delivered").length,
    criticalShortages: Object.entries(needs)
      .map(([item, needed]) => ({ item, needed, available: inventoryTotals[item] || 0, gap: Math.max(0, needed - (inventoryTotals[item] || 0)) }))
      .filter((entry) => entry.gap > 0),
    inventoryTotals: Object.entries(inventoryTotals).map(([item, qty]) => ({ item, qty })),
    lowStockAlerts: db.depots.flatMap((depot) => depot.stock
      .filter((stock) => stock.isLow)
      .map((stock) => ({ depotId: depot.id, depotName: depot.name, item: stock.item, qty: stock.qty, lowThreshold: stock.lowThreshold }))),
  };
}

/* ---------- Requests ---------- */
export async function getRequests(filters = {}) {
  if (!mocked("requests")) {
    const q = new URLSearchParams(filters).toString();
    return http("/requests" + (q ? "?" + q : ""));
  }
  await wait();
  let list = rescoreAll(db.requests, db.weights);
  if (filters.status) list = list.filter((r) => r.status === filters.status);
  if (filters.urgency) list = list.filter((r) => r.urgency === filters.urgency);
  return clone(list);
}

export async function createRequest(body) {
  if (!mocked("requests")) return http("/requests", { method: "POST", body });
  await wait();
  const bad = (m) => Object.assign(new Error(m), { code: "VALIDATION_ERROR" });
  if (body.lat == null || body.lng == null) throw bad("Pick a location on the map");
  if (!(body.population > 0)) throw bad("Population must be greater than 0");
  if (!body.items?.length) throw bad("Add at least one supply");
  const r = {
    id: "req_" + Math.random().toString(36).slice(2, 8),
    ...body, status: "pending", hoursWaiting: 0, createdAt: new Date().toISOString(),
    items: body.items.map((i) => ({ ...i, qtyAllocated: 0 })), fulfilmentPct: 0,
  };
  db.requests.push(r);
  const maxPop = Math.max(...db.requests.map((x) => x.population));
  r.score = scoreRequest(r, db.weights, maxPop);
  return clone(r);
}

export async function getRequest(id) {
  if (!mocked("requests")) return http("/requests/" + id);
  await wait(100);
  const r = db.requests.find((x) => x.id === id);
  if (!r) throw Object.assign(new Error("Request not found"), { code: "NOT_FOUND" });
  const scored = rescoreAll(db.requests, db.weights).find((x) => x.id === id);
  return clone({ ...scored, tracking: [] });
}

export async function updateRequest(id, body) {
  if (!mocked("requests")) return http("/requests/" + id, { method: "PATCH", body });
  await wait();
  const index = db.requests.findIndex((request) => request.id === id);
  if (index === -1) throw Object.assign(new Error("Request not found"), { code: "NOT_FOUND" });
  db.requests[index] = { ...db.requests[index], ...body };
  return clone(rescoreAll(db.requests, db.weights).find((request) => request.id === id));
}

/* ---------- Weights ---------- */
export async function getWeights() {
  if (!mocked("weights")) return http("/settings/weights");
  return clone(db.weights);
}
export async function putWeights(weights) {
  if (!mocked("weights")) return http("/settings/weights", { method: "PUT", body: weights });
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1) > 0.15) throw Object.assign(new Error("Weights must add up to 100%"), { code: "VALIDATION_ERROR" });
  db.weights = Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, v / sum]));
  return { weights: clone(db.weights), requests: clone(rescoreAll(db.requests, db.weights)) };
}

/* ---------- Phase 2: depots and inventory ---------- */
export async function getDepots() {
  if (!mocked("inventory")) return http("/depots");
  await wait(100);
  return clone(db.depots);
}

export async function createDepot(body) {
  if (!mocked("inventory")) return http("/depots", { method: "POST", body });

  await wait();
  const depot = {
    id: makeId("dep"),
    name: body.name.trim(),
    lat: Number(body.lat),
    lng: Number(body.lng),
    dailyCapacity: Number(body.dailyCapacity),
    stock: body.inventory.map((entry) => ({
      item: entry.item,
      qty: Number(entry.qty),
      lowThreshold: Number(entry.lowThreshold),
      isLow: Number(entry.qty) < Number(entry.lowThreshold),
    })),
    vehicles: body.vehicles.map((vehicle) => ({
      id: makeId("veh"),
      name: vehicle.name.trim(),
      capacity: Number(vehicle.capacity),
      status: "available",
      lat: Number(body.lat),
      lng: Number(body.lng),
    })),
  };
  db.depots.push(depot);
  return clone(depot);
}

export async function patchDepotInventory(depotId, body) {
  if (!mocked("inventory")) {
    return http(`/depots/${depotId}/inventory`, { method: "PATCH", body });
  }

  await wait();
  const depot = db.depots.find((entry) => entry.id === depotId);
  if (!depot) throw Object.assign(new Error("Depot not found"), { code: "NOT_FOUND" });

  const stock = depot.stock.find((entry) => entry.item === body.item);
  if (!stock) throw Object.assign(new Error("Inventory item not found"), { code: "NOT_FOUND" });

  const change = Number(body.change);
  if (!Number.isInteger(change) || change === 0 || !body.reason?.trim()) {
    throw Object.assign(new Error("Enter a quantity and reason"), { code: "VALIDATION_ERROR" });
  }
  if (stock.qty + change < 0) {
    throw Object.assign(new Error(`Only ${stock.qty} units are available`), { code: "INSUFFICIENT_STOCK" });
  }

  stock.qty += change;
  stock.isLow = stock.qty < stock.lowThreshold;
  db.stockLog.unshift({
    id: `log_${Math.random().toString(36).slice(2, 9)}`,
    depotId,
    requestId: null,
    item: body.item,
    qty: Math.abs(change),
    action: change > 0 ? "restocked" : "adjusted",
    reason: body.reason.trim(),
    createdAt: new Date().toISOString(),
  });

  return clone(depot);
}

export async function patchDepot(depotId, body) {
  if (!mocked("inventory")) return http(`/depots/${depotId}`, { method: "PATCH", body });

  await wait();
  const depot = db.depots.find((entry) => entry.id === depotId);
  if (!depot) throw Object.assign(new Error("Depot not found"), { code: "NOT_FOUND" });

  const dailyCapacity = Number(body.dailyCapacity);
  if (!Number.isInteger(dailyCapacity) || dailyCapacity < 0) {
    throw Object.assign(new Error("Daily capacity must be 0 or more"), { code: "VALIDATION_ERROR" });
  }
  depot.dailyCapacity = dailyCapacity;
  return clone(depot);
}

export async function getStockLog(depotId) {
  if (!mocked("inventory")) {
    const query = new URLSearchParams({ depotId }).toString();
    return http(`/stock-log?${query}`);
  }

  await wait(100);
  return clone(db.stockLog.filter((entry) => entry.depotId === depotId));
}

export async function addDepotVehicle(depotId, body) {
  if (!mocked("inventory")) {
    return http(`/depots/${depotId}/vehicles`, { method: "POST", body });
  }
  await wait();
  const depot = db.depots.find((entry) => entry.id === depotId);
  if (!depot) throw Object.assign(new Error("Depot not found"), { code: "NOT_FOUND" });
  const capacity = Number(body.capacity);
  if (!body.name?.trim() || !Number.isInteger(capacity) || capacity < 1) {
    throw Object.assign(new Error("Enter a vehicle name and valid capacity"), { code: "VALIDATION_ERROR" });
  }
  depot.vehicles.push({
    id: makeId("veh"),
    name: body.name.trim(),
    capacity,
    status: "available",
    lat: depot.lat,
    lng: depot.lng,
  });
  return clone(depot);
}

export async function updateDepotVehicle(depotId, vehicleId, body) {
  if (!mocked("inventory")) {
    return http(`/depots/${depotId}/vehicles/${vehicleId}`, { method: "PATCH", body });
  }
  await wait(100);
  const depot = db.depots.find((entry) => entry.id === depotId);
  const vehicle = depot?.vehicles.find((entry) => entry.id === vehicleId);
  if (!vehicle) throw Object.assign(new Error("Vehicle not found"), { code: "NOT_FOUND" });
  if (body.status && !["available", "busy"].includes(body.status)) {
    throw Object.assign(new Error("Invalid vehicle status"), { code: "VALIDATION_ERROR" });
  }
  Object.assign(vehicle, body);
  return clone(depot);
}

export async function removeDepotVehicle(depotId, vehicleId) {
  if (!mocked("inventory")) {
    return http(`/depots/${depotId}/vehicles/${vehicleId}`, { method: "DELETE" });
  }
  await wait(100);
  const depot = db.depots.find((entry) => entry.id === depotId);
  if (!depot) throw Object.assign(new Error("Depot not found"), { code: "NOT_FOUND" });
  depot.vehicles = depot.vehicles.filter((entry) => entry.id !== vehicleId);
  return clone(depot);
}

/* ---------- Phase 3: dashboard ---------- */
export async function getCoordinatorOverview() {
  if (!mocked("dashboard")) {
    const [dashboard, requests, depots] = await Promise.all([
      http("/dashboard"),
      http("/requests"),
      http("/depots"),
    ]);
    return { dashboard, requests, depots };
  }
  await wait(150);
  return clone({
    dashboard: dashboardSnapshot(),
    requests: rescoreAll(db.requests, db.weights),
    depots: db.depots,
  });
}

export async function advanceTime(hours = 6) {
  if (!mocked("dashboard")) return http("/simulate/advance-time", { method: "POST", body: { hours } });
  await wait();
  db.requests = db.requests.map((request) => ({ ...request, hoursWaiting: request.hoursWaiting + hours }));
  db.requests = rescoreAll(db.requests, db.weights);
  return clone(db.requests);
}

/* ---------- Phase 4: allocation ---------- */
function buildAllocationPlan(state = db) {
  const requests = rescoreAll(state.requests, state.weights);
  const workingDepots = clone(state.depots).map((depot) => ({ ...depot, remainingCapacity: depot.dailyCapacity }));
  const rows = [];

  for (const request of requests) {
    for (const neededItem of request.items) {
      const remainingNeed = Math.max(0, neededItem.qtyNeeded - neededItem.qtyAllocated);
      if (!remainingNeed) continue;

      const candidates = workingDepots
        .map((depot) => ({
          depot,
          stock: depot.stock.find((entry) => entry.item === neededItem.item),
          distanceKm: haversineKm(depot, request),
          vehicle: depot.vehicles.find((vehicle) => vehicle.status === "available"),
        }))
        .filter((candidate) => candidate.stock?.qty > 0 && candidate.depot.remainingCapacity > 0)
        .sort((a, b) => a.distanceKm - b.distanceKm);

      const choice = candidates[0];
      let qty = 0;
      let reason = "No stock available at any depot.";
      if (choice) {
        qty = Math.min(remainingNeed, choice.stock.qty, choice.depot.remainingCapacity);
        if (!choice.vehicle) {
          qty = 0;
          reason = `${choice.depot.name} has stock, but no vehicle is available.`;
        } else {
          choice.stock.qty -= qty;
          choice.depot.remainingCapacity -= qty;
          const pct = Math.round(qty / remainingNeed * 100);
          const limitReason = qty < remainingNeed
            ? (choice.depot.remainingCapacity === 0 ? " Depot daily capacity was reached." : " Stock is short, so supply was shared by priority.")
            : " The nearest available depot can meet this need.";
          reason = `${neededItem.item[0].toUpperCase() + neededItem.item.slice(1)}: ${qty} of ${remainingNeed} (${pct}%). ${choice.depot.name} is nearest (${Math.round(choice.distanceKm)} km).${limitReason}`;
        }
      }

      rows.push({
        id: makeId("alc"),
        requestId: request.id,
        area: request.area,
        depotId: choice?.depot.id ?? null,
        depotName: choice?.depot.name ?? "No depot available",
        vehicleId: choice?.vehicle?.id ?? null,
        item: neededItem.item,
        qty,
        qtyNeeded: remainingNeed,
        unfulfilled: remainingNeed - qty,
        fulfilmentPct: Math.round(qty / remainingNeed * 100),
        distanceKm: choice ? Number(choice.distanceKm.toFixed(1)) : null,
        etaMin: choice ? Math.round(choice.distanceKm / 45 * 60 + 20) : null,
        status: "recommended",
        reason,
      });
    }
  }

  const totalNeeded = rows.reduce((total, row) => total + row.qtyNeeded, 0);
  const totalAllocated = rows.reduce((total, row) => total + row.qty, 0);
  const criticalIds = new Set(requests.filter((request) => request.urgency === "critical").map((request) => request.id));
  const criticalRows = rows.filter((row) => criticalIds.has(row.requestId));
  const criticalNeeded = criticalRows.reduce((total, row) => total + row.qtyNeeded, 0);
  const criticalAllocated = criticalRows.reduce((total, row) => total + row.qty, 0);
  const overallFulfilmentPct = totalNeeded ? Math.round(totalAllocated / totalNeeded * 100) : 0;
  const criticalFulfilmentPct = criticalNeeded ? Math.round(criticalAllocated / criticalNeeded * 100) : 0;

  return {
    rows,
    summary: { overallFulfilmentPct, criticalFulfilmentPct, totalAllocated, totalNeeded },
    baseline: {
      overallFulfilmentPct: Math.max(0, overallFulfilmentPct - 11),
      criticalFulfilmentPct: Math.max(0, criticalFulfilmentPct - 24),
    },
  };
}

export async function generateAllocation() {
  if (!mocked("allocation")) return http("/allocation/generate", { method: "POST", body: {} });
  await wait(350);
  db.generatedAllocation = buildAllocationPlan();
  return clone(db.generatedAllocation);
}

export async function getAllocation() {
  if (!mocked("allocation")) return http("/allocation");
  await wait(100);
  return clone(db.allocations);
}

export async function approveAllocation(body = { all: true }) {
  if (!mocked("allocation")) return http("/allocation/approve", { method: "POST", body });
  await wait(300);
  if (!db.generatedAllocation) throw Object.assign(new Error("Generate an allocation first"), { code: "VALIDATION_ERROR" });

  const selectedIds = body.rowIds ? new Set(body.rowIds) : null;
  const selectedRows = db.generatedAllocation.rows.filter((row) =>
    row.status !== "approved" && (
      body.all ||
      (body.requestId && row.requestId === body.requestId) ||
      selectedIds?.has(row.id)
    ),
  );
  if (!selectedRows.some((row) => row.qty > 0)) {
    throw Object.assign(new Error("The selected request has no supplies available to approve"), { code: "INVALID_STATE" });
  }

  const vehicleByAllocation = new Map();
  selectedRows.forEach((row) => {
    if (!row.depotId || !row.vehicleId) return;
    const key = `${row.requestId}:${row.depotId}`;
    const vehicleId = vehicleByAllocation.get(key) || row.vehicleId;
    vehicleByAllocation.set(key, vehicleId);
    row.vehicleId = vehicleId;
  });
  const requiredStock = new Map();
  selectedRows.forEach((row) => {
    if (row.depotId && row.qty > 0) {
      const key = `${row.depotId}:${row.item}`;
      requiredStock.set(key, (requiredStock.get(key) || 0) + row.qty);
    }
  });
  for (const [key, required] of requiredStock) {
    const [depotId, item] = key.split(":");
    const stock = db.depots.find((depot) => depot.id === depotId)?.stock.find((entry) => entry.item === item);
    if (!stock || stock.qty < required) {
      throw Object.assign(new Error("Stock changed after this recommendation. Regenerate the allocation."), { code: "INSUFFICIENT_STOCK" });
    }
  }

  for (const row of selectedRows) {
    row.status = "approved";
    if (!row.depotId || row.qty === 0) continue;
    const depot = db.depots.find((entry) => entry.id === row.depotId);
    const stock = depot.stock.find((entry) => entry.item === row.item);
    stock.qty -= row.qty;
    stock.isLow = stock.qty < stock.lowThreshold;
    db.stockLog.unshift({
      id: makeId("log"), depotId: row.depotId, requestId: row.requestId,
      item: row.item, qty: row.qty, action: "dispatched", createdAt: new Date().toISOString(),
    });
  }

  for (const request of db.requests) {
    const requestRows = selectedRows.filter((row) => row.requestId === request.id);
    request.items = request.items.map((item) => {
      const allocated = requestRows.filter((row) => row.item === item.item).reduce((total, row) => total + row.qty, 0);
      return { ...item, qtyAllocated: Math.min(item.qtyNeeded, item.qtyAllocated + allocated) };
    });
    const needed = request.items.reduce((total, item) => total + item.qtyNeeded, 0);
    const allocated = request.items.reduce((total, item) => total + item.qtyAllocated, 0);
    request.fulfilmentPct = needed ? Math.round(allocated / needed * 100) : 0;
    request.status = allocated === 0 ? "pending" : allocated >= needed ? "allocated" : "partially_allocated";
  }

  db.allocations.push(...clone(selectedRows.filter((row) => row.qty > 0)));
  return clone({
    approved: selectedRows.filter((row) => row.qty > 0).length,
    approvedRequests: new Set(selectedRows.map((row) => row.requestId)).size,
    requests: db.requests,
    depots: db.depots,
  });
}

/* ---------- Phase 5: what-if simulator ---------- */
function planByRequest(plan) {
  const grouped = new Map();
  plan.rows.forEach((row) => {
    const current = grouped.get(row.requestId) || { area: row.area, needed: 0, allocated: 0, items: new Map() };
    current.needed += row.qtyNeeded;
    current.allocated += row.qty;
    const item = current.items.get(row.item) || 0;
    current.items.set(row.item, item + row.qty);
    grouped.set(row.requestId, current);
  });
  return grouped;
}

function simulationReason(action) {
  const messages = {
    reduce_stock: "Reduced stock changes how limited supplies are shared.",
    add_stock: "Additional stock allows more requests to be fulfilled.",
    increase_population: "Higher affected population increases demand and priority.",
    add_request: "The new request competes for the same limited resources.",
    change_capacity: "Depot capacity changes the amount that can be dispatched today.",
    block_zone: "The blocked zone increases access difficulty for nearby requests.",
  };
  return messages[action.action] || "The scenario changed the recommended allocation.";
}

function applyScenarioAction(state, action) {
  const bad = (message) => { throw Object.assign(new Error(message), { code: "VALIDATION_ERROR" }); };
  if (action.action === "reduce_stock" || action.action === "add_stock") {
    const depot = state.depots.find((entry) => entry.id === action.depotId);
    const stock = depot?.stock.find((entry) => entry.item === action.item);
    if (!stock) bad("Choose a depot and supply item");
    if (action.action === "reduce_stock") {
      const percent = Number(action.percent);
      if (!(percent > 0 && percent <= 100)) bad("Reduction must be between 1% and 100%");
      stock.qty = Math.max(0, Math.round(stock.qty * (1 - percent / 100)));
    } else {
      const qty = Number(action.qty);
      if (!Number.isInteger(qty) || qty < 1) bad("Added stock must be a positive whole number");
      stock.qty += qty;
    }
    stock.isLow = stock.qty < stock.lowThreshold;
  } else if (action.action === "increase_population") {
    const request = state.requests.find((entry) => entry.id === action.requestId);
    const percent = Number(action.percent);
    if (!request || !(percent > 0)) bad("Choose a request and enter a valid increase");
    request.population = Math.round(request.population * (1 + percent / 100));
  } else if (action.action === "add_request") {
    const request = action.request;
    if (!request?.area?.trim() || !(Number(request.population) > 0)) bad("Enter an area and affected population");
    state.requests.push({
      id: makeId("req"), area: request.area.trim(), lat: Number(request.lat ?? 26.3), lng: Number(request.lng ?? 68.2),
      population: Number(request.population), urgency: request.urgency || "high", vulnerable: Boolean(request.vulnerable),
      accessibility: request.accessibility || "medium", status: "pending", hoursWaiting: 0,
      createdAt: new Date().toISOString(), fulfilmentPct: 0,
      items: [{ item: request.item || "water", qtyNeeded: Number(request.qtyNeeded) || 300, qtyAllocated: 0 }],
    });
  } else if (action.action === "change_capacity") {
    const depot = state.depots.find((entry) => entry.id === action.depotId);
    const dailyCapacity = Number(action.dailyCapacity);
    if (!depot || !Number.isInteger(dailyCapacity) || dailyCapacity < 0) bad("Choose a depot and valid capacity");
    depot.dailyCapacity = dailyCapacity;
  } else if (action.action === "block_zone") {
    if (action.lat == null || action.lng == null) bad("Click the map to place the blocked zone");
    const radiusKm = Number(action.radiusKm);
    if (!(radiusKm > 0)) bad("Enter a valid block radius");
    state.blocks.push({ id: makeId("blk"), lat: Number(action.lat), lng: Number(action.lng), radiusKm, active: true });
    state.requests.forEach((request) => {
      if (haversineKm(action, request) <= radiusKm) request.accessibility = "hard";
    });
  } else {
    bad("Choose a simulation action");
  }
}

function comparePlans(before, after, action) {
  const beforeRequests = planByRequest(before);
  const afterRequests = planByRequest(after);
  const requestIds = new Set([...beforeRequests.keys(), ...afterRequests.keys()]);
  const requests = [...requestIds].map((requestId) => {
    const oldValue = beforeRequests.get(requestId) || { area: afterRequests.get(requestId)?.area, needed: 0, allocated: 0, items: new Map() };
    const newValue = afterRequests.get(requestId) || { area: oldValue.area, needed: 0, allocated: 0, items: new Map() };
    const beforePct = oldValue.needed ? Math.round(oldValue.allocated / oldValue.needed * 100) : 0;
    const afterPct = newValue.needed ? Math.round(newValue.allocated / newValue.needed * 100) : 0;
    const itemNames = new Set([...oldValue.items.keys(), ...newValue.items.keys()]);
    return {
      requestId,
      area: newValue.area || oldValue.area,
      tag: afterPct > beforePct ? "gained" : afterPct < beforePct ? "lost" : "same",
      fulfilmentBeforePct: beforePct,
      fulfilmentAfterPct: afterPct,
      items: [...itemNames].map((item) => ({ item, before: oldValue.items.get(item) || 0, after: newValue.items.get(item) || 0 })),
      reason: simulationReason(action),
    };
  }).sort((a, b) => Math.abs(b.fulfilmentAfterPct - b.fulfilmentBeforePct) - Math.abs(a.fulfilmentAfterPct - a.fulfilmentBeforePct));

  return { overallChangePct: after.summary.overallFulfilmentPct - before.summary.overallFulfilmentPct, requests };
}

export async function recalculateSimulation(action) {
  if (!mocked("simulator")) return http("/simulate/recalculate", { method: "POST", body: action });
  await wait(350);
  const before = buildAllocationPlan();
  const scenario = { requests: clone(db.requests), depots: clone(db.depots), weights: clone(db.weights), blocks: clone(db.blocks) };
  applyScenarioAction(scenario, action);
  const after = buildAllocationPlan(scenario);
  const result = { before, after, diff: comparePlans(before, after, action) };
  db.pendingScenario = { scenario, result };
  return clone(result);
}

export async function applySimulation() {
  if (!mocked("simulator")) return http("/simulate/apply", { method: "POST", body: {} });
  await wait();
  if (!db.pendingScenario) throw Object.assign(new Error("Recalculate a scenario first"), { code: "VALIDATION_ERROR" });
  db.requests = clone(db.pendingScenario.scenario.requests);
  db.depots = clone(db.pendingScenario.scenario.depots);
  db.blocks = clone(db.pendingScenario.scenario.blocks);
  db.generatedAllocation = clone(db.pendingScenario.result.after);
  db.pendingScenario = null;
  return { ok: true };
}

export async function undoSimulation() {
  if (!mocked("simulator")) return http("/simulate/undo", { method: "POST", body: {} });
  await wait(100);
  db.pendingScenario = null;
  return { ok: true };
}

export async function getSimulationBlocks() {
  if (!mocked("simulator")) return http("/simulate/blocks");
  await wait(100);
  return clone(db.blocks);
}

export async function deleteSimulationBlock(blockId) {
  if (!mocked("simulator")) return http(`/simulate/blocks/${blockId}`, { method: "DELETE" });
  await wait(100);
  db.blocks = db.blocks.filter((block) => block.id !== blockId);
  return { ok: true };
}

/* ---------- Phase 6: route previews ---------- */
export async function getRoute(depotId, requestId) {
  if (!mocked("routes")) {
    const query = new URLSearchParams({ depotId, requestId }).toString();
    return http(`/routes?${query}`);
  }
  await wait(120);
  const depot = db.depots.find((entry) => entry.id === depotId);
  const request = db.requests.find((entry) => entry.id === requestId);
  if (!depot || !request) throw Object.assign(new Error("Route endpoints not found"), { code: "NOT_FOUND" });
  const distanceKm = Number(haversineKm(depot, request).toFixed(1));
  const midpoint = [(depot.lat + request.lat) / 2 + 0.08, (depot.lng + request.lng) / 2 - 0.05];
  return clone({
    depotId, requestId,
    polyline: [[depot.lat, depot.lng], midpoint, [request.lat, request.lng]],
    distanceKm,
    durationMin: Math.round(distanceKm / 45 * 60 + 20),
    estimated: true,
  });
}

/* ---------- Phase 7: live delivery mock ---------- */
function routePoints(depot, request) {
  return [
    [depot.lat, depot.lng],
    [(depot.lat + request.lat) / 2 + 0.08, (depot.lng + request.lng) / 2 - 0.05],
    [request.lat, request.lng],
  ];
}

function ensureMockDeliveries() {
  if (db.deliveries.length) return;

  const usableRows = db.allocations.filter((row) => row.qty > 0 && row.depotId && row.vehicleId);
  if (usableRows.length) {
    const groups = new Map();
    usableRows.forEach((row) => {
      const key = `${row.requestId}:${row.depotId}:${row.vehicleId}`;
      const group = groups.get(key) || { rows: [], row };
      group.rows.push(row);
      groups.set(key, group);
    });
    groups.forEach(({ rows, row }) => {
      const request = db.requests.find((entry) => entry.id === row.requestId);
      const depot = db.depots.find((entry) => entry.id === row.depotId);
      if (!request || !depot) return;
      db.deliveries.push({
        allocationId: rows[0].id,
        allocationIds: rows.map((entry) => entry.id),
        vehicleId: row.vehicleId,
        requestId: row.requestId,
        createdAt: new Date().toISOString(),
        status: row.status === "recommended" ? "approved" : row.status,
        progressPct: 0,
        lat: depot.lat,
        lng: depot.lng,
        area: request.area,
        depotId: depot.id,
        depotName: depot.name,
        items: rows.map((entry) => ({ item: entry.item, qty: entry.qty })),
        distanceKm: row.distanceKm,
        etaMin: row.etaMin,
        route: routePoints(depot, request),
        startedAt: null,
      });
    });
    return;
  }

  const request = db.requests[0];
  const depot = db.depots[0];
  const vehicle = depot?.vehicles[0];
  if (!request || !depot || !vehicle) return;
  const distanceKm = Number(haversineKm(depot, request).toFixed(1));
  db.deliveries.push({
    allocationId: "alc_demo_01",
    allocationIds: ["alc_demo_01"],
    vehicleId: vehicle.id,
    requestId: request.id,
    createdAt: new Date().toISOString(),
    status: "approved",
    progressPct: 0,
    lat: depot.lat,
    lng: depot.lng,
    area: request.area,
    depotId: depot.id,
    depotName: depot.name,
    items: request.items.slice(0, 2).map((item) => ({ item: item.item, qty: Math.min(item.qtyNeeded, Math.max(50, Math.round(item.qtyNeeded * 0.65))) })),
    distanceKm,
    etaMin: Math.round(distanceKm / 45 * 60 + 20),
    route: routePoints(depot, request),
    startedAt: null,
  });
}

function positionAlongRoute(points, progressPct) {
  if (!points?.length) return { lat: 0, lng: 0 };
  const scaled = Math.min(0.9999, Math.max(0, progressPct / 100)) * (points.length - 1);
  const index = Math.floor(scaled);
  const fraction = scaled - index;
  const start = points[index];
  const end = points[Math.min(index + 1, points.length - 1)];
  return { lat: start[0] + (end[0] - start[0]) * fraction, lng: start[1] + (end[1] - start[1]) * fraction };
}

function finishDelivery(delivery) {
  delivery.status = "delivered";
  delivery.progressPct = 100;
  const finalPoint = delivery.route[delivery.route.length - 1];
  delivery.lat = finalPoint[0];
  delivery.lng = finalPoint[1];
  const request = db.requests.find((entry) => entry.id === delivery.requestId);
  if (request) request.status = "delivered";
  const vehicle = db.depots.flatMap((depot) => depot.vehicles).find((entry) => entry.id === delivery.vehicleId);
  if (vehicle) {
    vehicle.status = "available";
    vehicle.lat = delivery.lat;
    vehicle.lng = delivery.lng;
  }
}

function syncDeliveryProgress() {
  const now = Date.now();
  db.deliveries.forEach((delivery) => {
    if (delivery.status !== "in_transit" || !delivery.startedAt) return;
    const progressPct = Math.min(96, Math.round((now - delivery.startedAt) / 300));
    delivery.progressPct = progressPct;
    const point = positionAlongRoute(delivery.route, progressPct);
    delivery.lat = Number(point.lat.toFixed(5));
    delivery.lng = Number(point.lng.toFixed(5));
    const vehicle = db.depots.flatMap((depot) => depot.vehicles).find((entry) => entry.id === delivery.vehicleId);
    if (vehicle) {
      vehicle.lat = delivery.lat;
      vehicle.lng = delivery.lng;
    }
  });
}

export async function getDeliveries(vehicleId) {
  if (!mocked("deliveries")) {
    const query = vehicleId ? `?${new URLSearchParams({ vehicleId }).toString()}` : "";
    return http(`/deliveries${query}`);
  }
  ensureMockDeliveries();
  syncDeliveryProgress();
  await wait(80);
  return clone(vehicleId ? db.deliveries.filter((delivery) => delivery.vehicleId === vehicleId) : db.deliveries);
}

export async function startDeliveries(body) {
  if (!mocked("deliveries")) return http("/deliveries/start", { method: "POST", body });
  ensureMockDeliveries();
  await wait();
  const ids = body.all ? null : new Set(body.allocationIds || []);
  let started = 0;
  db.deliveries.forEach((delivery) => {
    if ((!ids || ids.has(delivery.allocationId)) && ["approved", "recommended"].includes(delivery.status)) {
      delivery.status = "in_transit";
      delivery.startedAt = Date.now();
      const request = db.requests.find((entry) => entry.id === delivery.requestId);
      if (request) request.status = "in_transit";
      const vehicle = db.depots.flatMap((depot) => depot.vehicles).find((entry) => entry.id === delivery.vehicleId);
      if (vehicle) vehicle.status = "busy";
      started += 1;
    }
  });
  return { started };
}

export async function completeDelivery(allocationId) {
  if (!mocked("deliveries")) return http(`/deliveries/${allocationId}/complete`, { method: "POST", body: {} });
  ensureMockDeliveries();
  await wait();
  const delivery = db.deliveries.find((entry) => entry.allocationId === allocationId);
  if (!delivery) throw Object.assign(new Error("Delivery not found"), { code: "NOT_FOUND" });
  if (delivery.status !== "in_transit") throw Object.assign(new Error("Start the trip before marking it delivered"), { code: "INVALID_STATE" });
  finishDelivery(delivery);
  return clone({ allocationId, status: "delivered", requestStatus: "delivered" });
}

/* ---------- Demo reset ---------- */
export async function resetDemo() {
  if (!mocked("reset")) return http("/seed/reset", { method: "POST", body: {} });
  db.requests = clone(requestsMock);
  db.depots = clone(depotsMock);
  db.weights = clone(weightsMock);
  db.stockLog = [];
  db.allocations = [];
  db.generatedAllocation = null;
  db.blocks = [];
  db.pendingScenario = null;
  db.deliveries = [];
  return { ok: true };
}
