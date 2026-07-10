# Terra Chronicle 移动实机与 Surface 稳定性复审 - 2026-07-10

审查对象：`e9a8465a07cd644fbf5c756eb85a4a675fb7f47d`

## 本轮真实复现与修复

- 世界地图移动端左右固定 rail 使 390px Canvas 可用宽度为负；现隐藏 rail，Canvas 实测 `370×738`。
- 世界地图 touch 只拖拽/缩放，轻点不选择 hex；现轻点 `(60,72)` 正确落在 `100×100` 地图内。
- 世界地图坐标被重复减去相机偏移，鼠标/触摸选择错误格；现统一由 `screenToWorld` 处理一次相机变换。
- 地图关闭后 RAF 永久排队；现关闭后 `_renderLoopStarted=false` 并取消 RAF。
- 地图/炼金/升级等全屏 surface 打开时底层农场仍渲染；现以 `SurfaceLifecycle.active` 统一暂停 world/fx。
- 页面隐藏时 Pixi ticker 继续推进；现 hidden 时 stop、恢复时 start。
- 炼金成功后立即关闭，1.4 秒后卡牌揭示可能复活；现绑定 `openToken`，实测 `reveal=false`。
- Dungeon toast 的延迟 after 可能跨 surface 执行；现关闭时清 timer，并用 token 校验。
- SurfaceLifecycle immediate close 可能双重 `afterClose`；现仅在 active 尚未被模块清空时兜底。
- World Map fallback 原生 `alert()` 已移除。

## 390×844 连续操作结果

- 炼金：面板 `370.5×801.8`，关闭后 active=null、locked=false。
- 升级：面板 `374×828`，无横向溢出。
- 世界地图：Canvas `370×738`，轻点选择有效，关闭后 RAF 停止。
- 地城：Canvas `366×714`，关闭后无迟到复活。
- 战斗：4 张手牌均 `126×184`，hand scrollWidth `564 > 390`，横滚有效；结束回合高度 `44px`。
- Battle 切换到 Alchemy 后 Battle 已退出，新 surface 正确接管。
- Console errors: 0；Page errors: 0；viewport failures: 0；close failures: 0。

## 像素复审

- `dogfood-output/mobile-final-surfaces/alchemy.png`：PASS。单栏、材料库存与按钮可见，无背景穿透。
- `dogfood-output/mobile-final-surfaces/world-map.png`：PASS。地图非黑屏，Canvas 完整，标题与 46px 关闭按钮分离。
- `dogfood-output/mobile-final-surfaces/battle.png`：PASS。敌人、意图、横滚手牌、状态栏和结束回合无 blocker。

## 自动回归

- `tools/entry_responsiveness_smoke.js` mobile：PASS；延迟 main 900ms 后首次点击不丢，世界约 2.25 秒就绪，只进入一次。
- `tools/mobile_interaction_smoke.js`：PASS。
- `npm run verify:surface`：PASS。
- `tools/terra_battle_dungeon_smoke.js`：PASS；versionsOk，零 console/page errors。

## 结论

APPROVED。未发现本轮移动端流程的 P0/P1 blocker，可进入正式 Gate 与公网部署。
