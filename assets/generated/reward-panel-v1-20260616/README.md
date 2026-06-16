# Reward Panel v1 Asset Brief

Generated: 2026-06-16

This folder defines the first reward-panel icon/token family for Terra Chronicle. It is a brief/manifest artifact only: no `src/` files were edited and no final PNGs are included yet.

## Source alignment

Based on existing project docs:

- `PROJECT_VISION.md` — premium warm fantasy, parchment + gold UI direction.
- `docs/unified-art-design-spec.md` — reward/icons must use clear silhouettes, handcrafted Terra materials, and avoid emoji/flat generic UI.
- `docs/asset-master-list.md` — reward assets should use `reward_...` naming and support settlement panels/material drops.
- `docs/first-wave-asset-families.md` — `ui_reward_panel_terra` belongs to core UI components.
- `docs/first-wave-visual-briefs.md` and `docs/first-wave-generation-prompts.md` — water spirit/spring drop language.
- `docs/second-wave-visual-prompts.md` — dungeon node/status/material icon prompt style and wood material language.

## Shared art direction

- Cluster: UI icons / reward tokens.
- Use: reward settlement panel, inventory grid, crafting/material reveal.
- Format: single centered icon or token; transparent background preferred; readable at 48px and 96px.
- Style: warm fantasy, parchment-and-bronze compatible, handcrafted premium game asset, clear silhouette, subtle gold rim/inner glow where useful.
- Avoid: emoji, stock icons, flat app icons, plastic toys, cyberpunk neon, sci-fi UI, photoreal objects, cluttered tiny details.

## Icon list

| id | Target path | Brief |
| --- | --- | --- |
| `blight_seed` | `assets/generated/reward-panel-v1-20260616/blight_seed.png` | Corrupted botanical seed pod from polluted soil, cracked dark husk, muted purple fissures, tiny sickly green sprout, spore motes. |
| `abyss_vigor` | `assets/generated/reward-panel-v1-20260616/abyss_vigor.png` | Controlled abyss vitality buff token: amethyst heart-core/droplet, red-violet pulse, warm gold/bronze restraint ring. |
| `ember_focus` | `assets/generated/reward-panel-v1-20260616/ember_focus.png` | Forge-fire focus token: glowing coal crystal or ember lens wrapped in copper, orange core, small sparks. |
| `wood_crate` | `assets/generated/reward-panel-v1-20260616/wood_crate.png` | Handcrafted wooden reward crate, warm wood grain, rope binding, bronze nails, moss/bark texture. |
| `spring_drop_capture` | `assets/generated/reward-panel-v1-20260616/spring_drop_capture.png` | Capture token for spring-drop water spirit: crystal droplet in bronze capture ring with pale blue/soft green leaf accents. |
| `abyss_core` | `assets/generated/reward-panel-v1-20260616/abyss_core.png` | Rare cracked black-violet stone orb/core, restrained purple glow, faint smoke, old-gold/bronze setting fragments. |

Full prompt briefs, negative prompts, categories, and notes are in `manifest.json`.

## Production notes

1. Generate each icon as an isolated token, not a full scene.
2. Check readability at 48px before accepting.
3. Keep all six icons visually related through bronze/gold UI integration and Terra material texture.
4. The abyss/blight icons may use dark purple accents, but should not become neon sci-fi or demonic gore.
5. `spring_drop_capture` should imply the existing `beast_spring_drop` without replacing the actual beast portrait.
