import { createApp } from "../src/app.js";

const app = createApp();
const server = app.listen(0);

async function request(path, options) {
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}${path}`, options);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`${response.status} ${path}: ${JSON.stringify(body)}`);
  }
  return body.data;
}

try {
  const depots = await request("/api/depots");
  if (depots.length !== 3) {
    throw new Error(`Expected 3 depots, received ${depots.length}`);
  }

  const depot = depots[0];
  if (!Array.isArray(depot.stock) || !Array.isArray(depot.vehicles)) {
    throw new Error("Depot response is missing stock or vehicles");
  }

  const stockLog = await request(`/api/stock-log?depotId=${depot.id}`);
  if (!Array.isArray(stockLog)) {
    throw new Error("Stock log response is not an array");
  }

  console.log(
    `Inventory API check passed: ${depots.length} depots, ${depot.stock.length} stock rows, ${depot.vehicles.length} vehicles.`,
  );
} finally {
  server.close();
}
