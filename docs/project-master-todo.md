# Terra Chronicle Master Todo

Updated: 2026-06-16
Source of truth: `PROJECT_VISION.md`, `docs/art-production-index.md`, `docs/first-wave-asset-families.md`, `docs/second-wave-asset-families.md`, current `src/` state, public smoke scripts, and `.deep-work/terra-unified-assets-20260615/progress.md`.

## 1) Current Status

- Public build is live at `https://terra.bz9.me/`.
- Public verification currently passes with `npm run verify:public`.
- Core visual surfaces have been moved toward real generated assets:
  - alchemy cauldron
  - battle card frames
  - victory / reward panel
  - updated slash / heal card illustrations
- Remaining work is mostly visual unification depth, not basic functionality.

## 2) Completed This Round

- [x] Replaced CSS-handmade cauldron with real generated art.
- [x] Generated and reviewed cauldron candidate sheets.
- [x] Replaced battle card frames with a real UI asset.
- [x] Replaced victory / reward popup panel with a real UI asset.
- [x] Replaced weak battle card illustrations for `slash` and `heal`.
- [x] Added / updated dedicated smoke scripts for battle and reward verification.
- [x] Verified public deploy after each major visual swap.
- [x] Confirmed the public battle screenshot shows real framed cards and the new slash/heal illustrations.

## 3) Already Verified in Public

- `node tools/alchemy_workshop_polish_smoke.js`
- `node tools/reward_popup_smoke.js`
- `node tools/terra_battle_dungeon_smoke.js`
- `node tools/terra_visual_smoke.js`
- `node tools/soft_farm_unification_smoke.js`
- `node tools/soft_farm_crop_ui_smoke.js`
- `npm run verify:public`

## 4) Active Visual TODOs

### 4.1 Battle UI polish

- [ ] Increase vertical spacing between enemy HP / intent and the card hand.
- [ ] Make player HUD numbers slightly more legible against the bottom panel.
- [ ] Recheck card art consistency after the slash/heal replacement.
- [ ] Decide whether `guard` and `charge` also need replacement in a later batch.
- [ ] Verify card hover / play animation still feels good with the new frames.

### 4.2 Reward panel polish

- [ ] Reduce any remaining text crowding in the reward popup.
- [ ] Recheck card/reward grid padding at smaller browser widths.
- [ ] Confirm the popup still feels premium on narrow viewports.
- [ ] Consider a later pass to make reward choice cards less visually dense.

### 4.3 Alchemy workshop polish

- [ ] Optional later pass on the cauldron base shadow and smoke softness.
- [ ] Optional later pass on right-side panel contrast and helper text readability.
- [ ] Keep the real-image rule: do not regress to CSS fake pots or fake core assets.

## 5) Asset Roadmap — Priority Order

### P0: Highest priority core visuals

- [x] `ui_card_frame_terra`
- [x] `ui_reward_panel_terra`
- [x] `card_slash_sprout`
- [x] `card_root_guard`
- [x] `alchemy_cauldron`
- [ ] `monster_root_worm`
- [ ] `beast_spring_drop`
- [ ] `crop_star_wheat`

### P1: Next best visual systems to unify

- [ ] `ui_dungeon_node_combat`
- [ ] `ui_dungeon_node_elite`
- [ ] `ui_dungeon_node_rest`
- [ ] `ui_dungeon_node_shop`
- [ ] `ui_dungeon_node_boss`
- [ ] `status_shield`
- [ ] `status_energy`
- [ ] `status_blessing`
- [ ] `status_weakness`
- [ ] `status_corruption`
- [ ] `status_thorns`
- [ ] `monster_spore_gnarl`
- [ ] `monster_fungus_knight`
- [ ] `monster_mist_mold`
- [ ] `beast_forge_ember`
- [ ] `material_wood_raw`

### P2: Secondary content / support art

- [ ] `crop_moon_turnip`
- [ ] `crop_iron_tuber`
- [ ] `crop_moss_radish`
- [ ] `material_stone_chip`
- [ ] `material_iron_frag`
- [ ] `material_spore_dust`
- [ ] `material_seed_core`
- [ ] `material_essence_shard`
- [ ] Remaining water / fire /土系灵兽 variants
- [ ] Remaining card families beyond slash / guard / heal / charge

## 6) Gameplay / Systems TODOs

### 6.1 Battle / dungeon system

- [ ] Deepen card-family visual consistency across all card types.
- [ ] Expand dungeon node icon set beyond the current working set.
- [ ] Improve enemy / player HUD hierarchy and readability.
- [ ] Add more boss / elite visual identity work.

### 6.2 Farm / ecology / capture systems

- [ ] Continue integrating beast / crop / material visuals into the live runtime.
- [ ] Expand ecology / capture / labor presentation so assets feel like a single ecosystem.
- [ ] Add or polish any missing capture or evolution-facing presentation layers.

### 6.3 Progression / content breadth

- [ ] Extend first-wave and second-wave asset families into full content sets.
- [ ] Keep alignment with the unified art spec for all future content batches.
- [ ] Avoid adding isolated one-off art that does not fit the cluster rules.

## 7) Technical Debt / Maintenance

- [ ] Keep `src/main.js` cache-busted whenever it changes.
- [ ] Keep `index.html` script versions in sync with deployed live files.
- [ ] Preserve public verification after every visual asset swap.
- [ ] Keep the smoke scripts aligned with real visual expectations, not stale template checks.
- [ ] Update `.deep-work/terra-unified-assets-20260615/progress.md` whenever a real asset batch is selected or replaced.
- [ ] Commit and push meaningful changes so server loss does not erase progress.

## 8) Verification Gates

A visual task is not done until all of these are true:

- [ ] The asset exists as a real generated or sourced image file.
- [ ] A candidate sheet / manifest exists for the selection batch.
- [ ] The candidate was reviewed visually on a light and dark background where relevant.
- [ ] The runtime file points to the selected asset.
- [ ] The public site loads the updated bundle.
- [ ] A public smoke script passes.
- [ ] A visual review screenshot confirms the intended asset is actually visible.
- [ ] No console or page errors were introduced.

## 9) Notes For Future Work

- Keep using clustered reference packs instead of mixing styles across systems.
- Prefer 5+ candidates for any new core visual surface.
- For premium surfaces, real image assets are mandatory; CSS is layout only.
- If a screenshot is black, verify fade overlays before judging the art.
- If a candidate feels “almost right,” it is still a candidate, not a final asset.

## 10) Recommended Next Batch

If continuing immediately, the best next batch is:

1. `monster_root_worm`
2. `beast_spring_drop`
3. `crop_star_wheat`
4. `ui_dungeon_node_combat`
5. `status_shield`

Reason:
- These are the next highest-visibility assets still needed to extend the unified language beyond the battle/reward/alchemy surfaces already improved.
- They map directly to the existing first-wave and second-wave family docs.
- They would tighten the battle, farm, and dungeon loops without needing a system rewrite.

## 11) Quick Snapshot

- Done: core battle/reward/alchemy surfaces are now real-art based.
- In progress: battle spacing and readability polish.
- Next: monsters, beasts, crops, dungeon nodes, and status icons.
- Rule: no more CSS fake hero assets.
