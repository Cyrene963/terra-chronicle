#!/usr/bin/env bash
set -euo pipefail
ROOT="/root/terra-chronicle-game"
# Formal deployment is fail-closed on a multimodal review of the current commit.
python3 "$ROOT/tools/visual_release_gate.py"
TARGET_DEFAULT="/var/www/terra-pixijs"
TARGET="${1:-$TARGET_DEFAULT}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
SNAP_ROOT="/root/ops-snapshots/terra/releases/$STAMP"
MANIFEST="$ROOT/ops/releases/$STAMP.json"
mkdir -p "$SNAP_ROOT" "$ROOT/ops/releases"
cd "$ROOT"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERR: not a git repo" >&2; exit 1
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERR: dirty working tree; commit or clean before deploy" >&2; exit 1
fi
UPSTREAM="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)"
if [[ -z "$UPSTREAM" ]]; then
  echo "ERR: no upstream configured" >&2; exit 1
fi
LOCAL_SHA="$(git rev-parse HEAD)"
UPSTREAM_SHA="$(git rev-parse "$UPSTREAM")"
if [[ "$LOCAL_SHA" != "$UPSTREAM_SHA" ]]; then
  echo "ERR: local HEAD ($LOCAL_SHA) differs from upstream ($UPSTREAM_SHA); push or sync first" >&2; exit 1
fi

cp /root/.pm2/dump.pm2 "$SNAP_ROOT/" 2>/dev/null || true
cp /root/.pm2/logs/terra-game-out.log "$SNAP_ROOT/" 2>/dev/null || true
cp /root/.pm2/logs/terra-game-error.log "$SNAP_ROOT/" 2>/dev/null || true
cp "$ROOT/index.html" "$SNAP_ROOT/index.html.pre"
if [[ -d "$TARGET" ]]; then
  tar czf "$SNAP_ROOT/target-predeploy.tar.gz" -C "$(dirname "$TARGET")" "$(basename "$TARGET")"
fi

if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude 'runtime-captures' \
    --exclude 'review_screenshots' \
    --exclude 'shots' \
    --exclude 'shots2' \
    --exclude '*.log' \
    --exclude 'ops-snapshots' \
    "$ROOT/" "$TARGET/"
else
  echo "WARN: rsync unavailable; using python mirror fallback" >&2
  python3 - <<PY
import fnmatch, os, shutil
root='$ROOT'; target='$TARGET'
exclude_patterns=['.git','node_modules','runtime-captures','review_screenshots','shots','shots2','ops-snapshots','*.log']

def excluded(rel):
    parts=rel.split(os.sep)
    for part in parts:
        for pat in exclude_patterns:
            if fnmatch.fnmatch(part, pat):
                return True
    return False

os.makedirs(target, exist_ok=True)
# delete files/dirs not present in source (respect excludes)
for dp, dns, fns in os.walk(target, topdown=False):
    for fn in fns:
        tp=os.path.join(dp, fn)
        rel=os.path.relpath(tp, target)
        if excluded(rel):
            continue
        sp=os.path.join(root, rel)
        if not os.path.exists(sp):
            os.remove(tp)
    for dn in dns:
        td=os.path.join(dp, dn)
        rel=os.path.relpath(td, target)
        if excluded(rel):
            continue
        sd=os.path.join(root, rel)
        if not os.path.exists(sd):
            shutil.rmtree(td, ignore_errors=True)

for dp, dns, fns in os.walk(root):
    rel_dir=os.path.relpath(dp, root)
    if rel_dir == '.':
        rel_dir=''
    dns[:] = [d for d in dns if not excluded(os.path.join(rel_dir,d))]
    os.makedirs(os.path.join(target, rel_dir), exist_ok=True)
    for fn in fns:
        rel=os.path.join(rel_dir, fn) if rel_dir else fn
        if excluded(rel):
            continue
        shutil.copy2(os.path.join(root, rel), os.path.join(target, rel))
PY
fi

VERIFY_STATUS="not_run"
if [[ -f "$ROOT/tools/verify_public_deploy.js" ]]; then
  if node "$ROOT/tools/verify_public_deploy.js" >/tmp/terra-verify-$STAMP.log 2>&1; then
    VERIFY_STATUS="passed"
  else
    VERIFY_STATUS="failed"
  fi
fi

python3 - <<PY
import hashlib, json, os, re, time
root='$ROOT'; target='$TARGET'; manifest='$MANIFEST'; verify='$VERIFY_STATUS'; sha='$LOCAL_SHA'; upstream='$UPSTREAM'; stamp='$STAMP'
files=['index.html','src/main.js','src/battle.js','src/multiplayer_ui.js','src/world_map.js','src/world_map_integration.js','package.json']
out={'timestamp':stamp,'git_sha':sha,'upstream':upstream,'source_path':root,'target_path':target,'verify_status':verify,'key_files':{}}
for rel in files:
    p=os.path.join(root, rel)
    if os.path.exists(p):
        b=open(p,'rb').read(); out['key_files'][rel]={'sha256':hashlib.sha256(b).hexdigest(),'size':len(b)}
html=open(os.path.join(root,'index.html'),'r',encoding='utf-8').read()
out['mounted_scripts']=re.findall(r'<script src="([^"]+)"', html)
open(manifest,'w').write(json.dumps(out,ensure_ascii=False,indent=2))
PY

echo "Deploy complete -> $TARGET"
echo "Manifest: $MANIFEST"
echo "Verify: $VERIFY_STATUS"
