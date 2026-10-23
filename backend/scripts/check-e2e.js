import { createApp } from "../src/app.js";

const app = createApp();
const server = app.listen(0);
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;

async function api(path, { method = "GET", body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`${method} ${path} -> ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload.data;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

let resetAvailable = false;
try {
  await api("/api/seed/reset", { method: "POST", body: {} });
  resetAvailable = true;

  const ready = await api("/health/ready");
  assert(ready.status === "ready", "Database readiness failed");

  const [requests, depots, weights, dashboard] = await Promise.all([
    api("/api/requests"),
    api("/api/depots"),
    api("/api/settings/weights"),
    api("/api/dashboard"),
  ]);
  assert(requests.length === 12, `Expected 12 seeded requests, got ${requests.length}`);
  assert(depots.length === 3, `Expected 3 seeded depots, got ${depots.length}`);
  assert(dashboard.activeRequests === 12, "Dashboard active-request count is incorrect");

  const created = await api("/api/requests", {
    method: "POST",
    body: {
      area: "E2E Test Area",
      lat: 25.8,
      lng: 68.2,
      population: 500,
      urgency: "medium",
      vulnerable: false,
      accessibility: "easy",
      items: [{ item: "water", qtyNeeded: 50 }],
    },
  });
  assert(created.id, "Request creation failed");
  await api("/api/settings/weights", { method: "PUT", body: weights });

  const depotId = depots[0].id;
  await api(`/api/depots/${depotId}/inventory`, {
    method: "PATCH",
    body: { item: "water", change: 5, reason: "end-to-end verification" },
  });
  await api(`/api/depots/${depotId}/inventory`, {
    method: "PATCH",
    body: { item: "water", change: -5, reason: "restore after verification" },
  });
  const stockLog = await api(`/api/stock-log?depotId=${depotId}`);
  assert(stockLog.length >= 2, "Inventory transaction log was not written");

  const vehicleDepot = await api(`/api/depots/${depotId}/vehicles`, {
    method: "POST",
    body: { name: "E2E Truck", capacity: 275 },
  });
  const vehicle = vehicleDepot.vehicles.find((entry) => entry.name === "E2E Truck");
  assert(vehicle, "Dynamic vehicle creation failed");
  await api(`/api/depots/${depotId}/vehicles/${vehicle.id}`, {
    method: "PATCH",
    body: { status: "busy" },
  });
  await api(`/api/depots/${depotId}/vehicles/${vehicle.id}`, {
    method: "PATCH",
    body: { status: "available" },
  });
  await api(`/api/depots/${depotId}/vehicles/${vehicle.id}`, { method: "DELETE" });

  const advanced = await api("/api/simulate/advance-time", {
    method: "POST",
    body: { hours: 6 },
  });
  assert(advanced.every((request) => request.hoursWaiting >= 6), "Time advancement failed");

  const plan = await api("/api/allocation/generate", { method: "POST", body: {} });
  assert(plan.rows.length > 0 && plan.baseline, "Allocation generation failed");
  const approval = await api("/api/allocation/approve", {
    method: "POST",
    body: { all: true },
  });
  assert(approval.approved > 0, "Allocation approval produced no deliveries");

  const saved = await api("/api/allocation");
  assert(saved.length === approval.approved, "Saved allocation count does not match approval");
  const routeRow = saved.find((row) => row.depotId && row.requestId);
  const route = await api(
    `/api/routes?depotId=${routeRow.depotId}&requestId=${routeRow.requestId}`,
  );
  assert(route.polyline.length >= 2, "Route lookup failed");

  const deliveries = await api("/api/deliveries");
  assert(deliveries.length > 0, "Approved allocations did not create driver loads");
  const delivery = deliveries[0];
  const started = await api("/api/deliveries/start", {
    method: "POST",
    body: { allocationIds: [delivery.allocationId] },
  });
  assert(started.started === 1, "Delivery did not start");
  await new Promise((resolve) => setTimeout(resolve, 2200));
  const moving = (await api(`/api/deliveries?vehicleId=${delivery.vehicleId}`)).find(
    (entry) => entry.allocationId === delivery.allocationId,
  );
  assert(moving?.progressPct > 0, "Truck simulator did not advance");
  const completed = await api(`/api/deliveries/${delivery.allocationId}/complete`, {
    method: "POST",
    body: {},
  });
  assert(completed.status === "delivered", "Delivery completion failed");
  const tracked = await api(`/api/requests/${delivery.requestId}`);
  assert(Array.isArray(tracked.tracking), "Requester tracking response is missing");

  const scenario = await api("/api/simulate/recalculate", {
    method: "POST",
    body: { action: "add_stock", depotId, item: "water", qty: 100 },
  });
  assert(scenario.before && scenario.after && scenario.diff, "Scenario comparison failed");
  await api("/api/simulate/undo", { method: "POST", body: {} });
  assert(Array.isArray(await api("/api/simulate/blocks")), "Road-block listing failed");

  console.log(
    `End-to-end check passed: request ${created.id}, ${approval.approved} allocations, ${deliveries.length} delivery groups, truck reached ${moving.progressPct}%.`,
  );
} finally {
  if (resetAvailable) {
    try {
      await api("/api/seed/reset", { method: "POST", body: {} });
      const [requests, depots, allocations, stockLog] = await Promise.all([
        api("/api/requests"),
        api("/api/depots"),
        api("/api/allocation"),
        api("/api/stock-log"),
      ]);
      assert(requests.length === 12, "Final reset did not restore 12 requests");
      assert(depots.flatMap((depot) => depot.vehicles).length === 6, "Final reset did not restore 6 vehicles");
      assert(allocations.length === 0, "Final reset did not clear allocations");
      assert(stockLog.length === 0, "Final reset did not clear the stock log");
      console.log("Final reset verified: 12 requests, 3 depots, 6 vehicles, no allocations or stock logs.");
    } catch (error) {
      console.error("Final reset verification failed", error);
      process.exitCode = 1;
    }
  }
  server.close();
}
