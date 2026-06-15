# Terra Chronicle 首发资产定版总览

本文件汇总第一批核心资产的 reference board 与定版结果。后续进入游戏落地时，优先按这里执行。

## 1. `ui_card_frame_terra`

- 定版基底：Candidate 01
- 参考板：`assets/generated/card-frame-ui/contact_sheet.png`
- 决议文档：`docs/card-frame-selection.md`
- 下一步：制作正式卡框母版，替换/增强战斗卡牌 UI

## 2. `card_slash_sprout`

- 定版基底：Candidate 01
- 参考板：`assets/generated/card-slash-sprout/contact_sheet.png`
- 决议文档：`docs/card-slash-sprout-selection.md`
- 下一步：把它作为基础攻击卡的首个正式卡面，套入 `ui_card_frame_terra`

## 3. `monster_root_worm`

- 定版基底：Candidate 04
- 借鉴候选：Candidate 03 的生产细节、弱点和动作参考
- 参考板：`assets/generated/monster-root-worm/contact_sheet.png`
- 决议文档：`docs/monster-root-worm-selection.md`
- 下一步：制作 2D 战斗精灵或替换现有普通污染怪视觉

## 4. `beast_spring_drop`

- 定版基底：Candidate 04
- 借鉴候选：Candidate 01 的脸部可读性与水滴尖细节
- 参考板：`assets/generated/beast-spring-drop/contact_sheet.png`
- 决议文档：`docs/beast-spring-drop-selection.md`
- 下一步：制作水系灵兽图标/精灵，作为灌溉灵兽基准

## 5. `crop_star_wheat`

- 定版基底：Candidate 02
- 借鉴候选：Candidate 05 的田地生长阶段；Candidate 03/06 的库存与炼金变体
- 参考板：`assets/generated/crop-star-wheat/contact_sheet.png`
- 决议文档：`docs/crop-star-wheat-selection.md`
- 下一步：制作幼苗、成熟、收获物三态，并替换/增强当前基础作物视觉

## 6. 实际落地优先级

1. `ui_card_frame_terra`
2. `card_slash_sprout`
3. `monster_root_worm`
4. `beast_spring_drop`
5. `crop_star_wheat`

## 7. 落地质量门

正式接入游戏前必须满足：
- 不是直接把 AI 候选硬塞进 UI
- 必须经过裁切/适配/压缩/命名规范
- 必须验证在 `https://terra.bz9.me/` 实际页面中的视觉效果
- 必须保证不破坏现有战斗/农场 smoke
- 需要同步 `/root/terra-chronicle-game` 与 `/var/www/terra-pixijs`
