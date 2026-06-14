# Beast Capture System API Reference

## CaptureSystem 对象

全局可用: `window.CaptureSystem`

---

## 核心方法

### `trySpawnEncounter(plot, encounterRate)`

尝试在指定地块生成野生灵兽遭遇。

**参数:**
- `plot` (Object): 地块数据
  - `x` (Number): 地块 X 坐标
  - `y` (Number): 地块 Y 坐标
  - `biome` (String): 生物群落类型 (见 `BIOMES`)
- `encounterRate` (Number): 遭遇触发概率 (0-1)，默认 0.15

**返回:** `Object|null`
```javascript
{
  type: 'wild_beast_encounter',
  beast: { /* 野生灵兽数据 */ },
  location: { x, y, biome },
  timestamp: 1234567890
}
```

**示例:**
```javascript
const encounter = CaptureSystem.trySpawnEncounter(
  { x: 15, y: 20, biome: BIOMES.FOREST },
  0.2
);

if (encounter) {
  console.log(`发现野生 ${encounter.beast.name}!`);
}
```

---

### `startCaptureBattle(encounter, playerDeck)`

初始化捕获战斗。

**参数:**
- `encounter` (Object): 由 `trySpawnEncounter` 返回的遭遇数据
- `playerDeck` (Array): 玩家卡组

**返回:** `Object` - 战斗初始化数据

**示例:**
```javascript
const battleData = CaptureSystem.startCaptureBattle(
  encounter,
  Terra.farm.inventory.cards
);

// 传递给现有战斗系统
Battle.enter({ /* 战斗配置 */ });
```

---

### `calculateCaptureRate(beast, crystalTier)`

计算当前捕获成功率。

**参数:**
- `beast` (Object): 野兽数据
- `crystalTier` (String): 魂晶等级，可选值:
  - `'basic'` - 基础魂晶 (1.0x)
  - `'advanced'` - 高级魂晶 (1.5x)
  - `'perfect'` - 完美魂晶 (2.5x)

**返回:** `Number` - 成功率 (0-1)

**公式:**
```
成功率 = (1 - HP%) × 稀有度修正 × 魂晶加成
```

**示例:**
```javascript
const beast = encounter.beast;
beast.currentHP = beast.maxHP * 0.2;  // 降低到 20% HP

const rate = CaptureSystem.calculateCaptureRate(beast, 'basic');
console.log(`捕获率: ${(rate * 100).toFixed(1)}%`);
```

---

### `attemptCapture(beast, crystalTier)`

执行捕获判定。

**参数:**
- `beast` (Object): 野兽数据
- `crystalTier` (String): 魂晶等级 (同上)

**返回:** `Object`
```javascript
{
  success: true/false,
  rate: 75.3,              // 实际成功率 (%)
  roll: 68.2,              // 随机掷骰结果 (%)
  message: "捕获成功！",
  shakeCount: 4,           // 摇晃次数 (1-4)
  beast: { /* 驯服后的灵兽 */ } | null
}
```

**示例:**
```javascript
const result = CaptureSystem.attemptCapture(beast, 'advanced');

if (result.success) {
  // 扣除魂晶
  Terra.farm.inventory.materials.soul_crystal_advanced--;
  
  // 添加到牧场
  CaptureSystem.addBeastToRanch(Terra.farm, result.beast);
  
  console.log(`捕获成功！摇晃 ${result.shakeCount} 次`);
} else {
  console.log(`捕获失败 (${result.roll}% > ${result.rate}%)`);
}
```

---

### `addBeastToRanch(farm, beast)`

将灵兽添加到牧场。

**参数:**
- `farm` (Object): 私有农场数据 (`Terra.farm`)
- `beast` (Object): 灵兽数据

**返回:** `Object`
```javascript
{ ok: true, beast: { /* ... */ } }
// 或
{ ok: false, reason: "牧场已满！(20/20)" }
```

**示例:**
```javascript
const result = CaptureSystem.addBeastToRanch(Terra.farm, tamedBeast);

if (!result.ok) {
  alert(result.reason);
}
```

---

### `releaseBeast(farm, beastId)`

放生指定灵兽。

**参数:**
- `farm` (Object): 私有农场数据
- `beastId` (String): 灵兽唯一 ID

**返回:** `Object`
```javascript
{ ok: true, beast: { /* 被放生的灵兽 */ } }
// 或
{ ok: false, reason: "错误原因" }
```

**注意:** 正在工作的灵兽无法放生。

**示例:**
```javascript
const result = CaptureSystem.releaseBeast(Terra.farm, 'beast_12345');

if (result.ok) {
  console.log(`${result.beast.name} 回归自然了`);
}
```

---

### `assignWork(farm, beastId, workType)`

分配工作给灵兽。

**参数:**
- `farm` (Object): 私有农场数据
- `beastId` (String): 灵兽 ID
- `workType` (String): 工作类型 (见下方"工作类型"列表)

**返回:** `Object`
```javascript
{ ok: true, beast: { /* 更新后的灵兽 */ } }
// 或
{ ok: false, reason: "体力不足！需要休息。" }
```

**示例:**
```javascript
const result = CaptureSystem.assignWork(
  Terra.farm,
  'beast_12345',
  'irrigate'
);

if (result.ok) {
  console.log(`${result.beast.name} 开始工作: 灌溉`);
}
```

---

### `unassignWork(farm, beastId)`

停止灵兽工作。

**参数:**
- `farm` (Object): 私有农场数据
- `beastId` (String): 灵兽 ID

**返回:** `Object`

**示例:**
```javascript
CaptureSystem.unassignWork(Terra.farm, 'beast_12345');
```

---

### `updateBeast(beast, deltaTime)`

更新灵兽状态 (体力、工作进度)。

**参数:**
- `beast` (Object): 灵兽数据
- `deltaTime` (Number): 时间增量 (秒)

**调用时机:** 在主游戏循环的每一帧调用。

**示例:**
```javascript
function tick(dt) {
  // 更新所有灵兽
  Terra.farm.beasts?.forEach(beast => {
    CaptureSystem.updateBeast(beast, dt);
  });
}
```

---

### `getRanchStatus(farm)`

获取牧场完整状态。

**参数:**
- `farm` (Object): 私有农场数据

**返回:** `Object`
```javascript
{
  beasts: [ /* 所有灵兽数组 */ ],
  capacity: 20,
  occupied: 8,
  available: 12,
  workingBeasts: 3,
  restingBeasts: 5
}
```

**示例:**
```javascript
const status = CaptureSystem.getRanchStatus(Terra.farm);
console.log(`牧场占用: ${status.occupied}/${status.capacity}`);
console.log(`工作中: ${status.workingBeasts}`);
```

---

## 查询方法

### `getSpecies(speciesId)`

通过 ID 获取物种数据。

**返回:** `Object|null`

```javascript
const species = CaptureSystem.getSpecies('shadow_fox');
console.log(species.name);  // "影狐"
console.log(species.element);  // "dark"
```

---

### `getAllSpecies()`

获取所有物种列表。

**返回:** `Array<Object>`

```javascript
const allSpecies = CaptureSystem.getAllSpecies();
console.log(`共 ${allSpecies.length} 种灵兽`);
```

---

### `getSpeciesByBiome(biome)`

按生物群落过滤物种。

**参数:**
- `biome` (String): 生物群落 (见 `BIOMES`)

**返回:** `Array<Object>`

```javascript
const forestBeasts = CaptureSystem.getSpeciesByBiome(BIOMES.FOREST);
console.log(`森林中有 ${forestBeasts.length} 种灵兽`);
```

---

### `getSpeciesByRarity(rarityTier)`

按稀有度过滤物种。

**参数:**
- `rarityTier` (String): 稀有度 (`'common'`, `'uncommon'`, `'rare'`, `'epic'`, `'legendary'`)

**返回:** `Array<Object>`

```javascript
const legendaryBeasts = CaptureSystem.getSpeciesByRarity('legendary');
console.log('传说级灵兽:', legendaryBeasts.map(b => b.name));
```

---

### `getAllPersonalities()`

获取所有性格特质。

**返回:** `Object`

```javascript
const personalities = CaptureSystem.getAllPersonalities();
console.log(personalities.diligent.name);  // "勤勉"
```

---

### `randomPersonality()`

生成随机性格特质。

**返回:** `Object`

```javascript
const personality = CaptureSystem.randomPersonality();
console.log(`性格: ${personality.name}`);
console.log(`工作效率: ${personality.workEfficiency}x`);
```

---

## 常量

### `BIOMES`

生物群落类型。

```javascript
BIOMES.FOREST    // "forest"
BIOMES.RIVER     // "river"
BIOMES.MOUNTAIN  // "mountain"
BIOMES.PLAINS    // "plains"
BIOMES.SWAMP     // "swamp"
```

---

### `RARITY`

稀有度配置。

```javascript
RARITY.COMMON      // { tier: 'common', name: '普通', dropRate: 0.65, captureMod: 1.0 }
RARITY.UNCOMMON    // { tier: 'uncommon', name: '罕见', dropRate: 0.25, captureMod: 0.8 }
RARITY.RARE        // { tier: 'rare', name: '稀有', dropRate: 0.08, captureMod: 0.5 }
RARITY.EPIC        // { tier: 'epic', name: '史诗', dropRate: 0.015, captureMod: 0.3 }
RARITY.LEGENDARY   // { tier: 'legendary', name: '传说', dropRate: 0.005, captureMod: 0.15 }
```

---

### `BEAST_SPECIES`

所有物种数据对象。

```javascript
BEAST_SPECIES.shadow_fox  // { id: 'shadow_fox', name: '影狐', ... }
```

---

### `PERSONALITY_TRAITS`

所有性格特质。

```javascript
PERSONALITY_TRAITS.diligent  // { name: '勤勉', workEfficiency: 1.3, ... }
```

---

## 工作类型

灵兽可分配的工作类型：

| 工作类型 | 描述 | 效果 |
|---------|------|------|
| `farming` | 耕作 | 提升作物生长速度和质量 |
| `irrigate` | 灌溉 | 自动为干旱作物浇水 |
| `mining` | 采矿 | 开采矿石资源 |
| `gather_wood` | 伐木 | 收集木材 |
| `construction` | 建造 | 协助建筑施工 |
| `forge` | 锻造 | 提升锻造品质 |
| `alchemy` | 炼金 | 提升炼金成功率 |
| `combat` | 战斗 | 参与战斗作为伙伴 |
| `guard` | 守卫 | 保护农场免受入侵 |
| `scout` | 侦查 | 探索未知区域 |
| `courier` | 信使 | 快速运输物资 |
| `pest_control` | 除虫 | 降低虫害压力 |
| `climate_control` | 气候调节 | 影响周围气候 |
| `fish` | 捕鱼 | 在河流中捕鱼 |
| `herd` | 放牧 | 管理其他动物 |
| `night_guard` | 夜巡 | 夜间守卫效率翻倍 |
| `power_generation` | 发电 | 为设施提供能量 |
| `ritual` | 仪式 | 参与魔法仪式 |

---

## 数据结构

### Beast 对象

```javascript
{
  id: 'wild_1718296800000_123456',  // 唯一 ID
  speciesId: 'shadow_fox',           // 物种 ID
  name: '影狐',                      // 显示名称
  element: 'dark',                   // 元素
  rarity: 'uncommon',                // 稀有度
  
  // 战斗属性
  maxHP: 38,
  currentHP: 38,
  atk: 18,
  def: 6,
  
  // 性格特质
  personality: {
    key: 'curious',
    name: '好奇',
    workEfficiency: 0.9,
    discoveryBonus: 1.5
  },
  
  // 工作能力
  workTypes: ['scout', 'night_guard'],
  abilities: ['暗影遁', '夜视'],
  
  // 状态
  stamina: 100,           // 体力 (0-100)
  friendship: 30,         // 友好度
  loyalty: 50,            // 忠诚度
  experience: 0,          // 经验值
  level: 1,               // 等级
  
  // 工作分配
  assignment: null,       // 当前工作 | null
  assignedAt: null,       // 分配时间戳
  
  // 元数据
  sprite: 'assets/sprites/beasts/shadow_fox.png',
  discoveredAt: { x: 15, y: 20, biome: 'forest' },
  capturedAt: 1718296800000
}
```

---

## 使用示例

### 完整捕获流程

```javascript
// 1. 玩家探索，触发遭遇
const encounter = CaptureSystem.trySpawnEncounter(
  { x: playerX, y: playerY, biome: 'forest' },
  0.15
);

if (encounter) {
  // 2. 进入捕获战斗
  const battleData = CaptureSystem.startCaptureBattle(
    encounter,
    Terra.farm.inventory.cards
  );
  
  // 3. 战斗削弱灵兽...
  // (使用现有 battle.js 系统)
  
  // 4. HP < 30% 时，尝试捕获
  const beast = battleData.beast;
  beast.currentHP = beast.maxHP * 0.25;
  
  const result = CaptureSystem.attemptCapture(beast, 'basic');
  
  if (result.success) {
    // 5. 捕获成功，添加到牧场
    const addResult = CaptureSystem.addBeastToRanch(
      Terra.farm,
      result.beast
    );
    
    if (addResult.ok) {
      console.log(`${result.beast.name} 加入牧场！`);
      
      // 6. 分配工作
      CaptureSystem.assignWork(
        Terra.farm,
        result.beast.id,
        'irrigate'
      );
    }
  }
}
```

### 牧场管理循环

```javascript
function updateRanch(deltaTime) {
  const beasts = Terra.farm.beasts || [];
  
  for (const beast of beasts) {
    // 更新体力和工作进度
    CaptureSystem.updateBeast(beast, deltaTime);
    
    // 执行工作逻辑
    if (beast.assignment === 'irrigate') {
      autoIrrigate(beast);
    } else if (beast.assignment === 'farming') {
      boostCropGrowth(beast);
    }
    
    // 体力耗尽时自动停工
    if (beast.stamina <= 0 && beast.assignment) {
      CaptureSystem.unassignWork(Terra.farm, beast.id);
      console.log(`${beast.name} 体力耗尽，停止工作`);
    }
  }
}

// 在主循环中调用
function tick(dt) {
  updateRanch(dt);
}
```

---

## 配置

### 修改牧场容量

```javascript
CaptureSystem.RANCH_MAX_SLOTS = 30;  // 默认 20
```

### 修改捕获阈值

在战斗数据中设置：

```javascript
const battleData = CaptureSystem.startCaptureBattle(encounter, deck);
battleData.rules.captureThreshold = 0.4;  // 改为 40%
```

---

## 调试工具

### 强制生成特定物种

```javascript
function forceSpawn(speciesId, x, y) {
  const species = CaptureSystem.getSpecies(speciesId);
  const wildBeast = CaptureSystem._createWildBeast(species, { x, y, biome: species.biome });
  
  return {
    type: 'wild_beast_encounter',
    beast: wildBeast,
    location: { x, y, biome: species.biome },
    timestamp: Date.now()
  };
}

// 使用
const encounter = forceSpawn('azure_dragon', 10, 10);
```

### 作弊捕获（100% 成功）

```javascript
function cheatCapture(beast) {
  beast.currentHP = 1;
  const result = CaptureSystem.attemptCapture(beast, 'perfect');
  result.success = true;  // 强制成功
  result.beast = CaptureSystem._convertToTamed(beast);
  return result;
}
```

### 查看牧场详情

```javascript
console.table(Terra.farm.beasts.map(b => ({
  name: b.name,
  rarity: b.rarity,
  hp: `${b.currentHP}/${b.maxHP}`,
  stamina: b.stamina,
  assignment: b.assignment || 'resting',
  personality: b.personality.name
})));
```

---

**更新日期**: 2026-06-14  
**版本**: 1.0.0
