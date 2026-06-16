# Card / Node Polish Manifest v1 — 2026-06-16

This folder is a curation-only handoff for the card/node polish lane. It selects the strongest already-generated candidates requested for immediate use, while preserving the instruction not to edit live assets.

## Scope

- Output folder: `/root/terra-chronicle-game/assets/generated/card-node-polish-v1-20260616/`
- Manifest: `manifest.json`
- Live asset edits: none
- Source policy: reference existing generated files by absolute source path

## Selected candidates

### Card frames

1. `card_frame_04`
   - Source: `/root/terra-chronicle-game/assets/generated/battle-visual-overhaul-20260615/card_frame_04.png`
   - Source manifest: `/root/terra-chronicle-game/assets/generated/battle-visual-overhaul-20260615/manifest.json`
   - Size checked: 1024x1536 RGB

2. `card_frame_05`
   - Source: `/root/terra-chronicle-game/assets/generated/battle-visual-overhaul-20260615/card_frame_05.png`
   - Source manifest: `/root/terra-chronicle-game/assets/generated/battle-visual-overhaul-20260615/manifest.json`
   - Size checked: 1024x1536 RGB

3. `card_frame_06`
   - Source: `/root/terra-chronicle-game/assets/generated/battle-visual-overhaul-20260615/card_frame_06.png`
   - Source manifest: `/root/terra-chronicle-game/assets/generated/battle-visual-overhaul-20260615/manifest.json`
   - Size checked: 1024x1536 RGB

### Combat node

1. `node_combat_3`
   - Source: `/root/terra-chronicle-game/assets/generated/corrected-battle-assets-20260615/round2/node_combat_3.png`
   - Source manifest: `/root/terra-chronicle-game/assets/generated/corrected-battle-assets-20260615/round2/manifest.json`
   - Prior processing report: `/root/terra-chronicle-game/assets/generated/corrected-battle-assets-20260615/final_processing_report.json`
   - Size checked: 1254x1254 RGB
   - Prior live target recorded by report: `/root/terra-chronicle-game/assets/ui/node_combat.png`
   - Prior processed size: 168x168

## Integration notes

- This pass does not copy, overwrite, resize, or otherwise modify live assets.
- Treat `manifest.json` as the handoff list for a later integration step.
- Card frames are high-resolution sources; choose final downscale/crop rules in the implementation pass and verify in browser.
- `node_combat_3` already has prior processing metadata for a 168x168 UI export; reuse that as a baseline if/when integration is approved.
