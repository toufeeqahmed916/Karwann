"""Fails (exit 1) if a Gemini-style key, or a secret-looking VITE_ variable, is anywhere it should not be.

Run from the repo root:   python ai-service/scripts/check_secrets.py
Scans: every git-tracked file + untracked non-ignored files, and frontend/dist (the built bundle) if present.
"""
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
KEY_RE = re.compile(r"AIza[0-9A-Za-z_\-]{30,}")  # Google API key shape
ENV_ASSIGN_RE = re.compile(r"^[ \t]*(GEMINI_KEY_[AB]|SUPABASE_SERVICE_KEY)[ \t]*=[ \t]*(\S*)", re.M)
VITE_BAD_RE = re.compile(r"VITE_[A-Z_]*(GEMINI|SERVICE_KEY|SECRET)[A-Z_]*", re.I)
SKIP_SUFFIX = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".woff", ".woff2", ".ttf", ".lock", ".pyc"}


def candidate_files() -> list[Path]:
    out = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard"],
        cwd=ROOT, capture_output=True, text=True, check=True,
    ).stdout.splitlines()
    files = [ROOT / f for f in out if (ROOT / f).is_file() and (ROOT / f).suffix.lower() not in SKIP_SUFFIX]
    dist = ROOT / "frontend" / "dist"
    if dist.exists():
        files += [f for f in dist.rglob("*") if f.is_file() and f.suffix.lower() not in SKIP_SUFFIX]
    return files


def main() -> int:
    problems = []
    files = candidate_files()
    for f in files:
        if f.name == "check_secrets.py":
            continue
        text = f.read_text(encoding="utf-8", errors="ignore")
        rel = f.relative_to(ROOT)
        if KEY_RE.search(text):
            problems.append(f"{rel}: looks like a Google API key")
        for m in ENV_ASSIGN_RE.finditer(text):
            if m.group(2).strip("\"'"):  # .env.example has empty values and passes
                problems.append(f"{rel}: {m.group(1)} has a value")
        if VITE_BAD_RE.search(text) and rel.suffix != ".md":
            problems.append(f"{rel}: a secret-looking VITE_ variable name")

    tracked = set(subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True).stdout.splitlines())
    for f in ROOT.rglob(".env"):
        if "node_modules" in f.parts:
            continue
        if str(f.relative_to(ROOT)).replace("\\", "/") in tracked:
            problems.append(f"{f.relative_to(ROOT)}: a real .env file is tracked by git")

    print(f"Scanned {len(files)} files.")
    if problems:
        print("PROBLEMS FOUND:")
        print("\n".join(" - " + p for p in problems))
        return 1
    print("OK: no keys in tracked files, and none in the frontend bundle.")
    return 0


sys.exit(main())
