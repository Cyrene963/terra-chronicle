# 灵兽进化系统 (Beast Evolution System)

## 概述

多路径灵兽进化系统允许每只灵兽沿着 3 条不同的进化路径发展：战斗系、工作系、混合系。每条路径提供独特的能力和形态。

## 核心特性

### 1. 三条进化路径

- **战斗路径 (Combat)**: 强化战斗能力，解锁战斗技能
- **工作路径 (Work)**: 提升农务效率，增加工作产出
- **混合路径 (Hybrid)**: 平衡发展，通用性强

### 2. 进化点获取

- **战斗经验 (combat_exp)**: 通过战斗获得
  - 胜利: +30 点
  - 存活: +10 点
  - 造成伤害: 每 10 点伤害 +1 点
  
- **工作经验 (work_exp)**: 通过农务工作获得
  - 基础: 工作时长 × 2
  - 高质量工作 (≥80%): ×1.5 加成
  - 完美工作 (≥95%): 额外 ×1.3 加成
  
- **混合经验 (hybrid_exp)**: 战斗和工作都会贡献 30% 到混合路径

### 3. 进化阶段

| 阶段 | 名称 | 所需进化点 |
|------|------|-----------|
| 0 | 初始形态 | 0 |
| 1 | 初级进化 | 100 |
| 2 | 中级进化 | 300 |
| 3 | 终极形态 | 600 |

### 4. 进化重置

- 每只灵兽可使用【进化重置石】重置一次
- 重置后回到初始形态，但保留所有经验点
- 可重新选择进化路径

## 使用方法

### 初始化灵兽

```javascript
const beast = {
  id: 'beast_001',
  species: 'woodland_sprite',
  name: '林地精灵',
  base_hp: 45,
  base_atk: 12,
  base_def: 8,
};

EvolutionSystem.initBeastEvolution(beast);
```

### 添加进化点

```javascript
// 战斗后
const battleResult = { victory: true, damage: 150, survived: true };
EvolutionSystem.gainCombatExp(beast, battleResult);

// 工作后
const workResult = { workType: 'farming', duration: 120, quality: 0.95 };
EvolutionSystem.gainWorkExp(beast, workResult);
```

### 选择路径并进化

```javascript
// 选择路径（只能选一次，除非重置）
EvolutionSystem.choosePath(beast, 'combat'); // 'combat' | 'work' | 'hybrid'

// 执行进化
const result = EvolutionSystem.evolve(beast);
if (result.success) {
  console.log(result.message); // "进化成功！荆棘卫士"
  console.log(result.skills);   // ["荆棘反击"]
}
```

### 渲染进化树 UI

```javascript
const container = document.getElementById('beast-panel');
EvolutionTreeUI.render(beast, container);
```

## API 文档

### EvolutionSystem

#### `initBeastEvolution(beast)`
初始化灵兽进化数据。

#### `addEvolutionPoints(beast, type, amount)`
手动添加进化点。
- `type`: 'combat_exp' | 'work_exp' | 'hybrid_exp'
- `amount`: 经验值数量

#### `gainCombatExp(beast, battleResult)`
战斗后自动计算并添加经验。
- `battleResult`: `{ victory: bool, damage: number, survived: bool }`

#### `gainWorkExp(beast, workResult)`
工作后自动计算并添加经验。
- `workResult`: `{ workType: string, duration: number, quality: number }`

#### `choosePath(beast, path)`
选择进化路径。
- `path`: 'combat' | 'work' | 'hybrid'
- 返回: `{ success: bool, message: string }`

#### `evolve(beast)`
执行进化。
- 返回: `{ success: bool, message: string, newStage?: number, newForm?: string, skills?: string[] }`

#### `resetEvolution(beast, hasResetItem)`
重置进化。
- `hasResetItem`: 是否持有重置道具
- 返回: `{ success: bool, message: string }`

#### `getEvolutionSummary(beast)`
获取进化状态摘要。

#### `getWorkEfficiencyMultiplier(beast, workType)`
获取工作效率倍数。

#### `getCombatBonus(beast)`
获取战斗能力加成。

### EvolutionTreeUI

#### `render(beast, parentElement)`
渲染进化树 UI。

#### `injectStyles()`
注入 CSS 样式（自动执行）。

## 物种进化树配置

当前已配置物种：
- `woodland_sprite` (林地精灵)
- `shadow_fox` (影狐)
- `river_turtle` (河流龟)

其他物种会使用默认模板。

### 添加新物种进化树

编辑 `SPECIES_EVOLUTION_TREES` 对象：

```javascript
SPECIES_EVOLUTION_TREES.your_species_id = {
  species: 'your_species_id',
  baseName: '物种名称',
  paths: {
    combat: {
      name: '战斗路径',
      stages: [
        { 
          stage: 0, 
          form: '初始形态', 
          desc: '描述', 
          skills: [] 
        },
        { 
          stage: 1, 
          form: '一级形态', 
          desc: '描述',
          skills: ['技能1'], 
          statBonus: { atk: 10, def: 5 } 
        },
        // ... 更多阶段
      ],
    },
    work: { /* 同上 */ },
    hybrid: { /* 同上 */ },
  },
};
```

## 集成到主游戏

### 1. 引入模块

在 `index.html` 中添加：
```html
<script src="src/evolution_tree.js"></script>
```

### 2. 战斗系统集成

在 `battle.js` 战斗结束时：
```javascript
if (beast) {
  EvolutionSystem.gainCombatExp(beast, {
    victory: playerWon,
    damage: totalDamageDealt,
    survived: beast.hp > 0,
  });
}
```

### 3. 工作系统集成

在 `farming_enhanced.js` 工作完成时：
```javascript
if (beast.assignment) {
  EvolutionSystem.gainWorkExp(beast, {
    workType: beast.assignment,
    duration: workDuration,
    quality: workQuality,
  });
}
```

### 4. UI 显示

在灵兽管理界面添加按钮：
```javascript
function showBeastEvolutionUI(beast) {
  const panel = document.getElementById('beast-detail-panel');
  panel.innerHTML = '';
  EvolutionTreeUI.render(beast, panel);
}
```

## 注意事项

1. **路径选择不可逆**：除非使用重置道具，否则选择路径后无法更改
2. **经验点独立**：三条路径的经验点独立累积
3. **属性加成累积**：进化后的属性加成会叠加到基础属性上
4. **技能继承**：高级形态会继承低级形态的所有技能
5. **保存兼容**：进化数据存储在 `beast.evolution` 对象中，可序列化保存

## 未来扩展

- [ ] 更多物种的专属进化树
- [ ] 进化动画效果
- [ ] 进化成就系统
- [ ] 多重进化分支（每个阶段有多个选项）
- [ ] 进化材料需求（除了经验点还需特定材料）
