# Terra Chronicle 大地编年史

农场经营 × 灵兽养成 × 卡牌锻造 × 大陆地缘博弈的多人联机网页游戏。
**v7 · 游戏感(Juice) + 灵兽繁育系统**（PixiJS v8 / WebGL · gpt-image-2 全套贴图）。

- 在线：https://terra.bz9.me （旧版氛围 demo 保留在 https://terra.bz9.me/v0/prototype/index.html）

## v7 新增（游戏感爆发 + 繁育闭环）

- **战斗打击感（Combat Juice）** `src/battle.js`：抛物线弹跳伤害数字（FCT with gravity arc）、屏幕震动（screen shake on hit）、敌人受击闪白（hit flash brightness filter）、卡牌→敌人光弹动画（projectile tween）、敌人待机呼吸（CSS ebreathe keyframe）+ 紫色污染瘴气粒子持续飘散、玩家受击红色内阴影 vignette。
  每次出牌和敌人攻击都有完整的视觉反馈——真正的「砰」的一下。

- **灵兽程序化动画（Procedural Beast Animation）** `src/main.js §8.6`：
  - 待机：呼吸（Y-scale sin 波，body 微升降）
  - 移动：弹跳轨迹（jump-arc，落地时 squash & stretch 形变）
  - 浇水：剧烈膨胀+回弹 + 耕地处蓝色水花爆发（抛物线 + 重力下落粒子）
  
  静止贴图彻底「活」过来，不再是平移的纸片。

- **灵兽繁育 + 火灵兽（Breeding & Fire Spirit）** `src/main.js §8.7`：
  - 地图新增：**孵化阵（Incubator, 17,31）**、**工坊熔炉（Furnace, 25,22）**
  - 走近孵化阵 → 打开繁育面板，消耗深渊战利品（灵兽灵魂 / 污染种子）可：
    - **孵化火灵兽 🔥**：消耗 灵兽灵魂×1 + 污染种子×1 → 火灵兽破壳，AI 自动寻路去熔炉点火
    - **进化水灵兽 💧**：消耗 灵兽灵魂×1 → 体型变大 1.22×，灌溉时间缩短 40%（2.0s → 1.2s）
  - **火灵兽 AI**：状态机 闲逛 → 前往熔炉 → 工作（持续 6s，周围橙色火星粒子）→ `forgeHot=true` → 锻造品质提升至 0.9+（近保底词条），按钮显示「锻造 · 熔炉灼热 🔥」。
  
  **深渊掉落 → 孵化/进化 → 农场增益 → 更强卡牌 → 深渊** 的循环彻底通了。

- **水岸泡沫融合（Shoreline Foam Blending）** `src/main.js §5`：每条水↔陆边界都骑缝生成一个半透明柔光精灵（per-direction, 4 邻方向分别检测），彻底打破了原来的 90° 台阶锯齿硬边。

- **DPR/Resize 加固（Viewport Hardening）** `src/main.js §4`：画布 CSS 强制 100%，window.resize 监听器同步 renderer.resize + filterArea 更新，确保高分屏/窗口变化时不黑屏、不裁切。

## 操作

- **点击/触摸大地**：寻路移动（自动绕障）· 点树→伐木 · 点耕地→种/收 · 点**深渊之门**→进副本 · 点**孵化阵**→繁育
- `WASD` 直接移动 · `空格` 就近交互（含繁育/战斗）· `右键` 看地籍 · `1-4` 季节 · `F` 加速时光

## 资产工艺

- `tools/gen_sprites.py` / `gen_heroes.py` / `gen_winter.py` / `gen_round6.py` / `gen_round7.py`：gpt-image-2 `quality:high`
  （实测此代理 size 上限 ~1254²，2K/4K 不被采纳）+ 品红色键（角点采样 + 1px alpha 腐蚀去毛边）+ 无损 PNG-32。
- 换图接口：`src/main.js` 顶部 `ASSETS` 表，`season:[春,夏,秋,冬]` 配四季专属图。

## 历史版本

- **v6** 卡牌地城战斗（Slay-the-Spire 核心回合制）、扁平手绘地表、季节专属贴图、流动河水、旋转风车。
- **v5** 像素级清晰渲染（全 DPR + 512px 高清源）、A* 点击寻路 + 上下文交互、水灵兽 FSM 自动灌溉。
- **v2-v4** 全套 AI 贴图、性能体系、双层世界 state.js、农场闭环、缓存破坏 `?v=N`。

---

## 技术架构（对应 2D/2.5D 审计）

| 审计要求 | 实现 |
|---|---|
| 2D 俯视角 + 主角移动 | `src/main.js` §7 — 纸片人主角、WASD + A* 寻路、走路挤压弹跳动画 |
| 摄像机平滑跟随 | §8 — 指数趋近插值 + 世界边缘钳制，入场时从 0.5x 缓推到 1x |
| 标准 Tilemap + 精灵节点 | §5 瓦片层(56×56×64px) + §6 `makeNode()` 精灵工厂 |
| 图片替换接口 | §1 `ASSETS` 清单 — 给任意条目填 `src:'assets/sprites/x.png'` 即换图，碰撞/遮挡/换色逻辑零改动 |
| 碰撞检测 | 水域瓦片阻挡 + 物件椭圆碰撞体（树/石/屋/风车），轴分离移动 |
| Y-Sort 层级遮挡 | `objL.sortableChildren` + `zIndex=y`，主角走到树后正确被遮挡 |
| 顶级氛围保留 | 四季连续调色插值、昼夜乘色光照、暮金时刻、云影漂移、樱瓣/落叶/雪/夜萤粒子、晕影、屋窗夜灯、毛玻璃地籍面板、弹簧物理 UI |
