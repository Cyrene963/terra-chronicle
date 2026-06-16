#!/usr/bin/env python3
from pathlib import Path
import json, time

ROOT = Path('/root/terra-chronicle-game')
RUN = ROOT/'.deep-work/terra-unified-assets-20260615'
RUN.mkdir(parents=True, exist_ok=True)

clusters = {
    'environment': ['battle_bg','dungeon_map_bg','dungeon_entrance_bg','tile_','grass','water','soil','sand'],
    'battle_magic': ['enemy','boss','card_art','damage','healing','capture','level_up','evolution'],
    'node_ui': ['node_','icon_boss','icon_combat','dungeon_route'],
    'soft_farm': ['beast','crop','wheat','dewberry','button','scroll','house','workshop','well','warehouse','ranch','tree','bush','rock','fence','windmill']
}

inventory = json.loads((RUN/'inventory.json').read_text())
classified = {k: [] for k in clusters}
classified['uncertain'] = []
for asset in inventory['assets']:
    name = asset.lower()
    hit = None
    for cluster, keys in clusters.items():
        if any(k in name for k in keys):
            hit = cluster
            break
    classified[hit or 'uncertain'].append(asset)

report = {
    'updated_at': time.strftime('%Y-%m-%d %H:%M:%S %Z'),
    'counts': {k: len(v) for k, v in classified.items()},
    'classified': classified,
    'next_action': 'generate/review candidate batches starting with largest weak cluster; do not edit runtime until candidates pass review'
}
(RUN/'classification_round1.json').write_text(json.dumps(report, indent=2, ensure_ascii=False))
with (RUN/'progress.md').open('a') as f:
    f.write(f"\n- [classify] {report['updated_at']} counts={report['counts']}\n")
print(json.dumps({'ok': True, 'counts': report['counts']}, ensure_ascii=False))
