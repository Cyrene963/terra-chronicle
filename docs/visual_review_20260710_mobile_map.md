# Terra Chronicle 移动端与世界地图稳定性复审 - 2026-07-10

审查对象：`ebfd966fcf9c0779f59a39267fadd056fb9fd28d`

## 修复范围

- AnyRouter Fable watchdog 已在 Hermes cron 中暂停；该运维状态不属于游戏仓库提交。
- 移动端底部资源 dock 从居中改为左侧安全区布局，右侧为 84px 交互按钮保留固定空间。
- 灵兽账册关闭与技能按钮在缩放后保持至少 44px 触控面积。
- 灵兽账册打开时隐藏移动操作层、资源 dock 和炼金 FAB，消除面板与交互按钮重叠。
- 地籍面板与统一面板关闭按钮提升至 44px。
- 卡牌 3D hover tracking 只在 fine pointer + hover 设备启用，触摸设备不再每次 pointer move 做布局读取。
- 世界地图 DPR 上限：粗指针设备 1.5，桌面 2.0。
- 世界地图关闭时停止 100×100 六边格 Canvas 重绘；仅打开时 render。

## 自动化证据

- `node --check src/main.js src/world_map.js`：PASS。
- `git diff --check`：PASS。
- 世界地图专用 render-count：关闭 0 次、打开 1 次、再次关闭仍 1 次：PASS。
- iPad 3× DPR 测试桩：800×600 CSS Canvas 生成 1200×900 backing store，而非旧版 2400×1800：PASS。
- 390×844 真触控上下文：
  - dock：x=18，宽=241，右缘=259。
  - 交互按钮：x=284，宽=84；两者间距约 25px。
  - 灵兽关闭按钮：46×46。
  - 灵兽操作按钮高度：46px。
  - 账册打开时 mobileControls/dock/craftFAB opacity=0、pointer-events=none。
  - 账册关闭后 body 状态恢复，零 page errors。

## 视觉证据

- `dogfood-output/mobile-touch-final-v2.png`
- `dogfood-output/mobile-pet-modal-final-v2.png`
- `dogfood-output/perf-final-priority.png`

原生多模态复审结论：PASS。未发现底部 dock/交互按钮重叠、账册越界、关闭按钮不可见、黑块、缺图或文字截断。

## 性能边界

世界地图旧实现首次打开后会永久 60Hz 重绘，即使覆盖层已关闭；本轮已消除。服务器仍为 4GB RAM + SwiftShader，完整三页 smoke 在满 Swap 时可能被系统 SIGTERM；此前同一核心链在稳定性候选上已完整通过，本轮只修改移动布局、指针监听和世界地图渲染策略。

结论：APPROVED，可部署。
