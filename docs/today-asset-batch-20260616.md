# Today Asset Batch Plan — 2026-06-16

Scope: plan only. This document does not change runtime code or `src/`.

Grounding docs:
- `PROJECT_VISION.md`
- `docs/unified-art-design-spec.md`
- `docs/asset-master-list.md`
- `docs/art-production-index.md`
- `docs/first-wave-asset-families.md`
- `docs/first-wave-visual-briefs.md`
- `docs/first-wave-production-breakdown.md`
- `docs/card-frame-selection.md`
- `docs/card-composition-review.md`
- `docs/second-wave-asset-families.md`
- `docs/second-wave-visual-prompts.md`

## 1. North Star for today

Today should produce a small, coherent asset batch that can later flow into the visible core loop: battle cards, HUD states, dungeon map nodes, reward UI, crops, and material inventory.

The project direction is not generic web-game art. Assets must support Terra Chronicle as a premium warm-fantasy, parchment-and-bronze, handcrafted interactive art game. Every asset should look like it belongs to the same ecology of land, crops, workshop alchemy, spirit beasts, dungeon risk, and abyssal pollution.

Hard style rules for the batch:
- Use warm fantasy, parchment, bronze, leather, wood, bark, soil, moss, muted gold, and subtle glow.
- Keep silhouettes readable at game UI sizes.
- Avoid emoji, flat app icons, plastic shine, cyberpunk neon, unrelated anime sticker style, and over-detailed AI concept clutter.
- Classify by reference cluster before production:
  - Card frame / card art: Battle / magic / card art cluster.
  - Dungeon combat node: Route node / map UI cluster.
  - Reward panel, crop, material, soft HUD icon variants: Soft farm / pet / crop / button / scroll UI cluster, with HUD readability checks.
- Use candidate-first workflow for any final art: 5+ candidates per important asset, labeled contact sheet, manifest, selected source, processed asset, and target-size visual QA before integration.

## 2. Today feasible batches

### Batch A — Reward UI panel family

Primary asset:
- `ui_reward_panel_terra`

Why today:
- `asset-master-list.md` lists reward settlement panel under major UI components and `reward_...` as a naming family.
- `first-wave-asset-families.md` includes `ui_reward_panel_terra` beside `ui_card_frame_terra` and `ui_dungeon_node_terra` as a core UI component.
- Reward presentation connects battle, alchemy, crop/material output, and long-term progression; it is a high-leverage UI wrapper.

Design target:
- A parchment reward panel with bronze/gold trim, subtle corner ornaments, and clean hierarchy.
- Must feel like a workshop ledger or expedition settlement sheet, not a browser modal.
- Should support reward rows for cards, materials, crops, currency, and blessings.

Minimum deliverables:
1. Panel shell: parchment body, bronze/gold border, four-corner ornament language aligned with current UI.
2. Reward slot component: small item-card well with readable icon area and quantity badge.
3. Header/footer states: title zone, confirm button zone, optional rarity glow behind high-value rewards.
4. Contact sheet: 5 candidates minimum, selecting 1–2 directions.

Production notes:
- Keep panel less noisy than card art so reward icons remain readable.
- Match current warm parchment + gold border + serif typography direction from `PROJECT_VISION.md`.
- Use material/crop/card icon placeholders only in planning; do not hardwire to `src/` today.

Done today if:
- A selected reward panel direction is documented with slot structure and target layout proportions.
- It has enough spacing for at least 3 reward types at small browser sizes.

### Batch B — Card frame / gameplay card standard

Primary assets:
- `ui_card_frame_terra_gameplay_v1`
- Optional compatibility preview for `card_slash_sprout`

Why today:
- `art-production-index.md` says the first practical route starts from `ui_card_frame_terra`.
- `card-frame-selection.md` already selected Candidate 01 as the first card-frame base.
- `card-composition-review.md` says the direction works but needs a gameplay-specific adaptation before code integration.

Design target:
- Keep Candidate 01’s warm parchment, bronze, handcrafted fantasy base.
- Reduce noise, improve hierarchy, and make the frame usable in battle hand size.
- Separate fee orb, title, illustration window, and rules text.

Minimum deliverables:
1. Gameplay frame layout pass: fixed title band, isolated left-top cost orb, inset illustration window, high-contrast rules box.
2. Type/range variants as color notes only: attack, defense, blessing/alchemy.
3. One static composition test using `card_slash_sprout` as the sample, without integrating into `src/battle.js`.
4. Small-size readability checklist for cost, name, type, and effect.

Production notes:
- Candidate 01 is the base direction; do not restart from an unrelated frame style.
- The card must remain a “crafted physical object” rather than a flat web panel.
- The `card_slash_sprout` preview is only a validation sample; the deliverable is the reusable frame standard.

Done today if:
- The layout resolves the known review issues: crowded title/cost, pasted-looking illustration, weak text area, and hand-size complexity.

### Batch C — Status shield HUD icon

Primary asset:
- `status_shield`

Why today:
- `second-wave-asset-families.md` ranks `status_shield` immediately after `ui_dungeon_node_combat` in the second-wave order.
- It is a battle HUD semantic anchor: players should understand armor without reading text.
- `second-wave-visual-prompts.md` already defines a production-ready brief.

Design target:
- Small readable fantasy HUD shield icon.
- Root-and-bark shield silhouette, bronze rim, soft blue-gray protection glow.
- Compatible with parchment UI and card-frame materials.

Minimum deliverables:
1. 5–8 candidate icons on one contact sheet.
2. 24px / 32px / 48px readability preview.
3. Selected 1–2 candidates, with notes on silhouette, contrast, and how it differs from generic app shields.

Production notes:
- Must remain readable at 24px.
- Avoid over-detailed heraldry, sci-fi shields, emoji shield, and generic flat-blue app icon language.
- Should visually connect to defensive card motifs: root, bark, shield, ward, bronze edge.

Done today if:
- At least one selected icon is clearly identifiable at 24px and stylistically fits Terra’s parchment/bronze HUD.

### Batch D — Dungeon combat node

Primary asset:
- `ui_dungeon_node_combat`

Why today:
- `second-wave-asset-families.md` lists it as the first recommended second-wave asset.
- Dungeon route nodes are visible, repeated UI objects; a strong combat node improves the map immediately.
- It belongs to a different cluster from card art, so it can establish the route-node language before elite/rest/shop/boss variants.

Design target:
- A combat badge embedded in a dark parchment map route.
- Bronze ring, subtle golden pulse, crossed organic blades or vine thorns.
- Readable as “fight here” without becoming a generic sword emoji.

Minimum deliverables:
1. Combat node icon candidates: normal, hover/active glow note, and disabled/visited tone note.
2. Size preview for map-node scale.
3. Family extension notes for elite/rest/shop/boss so the combat node does not become a one-off.

Production notes:
- Use route node / map UI reference cluster first.
- Maintain layer hierarchy: map background < node ring < combat symbol < glow/selection state.
- Avoid plastic button, flat web icon, neon sci-fi glow, or generic crossed swords.

Done today if:
- One combat node direction can clearly scale into the full dungeon-node set.

### Batch E — Root crop + material mini-set

Primary assets:
- `crop_moon_turnip`
- `material_wood_raw`

Optional adjacent notes:
- `crop_iron_tuber`, `crop_moss_radish`
- `material_stone_chip`, `material_iron_frag`

Why today:
- Root crop and material assets connect farm output to alchemy, crafting, cards, and rewards.
- `second-wave-asset-families.md` positions `crop_moon_turnip` and `material_wood_raw` as feasible second-wave items.
- `first-wave-asset-families.md` defines root crops as durability/armor/recovery/alchemy inputs and materials as the economic base.

Design target for `crop_moon_turnip`:
- A harvestable root crop with clear underground mass, pale moonlit body, small green leaves, earthy base, and slight night magic.
- Must read as a root vegetable, not a stock-photo turnip and not a toy icon.

Design target for `material_wood_raw`:
- Small bundle of cut logs with warm brown grain, bark, slight moss, and inventory readability.
- Simple but premium; recognizable as a base material and not overly ornate.

Minimum deliverables:
1. `crop_moon_turnip`: seedling/mature/harvest icon structure notes, with 5 candidate mature forms if producing art.
2. `material_wood_raw`: 5 icon candidates and inventory-slot preview.
3. Shared reward/inventory compatibility check with `ui_reward_panel_terra` slots.

Production notes:
- Keep root crop in soft farm/crop cluster; keep material in inventory/reward icon context.
- Crop must contrast with `crop_star_wheat`: underground, heavier, functional/alchemical, not golden grain.
- Wood should look like a humble base input, not a rare artifact.

Done today if:
- Crop and wood can both sit inside the reward slot component without style clash.

## 3. Recommended order for today

1. `ui_card_frame_terra_gameplay_v1`
   - It fixes the known blocker from card composition review and stabilizes all future card visuals.
2. `ui_dungeon_node_combat`
   - It is the top second-wave recommendation and defines route-node language.
3. `status_shield`
   - It is small, feasible, and immediately useful for battle HUD clarity.
4. `ui_reward_panel_terra`
   - It wraps future drops from cards, crops, materials, and blessings.
5. `crop_moon_turnip` + `material_wood_raw`
   - Produce as a paired economy/reward mini-set after the UI containers are defined.

If time is limited, make today a UI/HUD day:
- Card frame gameplay v1
- Dungeon combat node
- Status shield
- Reward panel shell

If time remains, add the crop/material mini-set for reward-slot compatibility testing.

## 4. Batch acceptance checklist

Before any asset from this plan is considered ready for implementation:
- It has a clear Terra family name using `ui_...`, `status_...`, `crop_...`, or `material_...` naming.
- It can explain its ecosystem role: battle, dungeon route, reward, farm, alchemy, or inventory.
- It uses the correct reference cluster.
- It has at least 5 candidates if final art is being selected.
- It has a contact sheet and selection notes.
- It is tested at target size, especially 24px for status icons and hand-size for cards.
- It avoids the forbidden styles listed in `unified-art-design-spec.md`.
- It can coexist with parchment UI, bronze/gold trim, serif labels, and the warm fantasy farm/world tone.

## 5. Explicit non-goals today

- Do not edit `src/`.
- Do not integrate assets into `battle.js` or live UI today.
- Do not start unrelated new monsters, pets, bosses, or environments.
- Do not generate a large inconsistent batch without contact sheets and selection notes.
- Do not replace the selected card-frame base with an unrelated style.

## 6. Summary deliverable for the day

The best feasible asset batch for 2026-06-16 is a small UI/HUD/economy set:
- Reward UI: `ui_reward_panel_terra`
- Card frame: `ui_card_frame_terra_gameplay_v1` based on selected Candidate 01
- Status icon: `status_shield`
- Dungeon node: `ui_dungeon_node_combat`
- Root crop/material: `crop_moon_turnip` and `material_wood_raw`

This set is grounded in the current project docs, strengthens visible battle/dungeon/reward readability, and prepares future card, crop, and material assets without touching runtime source code.
