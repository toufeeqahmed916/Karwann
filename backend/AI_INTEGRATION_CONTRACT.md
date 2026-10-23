# Karwan AI Integration Contract

Contract version: **1**

This document defines the existing Express API surface used by the React
frontend and the separate FastAPI AI service. The Express backend remains the
operational source of truth.

## Boundaries

- React calls FastAPI for AI intake, transcription, chat, and optional
  credibility analysis.
- React sends a human-confirmed operational request directly to Express.
- FastAPI reads live operational facts from Express for chat context.
- FastAPI does not call Express write endpoints.
- Gemini does not calculate authoritative scores or allocations.
- AI metadata is written by FastAPI with its server-side Supabase service role;
  Express does not expose an AI metadata write endpoint.
- `verification_status = rejected` is advisory metadata only. It does not
  silently remove a request from the existing allocation flow.

## Request tracing

Every Express response includes `X-Request-Id`.

FastAPI should send its correlation ID in the same header. Express preserves a
safe incoming ID containing 1-128 letters, digits, dots, underscores, colons,
or hyphens. Otherwise, Express generates a UUID.

Error responses include the same value as `requestId`:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Route not found"
  },
  "requestId": "ai-chat-req_01"
}
```

## Demo reset lifecycle

`POST /api/seed/reset` runs the existing operational reset and then clears
`request_ai_metadata`. This prevents AI analysis from an earlier demo run from
remaining attached to reset request IDs. If the operational reset fails, the
metadata cleanup is not attempted.

## Deployment verification

After deploying Express and setting `API_URL` to its public base URL, run:

```bash
npm run check:ai-contract
```

The check verifies readiness discovery, contract version 1, the `data`
response envelope, `X-Request-Id` propagation, and all five read-only context
endpoints. FastAPI deployment should be promoted only after this check passes.

All API responses disable caching and include basic browser hardening headers.
Only React browser origins belong in `CLIENT_ORIGIN`; FastAPI server-to-server
requests do not require a CORS entry.

## React to Express: confirmed request

`POST /api/requests`

```json
{
  "area": "Dadu",
  "lat": 26.73,
  "lng": 67.78,
  "population": 240,
  "urgency": "high",
  "vulnerable": true,
  "accessibility": "hard",
  "items": [
    {
      "item": "water",
      "qtyNeeded": 500
    }
  ]
}
```

The existing validator remains authoritative. AI-only fields such as raw text,
confidence, and credibility are not accepted by this endpoint.

Success uses the existing envelope:

```json
{
  "data": {
    "id": "req_13",
    "area": "Dadu",
    "score": {
      "total": 78,
      "parts": {}
    }
  }
}
```

## FastAPI to Express: read-only context

FastAPI sends `Accept: application/json` and `X-Request-Id`. It unwraps the
existing top-level `data` property from every successful response.

### `GET /api/requests`

Provides request identity, area, coordinates, population, urgency,
vulnerability, accessibility, status, waiting time, supply needs, allocated
quantities, fulfilment, and priority score total/parts.

Optional filters remain supported: `status`, `item`, and `urgency`.

### `GET /api/allocation`

Provides saved allocation rows with request/depot/vehicle IDs, item, allocated
quantity, needed quantity, unfulfilled quantity, fulfilment percentage,
distance, ETA, status, and the stored explanation reason.

### `GET /api/depots`

Provides depot identity/location, daily capacity, inventory quantities and
thresholds, and vehicle state.

### `GET /api/dashboard`

Provides active requests, people awaiting help, delivery counts, shortages,
inventory totals, and low-stock alerts.

### `GET /api/deliveries`

Provides grouped deliveries with allocation/request/depot/vehicle IDs, status,
progress, position, ETA, items, route, and estimated-route flag.

An optional `vehicleId` query remains supported.

## Service behavior

- FastAPI should use a five-second timeout for each Express read.
- Independent reads may run concurrently.
- The combined chat context may be cached for at most ten seconds.
- If required operational data is unavailable, FastAPI returns
  `KARWAN_API_UNAVAILABLE`; it must not ask Gemini to guess.
- Server-to-server FastAPI requests are not governed by browser CORS.
- No staff credentials, Supabase keys, or browser session values are forwarded.

## Readiness discovery

`GET /health/ready` publishes the contract version and endpoint list:

```json
{
  "data": {
    "status": "ready",
    "database": "connected",
    "seedCounts": {},
    "aiIntegration": {
      "version": "1",
      "requestWrite": "/api/requests",
      "contextReads": [
        "/api/requests",
        "/api/allocation",
        "/api/depots",
        "/api/dashboard",
        "/api/deliveries"
      ],
      "responseEnvelope": "data",
      "requestIdHeader": "X-Request-Id"
    }
  }
}
```

