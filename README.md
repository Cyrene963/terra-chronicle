# Terra Chronicle 大地编年史

农场经营 × 灵兽养成 × 卡牌锻造 × 大陆地缘博弈的多人联机网页游戏。
**v5 · 寻路探索 + 灵兽 AI**（PixiJS v8 / WebGL · gpt-image-2 全套贴图）。

- 在线：https://terra.bz9.me （旧版氛围 demo 保留在 https://terra.bz9.me/v0/prototype/index.html）
- v0 备份仓库：https://github.com/Cyrene963/terra-chronicle-v0-demo

## v5 新增（Gemini 审计四大任务）

- **像素级清晰渲染**：全 DPR 原生分辨率（`devicePixelRatio`,上限 2）+ `roundPixels`；瓦片
  NEAREST + clamp-to-edge + 1px 重叠（消除水面接缝）；精灵 LINEAR+mipmap（高清源缩小不闪烁）。
  **根因修复**：旧版资产被预缩小到 ~110px 致视网膜屏放大发糊 → 现统一 512px 高清源,只缩不放。
- **Tap-to-Move 点击寻路**：A\* 网格寻路（避水/石/树/栅栏,禁切墙角）+ 视线平滑;
  点击树→走到旁边自动伐木;点击耕地→走过去自动种/收;点击空地→寻路前往。WASD 仍可用,右键看地籍。
- **四季 ColorMatrixFilter 色彩分级**：春=高饱和清新 / 夏=明亮 / 秋=绿叶转金黄(跨通道暖色相) /
  冬=去饱和冷调;季中保持满强度,仅季末平滑过渡。
- **水灵兽 AI（FSM）**：水边生成灵兽,状态机 闲逛→前往→浇水,自动扫描"已播种缺水"的田、A\* 寻路
  过去浇水（生长提速 1.8×）;左下角灵兽面板实时显示状态。
- **资产管线**：`tools/gen_sprites.py` 升级 `quality:high`（实测此代理 size 上限 ~1254²,2K/4K 不被采纳）
  + 角点采样色键 + 1px alpha 腐蚀去毛边 + 无损 PNG-32;`gen_heroes.py` / `gen_winter.py` 同工艺。

## 操作

- **点击/触摸大地**：寻路移动（自动绕障）· 点击树→伐木 · 点击耕地→种植/收获
- `WASD/方向键` 直接移动 · `空格` 就近交互 · `右键` 查看地籍 · `1-4` 季节 · `F` 加速时光

## 历史版本要点

- v2 全套 AI 贴图接入；性能体系（共享纹理粒子/调色节流/视口剔除/自适应画质）；
  `src/state.js` 双层世界（PrivateFarm/PublicOverworld/StrategicNode）+ `craftCard()` 锻造经济。
- v3/v4 农场闭环（种→收→锻卡）、冬季覆雪贴图、时间驱动粒子、缓存破坏（`?v=N` + nginx no-cache）。

## 本版核心（对应 2D/2.5D 架构审计）

| 审计要求 | 实现 |
|---|---|
| 2D 俯视角 + 主角移动 | `src/main.js` §7 — 纸片人主角、八方向移动/寻路、走路挤压弹跳动画 |
| 摄像机平滑跟随 | §8 — 指数趋近插值 + 世界边缘钳制，入场时从 0.5x 缓推到 1x |
| 标准 Tilemap + 精灵节点 | §5 瓦片层(56×56×64px) + §6 `makeNode()` 精灵工厂 |
| 图片替换接口 | §1 `ASSETS` 清单 — 给任意条目填 `src:'assets/sprites/x.png'` 即换图，碰撞/遮挡/换色逻辑零改动 |
| 碰撞 | 水域瓦片阻挡 + 物件椭圆碰撞体（树/石/屋/风车），轴分离移动 |
| Y-Sort 层级遮挡 | `objL.sortableChildren` + `zIndex=y`，主角走到树后正确被遮挡 |
| 顶级氛围保留 | 四季连续调色插值、昼夜乘色光照、暮金时刻、云影漂移、樱瓣/落叶/雪/夜萤粒子、晕影、屋窗夜灯、毛玻璃地籍面板、弹簧物理 UI |


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
