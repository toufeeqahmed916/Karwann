import { createApp } from "../src/app.js";

const app = createApp();
const server = app.listen(0);

async function api(path) {
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}${path}`);
  const body = await response.json();
  if (!response.ok) throw new Error(`${response.status} ${path}: ${JSON.stringify(body)}`);
  return body.data;
}

try {
  const route = await api("/api/routes?depotId=dep_01&requestId=req_01");
  const deliveries = await api("/api/deliveries");
  if (!Array.isArray(route.polyline) || route.polyline.length < 2) {
    throw new Error("Route response has no usable polyline");
  }
  if (!Array.isArray(deliveries)) {
    throw new Error("Deliveries response is not a list");
  }
  console.log(
    `Routes and deliveries API check passed: ${route.distanceKm} km, ${route.durationMin} min, estimated=${route.estimated}, ${deliveries.length} delivery groups.`,
  );
} finally {
  server.close();
}
