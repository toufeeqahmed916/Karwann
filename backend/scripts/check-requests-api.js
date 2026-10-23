import { createApp } from "../src/app.js";
import { supabaseAdmin } from "../src/config/supabase.js";
import { TABLES } from "../src/constants/database.js";

const app = createApp();
const server = app.listen(0);
let createdId;

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function api(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const body = await response.json();
  return { response, body };
}

try {
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const listed = await api(baseUrl, "/api/requests?urgency=critical&item=water");
  expect(listed.response.status === 200, "Request list check failed");
  expect(listed.body.data.length > 0, "Filtered request list is empty");
  expect(
    listed.body.data.every(
      (request) =>
        request.urgency === "critical" &&
        request.items.some((entry) => entry.item === "water"),
    ),
    "Request filters returned an unexpected record",
  );

  const created = await api(baseUrl, "/api/requests", {
    method: "POST",
    body: JSON.stringify({
      area: "Phase Three Verification",
      lat: 25.5,
      lng: 68.5,
      population: 125,
      urgency: "medium",
      vulnerable: false,
      accessibility: "easy",
      items: [
        { item: "water", qtyNeeded: 25 },
        { item: "food", qtyNeeded: 15 },
      ],
    }),
  });
  expect(created.response.status === 201, "Request creation check failed");
  createdId = created.body.data.id;
  expect(createdId, "Created request did not include an ID");

  const updated = await api(baseUrl, `/api/requests/${createdId}`, {
    method: "PATCH",
    body: JSON.stringify({ population: 250, urgency: "high" }),
  });
  expect(updated.response.status === 200, "Request update check failed");
  expect(updated.body.data.population === 250, "Population was not updated");
  expect(updated.body.data.urgency === "high", "Urgency was not updated");

  const detail = await api(baseUrl, `/api/requests/${createdId}`);
  expect(detail.response.status === 200, "Request detail check failed");
  expect(Array.isArray(detail.body.data.tracking), "Tracking must be an array");

  const invalid = await api(baseUrl, "/api/requests", {
    method: "POST",
    body: JSON.stringify({ area: "Invalid" }),
  });
  expect(invalid.response.status === 400, "Invalid request must return 400");
  expect(
    invalid.body.error?.code === "VALIDATION_ERROR",
    "Invalid request must use VALIDATION_ERROR",
  );

  console.log("Phase 3 request API verified against Supabase.");
} finally {
  if (createdId) {
    const cleanup = await supabaseAdmin
      .from(TABLES.requests)
      .delete()
      .eq("id", createdId);
    if (cleanup.error) {
      console.error("Could not remove Phase 3 verification request", cleanup.error);
      process.exitCode = 1;
    }
  }
  await new Promise((resolve) => server.close(resolve));
}
