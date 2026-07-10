# Terra Chronicle 稳定性与性能事故复审 - 2026-07-10

审查对象：`f591f35b864ae1d66d9e62d3b2aacd1f25c1ddaa`

## 用户报告

用户反馈“好多 bug，而且卡得要死”。本轮停止视觉扩展，按线上事故处理。

## 已复现 P0/P1

1. P0 标题入口不可见：`MultiplayerUI` 在默认单人切片中仍把 `#enter` 设为 `display:none`，替换为模式卡；模式层未形成可靠替代入口。
2. P0 极端卡顿：56×56 世界的 2979 个静态地块、雪覆盖、整条河岸泡沫及大量综合色 Sprite 持续逐个提交渲染；`cullWorld()` 已被改为空函数。
3. P0 昼夜循环：每帧对 3600×3600 Graphics 执行 `clear/rect/fill`，重复重建整图遮罩。
4. P1 面板关闭竞态：Alchemy/Dungeon 的异步 open RAF 与 close timeout 可交错，导致关闭后复活、输入锁残留。
5. P1 测试资源泄漏：battle/dungeon smoke 在创建捕获页和品质页前没有关闭首张重型 Pixi 页面。
6. P1 入场尖峰：全屏过场 Canvas 使用最高 3× DPR，每帧绘制 14 个大径向渐变。

## 修复

- 默认单人模式恢复真实标题 CTA，不再用三张模式卡替换唯一入口。
- 恢复镜头视口剔除，采用 `renderable`，不修改业务可见状态。
- 静态地表按 8×8 分成 49 个缓存区块，优先缓存玩家初始视口；耕地、水体和交互对象仍是动态层。
- Headless 路径禁用 GPU 缓存纹理，避免旧 Chromium SharedImage mailbox 崩溃；生产浏览器启用缓存。
- 雪层按区块剔除，河流与 414 个泡沫按视口逐格剔除。
- 删除约 200 个大面积 multiply/screen 地表综合色 Sprite。
- 昼夜遮罩改成一次创建，只更新 `tint/alpha`；昼夜逻辑降为 4Hz。
- 水/泡沫更新降频，物件氛围更新降频，HUD 2Hz，交互扫描 10Hz，粒子按质量降频/停用。
- Battle/Dungeon 全屏覆盖期间暂停农场 world/fx 渲染。
- 正常 DPR 上限改为桌面 1.5、iPad 1.75；低画质保持 1.0。
- 入场镜头直接进入正常缩放，避免低 FPS 下长期停留超广角。
- 入场云雾 Canvas 降为 1× DPR、6 个 blob。
- Alchemy/Dungeon 加 open token 和 immediate close 合约；关闭时立即释放 SurfaceLifecycle 输入锁，动画只做视觉收尾。
- Smoke 每段结束立即关闭页面。

## 性能证据

同一服务器、同一 Chromium 软件渲染基准：

- 修复前 desktop：约 0.25 FPS，P95 单帧约 8.98 秒，最大 long task 约 7.57 秒。
- 第一轮剔除后：仍约 0.25 FPS，确认主要成本在 draw calls。
- 生产区块缓存 + 昼夜/综合色修复后：约 2.67 FPS，P50 约 383ms，P95 约 683ms。
- 提升约 10.7 倍；这仍是服务器 SwiftShader，不代表真实 GPU FPS。
- 生产路径初始视口 16/16 地面区块已缓存；泡沫从 414 个降到视口内 141 个。

## 视觉检查

截图：

- `dogfood-output/perf-final-priority.png`
- `dogfood-output/ux-core-final.png`
- `dogfood-output/terra-battle-dungeon-smoke/01_battle_cards.png`
- `dogfood-output/terra-battle-dungeon-smoke/02_dungeon_preview.png`

多模态像素检查：未出现黑块、白色占位、地块缺失、河流断裂或 UI 越界。地面分块边界不可见。

## 自动化

- JS syntax：PASS。
- `git diff --check`：PASS。
- battle/dungeon/capture/quality-origin：PASS，console/page errors 0。
- SurfaceLifecycle：PASS，errors 0。
- 标题真实按钮 `#enter:visible` 并可 click：PASS。
- Alchemy/Dungeon 关闭后立即 `active=null`、`locked=false`：PASS。
- Dungeon 延迟 RAF 不会复活关闭面板：PASS。

## 边界

服务器当前只有 4GB RAM，Swap 一度 100% 使用；同时 AnyRouter Fable watchdog 每 15 秒启动 Claude 探测，会干扰 headless Chromium。未擅自停止该 watchdog。真实设备 GPU 性能仍需 iPad/Safari dogfood，但本轮已修复可证明的代码级灾难性过绘制和入口/面板 P0。

结论：APPROVED，可部署稳定性修复。
