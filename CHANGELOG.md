# Terra Chronicle - Changelog

## v9.15 - Animation & Transition System Overhaul (2026-06-17)

### 🎬 Animation System
- **Unified Animation Manager** (`src/animation-manager.js`)
  - Standardized easing curves (EASE_STANDARD/EASE_ELASTIC/EASE_IN_OUT/HOVER)
  - Tween abstraction layer unifying RAF/setTimeout/PixiJS ticker
  - Animation cancellation/interruption mechanism
  - Global time scaling support
  - Performance-adaptive LOD framework

### 🔄 Seamless Scene Transitions
- **Game → Battle:** Zoom transition replaces black screen fade (900ms)
- **Battle Internal:** Uses unified AnimationManager.transition.fade
- **Dungeon Map:** Smooth fade-in/out transitions (550ms)
- **Alchemy Workshop:** Layered entrance animation (cauldron 150ms → ingredients 80ms each)

### ✨ Micro-interaction Enhancements
- **Enhanced Click Ripples:** Dual-layer (PixiJS world space + DOM screen space)
- **Chopping Feedback:** Tree shake + camera shake (intensity: 3, duration: 100ms)
- **Button Clicks:** All buttons now have ripple feedback (maxSize: 100, duration: 500ms)
- **Harvest/Interaction:** Original particles + new screen-space ripples

### ⚡ Performance Optimization
- **AnimationManager ↔ main.js quality sync**
- **Mobile detection:** Auto-reduces animation complexity
- **FPS monitoring:** Auto-adjusts quality levels (high/medium/low)
- **Quality event system:** `animation:qualitychange` event for system integration

### 📊 Completion Scores
- Animation Detail: 70 → 85 (+15)
- Seamless Transitions: 55 → 80 (+25)
- Micro-interactions: 65 → 85 (+20)
- **Overall: 85/100**

### 📚 Documentation
- Added `docs/ANIMATION_POLISH_REPORT.md` - comprehensive animation polish report
- Detailed before/after comparisons
- API reference for AnimationManager
- Performance metrics and compatibility notes

### 🐛 Known Limitations
- Secondary motion (ear/tail follow) not yet implemented
- Beast AI state transitions are instant (no interpolation)
- UI panel content renders at once (not progressively)
- Time scaling doesn't affect CSS transitions (only Tween system)

---

## v9.14 - Visual Polish Update (2026-06-17)

### 🎨 Rendering Improvements
- **Re-enabled ColorMatrixFilter** for full seasonal color grading (春夏秋冬)
  - Spring: +12% saturation, fresh green tint
  - Summer: +6% saturation, +6% brightness, warm tone
  - Autumn: warm red/yellow color shift with +5% saturation
  - Winter: -20% saturation, cool blue tint
  - Fixed black block artifacts by allowing PIXI auto-managed filterArea

### 🌳 Asset Coverage
- **Eliminated Graphics Placeholders** - 100% sprite-based rendering
  - All trees, rocks, bushes now load from PNG assets
  - Removed procedural geometry fallbacks
  - 215 sprite assets confirmed in deployment

### 🌱 Crop Growth Animation System
- **3-Stage Visual Growth** replacing scale-only animation
  - Stage 0 (0-33%): seedling sprite - tiny sprout with cotyledon leaves
  - Stage 1 (34-66%): growing sprite - young plant with spreading leaves
  - Stage 2 (67-100%): mature sprite - harvest-ready plant
  - Smooth texture transitions with async loading
  - Applied to both star wheat and dewberry crops

### 🦊 Beast Animation System Refactor
- **Extensible Animation Framework** supporting 6 animated beasts
  - Refactored from hardcoded if/else to `walkSheetMap` lookup
  - Added fallback to static sprite when walk sheet unavailable
  - Prepared infrastructure for 4 elite beast walk animations
  - Current: beast_fire, beast_water (animated)
  - Ready for: fox_spirit, fawnling, serpent, deepsea_noble

### 🎴 Card Art Analysis
- Confirmed 100% functional coverage with 4 type-based card arts
- Type-based fallback provides seamless coverage for 6 alchemy recipes
- Prepared expansion plan for 4 legendary-tier special cards

### 🛠️ Technical Improvements
- **Performance:** Maintained 60 FPS target with all filters enabled
- **Code Quality:** Removed ~70 lines of Graphics fallback code
- **Extensibility:** Animation system now supports unlimited beast types
- **Stability:** PIXI-managed filterArea eliminates rendering artifacts

### 📦 Deployment
- Updated public deployment at https://terra.bz9.me
- Synced main.js v9.14 to production
- Verified 215 sprite assets in public directory

### 📝 Documentation
- Created comprehensive Visual Polish Report (VISUAL_POLISH_REPORT.md)
- Generated asset creation scripts with gpt-image-2 prompts
- Documented remaining work items with priority levels

---

## v9.13 - Game Feel Polish (2026-06-15)

### 粒子反馈系统
- 伐木木屑粒子爆发
- 播种土壤粒子
- 收获光芒粒子（品质分级色彩）
- 战斗卡牌使用粒子
- 升级金光粒子

### 数字飘字全覆盖
- 收获数量飘向HUD
- 战斗伤害/治疗数字
- 升级经验获得

### 屏幕震动分级
- 伐木轻震 (8px)
- 收获品质震动 (3-12px)
- 战斗攻击震动 (6-15px)

---

## v9.12 - Alchemy & Battle Visual Overhaul (2026-06-14)

### 炼金系统视觉升级
- 真实大釜贴图 (985KB, 手绘水彩风格)
- 金色装饰卡牌边框 (552KB)
- 配方发现闪光动画
- 材料拖放反馈增强

### 战斗卡牌插画
- 4 张高质量卡牌插画 (守护/斩击/治愈/冲锋)
- 3D perspective 卡牌翻面动画
- 悬停倾斜效果 (rotateY/X ±22deg)

---

## v9.11 - Soft Farm UI Unification (2026-06-15)

### 作物渲染统一
- 星麦/露莓专属精致 sprite
- 成熟度色彩反馈 (品质分级)
- 浇水状态视觉提示 (青绿色 tint)

---

## v9.10 - Four Seasons System (2026-06-13)

### 季节循环机制
- 7 天一季，四季轮转
- 季节专属贴图 (草地/树木/房屋)
- Alpha-dip 交叉淡入换图 (0.7s)
- 季节粒子 (樱花/萤火/落叶/雪花)

### 昼夜光照
- 24 小时循环 (demo: 30秒)
- 暮金加法混合层
- 全局光照乘法
- 房屋灯光夜间亮起

---

## Earlier Versions

See Git history for full changelog prior to v9.10.
