#!/usr/bin/env python3
"""Tests for check_pins.py against real git repositories on disk (no network, no dependencies).

Each case builds throwaway repositories, pins a commit, and asks the real code — git included —
what it makes of them. The cases that matter most are the failed checks: a world that cannot be
reached must never be reported as drift, and must not be lost behind a world that has drifted.

  usage: test_check_pins.py
"""
import pathlib, subprocess, sys, tempfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from check_pins import check, status_of, OK, DRIFT, FAILED, BOTH

FAILURES = []


def git(d, *args):
    r = subprocess.run(["git", "-C", str(d), *args], capture_output=True, text=True)
    assert r.returncode == 0, f"git {' '.join(args)}: {r.stderr}"
    return r.stdout.strip()


def make_repo(root, name, path, first, second=None):
    """A repository with `path` committed once, optionally changed in a second commit.
    Returns (url, first commit, head)."""
    d = pathlib.Path(root) / name
    (d / pathlib.Path(path).parent).mkdir(parents=True, exist_ok=True)
    git(d.parent, "init", "-q", "-b", "main", str(d))
    git(d, "config", "user.email", "test@example.invalid")
    git(d, "config", "user.name", "test")
    git(d, "config", "uploadpack.allowAnySHA1InWant", "true")
    (d / path).write_text(first)
    git(d, "add", "-A"); git(d, "commit", "-q", "-m", "first")
    ref = git(d, "rev-parse", "HEAD")
    if second is not None:
        (d / path).write_text(second)
        (d / "unrelated.md").write_text("the repository moves on")  # so the head is new even when the scheme is not
        git(d, "add", "-A"); git(d, "commit", "-q", "-m", "second")
    return f"file://{d}", ref, git(d, "rev-parse", "HEAD")


def case(name, schemes, urls, want_status, want_drifted, want_in_report=(), want_not_in_report=()):
    lines, drifted, failures = check(schemes, url_of=lambda s: urls[s["repo"]])
    got, report = status_of(drifted, failures), "\n".join(lines)
    problems = []
    if got != want_status: problems.append(f"status {got}, wanted {want_status}")
    if [w for w, _ in drifted] != list(want_drifted): problems.append(f"drifted {[w for w, _ in drifted]}, wanted {list(want_drifted)}")
    for t in want_in_report:
        if t not in report: problems.append(f"report does not say {t!r}")
    for t in want_not_in_report:
        if t in report: problems.append(f"report says {t!r} and must not")
    print(("FAIL " if problems else "ok   ") + name)
    if problems:
        FAILURES.append(name)
        for p in problems: print("       " + p)
        print("       report:\n" + "\n".join("         " + l for l in lines))


A = '{"@graph": [{"@id": "x:one"}]}\n'
B = '{"@graph": [{"@id": "x:one"}, {"@id": "x:two"}]}\n'
P = "terms/scheme.jsonld"

with tempfile.TemporaryDirectory() as tmp:
    same_url, same_ref, same_head = make_repo(tmp, "same", P, A)
    moved_url, moved_ref, moved_head = make_repo(tmp, "moved", P, A, A)   # new commit, same file
    changed_url, changed_ref, changed_head = make_repo(tmp, "changed", P, A, B)
    urls = {"o/same": same_url, "o/moved": moved_url, "o/changed": changed_url, "o/gone": f"file://{tmp}/gone"}
    s = lambda repo, ref: {"repo": repo, "path": P, "ref": ref, "branch": "main"}

    case("current: the pin is the head",
         {"w": s("o/same", same_ref)}, urls, OK, [], ["w: current"])

    case("behind: a newer head carries the same file",
         {"w": s("o/moved", moved_ref)}, urls, OK, [], ["w: behind"], ["DRIFTED"])

    case("drifted: the file differs",
         {"w": s("o/changed", changed_ref)}, urls, DRIFT, ["w"], ["w: DRIFTED"])

    case("unreachable: a failed check is not drift",
         {"w": s("o/gone", changed_ref)}, urls, FAILED, [], ["w: NOT CHECKED"], ["DRIFTED"])

    case("missing file: a failed check is not drift",
         {"w": {"repo": "o/changed", "path": "terms/absent.jsonld", "ref": changed_ref, "branch": "main"}},
         urls, FAILED, [], ["NOT CHECKED"], ["DRIFTED"])

    case("wrong branch: a failed check is not drift",
         {"w": {"repo": "o/changed", "path": P, "ref": changed_ref, "branch": "master"}},
         urls, FAILED, [], ["NOT CHECKED"], ["DRIFTED"])

    case("mixed: drift and a failed check are both reported",
         {"d": s("o/changed", changed_ref), "f": s("o/gone", changed_ref)},
         urls, BOTH, ["d"], ["d: DRIFTED", "f: NOT CHECKED"])

    case("not pinned: a world on its seed copy is skipped",
         {"w": {"repo": "o/changed", "path": P, "ref": None, "seed": "terms/seed/x.jsonld"}},
         urls, OK, [], ["not pinned"])

# The exit codes are a contract with the workflow: each answer its own code, and none of them 1,
# which is what Python returns when the script itself breaks.
codes = {"ok": OK, "drift": DRIFT, "failed": FAILED, "both": BOTH}
if len(set(codes.values())) != len(codes) or 1 in codes.values():
    FAILURES.append("exit codes"); print("FAIL exit codes are distinct and never 1")
else:
    print("ok   exit codes are distinct and never 1")

print(f"\n{len(FAILURES)} failed" if FAILURES else "\nall cases pass")
sys.exit(1 if FAILURES else 0)
