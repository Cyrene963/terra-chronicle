# Terra Chronicle — 旧 Godot 资产迁移包归档

> 状态：已废弃 / 仅作历史参考。

2026-06-15 决策更新：Terra Chronicle 不再进行 Godot 迁移。项目后续继续沿 PixiJS / Web / PWA 路线推进。

## 当前权威路线

请以仓库根目录的 `PROJECT_VISION.md` 为准：

- 继续开发当前 PixiJS v8 WebGL 版本
- 公网站点继续使用 `https://terra.bz9.me`
- 通过 `/var/www/terra-pixijs` 同步部署
- 使用 Playwright smoke 和真实截图验证前端、美术、玩法与性能

## 本目录用途

本目录保留旧迁移包中的：

- 历史资产导出
- 旧系统拆解
- 旧迁移设计备注

这些内容可以作为资料参考，但不再是执行计划。

## 不再执行

- 不创建 Godot 项目
- 不把 JavaScript 逻辑重写为 GDScript
- 不以 Godot WASM 替代当前 PixiJS 版本
- 不按旧迁移清单推进 TileMap / NavigationAgent2D / Control 节点重写

## 当前开发入口

- `../PROJECT_VISION.md`
- `../docs/unified-art-design-spec.md`
- `../docs/asset-master-list.md`
- `../src/main.js`
- `../src/battle.js`
- `../tools/terra_visual_smoke.js`
- `../tools/terra_battle_dungeon_smoke.js`
