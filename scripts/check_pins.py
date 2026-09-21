#!/usr/bin/env python3
"""Reports pinned concept schemes whose file has moved on in its own repository (no dependencies).

terms/sources.json pins each world to a commit, so the register describes a state someone checked.
That pin does not follow the world: a repository can change its concept scheme and nothing here
notices. This script asks each repository for the current head of its default branch and compares
the scheme file byte for byte.

Three outcomes per world:
  current   the pinned commit is the head
  behind    the head is newer, but the scheme file is identical — nothing to do
  drifted   the scheme file differs — the register shows a state the world has left

Exit 1 if any world has drifted, 0 otherwise. The fix is one commit: set that world's `ref` in
terms/sources.json to the commit this script names, then run fetch_worlds.py, guard.py, render.py.

  usage: check_pins.py [--verbose]
"""
import json, pathlib, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
VERBOSE = "--verbose" in sys.argv[1:]
UNKNOWN = [a for a in sys.argv[1:] if a != "--verbose"]
if UNKNOWN: raise SystemExit(f"unexpected argument {UNKNOWN[0]!r}\nusage: check_pins.py [--verbose]")


def run(*args, **kw):
    return subprocess.run(args, capture_output=True, text=True, **kw)


def head_of(url, branch):
    """The commit the branch points at, or None if the repository cannot be reached."""
    r = run("git", "ls-remote", url, f"refs/heads/{branch}")
    if r.returncode != 0 or not r.stdout.split(): return None
    return r.stdout.split()[0]


def file_at(url, ref, path, workdir):
    """The bytes of one file at one commit, fetched shallow; None if it is not there."""
    d = pathlib.Path(workdir)
    if not (d / ".git").exists(): run("git", "init", "-q", str(d))
    if run("git", "-C", str(d), "fetch", "-q", "--depth", "1", url, ref).returncode != 0: return None
    r = run("git", "-C", str(d), "show", f"FETCH_HEAD:{path}")
    return r.stdout if r.returncode == 0 else None


schemes = json.load(open(ROOT / "terms/sources.json"))["schemes"]
drifted, problems = [], []

for world, s in schemes.items():
    if s.get("ref") is None:
        print(f"{world}: not pinned, uses its seed copy")
        continue
    url = f"https://github.com/{s['repo']}.git"
    branch, ref, path = s.get("branch", "main"), s["ref"], s["path"]
    head = head_of(url, branch)
    if head is None:
        problems.append(f"{world}: cannot reach {s['repo']} or it has no branch {branch}")
        continue
    if head == ref:
        print(f"{world}: current, pinned at {ref[:7]}")
        continue
    with tempfile.TemporaryDirectory() as tmp:
        pinned = file_at(url, ref, path, tmp)
    with tempfile.TemporaryDirectory() as tmp:
        latest = file_at(url, head, path, tmp)
    if pinned is None or latest is None:
        problems.append(f"{world}: {path} missing at {(ref if pinned is None else head)[:7]}")
        continue
    if pinned == latest:
        print(f"{world}: behind, pinned {ref[:7]} and head {head[:7]} carry the same {path}")
        continue
    drifted.append((world, head))
    print(f"{world}: DRIFTED, {path} differs between pinned {ref[:7]} and head {head[:7]}")
    if VERBOSE:
        import difflib
        for line in difflib.unified_diff(pinned.splitlines(), latest.splitlines(),
                                         f"{world} {ref[:7]}", f"{world} {head[:7]}", lineterm="", n=1):
            print("  " + line)

if problems:
    print("PROBLEMS:")
    for p in problems: print(" -", p)
if drifted:
    print("\nRe-pin in terms/sources.json, then run fetch_worlds.py, guard.py, render.py:")
    for world, head in drifted: print(f'  "{world}": "ref": "{head}"')

sys.exit(1 if drifted or problems else 0)
