#!/usr/bin/env python3
"""Guard: checks the federated term register. Exit 1 on errors.
Reports: missing language, missing source, dangling mapping, same word in two worlds without a mapping,
concepts that are neither mapped nor annotated. Lists proposals to the specs and convergence tasks."""
import sys
from terms_lib import load
concepts, links, notes, problems, warnings = load()
print(f"{len(concepts)} concepts, {sum(len(v) for v in links.values()) // 2} mappings")
props = [c for c in concepts.values() if c.get("rl:status") == "proposed"]
print("PROPOSALS TO THE SPECS:" if props else "no proposals"); [print(f" - {c['@id']} ({c['_world']})") for c in props]
conv = [(a, b) for a, v in links.items() for r, b in v if r == "rl:convergesWith" and a < b]
print("CONVERGENCE TASKS:" if conv else "no convergence tasks"); [print(f" - {a} -> {b}") for a, b in conv]
print("ERRORS:" if problems else "no errors"); [print(" -", p) for p in problems]
print("WARNINGS:" if warnings else "no warnings"); [print(" -", w) for w in warnings]
sys.exit(1 if problems else 0)
