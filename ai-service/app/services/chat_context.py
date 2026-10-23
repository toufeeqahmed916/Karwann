"""Reduce the five Express payloads to a compact, labelled DATA block for Gemini."""
from __future__ import annotations

import json
import re
from typing import Any

MAX_CONTEXT_CHARS = 14000
GENERAL_REQUEST_LIMIT = 15
GENERAL_ALLOCATION_LIMIT = 40


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").lower()).strip()


def _request(r: dict) -> dict:
    return {
        "id": r.get("id"), "area": r.get("area"), "population": r.get("population"),
        "urgency": r.get("urgency"), "vulnerable": r.get("vulnerable"),
        "accessibility": r.get("accessibility"), "status": r.get("status"),
        "hoursWaiting": r.get("hoursWaiting"), "fulfilmentPct": r.get("fulfilmentPct"),
        "score": r.get("score"),
        "items": [{k: i.get(k) for k in ("item", "qtyNeeded", "qtyAllocated")} for i in r.get("items", [])],
    }


def _allocation(a: dict) -> dict:
    keys = ("id", "requestId", "area", "depotId", "depotName", "item", "qty", "qtyNeeded",
            "unfulfilled", "fulfilmentPct", "distanceKm", "etaMin", "status", "reason")
    return {k: a.get(k) for k in keys}


def _depot(d: dict) -> dict:
    vehicles = d.get("vehicles", [])
    return {
        "id": d.get("id"), "name": d.get("name"), "dailyCapacity": d.get("dailyCapacity"),
        "stock": [{k: s.get(k) for k in ("item", "qty", "lowThreshold", "isLow")} for s in d.get("stock", [])],
        "vehicles": {"total": len(vehicles), "available": sum(1 for v in vehicles if v.get("status") == "available")},
    }


def _delivery(d: dict) -> dict:
    # route polyline, lat/lng are dropped on purpose - huge and useless for explanations
    keys = ("allocationId", "requestId", "area", "depotName", "vehicleId", "status",
            "progressPct", "distanceKm", "etaMin", "items")
    return {k: d.get(k) for k in keys}


def build_context(data: dict[str, Any], question: str) -> tuple[str, set[tuple[str, str]]]:
    """Returns (DATA json string, set of (type, id) pairs that may be cited as sources)."""
    q = _norm(question)
    requests = [r for r in data.get("requests") or [] if isinstance(r, dict)]
    allocations = [a for a in data.get("allocation") or [] if isinstance(a, dict)]
    depots = [d for d in data.get("depots") or [] if isinstance(d, dict)]
    deliveries = [d for d in data.get("deliveries") or [] if isinstance(d, dict)]
    dashboard = data.get("dashboard") if isinstance(data.get("dashboard"), dict) else {}

    named_areas = {_norm(r.get("area", "")) for r in requests} | {_norm(a.get("area", "")) for a in allocations}
    mentioned = {a for a in named_areas if a and a in q}
    mentioned_depots = {
        d.get("id") for d in depots
        if _norm(d.get("name", "")) in q or _norm(d.get("name", "")).replace(" depot", "") in q
    }

    if mentioned or mentioned_depots:
        req_rows = [r for r in requests if _norm(r.get("area", "")) in mentioned]
        alloc_rows = [a for a in allocations
                      if _norm(a.get("area", "")) in mentioned or a.get("depotId") in mentioned_depots]
        deliv_rows = [d for d in deliveries
                      if _norm(d.get("area", "")) in mentioned or d.get("depotId") in mentioned_depots]
        scope = "focused on the places named in the question"
    else:
        active = [r for r in requests if r.get("status") != "delivered"]
        ranked = sorted(active, key=lambda r: (r.get("score") or {}).get("total", 0), reverse=True)
        req_rows = ranked[:GENERAL_REQUEST_LIMIT]
        alloc_rows = allocations[:GENERAL_ALLOCATION_LIMIT]
        deliv_rows = [d for d in deliveries if d.get("status") != "delivered"]
        scope = "general: top-ranked active requests only"

    payload = {
        "contextScope": scope,
        "totals": {"requests": len(requests), "allocations": len(allocations),
                   "depots": len(depots), "deliveries": len(deliveries)},
        "dashboard": dashboard,
        "requests": [_request(r) for r in req_rows],
        "allocations": [_allocation(a) for a in alloc_rows],
        "depots": [_depot(d) for d in depots],
        "deliveries": [_delivery(d) for d in deliv_rows],
    }

    text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    # Enforce a hard size cap: drop the least important rows first.
    for key in ("deliveries", "requests", "allocations"):
        while len(text) > MAX_CONTEXT_CHARS and payload[key]:
            payload[key] = payload[key][: max(0, len(payload[key]) // 2)]
            payload["contextScope"] += f" (trimmed {key})"
            text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))

    known = (
        {("request", str(r["id"])) for r in payload["requests"] if r.get("id")}
        | {("allocation", str(a["id"])) for a in payload["allocations"] if a.get("id")}
        | {("depot", str(d["id"])) for d in payload["depots"] if d.get("id")}
        | {("delivery", str(d["allocationId"])) for d in payload["deliveries"] if d.get("allocationId")}
    )
    return text, known
