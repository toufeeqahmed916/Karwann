import { createApp } from "../src/app.js";

const app = createApp();
const server = app.listen(0);

try {
  const address = server.address();
  const response = await fetch(
    `http://127.0.0.1:${address.port}/api/dashboard`,
  );
  const body = await response.json();

  if (!response.ok) {
    throw new Error(`${response.status}: ${JSON.stringify(body)}`);
  }

  const dashboard = body.data;
  const requiredArrays = [
    "criticalShortages",
    "inventoryTotals",
    "lowStockAlerts",
  ];
  if (requiredArrays.some((key) => !Array.isArray(dashboard[key]))) {
    throw new Error("Dashboard response is missing an expected list");
  }

  console.log(
    `Dashboard API check passed: ${dashboard.activeRequests} active requests, ${dashboard.peopleAwaiting} people awaiting, ${dashboard.lowStockAlerts.length} low-stock alerts.`,
  );
} finally {
  server.close();
}
