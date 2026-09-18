#!/usr/bin/env python3
"""Guard: checks the federated term register. Exit 1 on errors.
Reports: missing language, missing source, dangling mapping, same word in two worlds without a mapping,
concepts that are neither mapped nor annotated. Lists proposals to the specs and convergence tasks.

usage: guard.py [--scheme WORLD=PATH ...]
  --scheme  check PATH as WORLD's concept scheme instead of the pinned source. A repository's CI uses
            this to check its own working copy against the register (see README, "Guard in a repository's CI")."""
import sys
from terms_lib import load, parse_overrides
overrides = parse_overrides(sys.argv[1:])
for w, f in overrides.items(): print(f"{w}: checking {f}")
concepts, links, notes, problems, warnings = load(overrides)
print(f"{len(concepts)} concepts, {sum(len(v) for v in links.values()) // 2} mappings")
props = [c for c in concepts.values() if c.get("rl:status") == "proposed"]
print("PROPOSALS TO THE SPECS:" if props else "no proposals"); [print(f" - {c['@id']} ({c['_world']})") for c in props]
conv = [(a, b) for a, v in links.items() for r, b in v if r == "rl:convergesWith" and a < b]
print("CONVERGENCE TASKS:" if conv else "no convergence tasks"); [print(f" - {a} -> {b}") for a, b in conv]
print("ERRORS:" if problems else "no errors"); [print(" -", p) for p in problems]
print("WARNINGS:" if warnings else "no warnings"); [print(" -", w) for w in warnings]
sys.exit(1 if problems else 0)
