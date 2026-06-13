# Terra Chronicle 大地编年史

农场经营 × 灵兽养成 × 卡牌锻造 × 大陆地缘博弈的多人联机网页游戏。
**v6 · 卡牌地城 + 扁平地表 + 活起来的世界**（PixiJS v8 / WebGL · gpt-image-2 全套贴图）。

- 在线：https://terra.bz9.me （旧版氛围 demo 保留在 https://terra.bz9.me/v0/prototype/index.html）

## v6 新增（核心循环闭合）

- **卡牌地城战斗（Slay-the-Spire 核心）** `src/battle.js`：地图东北角「深渊之门」→ 走过去进入独立卡牌对战。
  回合制：玩家 HP/护甲、3 点能量、从**锻造卡组**抽 5 张、敌人意图（攻击/格挡预告）、攻击牌造伤/守护牌加甲。
  胜利掉落「污染种子 / 灵兽灵魂」回流农场 —— **种田造牌 → 进洞打怪 → 回家变强**的循环正式闭合。
- **扁平手绘地表**：草地/泥土/沙地/河水重生为 cel-shaded 大色块风（杀掉高频草丝噪点造成的「泥泞糊感」）。
- **季节专属贴图**（取代代码硬调色）：春嫩绿带花 / 夏深绿 / 秋金黄 / 冬覆雪，换季时贴图交叉淡入,
  不再用 ColorMatrixFilter 强拧绿色（那会变脏黄绿）。
- **流动河水**：沿河道移动的流光亮带 + 水岸柔光泡沫（消除马赛克阶梯硬边）+ DisplacementFilter 波纹扭曲（高画质时）。
- **旋转风车**：拆成 `windmill_base` + `windmill_blades` 两张图，叶片作为子节点在主循环旋转。

## 操作

- **点击/触摸大地**：寻路移动（自动绕障）· 点树→伐木 · 点耕地→种/收 · 点**深渊之门**→进副本
- `WASD` 直接移动 · `空格` 就近交互（含进副本）· `右键` 看地籍 · `1-4` 季节 · `F` 加速时光

## 资产工艺

- `tools/gen_sprites.py` / `gen_heroes.py` / `gen_winter.py` / `gen_round6.py`：gpt-image-2 `quality:high`
  （实测此代理 size 上限 ~1254²，2K/4K 不被采纳）+ 品红色键（角点采样 + 1px alpha 腐蚀去毛边）+ 无损 PNG-32。
- 换图接口：`src/main.js` 顶部 `ASSETS` 表，`season:[春,夏,秋,冬]` 配四季专属图。

## 历史版本

- v5 像素级清晰渲染（全 DPR + 512px 高清源,修复"预缩小再放大"发糊）、A* 点击寻路 + 上下文交互、水灵兽 FSM 自动灌溉。
- v2-v4 全套 AI 贴图、性能体系、双层世界 state.js、农场闭环、缓存破坏 `?v=N`。


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
