# Terra Chronicle Godot 迁移资料归档

> 状态：已废弃 / 仅作历史参考。

2026-06-15 决策更新：Terra Chronicle 不再进行 Godot 迁移。项目后续继续沿 PixiJS / Web / PWA 路线推进。

## 当前权威路线

- 主项目：`/root/terra-chronicle-game`
- 公网站点：`https://terra.bz9.me`
- 公网根目录：`/var/www/terra-pixijs`
- 技术栈：PixiJS v8 + 原生 HTML/CSS UI + 静态部署 + Playwright smoke
- 目标：把现有网页版本打磨成高审美、高性能、强可玩性的游戏原型与后续产品化基础

## 为什么归档

此前曾计划将 PixiJS 原型迁移到 Godot 4.x，以获得跨平台和场景编辑能力。但当前项目最紧迫问题不是引擎能力，而是：

- 公网真实体验质量
- UI / 美术 / 动画 / 素材统一度
- 农场、炼金、卡牌、地城、奖励回流的玩法闭环
- 真实浏览器验证与性能稳定
- 快速迭代和持续 dogfood

因此短中期不再投入 Godot 重写，不再把“迁移”作为开发方向。

## 如何使用本文件

- 可以参考旧迁移包中的资产清单、系统拆解和设计备注。
- 不应再按照旧文件创建 Godot 项目、重写 GDScript 或替代 PixiJS 版本。
- 任何后续开发都应以 `PROJECT_VISION.md` 和 `docs/unified-art-design-spec.md` 为准。

## 废弃内容

以下旧内容均不再是当前计划：

- Godot 4.x 项目结构
- GDScript 重写计划
- Godot WASM 导出计划
- TileMap / NavigationAgent2D / Control 节点迁移清单
- “替代 PixiJS 版本”的发布计划

## 当前下一步

继续在 PixiJS/Web 版本中实装：

1. 玩法闭环：作物 → 材料 → 炼金 → 卡牌 → 地城 → 奖励回流。
2. 美术体系：怪物、灵兽、作物、卡牌、UI 使用统一资产规范。
3. 前端体验：响应式、动画、转场、反馈、性能、真实公网验证。
4. 联机原型：后续用 WebSocket / server-authoritative simulation 渐进接入。
