const baseUrl = (process.env.API_URL || "http://localhost:4000").replace(/\/+$/, "");
const expectedReads = [
  "/api/requests",
  "/api/allocation",
  "/api/depots",
  "/api/dashboard",
  "/api/deliveries",
];
const requestId = `ai-contract-check-${Date.now()}`;

async function readJson(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Accept: "application/json",
      "X-Request-Id": requestId,
    },
    signal: AbortSignal.timeout(10_000),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}: ${JSON.stringify(body)}`);
  }
  if (!body || !("data" in body)) {
    throw new Error(`${path} does not use the required data envelope`);
  }
  if (response.headers.get("x-request-id") !== requestId) {
    throw new Error(`${path} did not preserve X-Request-Id`);
  }

  return body.data;
}

const readiness = await readJson("/health/ready");
const contract = readiness.aiIntegration;

if (contract?.version !== "1") {
  throw new Error(`Expected AI contract version 1, received ${contract?.version ?? "none"}`);
}
if (contract.requestWrite !== "/api/requests") {
  throw new Error("Readiness returned an unexpected confirmed-request endpoint");
}
if (contract.responseEnvelope !== "data" || contract.requestIdHeader !== "X-Request-Id") {
  throw new Error("Readiness returned an incompatible envelope or request ID contract");
}
if (JSON.stringify(contract.contextReads) !== JSON.stringify(expectedReads)) {
  throw new Error("Readiness returned an unexpected AI context endpoint list");
}

await Promise.all(expectedReads.map(readJson));

console.log(
  `AI integration contract v${contract.version} passed for ${expectedReads.length} context endpoints at ${baseUrl}.`,
);
