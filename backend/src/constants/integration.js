export const AI_INTEGRATION_CONTRACT = Object.freeze({
  version: "1",
  requestWrite: "/api/requests",
  contextReads: Object.freeze([
    "/api/requests",
    "/api/allocation",
    "/api/depots",
    "/api/dashboard",
    "/api/deliveries",
  ]),
  responseEnvelope: "data",
  requestIdHeader: "X-Request-Id",
});

