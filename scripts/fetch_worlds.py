#!/usr/bin/env python3
"""Fetches each pinned concept scheme repository into worlds/<world> (no dependencies).
terms/sources.json names the repository, the file and the commit per world; a world whose ref is
null still uses its seed copy and is skipped. Run before guard.py, render.py or the site generator."""
import json, pathlib, subprocess
ROOT = pathlib.Path(__file__).resolve().parent.parent
src = json.load(open(ROOT / "terms/sources.json"))["schemes"]
for w, s in src.items():
    if s.get("ref") is None: continue
    d = ROOT / "worlds" / w
    git = lambda *a, **k: subprocess.run(["git", "-C", str(d), *a], check=True, text=True, **k)
    if (d / ".git").exists() and git("rev-parse", "HEAD", capture_output=True).stdout.strip() == s["ref"]:
        print(f"{w}: already at {s['ref'][:7]}"); continue
    d.mkdir(parents=True, exist_ok=True)
    if not (d / ".git").exists(): git("init", "-q")
    git("fetch", "-q", "--depth", "1", f"https://github.com/{s['repo']}.git", s["ref"])
    git("checkout", "-q", "--detach", "FETCH_HEAD")
    print(f"{w}: {s['repo']} at {s['ref'][:7]}")
