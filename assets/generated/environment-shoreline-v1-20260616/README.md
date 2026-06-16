# Environment Shoreline Asset Batch Manifest v1 — 2026-06-16

This folder is a batch manifest for the environment shoreline lane. It defines the target shoreline family, prompt brief, and verification screenshots to use before any live asset integration.

## Scope

- Output folder: `/root/terra-chronicle-game/assets/generated/environment-shoreline-v1-20260616/`
- Manifest: `manifest.json`
- Reference pack: environment cluster contact sheet
- Live asset edits: none
- This batch is manifest-only and does not touch `/root/terra-chronicle-game/assets/sprites/`

## Reference alignment

Use the environment cluster first, in line with `docs/unified-art-design-spec.md` and `PROJECT_VISION.md`.

Primary references:
- `/root/terra-chronicle-game/assets/style-reference/terra-master-pack-20260615/clusters/environment_contact_sheet.png`
- `/root/terra-chronicle-game/assets/sprites/tile_water.png` (reference only)
- `/root/terra-chronicle-game/assets/sprites/tile_grass.png` (reference only)
- `/root/terra-chronicle-game/assets/sprites/tile_sand.png` (reference only)
- `/root/terra-chronicle-game/assets/sprites/tile_soil.png` (reference only)
- `/root/terra-chronicle-game/assets/sprites/water_edge_nw.png` (reference only)
- `/root/terra-chronicle-game/assets/sprites/water_edge_ne.png` (reference only)
- `/root/terra-chronicle-game/assets/sprites/water_edge_sw.png` (reference only)
- `/root/terra-chronicle-game/assets/sprites/water_edge_se.png` (reference only)
- `/root/terra-chronicle-game/assets/sprites/water_diag_tl.png` (reference only)
- `/root/terra-chronicle-game/assets/sprites/water_diag_tr.png` (reference only)
- `/root/terra-chronicle-game/assets/sprites/water_diag_bl.png` (reference only)
- `/root/terra-chronicle-game/assets/sprites/water_diag_br.png` (reference only)

## Target tile / edge family

The manifest defines a coherent shoreline set for future generation and review:

- Base water tile
- Shallow water transition tile
- Cardinal shoreline edges: north, south, east, west
- Diagonal shoreline edges: tl, tr, bl, br
- Optional corner transitions: inner and outer

Key visual requirements:
- Seamless tile boundaries
- Warm fantasy painterly treatment
- Readable at Terra camera zoom
- Soft foam and wet fringe, not harsh outline borders
- No neon, no photoreal water photo, no sticker look, no magenta fringe

## Prompt brief

Generate the whole shoreline family together as one coherent environment set. Use image-to-image or reference-guided generation from the environment pack rather than prompting from scratch.

Core direction:
- Terra Chronicle shoreline tile set
- premium fantasy farming world
- hand-painted storybook texture
- top-down or isometric readable game tiles
- blue-green water, wet sand, mossy grass, translucent shallows
- subtle foam and natural lighting
- consistent material scale across every tile

## Verification screenshots to use

Use these screenshots for QA and before/after comparison:

1. `/root/terra-chronicle-game/test_screenshot.png`
   - Existing baseline screenshot referenced by the repo test checklist.
   - Use as a current-state anchor.

2. `/root/terra-chronicle-game/assets/generated/environment-shoreline-v1-20260616/verification_public_river_before.png`
   - Capture from `https://terra.bz9.me` before any shoreline integration.
   - Center on diagonal river edges and water-land boundaries.

3. `/root/terra-chronicle-game/assets/generated/environment-shoreline-v1-20260616/verification_candidate_tile_sheet_preview.png`
   - Local preview sheet of the candidate shoreline family arranged over grass, soil, sand, and water context.

4. `/root/terra-chronicle-game/assets/generated/environment-shoreline-v1-20260616/verification_public_river_after_candidate_overlay.png`
   - Browser screenshot after temporary/local overlay or approved integration.
   - Check for stair-stepping, black blocks, and fringe artifacts.

5. `/root/terra-chronicle-game/assets/generated/environment-shoreline-v1-20260616/verification_winter_shoreline.png`
   - Seasonal check under snow/winter lighting.
   - Confirm edge readability survives overlay and tint changes.

## Verification checklist

- Manifest and README exist only under `assets/generated/environment-shoreline-v1-20260616/`
- No live assets were edited
- No files under `assets/sprites/` or `src/` were modified by this batch
- Shoreline family covers base, cardinal, diagonal, and corner transitions
- Diagonal river tiles are explicitly included to address jagged river QA risk
- Current browser verification screenshots are defined before any final integration claim

## Notes

- `src/main.js` currently uses a lightweight foam layer and diagonal river logic, so future integration should map this shoreline family carefully before any live swap.
- The manifest is intentionally conservative: it prepares the batch, but does not claim final integration or production readiness.
