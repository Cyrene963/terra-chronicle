# Terra Chronicle → Godot 迁移包清单

## 📦 打包完成!

**文件**: `terra-godot-assets.tar.gz`  
**大小**: 27 MB  
**文件总数**: 54 个  
**创建时间**: 2026-06-13

---

## ✅ 已打包内容

### 🎨 美术资产 (全部可直接使用)

#### sprites/ (37 个精灵)
- **角色**: player_idle.png, player_walk_sheet.png
- **树木**: tree_oak/cherry.png + 季节变体 (autumn/winter)
- **建筑**: house.png (+ winter), windmill.png (+ base/blades 分离式)
- **装饰**: rock.png, bush.png (+ winter), fence.png, grass_*.png
- **作物**: crop.png
- **灵兽**: beast_water/fire.png + walk_sheet.png (序列帧)
- **战斗**: portal.png, furnace.png, incubator.png, enemy_blight.png
- **地表瓦片**: tile_grass/soil/water/sand/plot.png
- **对角线水岸**: water_diag_tl/tr/bl/br.png (消除阶梯锯齿)

#### tiles/ (9 个瓦片, 与 sprites/ 中重复以便 TileSet 导入)
- 5 种基础地表 + 4 种对角线水岸过渡

#### concept/ (2 张概念美术)
- kv_continent.png — 标题画面大陆地图
- card_template.png — 卡牌模板

---

### 📊 游戏数据 (JSON)

#### data/alchemy_recipes.json
6 条隐藏炼金配方:
- 3麦+1木 → 新芽守卫 (攻8 防18 木系)
- 1麦+3木 → 巨盾 (攻6 防28 土系)
- 2麦+2木 → 平衡刃 (攻16 防14 金系)
- 4麦+0木 → 生命之粮 (治疗24 光系)
- 0麦+4木 → 荆棘壁 (攻12 防22 土系)
- 5麦+1木 → 收割镰 (攻22 防8 火系)

#### data/game_systems.json
核心系统参数:
- 地图: 56×56, 瓦片大小64px
- 时间: 30秒/天, 7天/季, 四季色调
- 灵兽: 水灵兽浇水AI, 火灵兽守炉AI
- 寻路: A* + 路径缓存
- 战斗: Slay-the-Spire 机制
- 渲染: Y-Sort, DPR自适应, 后处理特效

---

### 📖 文档 (必读!)

#### docs/GODOT_MIGRATION_GUIDE.md (7800+ 字)
完整移植指南,包含:
- 7 大核心系统的 Godot 实现方案(含 GDScript 代码示例)
- TileMap/YSort/NavigationAgent2D 使用指南
- 炼金工坊配方探索玩法实现(核心!)
- 羊皮纸手账 UI 美学复现
- 灵兽 AI/卡牌战斗/四季系统实现要点
- Godot 项目结构建议
- 优先实现顺序清单

#### docs/ULTRACODE_V9_REPORT.md
v9 完整实现报告:
- Gemini 审计指出的 5 大痛点诊断
- 4 大重构详解(启动修复/UI革命/对角线瓦片/炼金系统)
- 代码改动清单
- v8 vs v9 对比表
- 美术资产生成记录

#### README.md
快速开始指南 + 包内容索引

---

### 🔧 工具

#### tools/gen_sprites.py
AI 批量生成贴图工具:
- API: ai.input.im (gpt-image-2, 4k quality:high)
- 品红色键抠图 + 裁切缩放
- 并发生成 + 自动保存
- 可继续用于生成新资产(更多作物/灵兽/建筑)

---

## 🎯 关键价值

### 可直接复用
- ✅ 所有美术资产(37 个精灵 + 9 个瓦片)
- ✅ 6 条炼金配方 + 系统参数
- ✅ 羊皮纸手账美学设计语言
- ✅ 灵兽 AI 逻辑
- ✅ 四季/昼夜系统参数

### 需要 GDScript 重写
- JavaScript 游戏逻辑 → GDScript
- HTML/CSS UI → Control 节点
- PixiJS Filter → GDShader

### 迁移指南已提供
- 7 大系统的 Godot 实现方案
- 完整 GDScript 代码示例
- 节点层级建议
- 优先实现顺序

---

## 📊 质量等级

从 **"程序员 demo"** 提升到 **"独立游戏商业水准"**:
- 统一的奇幻手账美学(金边+羊皮纸+衬线字体)
- 配方探索玩法深度(6 条隐藏配方)
- 丝滑启动体验(无黑屏)
- 对角线水岸资产(消除阶梯感)

---

## 🚀 解压使用

```bash
tar -xzf terra-godot-assets.tar.gz
cd terra-godot-assets
cat README.md              # 阅读快速开始
cat docs/GODOT_MIGRATION_GUIDE.md  # 阅读完整移植指南
```

然后复制资产到你的 Godot 项目:
```bash
cp -r sprites/* your-godot-project/assets/sprites/
cp -r tiles/* your-godot-project/assets/tiles/
cp -r data/* your-godot-project/data/
```

---

## ✅ 打包清单

- [x] 37 个精灵贴图(玩家/树/房屋/灵兽/装饰)
- [x] 9 个地表瓦片(含 4 个对角线水岸)
- [x] 2 张概念美术(KV图/卡牌模板)
- [x] 炼金配方 JSON (6 条隐藏配方)
- [x] 游戏系统参数 JSON (地图/时间/AI/战斗)
- [x] Godot 移植指南 (7800+ 字,含代码示例)
- [x] v9 实现报告 (完整设计文档)
- [x] 贴图生成工具 (可继续生成新资产)
- [x] README 快速开始指南

**一切就绪,可以开始 Godot 开发!** 🎮

---

**制作**: Cyrene963 + Claude Opus 4.8  
**日期**: 2026-06-13  
**原项目**: https://terra.bz9.me (PixiJS v9)
