# Soft-farm root crop/material candidates — 2026-06-16

This directory is a candidate-batch planning/review area for Terra Chronicle soft-farm assets. It intentionally does not modify live runtime assets.

## Scope

Batch id: `soft-farm-root-crop-material-candidates-20260616`

Assets covered:

- `crop_moon_turnip` / `moon_turnip` — 月萝
- `crop_iron_tuber` / `iron_tuber` — 铁薯
- `crop_moss_radish` / `moss_radish` — 苔萝
- `material_wood_raw` — 原木

## Cluster

Required reference cluster: `soft_farm`

Use the soft-farm/pet/crop/button/scroll UI reference language. Do not cross-mix battle/card, dungeon node UI, or environment-background style unless a later task explicitly asks for a bridge asset.

Relevant source docs:

- `docs/first-wave-asset-families.md`
- `docs/second-wave-asset-families.md`
- `docs/unified-art-design-spec.md`

## Intended generated outputs

Expected candidate files after generation/review work:

- `crop_moon_turnip_candidates.png`
- `crop_iron_tuber_candidates.png`
- `crop_moss_radish_candidates.png`
- `material_wood_raw_candidates.png`
- `root_crop_material_contact_sheet.png`

This task only creates the manifest and README. No candidate images were generated in this pass.

## Visual direction

Root crop family:

- Functional, grounded, soil-connected crops.
- Mature roots should have clear volume and distinct silhouettes.
- The three crop types should read differently at inventory size.
- They should support armor, recovery, durability, alchemy, and workshop systems.

Base material family:

- Humble, readable, raw material presentation.
- `material_wood_raw` should look like a basic log resource, not furniture or a decorative prop.
- It must contrast well against parchment/inventory UI.

## Candidate-first rule

Do not integrate any output from this batch directly into `assets/sprites/` or other live paths.

Before live integration, selected candidates must pass:

1. Visual review against the soft-farm reference cluster.
2. Contact-sheet comparison.
3. Cutout/fringe cleanup.
4. Crop/resize and alpha bounding-box checks.
5. Real browser verification at target in-game size.

See `manifest.json` for detailed item briefs, expected files, and review checklist.
