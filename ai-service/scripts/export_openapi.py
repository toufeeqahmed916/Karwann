"""Writes docs/openapi.json (hand-off for the frontend engineer). Run from ai-service/: python scripts/export_openapi.py"""
import json
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root))

from app.main import app  # noqa: E402

spec = app.openapi()
out = root / "docs" / "openapi.json"
out.write_text(json.dumps(spec, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"Wrote {out} ({len(spec['paths'])} paths)")
