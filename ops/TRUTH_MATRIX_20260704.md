# Terra Truth Matrix — 2026-07-04

## Live now
- Public reachable runtime: `http://165.232.142.30:8867`
- Served by PM2 app `terra-game` from `/root/terra-chronicle-game`
- Current runtime mount graph matches `/root/terra-chronicle-game/index.html`

## In repo now
- Core active runtime: `index.html`, `src/main.js`, `src/alchemy.js`, `src/battle.js`, `src/dungeon.js`, `src/upgrade.js`, `src/world_map.js`, `src/world_map_integration.js`, `src/multiplayer_ui.js`
- Additional modules present on disk: `src/capture_system.js`, `src/evolution_tree.js`, `src/sound.js`, `src/recipes_expanded.js`, `src/ecology_*.js`

## Historically verified but missing/uncertain now
- 2026-06-20 accepted live state included stronger battle QoL, era progress, map UX, and other work not fully reflected in current repo
- See: `/root/TERRA_FINAL_ACCEPTANCE_20260620.md`
- See: `/root/.claude/projects/-root/memory/terra-incident-live-clobber-20260704.md`

## Present on disk but not mounted
- `src/capture_system.js`
- `src/evolution_tree.js`
- `src/sound.js`
- `src/recipes_expanded.js`
- several `src/ecology_*.js`
- archive-only remnants under `/var/www/terra-pixijs/src/*.bak`

## Governance decision
- Canonical source = `/root/terra-chronicle-game`
- `/var/www/terra-pixijs` = archive/deploy artifact only; no direct edits
