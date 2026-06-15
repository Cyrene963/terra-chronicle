# Terra Chronicle Godot 迁移指南归档

> 状态：已废弃 / 仅作历史参考。

2026-06-15 决策更新：Terra Chronicle 不再进行 Godot 迁移。后续开发继续沿 PixiJS / Web / PWA 路线推进。

## 当前结论

旧版迁移指南中的 Godot 4.x、GDScript、TileMap、NavigationAgent2D、Control UI、WASM 导出等计划不再执行。

当前项目的真实开发目标是：

1. 继续打磨 `https://terra.bz9.me` 上的 PixiJS 版本。
2. 把农场经营、灵兽劳动力、炼金卡牌、地城战斗、奖励回流做成完整闭环。
3. 把怪物、卡牌、宠物、农作物、材料和 UI 统一到同一套美术语言。
4. 通过真实浏览器截图、smoke、性能读数和素材 alpha 检查验证每次改动。
5. 后续联机使用 WebSocket / server-authoritative simulation 渐进接入。

## 权威文件

请改读：

- `../../PROJECT_VISION.md`
- `../../docs/unified-art-design-spec.md`
- `../../docs/asset-master-list.md`
- `../../docs/core-systems-v0.1.md`
- `../../docs/dual-world-architecture.md`

## 归档说明

本文件保留作为历史上下文，避免未来误以为缺失迁移资料。任何 agent 或开发者不应再根据本文件启动 Godot 重写。
