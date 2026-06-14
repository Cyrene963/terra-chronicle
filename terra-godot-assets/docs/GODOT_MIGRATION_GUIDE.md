# Terra Chronicle — Godot 移植指南

## 📦 资产包结构

```
terra-godot-assets/
├── sprites/          # 37 个精灵贴图(玩家/树/房屋/灵兽等)
├── tiles/            # 9 个地表瓦片(草/土/水/沙/耕地 + 4个对角线水岸)
├── concept/          # 概念美术(大陆KV图/卡牌模板)
├── data/             # 游戏数据 JSON
│   ├── alchemy_recipes.json    # 炼金配方表(6条隐藏配方)
│   └── game_systems.json       # 核心系统参数
├── tools/            # 美术生成工具
│   └── gen_sprites.py          # AI 批量生成贴图脚本
└── docs/             # 设计文档
    ├── ULTRACODE_V9_REPORT.md  # v9 完整实现报告
    └── GODOT_MIGRATION_GUIDE.md # 本文档
```

---

## 🎯 核心系统 Godot 实现要点

### 1. 地图渲染 (TileMap)

**PixiJS 实现**:
- Container + 手动 Sprite 排布
- Y-Sort 通过 `children.sort((a,b)=>a.y-b.y)` 实现

**Godot 建议**:
```gdscript
# 使用 TileMap 节点 + TileSet
# tiles/ 文件夹的 9 张贴图导入为 TileSet
# 对角线水岸瓦片: water_diag_tl/tr/bl/br.png
# 在 TileMap 中检测河流转角并替换对角线瓦片

# Y-Sort 深度: 使用 YSort 节点包裹所有精灵
# 或在 Sprite2D 上启用 y_sort_enabled
```

**地图生成**:
- 56×56 网格
- 程序生成河流(Perlin noise 或手绘路径)
- 树木/岩石/房屋随机分布
- 参考 `game_systems.json` 中的 world 参数

---

### 2. 四季与昼夜系统

**PixiJS 实现**:
- 全局 ColorMatrixFilter 调色
- 暮金色加法混合 + 午夜蓝色乘法混合

**Godot 建议**:
```gdscript
# 使用 CanvasModulate 节点控制全局色调
var season_tints = {
    "spring": Color(1.0, 1.0, 1.0),
    "summer": Color(1.1, 1.05, 0.95),
    "autumn": Color(1.15, 0.95, 0.85),
    "winter": Color(0.9, 0.95, 1.1)
}

# 昼夜光照: BackBufferCopy + ShaderMaterial
# 或使用 Light2D + 动态调整 energy

# 时间系统: 30秒一昼夜, 7天一季
var time_of_day = 0.0  # 0.0~1.0
var current_day = 1
var current_season = "spring"

func _process(delta):
    time_of_day += delta / 30.0  # 30秒一天
    if time_of_day >= 1.0:
        time_of_day -= 1.0
        current_day += 1
        if current_day > 7:
            current_day = 1
            advance_season()
```

---

### 3. 玩家移动与寻路

**PixiJS 实现**:
- WASD 手动移动
- Tap-to-Move: A* 寻路 + 路径缓存
- 平滑跟随镜头: lerp 缓动

**Godot 建议**:
```gdscript
# 使用 CharacterBody2D + NavigationAgent2D
# A* 寻路由 NavigationServer2D 自动处理

extends CharacterBody2D

@onready var nav_agent = $NavigationAgent2D
var speed = 200.0

func _input(event):
    if event is InputEventMouseButton and event.pressed:
        nav_agent.target_position = get_global_mouse_position()

func _physics_process(delta):
    # WASD 手动移动
    var input_dir = Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
    if input_dir != Vector2.ZERO:
        velocity = input_dir * speed
    elif not nav_agent.is_navigation_finished():
        # 自动寻路移动
        var next_pos = nav_agent.get_next_path_position()
        velocity = (next_pos - global_position).normalized() * speed
    else:
        velocity = Vector2.ZERO
    
    move_and_slide()

# 镜头跟随: Camera2D.position_smoothing_enabled = true
```

---

### 4. 炼金工坊 (核心玩法!)

**PixiJS 实现**:
- 弹窗 UI,手动点击材料卡片投入大釜
- 6 条隐藏配方,试验探索
- 配方正确: 金色闪光动画 → 卡牌揭示

**Godot 建议**:
```gdscript
# UI: Control 节点 + Panel + Button
# 读取 alchemy_recipes.json

var cauldron = {"wheat": 0, "wood": 0}
var recipes = []  # 从 JSON 加载

func _ready():
    var file = FileAccess.open("res://data/alchemy_recipes.json", FileAccess.READ)
    var json = JSON.parse_string(file.get_as_text())
    recipes = json["recipes"]

func add_ingredient(type: String):
    if type == "wheat" and inventory.wheat > 0:
        inventory.wheat -= 1
        cauldron.wheat += 1
    elif type == "wood" and inventory.wood > 0:
        inventory.wood -= 1
        cauldron.wood += 1
    update_cauldron_display()

func brew():
    for recipe in recipes:
        var ingr = recipe["ingredients"]
        if ingr["wheat"] == cauldron.wheat and ingr["wood"] == cauldron.wood:
            show_discovery_animation()
            create_card(recipe["result"])
            return
    show_failure_hint()

# 金色发现动画: AnimationPlayer + ColorRect modulate
# @keyframes goldFlash 等效: 使用 Tween
var tween = create_tween()
tween.tween_property($DiscoveryPanel, "modulate", Color.GOLD, 0.5)
tween.tween_property($DiscoveryPanel, "modulate", Color.WHITE, 0.5)
```

---

### 5. 灵兽 AI

**PixiJS 实现**:
- 水灵兽: 每帧检测 moisture<30 的作物,寻路前往浇水
- 火灵兽: 蹲守熔炉,提升锻造品质

**Godot 建议**:
```gdscript
# 使用 CharacterBody2D + NavigationAgent2D + StateMachine

enum State { IDLE, MOVING, WORKING }
var state = State.IDLE
var target_crop = null

func _process(delta):
    match state:
        State.IDLE:
            # 水灵兽: 扫描作物
            var dry_crops = find_crops_with_moisture_below(30)
            if dry_crops.size() > 0:
                target_crop = dry_crops[0]
                nav_agent.target_position = target_crop.global_position
                state = State.MOVING
        
        State.MOVING:
            if nav_agent.is_navigation_finished():
                state = State.WORKING
                start_watering()
        
        State.WORKING:
            if is_work_done():
                target_crop = null
                state = State.IDLE

# 火灵兽类似,目标改为熔炉位置
```

---

### 6. 卡牌战斗系统

**PixiJS 实现**:
- Slay-the-Spire 核心机制
- 回合制: 能量/护甲/敌人意图
- fade-to-black 场景转场

**Godot 建议**:
```gdscript
# 使用独立场景 battle.tscn
# 转场: SceneTree.change_scene_to_file() + Transition shader

# 卡牌: Control 节点 + RichTextLabel 显示属性
# 拖拽: _get_drag_data() / _can_drop_data() / _drop_data()

var player_energy = 3
var player_hp = 50
var player_armor = 0
var enemy_hp = 30
var enemy_intent = "attack_8"

func play_card(card):
    if player_energy < card.cost:
        return
    player_energy -= card.cost
    
    match card.type:
        "attack":
            deal_damage(enemy, card.atk)
        "defense":
            player_armor += card.def
        "heal":
            player_hp = min(player_hp + card.heal, player_max_hp)

func end_turn():
    enemy_act()
    player_armor = 0  # 护甲重置
    player_energy = 3
    draw_cards(5)

# Transition: CanvasLayer + ColorRect + AnimationPlayer
var fade = ColorRect.new()
fade.color = Color.BLACK
fade.modulate.a = 0.0
var tween = create_tween()
tween.tween_property(fade, "modulate:a", 1.0, 0.5)
tween.tween_callback(change_scene)
```

---

### 7. UI 美学 (羊皮纸手账风)

**核心美学**: 温暖沙色背景 + 金色双边框 + 衬线字体 + 四角 L 形装饰

**Godot 实现**:
```gdscript
# PanelContainer + StyleBoxFlat
var style = StyleBoxFlat.new()
style.bg_color = Color("#f4ecd8")  # 温暖沙色
style.border_width_all = 3
style.border_color = Color("#8b7355")  # 深棕色
style.corner_radius_all = 12

# 金色边框: 使用 NinePatchRect + 自绘贴图
# 或叠加第二层 Panel 作为内边框

# 字体: 使用 Google Fonts
# Cormorant Garamond (衬线) + Noto Serif SC (中文)
# 下载 TTF 导入 Godot,设置为 Theme 默认字体

# 四角装饰: 4 个 TextureRect 放置在面板四角
# 使用 L 形金色描边贴图(40×40px)
```

**地城地图**: 暗色渐变背景 + 金环节点脉动
```gdscript
# 背景: ColorRect gradient
var gradient = Gradient.new()
gradient.set_color(0, Color("#2a2520"))
gradient.set_color(1, Color("#1a1612"))

# 节点脉动: AnimationPlayer 控制 scale
var tween = create_tween().set_loops()
tween.tween_property($Node, "scale", Vector2(1.1, 1.1), 1.0)
tween.tween_property($Node, "scale", Vector2(1.0, 1.0), 1.0)
```

---

## 🎨 美术资产使用

### sprites/ (37 个精灵)
- `player_idle.png` — 玩家角色
- `tree_oak.png / tree_cherry.png` — 橡树/樱花树
- `house.png` — 农舍
- `windmill.png` — 风车
- `beast_water.png / beast_fire.png` — 水/火灵兽
- `rock.png / bush.png / fence.png` — 场景装饰

**Godot 导入**:
- 设置为 Sprite2D 或 AnimatedSprite2D
- 确保 Filter: Linear, Mipmaps: Off (像素风格)
- 所有贴图已抠图(透明背景),直接使用

### tiles/ (9 个瓦片)
- `tile_grass/soil/water/sand/plot.png` — 基础地表
- `water_diag_tl/tr/bl/br.png` — 对角线水岸过渡

**Godot 导入**:
- 创建 TileSet 资源
- 将 9 张贴图作为 TileSet Tiles
- 对角线瓦片用于河流转角,消除阶梯感

### concept/ (概念美术)
- `kv_continent.png` — 标题画面背景
- `card_template.png` — 卡牌模板(可用 TextureRect 叠加文字)

---

## 🔧 额外工具

### tools/gen_sprites.py
- Python 脚本,调用 ai.input.im API 生成贴图
- 品红色键抠图 + 裁切缩放
- 可继续用于生成新资产(更多作物/灵兽/建筑)

**用法**:
```bash
cd terra-godot-assets/tools/
python3 gen_sprites.py
```

**修改**:
- 编辑 `SPRITES` 或 `TILES` 列表添加新定义
- 生成的贴图保存在 `../sprites/` 和 `../tiles/`

---

## 📊 核心数据参考

### 炼金配方 (alchemy_recipes.json)
6 条隐藏配方,玩家需试验探索:
- 3麦+1木 → 新芽守卫 (攻8 防18)
- 1麦+3木 → 巨盾 (攻6 防28)
- 2麦+2木 → 平衡刃 (攻16 防14)
- 4麦+0木 → 生命之粮 (治疗24)
- 0麦+4木 → 荆棘壁 (攻12 防22)
- 5麦+1木 → 收割镰 (攻22 防8)

### 游戏系统参数 (game_systems.json)
- 地图: 56×56 瓦片
- 时间: 30秒/天, 7天/季
- 寻路: A* + 路径缓存
- 灵兽AI: 水灵兽浇水, 火灵兽守炉
- 战斗: Slay-the-Spire 机制

---

## 🚀 Godot 项目初始化建议

### 1. 项目结构
```
res://
├── scenes/
│   ├── world.tscn          # 主场景(地图+玩家)
│   ├── battle.tscn         # 战斗场景
│   ├── ui/
│   │   ├── alchemy.tscn    # 炼金工坊 UI
│   │   ├── dungeon_map.tscn
│   │   └── upgrade_panel.tscn
├── scripts/
│   ├── player.gd
│   ├── beast_ai.gd
│   ├── alchemy_system.gd
│   ├── time_system.gd
│   └── battle_manager.gd
├── assets/
│   ├── sprites/            # 从 terra-godot-assets/ 复制
│   ├── tiles/
│   ├── fonts/
│   └── concept/
├── data/
│   ├── alchemy_recipes.json
│   └── game_systems.json
└── shaders/
    ├── day_night.gdshader
    └── cloud_shadows.gdshader
```

### 2. 推荐节点层级
```
World (Node2D)
├── TileMap (地表瓦片)
├── YSort (精灵深度排序)
│   ├── Player (CharacterBody2D)
│   ├── Trees (多个 Sprite2D)
│   ├── Rocks
│   ├── Houses
│   └── Beasts (多个 CharacterBody2D)
├── Camera2D (跟随玩家)
├── CanvasModulate (四季色调)
├── Light2D (昼夜光照)
└── UI (CanvasLayer)
    ├── HUD
    ├── AlchemyPanel
    └── BattleUI
```

### 3. 优先实现顺序
1. **地图渲染** — TileMap + 精灵放置
2. **玩家移动** — WASD + Tap-to-Move 寻路
3. **时间系统** — 昼夜/四季调色
4. **炼金工坊** — 核心玩法,配方探索
5. **灵兽 AI** — 水灵兽浇水
6. **卡牌战斗** — 回合制战斗系统
7. **地城地图** — 节点路径选择

---

## 💡 关键差异提醒

| 维度 | PixiJS (Web) | Godot |
|---|---|---|
| **渲染** | WebGL, Container 手动排布 | TileMap + YSort 自动深度 |
| **寻路** | 自实现 A* | NavigationAgent2D 内置 |
| **UI** | 手写 HTML/CSS | Control 节点 + Theme |
| **动画** | JS 手动 tween | AnimationPlayer / Tween |
| **存档** | LocalStorage | FileAccess / ConfigFile |
| **碰撞** | 手动检测 | CollisionShape2D 自动 |
| **光照** | Filter 手动调色 | Light2D / CanvasModulate |
| **着色器** | GLSL Filter | GDShader (类 GLSL) |

---

## 📖 完整设计文档

详见 `ULTRACODE_V9_REPORT.md`:
- 5 大痛点诊断与解决
- UI 美学变革细节
- 代码改动清单
- v8 vs v9 对比表
- 待办事项(生态连锁反应/序列帧动画)

---

## ✅ 移植检查清单

- [ ] 复制所有美术资产到 Godot 项目
- [ ] 导入 alchemy_recipes.json / game_systems.json
- [ ] 设置 TileSet (9 张瓦片)
- [ ] 创建 Player CharacterBody2D + NavigationAgent2D
- [ ] 实现时间系统(30秒昼夜, 7天四季)
- [ ] 实现炼金工坊 UI (6 条隐藏配方)
- [ ] 实现水灵兽 AI (扫描 moisture<30 作物)
- [ ] 实现卡牌战斗系统 (Slay-the-Spire 机制)
- [ ] 应用羊皮纸手账美学 (金边+衬线字体+四角装饰)
- [ ] 对角线水岸瓦片集成 (检测河流转角并替换)

---

**祝移植顺利! Godot 的 2D 工具链会让很多系统实现更简洁。** 🚀

有问题随时回来问! (这份资产包已经包含了所有核心设计)
