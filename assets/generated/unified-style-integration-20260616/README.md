# Terra Chronicle 统一风格接入清单 — 2026-06-16

## 目标
把当前已经验证过的 Terra 风格母版，稳定落到最值得先做、且风险最低的游戏 surface 上，而不是零散替换单个图。

## 首发家族
1. `ui_card_frame_terra`
2. `card_slash_sprout`
3. `card_root_guard`
4. `ui_reward_panel_terra`

## 推荐接入顺序
### A. 低风险先行
- `ui_reward_panel_terra`
- `ui_card_frame_terra`

### B. 受控替换
- `card_root_guard`
- `card_slash_sprout`

### C. 后续扩展
- `ui_dungeon_node_terra`
- `status_shield`
- `crop_star_wheat`
- `crop_moon_turnip`
- `material_wood_raw`

## 验收门槛
- 远看轮廓清楚
- 近看细节统一
- 文字可读性不下降
- 现有 smoke 全部继续通过
- 用户一眼能看出这是同一款 Terra
