# Unified Style Landing Smoke Coverage Plan

Scope: plan only. This note does not change runtime code, assets, deployment files, or existing smoke scripts.

Grounding:
- `PROJECT_VISION.md`
- `docs/unified-art-design-spec.md`
- `docs/today-asset-batch-20260616.md`
- Existing Playwright smoke scripts in `tools/`

## Landing areas in scope

The future unified-style landing batch is expected to touch the same visible surface area as the 2026-06-16 asset batch plan:
- `ui_card_frame_terra_gameplay_v1`: battle card frame and card readability.
- `ui_dungeon_node_combat`: dungeon route node icon and map-node state readability.
- `status_shield`: battle HUD status icon at small sizes.
- `ui_reward_panel_terra`: battle reward / settlement popup shell and reward slots.
- `crop_moon_turnip` and `material_wood_raw`: crop/material inventory and reward-slot compatibility.

The smoke goal is not to judge art quality exhaustively. It should catch broken integration: missing deployed assets, stale scripts, black/empty rendering, console errors, invisible icons, non-Terra fallback UI, and unreadable core states after the style landing.

## Existing smoke coverage to keep

### `tools/terra_visual_smoke.js`

Already covers:
- Public `https://terra.bz9.me/` boot path, expected `main.js` and `alchemy.js` versions, and console/page errors.
- Non-black world canvas verification, guarding against renderer/culling/filter regressions.
- Alchemy panel visibility and card reveal flow.
- Broad HUD/debug presence, including ecology, FPS, and quality badges.
- Selected pet obtainment, companion rendering, codex panel, and active skill UI.

Use after landing because it is the broadest public-playability smoke and exercises the farm-to-alchemy-to-card reveal path where unified parchment/card styling can regress.

### `tools/terra_battle_dungeon_smoke.js`

Already covers:
- Battle entry with expected `battle.js` and `dungeon.js` versions.
- Battle card template application through `card_template.png`.
- Card art sources for attack/defense/charge/heal examples.
- Battle HUD state including HP, energy, buffs, shield bar, enemy image, and card hand layout.
- Dungeon map open state, node icons, combat/boss icon presence, reward preview text, and loot grant behavior.
- Capture reward loop from battle result to saved beast state.

Use after landing for `ui_card_frame_terra_gameplay_v1`, `ui_dungeon_node_combat`, and `status_shield` adjacency. It already catches stale or missing card/dungeon assets, but should be supplemented for the new shield icon specifically.

### `tools/reward_popup_smoke.js`

Already covers:
- Public battle win path into reward popup.
- Expected `battle.js` version.
- Reward result panel presence.
- At least five reward choices.
- Screenshot capture of the reward popup.
- Console/page error guard.

Use after landing for `ui_reward_panel_terra`. It is the focused smoke for reward shell and reward-choice layout. If the reward panel asset lands as CSS background or image slot, this script is the natural place to assert the new shell is actually used.

### `tools/alchemy_workshop_polish_smoke.js`

Already covers:
- Public alchemy workshop entry with expected `alchemy.js` version.
- Alchemy panel open state.
- Ingredient add/brew flow.
- Card reveal state with name, art, and affix text.
- Screenshots of alchemy panel and card reveal.

Use after landing for card-frame/card-reveal compatibility and alchemy-adjacent crop/material visuals. It does not directly verify inventory/reward icons for new crop/material assets, so it is secondary coverage for `crop_moon_turnip` and `material_wood_raw`.

### `tools/soft_farm_crop_ui_smoke.js`

Already covers:
- Public alchemy UI path with crop UI open.
- Expected `main.js` version.
- Dewberry image load in the alchemy material UI.
- Source-vs-live hash parity for `crop_dewberry.png`, `button_frame.png`, and `scroll_paper.png`.
- Screenshot capture of the crop UI.

Use after landing as the pattern for crop/material asset parity. It should either be extended or mirrored for `crop_moon_turnip` and `material_wood_raw` once those assets are integrated.

### `tools/soft_farm_unification_smoke.js`

Already covers:
- Public soft-farm visual entry.
- Expected `main.js` version.
- Water/fire beast sheet load, source-vs-live asset parity, and non-deformed scaling.
- Console/page error guard and screenshot capture.

Use as regression coverage for the existing soft-farm visual family. It is not directly responsible for the UI/HUD landing batch, but it protects the adjacent soft-farm art cluster from accidental deployment/hash regressions.

## Coverage gaps for the future landing

Existing scripts are strong for public boot, battle cards, dungeon nodes, reward popup, alchemy panel, and selected soft-farm assets. The main gaps are small and specific:
- No smoke explicitly asserts the new `status_shield` icon appears in the battle HUD or remains readable at 24px/32px scale.
- No smoke explicitly asserts `ui_reward_panel_terra` is the active reward panel shell rather than only checking that some reward panel exists.
- No smoke explicitly asserts `crop_moon_turnip` and `material_wood_raw` source-vs-live parity or their presence in reward/inventory slots.
- No smoke performs a unified-style landing check across all new assets in one short run with a single report.
- Current screenshot checks are mostly artifact capture; they do not yet sample image dimensions or computed backgrounds for the new style assets.

## Add one small new smoke

Add `tools/unified_style_landing_smoke.js` after the assets are integrated.

Recommended behavior:
1. Open `https://terra.bz9.me/?unified_style_landing=<timestamp>`.
2. Verify expected script versions using `scriptVersions()` and `hasExpectedScript()` for every touched runtime file, at minimum `main.js`, plus `battle.js`, `dungeon.js`, or `alchemy.js` if the landing touches them.
3. Enter the game and wait for `window.__dbg?.ready`.
4. Force a battle state with shield/armor visible and assert the `status_shield` image or CSS background is present, loaded, and not a 1px fallback.
5. Assert the first battle card uses the new gameplay card-frame class/background and still has readable cost, title, art, and rules text.
6. Open `DungeonMap` and assert combat node image source or CSS background uses the integrated `ui_dungeon_node_combat` asset, with normal and active/hover state hooks present if implemented.
7. Win a debug battle, wait for reward popup, and assert `ui_reward_panel_terra` shell plus reward slot structure are present.
8. Inject or grant `crop_moon_turnip` and `material_wood_raw` into inventory/reward state, then assert their images load in the relevant inventory/reward slots.
9. Hash-check every newly deployed asset against `/var/www/terra-pixijs/assets/...` when files are static assets.
10. Write `dogfood-output/unified-style-landing-smoke/report.json` and screenshots for battle, dungeon map, reward popup, and inventory/reward icon state.

Keep this new smoke narrow. It should not duplicate all of `terra_visual_smoke.js`; it should only prove that the new unified-style landing assets are live, visible, correctly wired, and not breaking core UI states.

## Suggested post-landing smoke order

Run in this order for fast triage:
1. `node tools/unified_style_landing_smoke.js` — new direct landing coverage for assets that changed.
2. `node tools/terra_battle_dungeon_smoke.js` — battle cards, dungeon nodes, reward/capture gameplay regression.
3. `node tools/reward_popup_smoke.js` — focused reward panel regression.
4. `node tools/alchemy_workshop_polish_smoke.js` — alchemy/card reveal regression.
5. `node tools/soft_farm_crop_ui_smoke.js` — crop/material UI parity pattern.
6. `node tools/terra_visual_smoke.js` — broad public playability and renderer sanity.
7. `node tools/soft_farm_unification_smoke.js` — adjacent soft-farm cluster regression if touched or if shared assets/CSS changed.

## Acceptance criteria for landing QA

The style landing is smoke-ready when:
- All touched runtime scripts load at expected cache-busted versions on `https://terra.bz9.me/`.
- Every newly integrated asset has source-vs-live hash parity when deployed as a file.
- Battle, dungeon, reward, alchemy, and crop/material UI states open with no console/page errors.
- New icons/panels are asserted by selector, image source/background, and natural dimensions or computed style.
- Screenshots exist for the critical visual states, but pass/fail does not rely only on a human viewing screenshots.
- Existing broad smokes still pass, especially `terra_visual_smoke.js` and `terra_battle_dungeon_smoke.js`.
