# Terra Chronicle Entry and Mobile Surface Review - 2026-07-10

Reviewed candidate: `cc3e63ae1a571e2f4b9e1620e221e4681b2efd86`

## Scope

- Primary title CTA binds before heavy Pixi world construction and immediately acknowledges slow-device taps.
- `main.js` loads after the title can paint; deploy manifests and smoke version parsing now include dynamic script assignment.
- Repeated texture loads are deduplicated; title-time world rendering, duplicate FPS sampling, seasonal preload, foam, snow, and ground-cache work are deferred or removed from the critical path.
- Coarse-pointer entry skips the expensive cloud sweep.
- Mobile alchemy, upgrade, dungeon, battle, and world-map surfaces fit the 390x844 viewport and use safe touch targets.
- Battle hand becomes a horizontal mobile rail with 126x184 cards and a 44px end-turn control.
- World-map and modal transitions use tokens/immediate close paths to prevent stale open/close callbacks.
- Battle now honors immediate SurfaceLifecycle close and removes the stale `.on` state before opening another surface.

## Deterministic Evidence

- Syntax and whitespace gates: PASS.
- Entry responsiveness smoke with main.js delayed by 900ms: PASS.
  - Desktop: immediate `aria-busy=true`, exactly one entry, title removed, `main.js?v=90`, zero errors.
  - Mobile: immediate `aria-busy=true`, exactly one entry, title removed, `main.js?v=90`, zero errors.
- Surface lifecycle smoke: PASS.
  - Alchemy -> upgrade -> dungeon -> battle leaves exactly one active surface.
  - Tutorial overlay is hidden during battle.
  - Zero console/page errors.
- Mobile interaction smoke: PASS.
  - Alchemy, upgrade, world map, dungeon, and battle open/close in 390x844 without viewport failures.
  - Explicit closes release input lock.
  - Battle -> alchemy switch removes battle `.on` synchronously.
  - Four 126x184 cards form a horizontal scroll rail; end-turn target is 44px.
- A separate one-page mobile geometry probe also passed with 46px close targets and no overflow.

## Visual Evidence

- `dogfood-output/mobile-alchemy-entry-final.png`
- `dogfood-output/mobile-battle-entry-final.png`

Native multimodal pixel review: PASS.

- Alchemy remains within the viewport; close/action controls are clear; cauldron art keeps its proportions; no black blocks, missing art, or text collision.
- Battle enemy, intent, hand, and bottom HUD form distinct layers; cards are not stretched; no black blocks or missing art.
- Non-blocking density remains on the narrow alchemy information stack and battle top copy, but controls and primary content are readable.

## Degraded Evidence

`tools/terra_battle_dungeon_smoke.js` was attempted against the local candidate. Its first battle/dungeon page completed far enough to enter the capture lane, but the multi-page screenshot run was terminated by the host under severe memory/swap pressure (`SIGTERM`, SwiftShader `ReadPixels`). This is not counted as a pass. The same full gameplay chain passed on the previous deployed candidate, while the current changed surfaces are covered by the passing single-page lifecycle/mobile gates above.

## Decision

APPROVED for governed deployment. No P0/P1 visual or interaction blocker found in the changed entry/mobile/lifecycle paths.
