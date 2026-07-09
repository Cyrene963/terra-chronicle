#!/usr/bin/env python3
"""Fail-closed Terra visual release gate.

A formal release is allowed only when a review manifest covers the current git commit,
contains runtime screenshots, records a multimodal reviewer, includes the five-hour
flow simulation, and has no unresolved blockers.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REVIEW_DIR = ROOT / "docs" / "visual-reviews"


def git_head() -> str:
    return subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()


def changed_since(revision: str) -> list[str]:
    output = subprocess.check_output(["git", "diff", "--name-only", f"{revision}..HEAD"], cwd=ROOT, text=True)
    return [line.strip() for line in output.splitlines() if line.strip()]


def review_only_path(path: str) -> bool:
    return (
        path.startswith("docs/visual-reviews/")
        or path.startswith("docs/visual_review_")
        or path == "tools/visual_release_gate.py"
    )


def fail(message: str) -> None:
    print(f"VISUAL_GATE_FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", help="Explicit visual review manifest JSON")
    args = parser.parse_args()

    manifests = [Path(args.manifest)] if args.manifest else sorted(REVIEW_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not manifests:
        fail(f"no review manifest under {REVIEW_DIR}")
    path = manifests[0]
    if not path.is_absolute():
        path = ROOT / path
    data: dict = {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"invalid manifest {path}: {exc}")

    required = ["git_sha", "status", "reviewer", "screenshots", "five_hour_flow", "checks", "blockers"]
    missing = [key for key in required if key not in data]
    if missing:
        fail(f"manifest missing keys: {', '.join(missing)}")
    current_head = git_head()
    if data["git_sha"] != current_head:
        changes = changed_since(data["git_sha"])
        non_review_changes = [item for item in changes if not review_only_path(item)]
        if non_review_changes:
            fail(f"review is for {data['git_sha']}, current HEAD is {current_head}; unreviewed changes: {non_review_changes}")
    if data["status"] != "approved":
        fail(f"review status is {data['status']!r}, expected 'approved'")
    if data["reviewer"].get("type") not in {"multimodal_vision", "vision_subagent"}:
        fail("reviewer is not a multimodal vision lane")
    if not data["reviewer"].get("model"):
        fail("reviewer model/provenance missing")
    if not data["screenshots"]:
        fail("no runtime screenshots recorded")
    missing_shots = [s for s in data["screenshots"] if not (ROOT / s).exists()]
    if missing_shots:
        fail(f"missing screenshots: {missing_shots}")

    flow = data["five_hour_flow"]
    flow_keys = ["visual_consistency", "cheap_web_ui", "long_term_goal", "reward_peak", "fatigue_risks"]
    if any(not flow.get(key) for key in flow_keys):
        fail("five-hour flow simulation is incomplete")
    check_keys = ["art_style_unified", "no_web_ui_placeholders", "animation_runtime_verified", "reward_feedback_clear", "no_render_regression"]
    failed_checks = [key for key in check_keys if data["checks"].get(key) is not True]
    if failed_checks:
        fail(f"checks not approved: {failed_checks}")
    if data["blockers"]:
        fail(f"unresolved blockers: {data['blockers']}")

    print(f"VISUAL_GATE_PASS: {path.relative_to(ROOT)} @ {data['git_sha']}")


if __name__ == "__main__":
    main()
