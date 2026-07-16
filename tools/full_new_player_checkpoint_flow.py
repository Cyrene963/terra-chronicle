#!/usr/bin/env python3
import json
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BATCH = os.environ.get("TERRA_BATCH_ID", f"checkpoint-full-{int(time.time())}")
BASE = os.environ.get("TERRA_PUBLIC_BASE_URL", "http://127.0.0.1:8871")
CHROME = os.environ.get("TERRA_CHROMIUM_PATH", "")
OUT = ROOT / "dogfood-output" / "ultra-20run" / BATCH
CHECKPOINTS = OUT / "checkpoints"
OUT.mkdir(parents=True, exist_ok=True)

base_env = {
    **os.environ,
    "TERRA_BATCH_ID": BATCH,
    "TERRA_PUBLIC_BASE_URL": BASE,
    "TERRA_CHROMIUM_PATH": CHROME,
}
stages = [
    (
        "plant",
        ["node", "tools/ultra_new_player_20run.js"],
        {"TERRA_RUN_INDEX": "1", "TERRA_STOP_AFTER_PLANT": "1"},
        CHECKPOINTS / "run-1-plant.json",
    ),
    (
        "harvest",
        ["node", "tools/checkpoint_harvest_smoke.js"],
        {"TERRA_ULTRA_PLANT_CHECKPOINT": str(CHECKPOINTS / "run-1-plant.json")},
        CHECKPOINTS / "run-15-harvest.json",
    ),
    (
        "alchemy",
        ["node", "tools/checkpoint_alchemy_smoke.js"],
        {"TERRA_ULTRA_HARVEST_CHECKPOINT": str(CHECKPOINTS / "run-15-harvest.json")},
        CHECKPOINTS / "run-15-alchemy.json",
    ),
    (
        "portal-battle",
        ["node", "tools/portal_dungeon_route_smoke.js"],
        {"TERRA_ULTRA_ALCHEMY_CHECKPOINT": str(CHECKPOINTS / "run-15-alchemy.json")},
        None,
    ),
]

records = []
for name, command, extra, expected_checkpoint in stages:
    started = time.time()
    proc = subprocess.run(
        command,
        cwd=ROOT,
        env={**base_env, **extra},
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        timeout=150,
    )
    output = proc.stdout or ""
    compact = " ".join(output.split())
    if name == "plant":
        success = proc.returncode == 0 and '"total": 1' in compact and '"passed": 1' in compact and '"failed": 0' in compact
    else:
        success = proc.returncode == 0 and '"ok": true' in compact
    checkpoint_ok = expected_checkpoint is None or expected_checkpoint.is_file()
    record = {
        "stage": name,
        "returnCode": proc.returncode,
        "durationMs": round((time.time() - started) * 1000),
        "successEvidence": success,
        "checkpoint": str(expected_checkpoint) if expected_checkpoint else None,
        "checkpointExists": checkpoint_ok,
        "outputTail": output[-8000:],
    }
    records.append(record)
    (OUT / f"checkpoint-full-{name}.json").write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n")
    if not success or not checkpoint_ok:
        report = {"ok": False, "testClass": "checkpoint-resume-smoke", "batchId": BATCH, "failedStage": name, "stages": records}
        print(json.dumps(report, ensure_ascii=False, indent=2))
        sys.exit(1)
    time.sleep(2)

report = {"ok": True, "testClass": "checkpoint-resume-smoke", "batchId": BATCH, "stages": records}
(OUT / "checkpoint-full-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({"ok": True, "testClass": report["testClass"], "batchId": BATCH, "stages": [item["stage"] for item in records]}, ensure_ascii=False))
