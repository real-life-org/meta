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

A world that cannot be reached, or whose file is missing at either commit, is a failed check and
never a drift finding: nothing was compared, so nothing is known. The two are reported apart,
because the answers differ — drift is followed by a decision to re-pin, a failed check by fixing
whatever broke the check.

Exit codes (a caller MUST treat any other code as a failed run, a crash included):
  0  every world could be compared, none has drifted
  2  drift proven
  3  at least one world could not be checked
  4  both

  usage: check_pins.py [--verbose]
"""
import difflib, json, pathlib, subprocess, sys, tempfile

OK, DRIFT, FAILED, BOTH = 0, 2, 3, 4
ROOT = pathlib.Path(__file__).resolve().parent.parent


def github_url(scheme):
    return f"https://github.com/{scheme['repo']}.git"


def _run(*args):
    return subprocess.run(args, capture_output=True, text=True)


def _head_of(url, branch):
    """The commit the branch points at, or None if the repository cannot be reached."""
    r = _run("git", "ls-remote", url, f"refs/heads/{branch}")
    if r.returncode != 0 or not r.stdout.split(): return None
    return r.stdout.split()[0]


def _file_at(url, ref, path):
    """The text of one file at one commit, fetched shallow; None if it cannot be read."""
    with tempfile.TemporaryDirectory() as tmp:
        if _run("git", "init", "-q", tmp).returncode != 0: return None
        if _run("git", "-C", tmp, "fetch", "-q", "--depth", "1", url, ref).returncode != 0: return None
        r = _run("git", "-C", tmp, "show", f"FETCH_HEAD:{path}")
        return r.stdout if r.returncode == 0 else None


def check(schemes, url_of=github_url, verbose=False):
    """Compares every pinned world with the head of its branch.

    Returns (lines, drifted, failures): the report as a list of lines, the worlds whose file
    differs as (world, head) pairs, and the worlds that could not be checked as (world, reason).
    """
    lines, drifted, failures = [], [], []
    for world, s in schemes.items():
        if s.get("ref") is None:
            lines.append(f"{world}: not pinned, uses its seed copy")
            continue
        url, branch, ref, path = url_of(s), s.get("branch", "main"), s["ref"], s["path"]
        head = _head_of(url, branch)
        if head is None:
            failures.append((world, f"cannot reach {s['repo']} or it has no branch {branch}"))
            lines.append(f"{world}: NOT CHECKED, cannot reach {s['repo']} or it has no branch {branch}")
            continue
        if head == ref:
            lines.append(f"{world}: current, pinned at {ref[:7]}")
            continue
        pinned, latest = _file_at(url, ref, path), _file_at(url, head, path)
        if pinned is None or latest is None:
            missing = ref if pinned is None else head
            failures.append((world, f"{path} cannot be read at {missing[:7]}"))
            lines.append(f"{world}: NOT CHECKED, {path} cannot be read at {missing[:7]}")
            continue
        if pinned == latest:
            lines.append(f"{world}: behind, pinned {ref[:7]} and head {head[:7]} carry the same {path}")
            continue
        drifted.append((world, head))
        lines.append(f"{world}: DRIFTED, {path} differs between pinned {ref[:7]} and head {head[:7]}")
        if verbose:
            lines += ["  " + l for l in difflib.unified_diff(
                pinned.splitlines(), latest.splitlines(),
                f"{world} {ref[:7]}", f"{world} {head[:7]}", lineterm="", n=1)]
    return lines, drifted, failures


def status_of(drifted, failures):
    if drifted and failures: return BOTH
    if drifted: return DRIFT
    if failures: return FAILED
    return OK


def main(argv):
    verbose = False
    for a in argv:
        if a == "--verbose": verbose = True
        else: raise SystemExit(f"unexpected argument {a!r}\nusage: check_pins.py [--verbose]")
    schemes = json.loads((ROOT / "terms/sources.json").read_text())["schemes"]
    lines, drifted, failures = check(schemes, verbose=verbose)
    print("\n".join(lines))
    if failures:
        print("\nCOULD NOT BE CHECKED (nothing was compared, so nothing is known):")
        for world, why in failures: print(f" - {world}: {why}")
    if drifted:
        print("\nDRIFTED. Re-pin in terms/sources.json, then run fetch_worlds.py, guard.py, render.py:")
        for world, head in drifted: print(f'  "{world}": "ref": "{head}"')
    return status_of(drifted, failures)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
