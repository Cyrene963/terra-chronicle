# Terra Chronicle 大地编年史 — 项目 GDD

（本文件为核心设计文档；玩法细节另见 GAMEPLAY_DESIGN.md / PROJECT_VISION.md）

## 核心循环
种田(灵田) → 采集极品材料 → 炼金大釜锻造卡牌 → 深渊爬塔战斗 → 捕捉/进化灵兽 → 反哺农场。

## 美术总纲
全局锚点（焊死于 tools/gen_sprites.py 与 tools/gen_visual_unify.py 所有提示词末尾）：
> MUST STRICTLY USE: Studio Ghibli art style, Legend of Zelda Breath of the Wild style,
> bright and warm pastel colors, cute and stylized flat shading.
> ABSOLUTELY NO dark fantasy, NO photorealism, NO horror elements.

禁止：写实、恐怖、暗黑废墟、CSS/代码手搓 UI（Steven 硬性令：必须用插图资产）。

---

## 《AI 协同开发最高视觉宪法》

**第一条（多模态视觉审查，硬性）** 每一次完成核心迭代或 UI 更新后，必须主动调用多模态
Vision 模型（具备视觉能力的子 Agent 或外部 Vision API），对游戏运行时真机截图
（tools/shoot.js / terra-playtest 脚手架产出）进行像素级视觉审查，逐项核对：
画风是否与吉卜力锚点一致、有无写实/暗黑元素混入、UI 是否有原生网页感（纯色块、
emoji、系统默认控件）、动画是否实际播放（对比连续两帧截图）。

**第二条（5 小时心流模拟，硬性）** 每次审查必须模拟玩家"连续游玩 5 小时"的心流体验并
书面回答：① 视觉是否割裂（跨场景画风统一度）；② 交互是否有廉价网页感；
③ 长线目标是否明确（当前小时玩家在追求什么、下一小时的钩子是什么）；
④ 结算反馈是否有"极品材料→极品卡牌"的爽感峰值。

**第三条（Blocker 卡点，硬性）** 视觉审查未出具书面认可结论前，任何代码【绝不允许】
提交为正式版本或部署到权威公网运行入口。审查结论须同时落盘为
`docs/visual_review_YYYYMMDD.md`（人类可读报告）和 `docs/visual-reviews/*.json`（机器可执行清单），
包含截图清单、Vision reviewer/model/timestamp、当前 git SHA、逐项判定、5 小时心流模拟和整改项。
正式发布前必须执行 `python3 tools/visual_release_gate.py`；该 gate fail 时禁止正式部署。
有整改项时必须修完复审，复审通过才能部署。

**第四条（资产准入）** 一切新生成图像资产必须经由带全局锚点的生成脚本产出；
手写 CSS 纯色几何图形、emoji 一律视为占位符，禁止进入正式版本。
