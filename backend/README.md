# Karwan Backend

Node.js and Express API for the Karwan disaster relief resource optimizer.

## Implemented phases

Phase 1 contains the backend foundation:

- Express application startup
- Environment validation
- Supabase server clients
- Database constants and shared repository utilities
- Snake case and camel case mappers
- Standard API error handling
- Liveness and database readiness checks
- Foundation tests

Phase 2 contains transparent priority scoring and the agreed weight endpoints:

- `GET /api/settings/weights`
- `PUT /api/settings/weights`
- Weighted score parts that add up to the displayed total
- Immediate re-scoring and sorting of requests after a weight update

Phase 3 contains assistance request registration and tracking:

- `GET /api/requests`
- `POST /api/requests`
- `GET /api/requests/:id`
- `PATCH /api/requests/:id`
- Filters for status, item, and urgency
- Score, fulfilment, items, and delivery tracking in the agreed response shape

Phase 4 contains depot and inventory management:

- `GET /api/depots`
- `PATCH /api/depots/:id/inventory`
- `PATCH /api/depots/:id`
- `GET /api/stock-log?depotId=...`
- Existing vehicles included in each depot response
- Low-stock state from `v_inventory`
- Stock adjustments protected from negative quantities and written to `stock_log`

Phase 5 contains the operational dashboard and demo time control:

- `GET /api/dashboard`
- `POST /api/simulate/advance-time`
- Active-request and affected-population KPIs
- Delivery progress counts, critical shortages, inventory totals, and low-stock alerts
- Persistent waiting-time offset with immediate request re-scoring

Phase 6 contains allocation recommendations and approval:

- `POST /api/allocation/generate`
- `POST /api/allocation/approve`
- `GET /api/allocation`
- Weighted fair sharing, nearest-depot selection, capacity limits, vehicles, and blocked-zone penalties
- First-come-first-served baseline comparison
- Approval writes allocations, deducts stock, writes dispatch logs, and updates request fulfilment/status

Phase 7 contains safe what-if scenarios:

- `POST /api/simulate/recalculate`
- `POST /api/simulate/apply`
- `POST /api/simulate/undo`
- `GET /api/simulate/blocks`
- `DELETE /api/simulate/blocks/:id`
- Stock, population, new-request, capacity, and blocked-zone scenario actions
- Before/after fulfilment comparison with gained, lost, and unchanged requests

Phase 8 contains real route lookup and caching:

- `GET /api/routes?depotId=...&requestId=...`
- Cache-first reads from `route_cache`
- OSRM road routes with GeoJSON coordinate conversion
- Five-second timeout with Haversine estimated-route fallback
- `npm run warm:routes` to pre-fetch all depot/request pairs

Phase 9 contains driver deliveries and live truck progress:

- `GET /api/deliveries` with optional `vehicleId` filter
- `POST /api/deliveries/start`
- `POST /api/deliveries/:allocationId/complete`
- Allocation rows grouped into driver loads with items, route, ETA, and truck position
- One-second simulator updates for allocation progress and vehicle coordinates
- Automatic arrival completion, request status updates, and vehicle release
- Supabase Realtime-compatible writes with polling support from the frontend

Phase 10 completes the demo and frontend integration:

- `POST /api/seed/reset`
- Reset stops active simulators, restores SQL seed data, clears AI request metadata, and clears pending in-memory plans
- Dynamic vehicle create, availability update, and removal endpoints
- `POST /api/depots/:id/vehicles`
- `PATCH /api/depots/:id/vehicles/:vehicleId`
- `DELETE /api/depots/:id/vehicles/:vehicleId`
- Full reset-driven end-to-end verification script

All planned MVP backend phases are complete.

## Setup

1. Use Node.js 22 or newer.
2. Copy `.env.example` to `.env` and provide the Supabase values.
3. Install dependencies with `npm install`.
4. Start development mode with `npm run dev`.

The backend defaults to `http://localhost:4000`.

## Checks

```text
npm test
npm run check:allocation
npm run check:ai-contract
npm run check:db
npm run check:e2e
npm run check:dashboard
npm run check:inventory
npm run check:requests
npm run check:routes-deliveries
```

HTTP checks:

```text
GET /health/live
GET /health/ready
```

The readiness endpoint expects the database seed defined by the agreed SQL:
3 depots, 12 requests, 6 vehicles, and 41 request items.

For a deployed integration check, set `API_URL` to the Express base URL before
running `npm run check:ai-contract`. The check confirms the published AI
contract, request tracing, response envelope, and all FastAPI context reads.
Only browser frontend origins belong in `CLIENT_ORIGIN`; the FastAPI service
can make server-to-server reads without being added to CORS.

## Secrets

The Supabase secret key belongs only in `.env`. The file is ignored by Git.
Never include the secret key in frontend code, commits, screenshots, or logs.
