"""DEV ONLY: a tiny stand-in for the Express API with the real response shapes ({ data } envelope).

Lets you run the whole Karwan 2.0 flow in a browser with NO Supabase and NO Gemini key.
Run from ai-service/:  .venv/Scripts/python -m uvicorn scripts.dev_stack.fake_express:app --port 4000
Data comes from frontend/src/mocks. POST /api/requests only keeps data in memory.
"""
import json
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

MOCKS = Path(__file__).resolve().parents[3] / "frontend" / "src" / "mocks"
load = lambda name: json.loads((MOCKS / name).read_text(encoding="utf-8"))  # noqa: E731

requests = load("requests.json")
depots = load("depots.json")
weights = load("weights.json")
dashboard = load("dashboard.json") if (MOCKS / "dashboard.json").exists() else {}

# One approved allocation so the assistant has something to explain (Badin gets less water than it asked for).
badin = next(r for r in requests if r["area"] == "Badin")
water = next(i for i in badin["items"] if i["item"] == "water")
allocation = [{
    "id": "alc_demo_1", "requestId": badin["id"], "area": "Badin", "depotId": depots[0]["id"],
    "depotName": depots[0]["name"], "vehicleId": "veh_01", "item": "water", "qty": 320,
    "qtyNeeded": water["qtyNeeded"], "unfulfilled": max(0, water["qtyNeeded"] - 320),
    "fulfilmentPct": round(320 / water["qtyNeeded"] * 100), "distanceKm": 92.4, "etaMin": 118,
    "status": "approved",
    "reason": "Water stock was limited, so it was shared by priority score and remaining need.",
}]

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_methods=["*"],
                   allow_headers=["*"], expose_headers=["X-Request-Id"])


@app.middleware("http")
async def tag(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Request-Id"] = request.headers.get("x-request-id", "fake")
    return response


@app.get("/health/ready")
def ready():
    return {"data": {"status": "ready", "database": "connected", "aiIntegration": {"version": "1"}}}


@app.get("/api/requests")
def get_requests():
    return {"data": requests}


@app.post("/api/requests")
async def post_request(request: Request):
    body = await request.json()
    saved = {**body, "id": f"req_new_{len(requests) + 1}", "status": "pending", "hoursWaiting": 0,
             "fulfilmentPct": 0, "createdAt": "2026-01-01T00:00:00Z",
             "items": [{**i, "qtyAllocated": 0} for i in body.get("items", [])],
             "score": {"total": 61, "parts": {"urgency": 25, "population": 12, "vulnerability": 15, "waiting": 0, "accessibility": 9}}}
    requests.append(saved)
    return {"data": saved}


@app.get("/api/allocation")
def get_allocation():
    return {"data": allocation}


@app.get("/api/depots")
def get_depots():
    return {"data": depots}


@app.get("/api/dashboard")
def get_dashboard():
    return {"data": dashboard}


@app.get("/api/deliveries")
def get_deliveries():
    return {"data": [{"allocationId": "alc_demo_1", "requestId": badin["id"], "area": "Badin",
                      "depotId": depots[0]["id"], "depotName": depots[0]["name"], "vehicleId": "veh_01",
                      "status": "in_transit", "progressPct": 35, "items": [{"item": "water", "qty": 320}],
                      "distanceKm": 92.4, "etaMin": 118, "route": [[24.6, 68.8]] * 300, "estimated": True}]}


@app.get("/api/settings/weights")
def get_weights():
    return {"data": weights}
