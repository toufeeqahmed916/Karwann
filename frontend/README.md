# Karwan client (Person B)
```
cp .env.example .env
npm install
npm run dev
```
`VITE_USE_MOCKS=false` connects every completed feature to the backend. Mock data remains available for isolated frontend demonstrations; regenerate it with `npm run mocks`.

Requests, weights, inventory, vehicles, dashboard, allocation, simulation,
routes, deliveries, and reset now use the real backend through `src/lib/api.js`.

Application screens:

- `/inventory` — stock, capacity, dynamic vehicles, alerts and stock log
- `/dashboard` — KPIs, status pipeline, map details and time advance
- `/allocation` — generate, compare, inspect routes and approve a plan
- `/simulator` — six what-if actions, road blocks, before/after diff, Apply and Undo
- `/driver` — assigned load, route, live truck, Start Trip and Mark Delivered
- `/tracker` — requester-facing delivery status, ETA, progress and live map

The Dashboard includes five client-computed heat layers: Need, Urgency, Supply
gap, Delivery delay and Accessibility. Dashboard and Allocation use the shared
route layer; dashed lines identify estimated fallback routes.

Delivery screens subscribe to Supabase Realtime. If the subscription is not
available, they automatically poll the backend every two seconds.

Run both applications during development:

```text
cd ../backend
npm run dev

cd ../frontend
npm run dev
```
