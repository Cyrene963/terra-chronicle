# Terra Chronicle Overnight Deep Work

Started: 2026-06-14 22:42 CST
Target stop: 2026-06-15 07:00 CST

## Mission
Continuously improve Terra Chronicle public playable prototype at https://terra.bz9.me/ with verified frontend polish and gameplay-loop depth.

## Non-negotiable gates
- Keep public site playable.
- Sync source `/root/terra-chronicle-game` to live root `/var/www/terra-pixijs` for touched files.
- Bump script query versions after touched JS modules.
- Run JS syntax checks for touched modules.
- Verify public domain via remote readback and browser where possible.
- Commit and push meaningful changes to GitHub.

## Priority lanes
1. Make upgrade effects real: workshop/farmland/beast upgrades must change gameplay values or visible state.
2. Polish HUD/card/game-feel: remove web-demo feeling, add game-like resource/status panels and feedback.
3. Expand P1 loop: crops → quality → cards → abyss rewards → upgrades → stronger farming/cards.
4. Fix any regressions found during dogfood.

## Progress log
- 22:42 baseline: public site loads dungeon.js?v=35 upgrade.js?v=35 main.js?v=32, repo clean at e81e85a.
- 23:00 first implementation lane: upgrade effects are now real.
  - workshop_2 adds +10% forge scaling and `工坊精炼` affix.
  - workshop_3 adds +18% forge scaling, high craftsmanship, and `大师铭刻` affix.
  - farmland_2 doubles harvested starwheat per mature crop.
  - beast_capacity shortens water spirit irrigation time and shows a habitat bonus toast.
  - Public versions bumped to alchemy.js?v=36 upgrade.js?v=36 main.js?v=36.
  - Browser smoke evidence: same 90-fertility recipe produced base 21/30, workshop II 22/32 + 工坊精炼, workshop III 24/34 + 大师铭刻.
