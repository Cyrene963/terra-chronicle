# Terra Chronicle P1 商业化视觉复审 - 2026-07-10 第三轮

审查对象：`95c58e3f747b22917cb6efff2971d2804372c55d`

审查范围：战斗 HUD 降噪与材质统一、地城羊皮地图与产出回流、第一小时后持续目标轨、桌面/移动端布局。

## 运行时证据

- `dogfood-output/terra-battle-dungeon-smoke/01_battle_cards.png`
- `dogfood-output/terra-battle-dungeon-smoke/02_dungeon_preview.png`
- `dogfood-output/terra-battle-dungeon-smoke/03_quality_origin_reward.png`
- `dogfood-output/terra-p1-commercial/desktop_objective_final.png`
- `dogfood-output/terra-p1-commercial/mobile_objective_final.png`

## 多模态审查

### 战斗 HUD：PASS

- 现代玻璃胶囊被收敛为暖棕羊皮纸/铜边语言。
- 敌人意图、生命护甲、卡牌和结束回合 CTA 层级清楚。
- 没有文字遮挡、卡牌溢出或错误弹层。
- 紫色污染只保留为危险语义，不再主导全屏色调。

### 地城地图：PASS

- 路线主体改为纸张纹理、墨线道路和印章式节点，不再像独立网页 modal。
- 每个节点直接标明“产出 -> 回农场用途”，路线选择与炼金、灵兽、工坊形成可见因果。
- 第二层用途说明和 Boss 节点已分开，没有重叠或溢出。

### 持续目标轨：PASS

- 新手教程完成后，目标轨按真实存档自动推进：炼金初火 -> 首次远征 -> 灵兽盟约 -> 工坊突破 -> 丰饶锻造 -> 地脉共鸣。
- 1440x900 桌面和 390x844 移动端均无溢出。
- 新手教程活跃时目标轨自动隐藏，避免重复指令。
- Battle/WorldMap/SurfaceLifecycle 输入锁定时目标轨自动隐藏，不与模态界面竞争。

## 自动化

- `node --check`：main/battle/dungeon 与两项 smoke 全部通过。
- `git diff --check`：通过。
- battle/dungeon/capture/quality-origin smoke：PASS。
- SurfaceLifecycle smoke：PASS。
- `battle.js?v=72`、`dungeon.js?v=52`、`main.js?v=86`：版本断言通过。
- console errors：0。
- page errors：0。
- 极品卡牌触发丰饶回响：PASS。

## 五小时心流判断

- 目标轨持续提供“下一件大事”，不再在首轮教程结束后失去方向。
- 地城选路前即可理解战利品如何回流农场，降低系统割裂。
- 战斗信息密度仍高于农场，但焦点已稳定在敌人意图、手牌和唯一主 CTA。
- 剩余非阻塞 P1：奖励图标可继续替换为专属小图标；移动端真机触控手感仍需持续 dogfood。

## 稳定性处置

验证期间根分区到达 100%。定位为多次发布生成的重复 predeploy 整站快照。保留最新发布前快照及 2026-07-04 完整灾备，清理四组旧重复发布快照，恢复约 2GB 空间。Playwright 改为支持 `TERRA_CHROMIUM_PATH`，复用已安装 Chromium，避免再次下载浏览器占满磁盘。

结论：APPROVED，无 P0 视觉或运行时 blocker。
