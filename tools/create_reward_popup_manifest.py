#!/usr/bin/env python3
from pathlib import Path
import json

root = Path('/root/terra-chronicle-game')
out = root / 'assets' / 'generated' / 'reward-popup-ui-v1-20260616'
out.mkdir(parents=True, exist_ok=True)
manifest = {
    "cluster": "battle_magic",
    "goal": "Make victory/reward popup feel like a finished Terra reward modal, not a debug overlay.",
    "current_source": "src/battle.js",
    "output_targets": [
        "ui_reward_panel_terra",
        "reward_choice_material",
        "reward_choice_buff",
        "reward_choice_beast",
        "reward_choice_boss",
        "reward_choice_resource"
    ],
    "source_anchors": [
        "assets/generated/soft-farm-crop-ui-candidates-20260615/selected_scroll_paper.png",
        "assets/generated/soft-farm-crop-ui-candidates-20260615/selected_button_frame.png",
        "assets/generated/card-node-polish-v1-20260616/manifest.json",
        "assets/generated/corrected-battle-assets-20260615/round2/card_contact_sheet.png"
    ],
    "notes": [
        "Use warm parchment + gold border + clear reward categories.",
        "Do not use the old card_template.png as reward-card background.",
        "Prefer readable 3+2 grid with icon, tag, title, description.",
        "No red debug box, no layout guide, no sticker/emoji style."
    ]
}
(out / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
(out / 'README.md').write_text('# reward-popup-ui-v1-20260616\n\nThis folder tracks the reward popup UI direction and source anchors for the Terra victory modal.\n', encoding='utf-8')
print(out / 'manifest.json')
print(out / 'README.md')
