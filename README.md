# Terra Chronicle 大地编年史

农场经营 × 灵兽养成 × 卡牌锻造 × 大陆地缘博弈的多人联机网页游戏。
**v1 · 2.5D 探索原型**（PixiJS v8 / WebGL）。

- 在线：https://terra.bz9.me （旧版氛围 demo 保留在 https://terra.bz9.me/v0/prototype/index.html）
- v0 备份仓库：https://github.com/Cyrene963/terra-chronicle-v0-demo

## 本版核心（对应 2D/2.5D 架构审计）

| 审计要求 | 实现 |
|---|---|
| 2D 俯视角 + 主角 WASD | `src/main.js` §7 — 纸片人主角、八方向移动、走路挤压弹跳动画 |
| 摄像机平滑跟随 | §8 — 指数趋近插值 + 世界边缘钳制，入场时从 0.5x 缓推到 1x |
| 标准 Tilemap + 精灵节点 | §5 瓦片层(56×56×64px) + §6 `makeNode()` 精灵工厂 |
| 图片替换接口 | §1 `ASSETS` 清单 — 给任意条目填 `src:'assets/sprites/x.png'` 即换图，碰撞/遮挡/换色逻辑零改动 |
| 碰撞 | 水域瓦片阻挡 + 物件椭圆碰撞体（树/石/屋/风车），轴分离移动 |
| Y-Sort 层级遮挡 | `objL.sortableChildren` + `zIndex=y`，主角走到树后正确被遮挡 |
| 顶级氛围保留 | 四季连续调色插值、昼夜乘色光照、暮金时刻、云影漂移、樱瓣/落叶/雪/夜萤粒子、晕影、屋窗夜灯、毛玻璃地籍面板、弹簧物理 UI |

## 运行

零构建依赖，任何静态服务器即可：

```bash
npx serve .        # 或 pm2 serve . 8867
```

## 操作

- `WASD / 方向键` 移动 · 点击耕地查看地籍档案
- `1-4` 跳转季节 · `F` 10 倍时光流速

## 美术资产接入流程（AI 生成 PNG）

1. 用 gpt-image-2 生成透明底 PNG（建议尺寸见 `ASSETS` 各条目 w/h）
2. 放入 `assets/sprites/`
3. 在 `src/main.js` 顶部 `ASSETS` 表填入路径，刷新即生效
4. 瓦片贴图同理（64×64，`ASSETS.tiles.*.src`），季节色仍会以乘色方式作用在贴图上

## 目录

```
index.html        # DOM UI 层(标题/HUD/面板) + 样式
src/main.js       # 世界层引擎(Tilemap/精灵/主角/镜头/氛围)
vendor/pixi.min.js
assets/concept/   # AI 概念图(标题 KV/卡牌)
docs/             # 核心系统设计文档
tools/shoot.js    # Playwright 回归截图
```
