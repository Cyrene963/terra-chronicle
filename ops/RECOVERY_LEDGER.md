# Terra Chronicle Recovery Ledger

> 目的：把“做过 / 丢过 / 仍在磁盘上 / 当前未挂载 / 已退役”的内容硬拆清楚，不再靠记忆争论。

## Status Legend
- **A** = 当前 repo 已存在且已挂载
- **B** = 当前 repo/磁盘存在，但未挂载或未在公开 runtime 生效
- **C** = 历史上已验证/文档记载，但当前代码疑似丢失或未找到可信实现
- **D** = 明确退役，不再恢复

| Feature | Evidence | Current Status | Recoverability | Decision | Notes |
|---|---|---:|---|---|---|
| 凝神过牌 | `/root/TERRA_FINAL_ACCEPTANCE_20260620.md` | C | Low | Recover only if code artifact found later | repo/live 当前搜索无命中；现阶段仅有文档证据，不能假定仍存在 |
| `#b_handhint` | `/root/TERRA_FINAL_ACCEPTANCE_20260620.md` | C | Low | Recover only if code artifact found later | repo/live 当前搜索无命中；现阶段仅有文档证据 |
| Era cycle（验收版） | `/root/.claude/projects/-root/memory/terra-playthrough-baseline-verified.md` | C | Partial | Rebuild later under Wave 2, not blind-restore now | memory/acceptance 记载存在更强 live 版本，但当前 repo 缺同等实现，不应凭记忆热修 |
| 战斗 status icon wiring | `/var/www/terra-pixijs/assets/ui/status_*.png` + acceptance doc | B/C | Partial | Preserve assets now; rewire intentionally later | archive 树可见 6 个 status 图标，但 repo 当前无同名资产，说明至少部分成果不在权威源 |
| `wmCaption` 世界地图说明 | acceptance / memory | C | Low | Retire old implementation claim; redesign under Wave 1 map rebuild | repo/live 当前搜索无命中，不应再视为现存功能 |
| capture system | `src/capture_system.js` | B | High | Keep on disk, not public; remount only after Wave 2 state unification | 文件在 repo，当前 index 未挂载 |
| evolution tree | `src/evolution_tree.js` | B | High | Keep on disk, not public; remount only after Wave 2 state unification | 文件在 repo，当前 index 未挂载 |
| sound system | `src/sound.js` | B | High | Safe candidate for intentional remount once public UX shell is stabilized | 文件在 repo，当前 index 未挂载 |
| recipes_expanded | `src/recipes_expanded.js` | B | Medium | Preserve and evaluate under Wave 2 economy unification | 文件在 repo，当前主 runtime 未挂载 |
| ecology standalone modules | `src/ecology_*.js` | B | Medium | Treat as archive/experimental until ecology is re-centralized | 当前 public runtime 以 `main.js` 内嵌生态逻辑为主 |
| world_map demo/bak remnants | `/var/www/terra-pixijs/src/world_map*.bak` | B | Medium | Archive as evidence only; do not promote to source of truth | archive-only 证据，不能当权威代码 |

## 2026-07-04 Current Mounted Graph (served runtime)

Mounted now via public 8867 entry:
- `src/state.js?v=8`
- `src/game_feel_enhanced.js?v=1`
- `src/feedback_system.js?v=1`
- `src/soil_particles.js?v=1`
- `src/seasonal_events.js?v=1`
- `src/day_night_enhanced.js?v=1`
- `src/water_shader.js?v=14`
- `src/advanced_particles.js?v=14`
- `src/post_processing.js?v=14`
- `src/material_enhancement.js?v=14`
- `src/websocket_client.js`
- `src/neighbor_system.js`
- `src/multiplayer_ui.js?v=2`
- `src/world_map.js?v=3`
- `src/world_map_integration.js?v=3`
- `src/alchemy.js?v=46`
- `src/battle_effects.js?v=1`
- `src/battle.js?v=68`
- `src/dungeon.js?v=50`
- `src/upgrade.js?v=38`
- `src/main.js?v=83`

Not mounted despite present in repo:
- `src/sound.js`
- `src/capture_system.js`
- `src/evolution_tree.js`
- `src/recipes_expanded.js`
- multiple `src/ecology_*.js`
