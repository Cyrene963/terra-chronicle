# Terra Chronicle — Godot 资产迁移包

**版本**: v9 (2026-06-13)  
**原项目**: PixiJS Web 游戏 → Godot 4.x 迁移

---

## 📦 包含内容

### 🎨 美术资产 (Ready to use!)
- **37 个精灵** — 玩家/树/房屋/灵兽/装饰 (sprites/)
- **9 个地表瓦片** — 草/土/水/沙/耕地 + 4个对角线水岸过渡 (tiles/)
- **2 张概念美术** — 大陆KV图/卡牌模板 (concept/)
- **所有贴图已抠图处理** — 透明背景,直接导入 Godot

### 📊 游戏数据 (JSON)
- `alchemy_recipes.json` — 6 条隐藏炼金配方
- `game_systems.json` — 核心系统参数(地图/时间/灵兽AI/战斗)

### 📖 文档
- `GODOT_MIGRATION_GUIDE.md` — **完整移植指南**(必读!)
- `ULTRACODE_V9_REPORT.md` — v9 实现报告(设计原理)

### 🔧 工具
- `gen_sprites.py` — AI 批量生成贴图工具(可继续生成新资产)

---

## 🚀 快速开始

### 1. 复制资产到 Godot 项目
```bash
cp -r terra-godot-assets/sprites/* your-godot-project/assets/sprites/
cp -r terra-godot-assets/tiles/* your-godot-project/assets/tiles/
cp -r terra-godot-assets/data/* your-godot-project/data/
```

### 2. 阅读移植指南
打开 `docs/GODOT_MIGRATION_GUIDE.md`,包含:
- 7 大核心系统的 Godot 实现方案(含代码示例)
- TileMap/YSort/NavigationAgent2D 使用指南
- 炼金工坊配方探索玩法实现
- 羊皮纸手账 UI 美学复现
- 灵兽 AI/卡牌战斗/四季系统实现要点

### 3. 导入数据
```gdscript
# Godot 脚本中读取 JSON
var file = FileAccess.open("res://data/alchemy_recipes.json", FileAccess.READ)
var json = JSON.parse_string(file.get_as_text())
var recipes = json["recipes"]
```

---

## 🎯 核心玩法重点

### 炼金工坊 (最核心!)
- **6 条隐藏配方**,无任何提示
- 玩家手动投入材料(星麦/木材)试验探索
- 配方正确: 金色闪光动画 → 卡牌揭示
- **这是深度的来源!** 详见 `alchemy_recipes.json`

### 灵兽 AI
- **水灵兽**: 自动扫描 moisture<30 的作物,寻路前往浇水
- **火灵兽**: 蹲守熔炉,提升锻造品质
- 详见 `game_systems.json` 中的 beasts 配置

### 四季系统
- 30秒一昼夜, 7天一季
- 四季色调: 春(标准) / 夏(暖黄) / 秋(橙红) / 冬(冷蓝)
- 粒子效果: 秋落叶 / 冬雪花

---

## 🎨 美学方向

从 **"冷科技软件"** → **"温暖奇幻手账"**

### 关键元素
- 背景: 温暖沙色渐变 `#f4ecd8 → #e8dcbf`
- 边框: 金色双线 `#d4af37` + 深棕 `#8b7355`
- 字体: 衬线(Cormorant Garamond) + 中文(Noto Serif SC)
- 装饰: 四角金色 L 形描边
- 按钮悬停: 金色外发光

**Godot 实现详见移植指南 §7**

---

## 📁 目录结构

```
terra-godot-assets/
├── sprites/          # 37 个精灵贴图 (.png, 透明背景)
├── tiles/            # 9 个地表瓦片 (256x256)
├── concept/          # KV图 + 卡牌模板
├── data/             # JSON 数据文件
│   ├── alchemy_recipes.json
│   └── game_systems.json
├── docs/             # 文档
│   ├── GODOT_MIGRATION_GUIDE.md  ← 必读!
│   └── ULTRACODE_V9_REPORT.md
├── tools/            # 生成工具
│   └── gen_sprites.py
└── README.md         # 本文件
```

---

## 🔧 继续生成新资产

使用 `tools/gen_sprites.py` 可继续生成:
- 更多作物(胡萝卜/南瓜/番茄...)
- 更多灵兽(风/土/光/暗系)
- 更多建筑(铁匠铺/法师塔...)

**用法**:
```bash
cd tools/
# 编辑 gen_sprites.py 的 SPRITES 列表添加新定义
python3 gen_sprites.py
# 生成的贴图自动保存到 sprites/ 文件夹
```

API: ai.input.im (gpt-image-2, 4k quality:high)

---

## ✅ 移植检查清单

- [ ] 复制所有美术资产
- [ ] 导入 JSON 数据
- [ ] 设置 TileSet (9 张瓦片)
- [ ] 创建玩家 CharacterBody2D + NavigationAgent2D
- [ ] 实现时间系统(30秒昼夜, 7天四季)
- [ ] **实现炼金工坊**(核心玩法!)
- [ ] 实现水灵兽 AI
- [ ] 实现卡牌战斗系统
- [ ] 应用羊皮纸手账美学
- [ ] 集成对角线水岸瓦片

---

## 📖 原项目信息

- **URL**: https://terra.bz9.me
- **引擎**: PixiJS v8 (Web)
- **版本**: v9 (2026-06-13)
- **完成度**: 商业级独立游戏原型
- **审计**: Gemini 指出的 5 大痛点全部修复

---

## 💡 重要提醒

### Godot 优势
- TileMap/YSort 比手动排布简洁很多
- NavigationAgent2D 比自实现 A* 省力
- AnimationPlayer 比手写 tween 直观
- Control 节点 + Theme 比 HTML/CSS 灵活

### 需要重写的部分
- 所有 JavaScript 代码 → GDScript
- HTML/CSS UI → Control 节点
- PixiJS Filter → GDShader
- LocalStorage 存档 → FileAccess

**但核心设计、配方、美术、系统参数全部可直接复用!**

---

## 🚀 下一步

1. 阅读 `docs/GODOT_MIGRATION_GUIDE.md`
2. 创建 Godot 项目并导入资产
3. 优先实现: 地图 → 移动 → 炼金工坊
4. 逐步补全: 灵兽 AI → 战斗 → 地城

**祝移植顺利!** 🎮

有问题可以回来问原作者(Claude Opus 4.8) :)
