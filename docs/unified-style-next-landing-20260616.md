# Unified Style Next Landing Map — 2026-06-16

Purpose: map the next visual landing points to their canonical Terra source families before any source-code integration. This is a docs-only routing note.

## Global Source Rule

All five targets must inherit from `docs/unified-art-design-spec.md`: warm fantasy notebook tone, parchment/leather/copper/gold materials, serif readability, land-grown motifs, and no generic neon, plastic, sci-fi, or mismatched stock UI.

## Visual Source Map

| Landing target | Source visuals from | Landing guidance |
| --- | --- | --- |
| Card frame | `ui_card_frame_terra` in `docs/first-wave-asset-families.md`, `docs/first-wave-visual-briefs.md`, `docs/first-wave-generation-prompts.md` | Treat this as the master reusable card shell: parchment base, bronze/gold frame, worn handcrafted corners, cost orb, title/effect zones. Do not invent alternate frame language per card. |
| Battle cards | Card families in `docs/first-wave-asset-families.md`: `card_slash_sprout`, `card_thorn_cut`, `card_burst_bloom`, `card_root_guard`, `card_bark_shield`, `card_mist_ward`, `card_ember_pulse`, `card_verdant_rite`, `card_terra_blessing` | Source the frame from `ui_card_frame_terra`; source illustration motifs from card type families: attack = blade/sprout/vine impact, defense = root/bark/mist protection, blessing/alchemy = forge product + ritual glow. |
| Reward panel | `ui_reward_panel_terra` from the first-wave UI component family, plus card/alchemy reward motifs from the card and material families | Rewards should feel like workshop output laid on parchment: warm sand paper, gold trim, copper clasps, clear rarity emphasis, and icons/cards that still look harvested, forged, or alchemized from Terra materials. |
| Alchemy panel | Existing Terra alchemy language from `PROJECT_VISION.md` and `docs/unified-art-design-spec.md`: parchment UI, bronze cauldron, copper/gold workshop materials, fire/ember/ritual motifs | Source visuals from the workshop/alchemy axis, not from generic magic UI: bronze cauldron, warm copper, pottery/forge heat, ingredient slots, subtle golden discovery glow. Use `beast_forge_ember`, `material_wood_raw`, and blessing-card motifs as adjacent references. |
| Dungeon nodes | `ui_dungeon_node_terra` from first-wave UI, then second-wave node variants: `ui_dungeon_node_combat`, `ui_dungeon_node_elite`, `ui_dungeon_node_rest`, `ui_dungeon_node_shop`, `ui_dungeon_node_boss` | Source node silhouettes from the dungeon-node UI family: dark fantasy map base, old-gold rings, shadowed paths, pulsing selection state. Risk hierarchy must be visible: combat < elite < boss; rest/shop must read safer and calmer. |

## Landing Order

1. Lock `ui_card_frame_terra` as the shared card shell.
2. Compose one battle-card preview using `card_slash_sprout` inside that shell.
3. Derive reward panel styling from the same parchment/gold UI language.
4. Align alchemy panel details to bronze cauldron + workshop materials.
5. Expand dungeon nodes from `ui_dungeon_node_combat` into elite/rest/shop/boss variants.

## Do Not Source From

- Emoji-like system icons as final art.
- Generic web panels unrelated to parchment/copper/gold Terra UI.
- Cyberpunk neon, glossy plastic, flat mobile stock-game cards, or unrelated fantasy card frames.
- Cross-cluster references unless the bridge is intentional and documented.
