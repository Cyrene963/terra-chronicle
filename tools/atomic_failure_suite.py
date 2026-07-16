#!/usr/bin/env python3
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
commands = [
    ["node", "tools/atomic_economy_failure_smoke.js"],
    ["node", "tools/progression_failure_smoke.js"],
]
records = []
for command in commands:
    proc = subprocess.run(
        command,
        cwd=ROOT,
        env=os.environ.copy(),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        timeout=150,
    )
    output = proc.stdout or ""
    success = proc.returncode == 0 and '"ok": true' in " ".join(output.split())
    records.append({"command": " ".join(command), "returnCode": proc.returncode, "successEvidence": success, "outputTail": output[-8000:]})
    if not success:
        print(json.dumps({"ok": False, "testClass": "real-input-failure-injection", "records": records}, ensure_ascii=False, indent=2))
        sys.exit(1)

print(json.dumps({"ok": True, "testClass": "real-input-failure-injection", "checks": [record["command"] for record in records]}, ensure_ascii=False))
