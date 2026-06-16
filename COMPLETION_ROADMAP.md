# Terra Chronicle - 100% Completion Roadmap

**Current State:** v9.14 - Core Systems Implemented (60-80% Complete)
**Target:** Five Pillar Complete Implementation (~95%+ Visual + 100% Functional)

---

## 🎯 Five Pillar Status Analysis

### 1. 活地图经营 (Farm Management) — ✅ 80% Complete

**Implemented:**
- 56×56 procedural world generation
- 4-season color grading system (30s day/night, 7-day seasons)
- Soil attributes (fertility/moisture/pest/leyline)
- Plant/harvest loop with stamina consumption
- Quality inheritance from soil (35-118 points)
- Ecology score (0-100) display
- Tree chopping system
- Right-click tile inspection panel

**Missing (P1 - Critical):**
- Dynamic pest creature spawning/movement visualization
- Crop disease visual indicators
- Weather events affecting gameplay (drought/flood/frost)
- Multi-crop rotation mechanics (crop diversity bonus)

**Implementation Plan:**
1. Integrate `ecology_system.js` pest spawning logic
2. Add pest/predator sprites to map rendering
3. Visual disease markers on infected crops
4. Weather event system with forecast UI

---

### 2. 灵兽捕获与进化 (Spirit Beast System) — ⚠️ 40% Complete

**Implemented:**
- 6 spirit beasts (2 animated: water/fire, 4 elite static)
- Water beast auto-irrigation AI
- Fire beast furnace heating
- Incubation system (soul + blight seed → beast)
- Basic evolution system structure
- Companion beast passive effects

**Missing (P0 - Highest Priority):**
- **Wild encounter/capture gameplay** (capture_system.js exists but not integrated)
- **Multi-path evolution tree UI** (evolution_tree.js has 3-branch system ready)
- **Expansion to 200+ species** (currently only 6)
- Beast collection progress tracker (Pokédex-style)
- Walk animations for 4 elite beasts

**Implementation Plan:**
1. **Phase 1 - Capture Integration (Week 1)**
   - Activate random wild beast encounters in world map
   - Implement capture ring mini-game from `capture_system.js`
   - Add "捕获" mode to world interaction
   
2. **Phase 2 - Evolution System (Week 1-2)**
   - Build evolution tree UI showing 3 paths per species
   - Integrate `evolution_tree.js` progression tracking
   - Add evolution point earning from combat/farming
   
3. **Phase 3 - Species Expansion (Week 2-4)**
   - Design 20 base species → 60 evolved forms (P0)
   - Generate sprite assets batch 1 (20 base + walk sheets)
   - Expand to 50 base → 150 total (P1)
   - Generate sprite assets batch 2 (30 more base)
   - Full 200+ species library (P2 - post-launch)

---

### 3. 实物卡牌构筑 (Physical Card Crafting) — ✅ 70% Complete

**Implemented:**
- Alchemy workshop with drag-drop cauldron
- 4 hidden recipes (currently, user mentioned 6)
- Quality inheritance from crop origin
- Fire beast furnace quality boost
- 3D card flip reveal animation
- Slay-the-Spire combat system (turn-based, energy, armor, intent)
- Dungeon node path selection
- Battle rewards → farm materials loop

**Missing (P1):**
- **Recipe expansion to 30+** (currently only 4-6)
- **Archetype synergies** (3-card combos, faction bonuses)
- Material rarity tiers (common/rare/legendary materials)
- Recipe discovery clue system (NPC hints, rune fragments)
- Legendary card art variants (4 planned in tools/)

**Implementation Plan:**
1. **Recipe Design (Week 1)**
   - Design 30 recipes across 3 archetypes:
     - 守势荆棘 (Thorn Defense) - 10 cards
     - 丰收循环 (Harvest Loop) - 10 cards
     - 河川净涤 (River Purge) - 10 cards
   - Balance testing for deck variety
   
2. **Material Rarity System (Week 1)**
   - Add rarity field to crops/wood (common/rare/legendary)
   - Rare materials spawn from high-quality soil only
   - Legendary materials from ecology balance rewards
   
3. **Card Art Generation (Week 2)**
   - Generate 12 archetype representatives (4 per faction)
   - Generate 4 legendary card arts (tools scripts ready)

---

### 4. 生态链与科技树 (Ecology & Tech Tree) — ⚠️ 20% Complete

**Implemented:**
- Basic ecology score calculation
- Ecology panel (4 states: thriving/balanced/unstable/outbreak)
- Beast irrigation reduces pest pressure
- Fire beast heating increases pest pressure
- Farm building upgrade system exists

**Missing (P0 - Critical Gap):**
- **Dynamic food chain simulation** (predator hunts pest, overhunting → pest explosion)
- **Tech tree with 3 strategic paths** (agriculture/military/magic)
- **Ecology collapse consequences** (crop failure, disease spread)
- **Player decision → ecology feedback loop**

**Implementation Plan:**
1. **Ecology System Activation (Week 1-2)**
   - Integrate `ecology_system.js` fully into main.js
   - Spawn pest creatures visually on map (locust/aphid/weevil/moth)
   - Spawn predator beasts (field cat/lynx/ferret)
   - Implement hunting behavior (predator seeks pest in range)
   - Overhunting detection → pest explosion mechanic
   - Ecology warnings when balance tips critical
   
2. **Tech Tree Design (Week 2-3)**
   - Define 3 tech paths with 6-8 tiers each:
     - **农业专精 (Agriculture):** Crop yield +50% → unlock legendary crops → automation
     - **战斗流派 (Combat):** Card power +30% → unique battle cards → boss rush mode
     - **魔法工艺 (Magic):** Beast abilities enhanced → ritual magic → time manipulation
   - Design mutually exclusive ultimate techs
   - Build tech tree UI (branching graph visualization)
   
3. **Balance Testing (Week 3)**
   - Verify "multiple paths to victory" design
   - Tune ecology collapse severity (not too punishing for new players)

---

### 5. 大陆政治层与季节防御 (Continental Politics & Multiplayer) — ❌ 0% Complete

**Implemented:**
- `websocket_client.js` framework (503 lines, not active)
- `neighbor_system.js` (hex neighbor detection, climate spread, reputation)
- `world_map.js` stub code

**Missing (P0 - Core Multiplayer Vision):**
- Backend world server (Node.js + MongoDB)
- Hex world map with player farmland instances
- Neighbor policy system (deforestation → drought spread)
- Seasonal void tide world boss (server-wide cooperation)
- Player mutual aid (resource trading, pest assistance)
- Online/offline seamless transition

**Implementation Plan:**
1. **Backend Infrastructure (Week 3-4)**
   - Set up Node.js WebSocket server (ws library)
   - MongoDB for world state + player farms
   - Player authentication (simple token system)
   - Hex map data structure (store all player positions)
   
2. **Neighbor System Integration (Week 4-5)**
   - Activate `neighbor_system.js` calculations
   - Climate spread: deforestation drought (+10%/neighbor)
   - Pest outbreak contagion (20% chance/day from infected neighbor)
   - Mutual aid UI (send/request resources)
   - Reputation tracking (helping neighbors earns points)
   
3. **Seasonal World Boss (Week 5-6)**
   - Design void tide event (every season finale)
   - Server broadcasts boss HP to all players
   - Players contribute damage from local dungeons
   - Reward distribution based on participation
   - Failure consequence: global pest outbreak +50%
   
4. **Online/Offline Mode (Week 6)**
   - Local caching of world state
   - Background sync when online
   - Offline mode: AI simulated neighbors
   - Reconnection recovery (resume interrupted actions)

---

## 🎨 Visual Polish - Asset Generation Priority

**Current:** 219 sprites, 85% coverage
**Target:** 400+ sprites, 95%+ coverage

### P0 - Critical Missing Assets (Block core features)
1. **Crop Growth Stages** (4 files, ~200KB)
   - crop_seedling.png, crop_growing.png
   - crop_dewberry_seedling.png, crop_dewberry_growing.png
   - Scripts ready in `tools/generate_crop_growth_assets.sh`

2. **Elite Beast Walk Sheets** (4 files, ~800KB)
   - beast_shrine_fox_spirit_walk_sheet.png
   - beast_sacred_fawnling_walk_sheet.png
   - beast_white_serpent_shrine_walk_sheet.png
   - beast_deepsea_noble_walk_sheet.png
   - Scripts ready in `tools/generate_elite_beast_walk_sheets.sh`

3. **Pest & Predator Sprites** (7 files, ~500KB)
   - pest_locust.png, pest_aphid.png, pest_weevil.png, pest_moth.png
   - beast_field_cat.png (+ walk sheet)
   - beast_shadow_lynx.png (+ walk sheet)
   - beast_jade_ferret.png (+ walk sheet)

### P1 - High Visual Impact
4. **Legendary Card Art** (4 files, ~400KB)
   - card_art_legendary_harvest.png
   - card_art_legendary_thorn.png
   - card_art_legendary_shield.png
   - card_art_legendary_blade.png
   - Scripts ready in `tools/generate_card_art_expansion.sh`

5. **Weather Effect Sprites** (6 files, ~300KB)
   - weather_rain.png, weather_drought.png, weather_frost.png
   - weather_icon_rain.png, weather_icon_drought.png, weather_icon_frost.png

6. **Tech Tree Icons** (24 files, ~600KB)
   - 8 agriculture tech icons
   - 8 combat tech icons
   - 8 magic tech icons

### P2 - Post-Launch Polish
7. **Beast Species Expansion Batch 1** (20 base + 20 walk sheets, ~3MB)
8. **Seasonal Variants Expansion** (current 12 → target 30, ~2MB)
9. **4K Resolution Assets** (all critical sprites 2x versions, ~8MB)

---

## 📊 Completion Metrics

### Current State (v9.14)
| Pillar | Completion | Functional | Visual | Priority |
|--------|------------|------------|--------|----------|
| Farm Management | 80% | ✅ Complete | ✅ 90% | P1 - Ecology visual |
| Spirit Beast | 40% | ⚠️ 60% | ⚠️ 70% | P0 - Capture + Evolution |
| Card Crafting | 70% | ✅ 90% | ✅ 85% | P1 - Recipe expansion |
| Ecology & Tech | 20% | ⚠️ 30% | ❌ 10% | P0 - Both systems |
| Multiplayer | 0% | ❌ 0% | N/A | P0 - Backend + neighbor |

### Target State (v10.0 - 100% Complete)
| Pillar | Completion | Functional | Visual | Status |
|--------|------------|------------|--------|--------|
| Farm Management | 95% | ✅ 100% | ✅ 95% | +Weather, +Ecology visual |
| Spirit Beast | 95% | ✅ 100% | ✅ 90% | +Capture, +Evolution, +50 species |
| Card Crafting | 90% | ✅ 100% | ✅ 90% | +30 recipes, +Synergies |
| Ecology & Tech | 90% | ✅ 100% | ✅ 85% | +Food chain, +3 tech paths |
| Multiplayer | 85% | ✅ 90% | ✅ 80% | +Backend, +Neighbor, +World boss |

---

## 🗓️ Development Timeline (6-Week Sprint)

### Week 1 - Ecology & Capture Foundation
- [ ] Integrate ecology_system.js (pest spawn, predator hunt)
- [ ] Generate pest/predator sprites (P0)
- [ ] Activate capture_system.js in world map
- [ ] Generate crop growth sprites (P0)

### Week 2 - Beast Evolution & Recipes
- [ ] Build evolution tree UI
- [ ] Design 30 alchemy recipes
- [ ] Generate elite beast walk sheets (P0)
- [ ] Add material rarity system

### Week 3 - Tech Tree & Backend Start
- [ ] Design 3-path tech tree (24 nodes)
- [ ] Build tech tree UI
- [ ] Set up Node.js WebSocket server
- [ ] MongoDB world state schema

### Week 4 - Neighbor System Integration
- [ ] Activate neighbor_system.js
- [ ] Climate/pest spread mechanics
- [ ] Mutual aid UI
- [ ] Generate legendary card art (P1)

### Week 5 - Seasonal World Boss
- [ ] Design void tide event
- [ ] Server broadcast system
- [ ] Contribution tracking
- [ ] Reward distribution

### Week 6 - Polish & Testing
- [ ] Online/offline mode switching
- [ ] Balance testing all 5 pillars
- [ ] Cross-browser verification
- [ ] Public deployment v10.0

---

## 🚀 Quick Start Priority Stack

### Immediate Next Actions (This Session)
1. ✅ Generate 8 P0 sprites (crop growth + elite walk sheets)
2. ✅ Integrate ecology_system.js visual spawning
3. ✅ Activate capture_system.js in main.js
4. ✅ Build evolution tree UI prototype
5. ✅ Design 30 alchemy recipes

### This Week Goals
- Ecology system fully visual (pests/predators on map)
- Beast capture playable (encounter → mini-game → tame)
- Evolution tree accessible (3-path progression UI)
- Recipe count tripled (4 → 30 with archetypes)

---

## 📝 Technical Debt & Risks

### High Priority Fixes
1. **WebSocket Backend Deployment** - Requires separate server process
   - Risk: Complex infrastructure, potential downtime
   - Mitigation: Start with localhost testing, Docker container for prod

2. **Sprite Asset Generation Bottleneck** - 100+ sprites needed
   - Risk: Art generation queue time, style consistency
   - Mitigation: Batch prompts, use consistent style reference cluster

3. **Balance Testing Time** - 3 tech paths × 30 recipes × 50 beasts = huge complexity
   - Risk: Unbalanced meta, dominant strategy
   - Mitigation: Incremental testing, community playtesting

### Medium Priority
4. **Performance with Many Entities** - 50 pests + 10 predators on map
   - Mitigation: Object pooling, spatial partitioning, LOD system

5. **Save/Load with Multiplayer** - Conflict resolution
   - Mitigation: Server as authority, optimistic local updates

---

## 🎯 Success Criteria

### Functional Completion (100%)
- [ ] All 5 pillars have complete gameplay loops
- [ ] Ecology system affects gameplay observably
- [ ] Tech tree offers strategic variety
- [ ] Multiplayer neighbor interactions work
- [ ] 30+ recipes craftable
- [ ] 50+ beasts capturable and evolvable

### Visual Excellence (95%+)
- [ ] No Graphics placeholders remain
- [ ] All beasts have walk animations
- [ ] Pests/predators visible on map
- [ ] Tech tree UI polished
- [ ] Weather effects implemented
- [ ] Seasonal variants complete

### Polish & Feel
- [ ] Every interaction has particle/sound feedback
- [ ] UI animations smooth (spring physics)
- [ ] Loading states handled gracefully
- [ ] Error messages helpful and stylish
- [ ] 60 FPS maintained on quality=1

---

**Document Version:** 1.0
**Last Updated:** 2026-06-17
**Next Review:** After Week 1 sprint completion
