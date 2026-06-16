# Terra Chronicle 大地编年史

**v9.14 · Visual Polish Complete**

农场经营 × 灵兽养成 × 卡牌锻造 × 大陆地缘博弈的多人联机网页游戏

🌐 **Live Demo:** https://terra.bz9.me

---

## 🎨 Visual Presentation (v9.14)

### Rendering Quality
- ✅ **ColorMatrixFilter Season Grading** - 春夏秋冬四季调色完整启用
- ✅ **100% Sprite-Based Rendering** - 消除所有 Graphics 占位符
- ✅ **3-Stage Crop Growth** - 幼苗 → 生长 → 成熟的视觉转换
- ✅ **6-Beast Animation System** - 可扩展灵兽行走动画框架
- ✅ **215+ Sprite Assets** - 高质量手绘水彩风格贴图

### Atmospheric Effects
- 四季专属调色矩阵 (春清新/夏明亮/秋暖调/冬冷调)
- 昼夜光照循环 (暮金混合 + 全局光照)
- 季节粒子系统 (樱花/萤火/落叶/雪花)
- 云影飘动 + 水面波纹 + 晕影柔光

### Game Feel (v9.13)
- 粒子反馈全覆盖 (伐木/播种/收获/战斗/升级)
- 数字飘字系统 (收获品质/战斗伤害/经验获得)
- 屏幕震动分级 (3-12px 基于交互强度)
- 微交互动画 (弹簧物理面板/卡牌3D倾斜/FAB脉冲)

---

## 🎮 Core Systems

### 🌾 Farm Management
- **Soft Farm Simulation:** 土壤四维 (肥力/湿度/虫害/灵脉)
- **Seasonal Crops:** 星麦 (主粮) / 露莓 (高级作物)
- **Quality Grading:** 品质继承土壤属性 (普通/良品/珍品/灵脉)
- **Dynamic Ecology:** 害虫/捕食者 visible on map (ecology_integration_visual.js)
- **Food Chain:** Predator hunts pest, overhunting → pest explosion
- **Beast Labor:** 灵兽浇水提升品质 + 自动化劳作

### 🦊 Spirit Beast Taming
- **6 Elite Beasts:** 神社狐灵 / 御鹿幼灵 / 白蛇社灵 / 深海贵族 + fire/water
- **Wild Encounters:** Biome-based spawning (forest/river/mountain)
- **Capture System:** Weaken beast → soul crystal → tame (capture_system.js)
- **Multi-Path Evolution:** 3 branches per species (combat/work/hybrid)
- **Animated Walk Cycles:** 4帧行走动画 (fire/water已实装, 4 elite准备中)
- **Personality Traits:** 勤勉/懒惰/专注/好奇 affecting efficiency
- **Expansion Path:** 200+ species library planned

### 🎴 Alchemy Crafting
- **32 Hidden Recipes:** 3 archetypes × 10 cards + 2 universal
- **Archetype Systems:**
  - 守势荆棘 (Thorn Defense): Armor stacking, reflect damage
  - 丰收循环 (Harvest Loop): Card draw, energy refund
  - 河川净涤 (River Purge): Healing, cleanse, freeze
- **Synergy Combos:** 3-card threshold bonuses, 5-card ultimate powers
- **Material Alchemy:** 星麦 + 木材 + 露莓 → 攻防治愈卡牌
- **Rarity System:** Common/Rare/Epic/Legendary materials affect card power
- **Visual Polish:** 真实大釜贴图 + 金色卡牌边框 + 翻面揭示动画
- **Card Art:** 4 种类型插画 (守护/斩击/治愈/冲锋) + 4 legendary variants planned

### ⚔️ Dungeon Battles
- **Deck Building:** 炼金卡牌 → 战斗套牌 (32 种配方,3 大流派)
- **Archetype Synergies:** 守势荆棘/丰收循环/河川净涤 combo 系统
- **Turn-Based Combat:** 能量系统 + 敌人意图预判
- **Boss Mechanics:** 深渊主核 2 阶段 + 暴走机制
- **Rogue-lite Buffs:** 远征祝福 (8 种可叠加)
- **Material Rarity:** 土壤品质影响卡牌强度 (1.0x-2.0x)

### 🏗️ Progression
- **Building Upgrades:** 6 大建筑线 (农田/牧场/熔炉/灵台/门扉/船坞)
- **Tech Tree:** 扩建解锁新机制 (高级作物/灵兽分支/卡牌强化)
- **Resource Economy:** 木材/矿石/作物/灵兽魂 循环流转

---

## 🛠️ Technical Stack

- **Engine:** PixiJS v8 (WebGL renderer)
- **Art:** gpt-image-2 生成 + 手工调整
- **Style:** 手绘水彩 + 羊皮纸手账 UI
- **Resolution:** 响应式 (960-1920px viewport)
- **Performance:** 60 FPS @ quality=1, adaptive降级至quality=0

---

## 📦 Project Structure

```
terra-chronicle-game/
├── src/
│   ├── main.js           # 核心游戏循环 + 世界渲染
│   ├── state.js          # 状态管理 + 存档系统
│   ├── alchemy.js        # 炼金界面 + 配方系统
│   ├── battle.js         # 战斗逻辑 + 卡牌效果
│   ├── dungeon.js        # 地牢生成 + Rogue-lite
│   ├── upgrade.js        # 建筑升级 + 科技树
│   ├── feedback_system.js # 粒子/飘字/震动反馈
│   └── game_feel_enhanced.js # Squash&Stretch 运动
├── assets/
│   ├── sprites/          # 215+ PNG 精灵贴图
│   └── generated/        # gpt-image-2 生成资产
├── tools/
│   ├── generate_crop_growth_assets.sh
│   ├── generate_elite_beast_walk_sheets.sh
│   └── generate_card_art_expansion.sh
├── VISUAL_POLISH_REPORT.md  # v9.14 改进详情
└── CHANGELOG.md
```

---

## 🚀 Development

```bash
# 本地开发
npm install
npm start  # 启动本地服务器 (http://localhost:8866)

# 验证构建
npm run verify:public  # 对比本地与公网版本

# 公网部署
# rsync to /var/www/terra-pixijs/
# 当前公网版本: v9.14 (2026-06-17)
```

---

## 📊 Asset Status (v9.14)

| Category | Count | Coverage | Notes |
|----------|-------|----------|-------|
| Environment Sprites | 215 | 100% ✅ | Trees, rocks, bushes, buildings |
| Seasonal Variants | 12 | 100% ✅ | Spring/autumn/winter textures |
| Beast Animations | 2/6 | 33% ⚠️ | Fire/water done, 4 elite pending |
| Crop Growth Stages | 0/6 | 0% ⚠️ | System ready, sprites pending |
| Card Art | 4 | 100% ✅ | Type-based fallback covers all recipes |

**Pending Asset Generation:** 8 sprites (~1MB total)
- 4 crop growth stages (seedling/growing × 2 crops)
- 4 elite beast walk sheets (fox/fawn/serpent/noble)

See `VISUAL_POLISH_REPORT.md` for generation prompts.

---

## 🎯 Roadmap

### Phase 1: Visual Polish ✅ (v9.14)
- [x] Re-enable ColorMatrixFilter
- [x] Eliminate Graphics placeholders
- [x] Implement crop growth stages
- [x] Refactor beast animation system
- [ ] Generate remaining 8 sprite assets

### Phase 2: Core Systems Integration ⚙️ (v9.15 - In Progress)
- [x] Beast capture system (capture_integration_enhanced.js)
- [x] Ecology visual simulation (ecology_integration_visual.js)
- [x] Recipe expansion 4→32 (recipes_expanded.js)
- [ ] Evolution tree UI (3-branch progression)
- [ ] Tech tree implementation (agriculture/combat/magic)
- [ ] Integration testing & sprite generation

### Phase 3: Multiplayer & Content
- [ ] WebSocket backend (Node.js + MongoDB)
- [ ] Neighbor system activation (climate/pest spread)
- [ ] Seasonal world boss events
- [ ] 50+ beast species expansion
- [ ] 3+ dungeon biomes
- [ ] Cross-region trading

---

## 📸 Screenshots

See `alchemy-crafting-screenshots/` for UI captures.

**Key Visuals:**
- 四季地图全景 (春樱/夏绿/秋枫/冬雪)
- 炼金大釜操作流程 (材料拖放 → 配方发现)
- 战斗卡牌战 (意图预判 + 能量管理)
- 灵兽遭遇 (捕获环 + 驯养结果)

---

## 🧪 Design Philosophy

### Visual
- **Gris / Hollow Knight 启发:** 层次感 + 克制色彩 + 氛围优先
- **羊皮纸美学:** 暖色调 UI + 金色装饰 + 衬线字体
- **手绘质感:** 水彩晕染 + 柔和边缘 + 纹理细节

### Gameplay
- **隐藏式探索:** 配方/灵兽/地图奥秘需玩家主动发现
- **有意义选择:** 作物品质 vs 产量 / 卡牌攻防平衡 / 建筑优先级
- **渐进复杂度:** 前5分钟简单种植 → 1小时后多线程资源流转

---

## 📝 License

MIT

---

## 🙏 Credits

- **Art Generation:** gpt-image-2 (Anthropic)
- **Game Engine:** PixiJS team
- **Design Inspiration:** Gris, Hollow Knight, Stardew Valley, Slay the Spire

---

**Built with Claude Code · 2024-2026**
