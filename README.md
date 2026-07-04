# Terra Chronicle 大地编年史

**Recovery Baseline · authoritative repo/runtime truth (post-incident)**

农场经营 × 灵兽养成 × 卡牌锻造 × 大陆地缘博弈的多人联机网页游戏

🌐 **Current Public Runtime:** http://165.232.142.30:8867

> Note: `terra.bz9.me` is not a reliable production entrypoint at this time. The project is in recovery/integration governance mode, not feature-complete v9.16 state.

---

## 🔄 Current Runtime Truth (2026-07-04)

### ✅ Daily Cycle (Short Rhythm) - 100% Complete
- **Energy System:** 6 stamina points for logging & planting
- **Day/Night Cycle:** 30-second day with 4-phase lighting (dawn/noon/dusk/night)
- **Enhanced Atmosphere:** Time-specific particles (mist/godrays/fireflies/stars)
- **Moon Phase System:** 8-phase lunar cycle affecting crop growth & beast activity
- **Energy Recovery:** Automatic stamina refresh at dawn
- **Crop Growth:** 18-second growth cycles with 3-stage visual progression
- **Save System:** Local storage persistence

### ✅ Seasonal Cycle (Medium Rhythm) - runtime-active, product status narrower than historical docs
- **Four Seasons:** 7-day seasons with visual transformation
- **Season Visuals:** color grading + season-specific textures + particles
- **Season Ecology:** seasonal pest pressure tuning is present in active runtime
- **Season Progress Ring:** HUD visualization is active
- **Seasonal Events:** code/assets exist, but these surfaces are **not currently trusted as public-production-complete systems** and should be treated as experimental until rebuilt in Wave 1/2

### ⚠️ Era Cycle (Long Rhythm) - 20% Complete
- **Static Display:** "Era I · Year 1" shown in HUD
- **Missing Systems:**
  - ❌ Era end detection & continent reset mechanism
  - ❌ Persistent codex (card collection/beast catalog across eras)
  - ❌ Player profile & historical records
  - ❌ Story choices affecting next era world settings
  - ❌ Diplomatic/warfare systems

**Design Note:** Era cycle is intended as a seasonal reset mechanic (similar to Path of Exile leagues), requiring multiplayer infrastructure to fully implement. Current focus is on perfecting daily & seasonal loops for single-player experience.

---

> Recovery warning: sections below may include historical implementation ambition or on-disk module inventory.
> For **current mounted runtime truth**, use `ops/TRUTH_MATRIX_20260704.md`, `ops/RECOVERY_LEDGER.md`, and real-browser verify outputs.

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

### 🦊 Spirit Beast Layer
- **Active in current runtime:** water / fire spirit labor, companion presence, farm bonuses, companion panel basics
- **On disk but not fully mounted as public runtime features:** capture system (`capture_system.js`), evolution tree (`evolution_tree.js`)
- **Animated Walk Cycles:** player + some beast walk-cycle support exist, but the full beast product layer is still under rebuild
- **Long-term direction:** beasts should become labor, bond, evolution, and battle pillars — current repo is only a partial realization of that vision

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
- **Building Upgrades:** active in current runtime
- **Tech / Era progression:** historically stronger in accepted live snapshots than in the current repo baseline; treat current implementation as recovery-state rather than final product truth
- **Resource Economy:** wood / crops / crafted cards / beast assistance are part of the active loop

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
│   ├── main.js                    # 核心游戏循环 + 世界渲染
│   ├── state.js                   # 状态管理 + 存档系统
│   ├── seasonal_events.js         # 🆕 季节爆发事件 (春拍卖/夏天梯/秋排行/冬BOSS)
│   ├── day_night_enhanced.js      # 🆕 强化昼夜循环 (4阶段光照/月相/时段粒子)
│   ├── alchemy.js                 # 炼金界面 + 配方系统
│   ├── battle.js                  # 战斗逻辑 + 卡牌效果
│   ├── dungeon.js                 # 地牢生成 + Rogue-lite
│   ├── upgrade.js                 # 建筑升级 + 科技树
│   ├── capture_system.js          # 野外遭遇 + 捕获战斗
│   ├── ecology_system.js          # 害虫/捕食者 AI
│   ├── ecology_integration_visual.js  # 生态链可视化
│   ├── evolution_tree.js          # 灵兽进化树 (3分支 × 200种族)
│   ├── animation-manager.js       # 统一动画系统
│   ├── game_feel_enhanced.js      # 粒子/震动/音效反馈
│   ├── feedback_system.js         # 数字飘字系统
│   ├── advanced_particles.js      # 🆕 Sprite-based粒子 (季节/时段专属)
│   ├── water_shader.js            # 🆕 水面Shader (反射/折射/菲涅尔)
│   ├── post_processing.js         # 🆕 后处理 (Bloom/Fog/God Rays)
│   └── material_enhancement.js    # 🆕 程序化材质 (木质/石头纹理+AO)
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

# 受治理部署
# ./ops/deploy.sh /var/www/terra-pixijs
# 当前真实公网入口: http://165.232.142.30:8867
```

---

## 📊 Asset / Runtime Notes

This repository contains both active runtime assets and recovery-era/historical assets. Presence on disk does **not** imply the asset or system is currently mounted in the public runtime.

Authoritative runtime truth should be checked against:
- `index.html` mounted script graph
- `ops/TRUTH_MATRIX_20260704.md`
- `ops/RECOVERY_LEDGER.md`
- real-browser verify outputs

See `VISUAL_POLISH_REPORT.md` only as historical/reference material, not as current product truth.

---

## 🎯 Roadmap

### Phase 1: Visual Polish ✅ (v9.14)
- [x] Re-enable ColorMatrixFilter
- [x] Eliminate Graphics placeholders
- [x] Implement crop growth stages
- [x] Refactor beast animation system
- [ ] Generate remaining 8 sprite assets

### Phase 2: Recovery / Integration Governance (post-incident)
- [x] Beast capture system (capture_integration_enhanced.js)
- [x] Ecology visual simulation (ecology_integration_visual.js)
- [x] Recipe expansion 4→32 (recipes_expanded.js)
- [ ] Evolution tree UI (3-branch progression)
- [ ] Tech tree implementation (agriculture/combat/magic)
- [ ] Integration testing & sprite generation

### Phase 3: Rebuild after Wave 0-1
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
