import { createApp } from "../src/app.js";

const app = createApp();
const server = app.listen(0);

async function api(path, options) {
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`${response.status} ${path}: ${JSON.stringify(body)}`);
  }
  return body.data;
}

try {
  const plan = await api("/api/allocation/generate", {
    method: "POST",
    body: "{}",
  });
  const [saved, blocks] = await Promise.all([
    api("/api/allocation"),
    api("/api/simulate/blocks"),
  ]);

  if (!Array.isArray(plan.rows) || !plan.summary || !plan.baseline) {
    throw new Error("Generated allocation does not match the agreed response shape");
  }
  if (!Array.isArray(saved) || !Array.isArray(blocks)) {
    throw new Error("Saved allocations or road blocks did not return a list");
  }

  console.log(
    `Allocation API check passed: ${plan.rows.length} recommendations, ${plan.summary.overallFulfilmentPct}% overall fulfilment, ${saved.length} saved rows, ${blocks.length} active blocks.`,
  );
} finally {
  server.close();
}
