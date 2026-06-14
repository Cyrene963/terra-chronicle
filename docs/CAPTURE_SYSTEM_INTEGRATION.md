# 灵兽捕获系统集成指南

## 概览

本文档说明如何将 `capture_system.js` 集成到 Terra Chronicle 主游戏中。

## 文件结构

```
terra-chronicle-game/
├── src/
│   ├── main.js                 # 主游戏循环
│   ├── state.js                # 状态管理
│   ├── battle.js               # 战斗系统
│   ├── capture_system.js       # 【新】灵兽捕获系统
│   └── ...
├── data/
│   └── beast_species.json      # 【新】灵兽物种数据库
└── index.html                  # 加载所有脚本
```

## 1. 引入脚本

在 `index.html` 中添加脚本引用（在 `state.js` 和 `battle.js` 之后）：

```html
<script src="src/state.js"></script>
<script src="src/battle.js"></script>
<script src="src/capture_system.js"></script> <!-- 新增 -->
<script src="src/main.js"></script>
```

## 2. 核心功能

### 2.1 野外遭遇生成

在玩家探索时触发灵兽遭遇：

```javascript
// 在 main.js 的 update() 循环中
function checkForEncounter(playerX, playerY) {
  const tileX = Math.floor(playerX / TS);
  const tileY = Math.floor(playerY / TS);
  
  // 确定当前地块的生物群落
  const biome = determineBiome(tileX, tileY);
  
  // 尝试生成遭遇 (每步 15% 概率)
  const encounter = CaptureSystem.trySpawnEncounter(
    { x: tileX, y: tileY, biome },
    0.15  // 遭遇率
  );
  
  if (encounter) {
    // 触发战斗
    startCaptureBattle(encounter);
  }
}

// 生物群落判定示例
function determineBiome(x, y) {
  const tile = grid[y]?.[x];
  if (!tile) return BIOMES.PLAINS;
  
  if (tile === 'w') return BIOMES.RIVER;
  if (tile === 'F') return BIOMES.FOREST;  // 树林密集区域
  if (x > 45 && y < 15) return BIOMES.MOUNTAIN;  // 地图右上角
  if (tile === 'p') return BIOMES.PLAINS;
  
  return BIOMES.PLAINS;
}
```

### 2.2 捕获战斗流程

扩展现有 `battle.js` 的战斗系统：

```javascript
// 在 battle.js 中添加捕获模式
function startCaptureBattle(encounter) {
  const playerDeck = Terra.farm.inventory.cards || [];
  const battleData = CaptureSystem.startCaptureBattle(encounter, playerDeck);
  
  // 使用现有战斗系统，添加捕获特殊规则
  Battle.enter({
    mode: 'capture',
    enemy: {
      name: battleData.beast.name,
      maxHP: battleData.beast.maxHP,
      hp: battleData.beast.currentHP,
      img: battleData.beast.sprite,
      intent: null,
    },
    deck: buildDeck(playerDeck),
    onWin: () => onCaptureVictory(battleData),
    onLose: () => onBeastEscape(battleData),
    
    // 捕获模式特殊 UI
    captureMode: {
      beast: battleData.beast,
      captureThreshold: 0.3,
      onCapture: (crystalTier) => attemptCapture(battleData.beast, crystalTier),
    }
  });
}

function onCaptureVictory(battleData) {
  // 战斗胜利但未捕获 = 灵兽逃跑
  showMessage(`${battleData.beast.name} 逃走了！`);
  Battle.exit();
}

function onBeastEscape(battleData) {
  // 玩家失败
  showMessage('你被击败了...');
  Battle.exit();
}
```

### 2.3 捕获 UI

在战斗界面添加捕获按钮：

```javascript
// 在战斗 UI 中添加魂晶投掷按钮
function createCaptureUI(battleData) {
  const capturePanel = document.createElement('div');
  capturePanel.id = 'capturePanel';
  capturePanel.className = 'capture-panel';
  
  const beast = battleData.beast;
  const hpRatio = beast.currentHP / beast.maxHP;
  const captureRate = CaptureSystem.calculateCaptureRate(beast, 'basic');
  
  capturePanel.innerHTML = `
    <div class="capture-info">
      <div class="beast-name">${beast.name}</div>
      <div class="beast-rarity ${beast.rarity}">${RARITY[beast.rarity.toUpperCase()].name}</div>
      <div class="capture-rate">
        捕获率: <span class="${hpRatio > 0.3 ? 'low' : 'good'}">
          ${(captureRate * 100).toFixed(1)}%
        </span>
      </div>
    </div>
    
    <div class="crystal-buttons">
      <button class="crystal-btn basic" onclick="throwCrystal('basic')">
        投掷基础魂晶 (×${battleData.player.soulCrystals.basic})
      </button>
      <button class="crystal-btn advanced" onclick="throwCrystal('advanced')">
        投掷高级魂晶 (×${battleData.player.soulCrystals.advanced})
      </button>
      <button class="crystal-btn perfect" onclick="throwCrystal('perfect')">
        投掷完美魂晶 (×${battleData.player.soulCrystals.perfect})
      </button>
    </div>
    
    ${hpRatio > 0.3 ? '<div class="warning">⚠️ 生命值过高，建议继续削弱！</div>' : ''}
  `;
  
  document.getElementById('battle').appendChild(capturePanel);
}

function throwCrystal(crystalTier) {
  const beast = currentBattleData.beast;
  const result = CaptureSystem.attemptCapture(beast, crystalTier);
  
  // 扣除魂晶
  if (Terra.farm.inventory.materials[`soul_crystal_${crystalTier}`] > 0) {
    Terra.farm.inventory.materials[`soul_crystal_${crystalTier}`]--;
  }
  
  // 播放捕获动画
  playCaptureAnimation(result);
  
  if (result.success) {
    // 捕获成功
    const addResult = CaptureSystem.addBeastToRanch(Terra.farm, result.beast);
    if (addResult.ok) {
      showMessage(`捕获成功！${result.beast.name} 加入了你的牧场！`);
      Battle.exit();
      openRanchPanel();
    } else {
      showMessage(`捕获成功但牧场已满！${result.beast.name} 被放生了。`);
      Battle.exit();
    }
  } else {
    showMessage(result.message);
    // 继续战斗
  }
}
```

### 2.4 捕获动画

```javascript
function playCaptureAnimation(result) {
  const crystalEl = document.createElement('div');
  crystalEl.className = 'soul-crystal';
  crystalEl.style.cssText = `
    position: absolute;
    width: 60px;
    height: 60px;
    background: radial-gradient(circle, #88f, #44f);
    border-radius: 50%;
    box-shadow: 0 0 30px #88f;
    animation: crystalThrow 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  `;
  
  document.getElementById('battle').appendChild(crystalEl);
  
  // 摇晃动画
  setTimeout(() => {
    crystalEl.style.animation = `crystalShake 0.5s ease-in-out ${result.shakeCount}`;
    
    setTimeout(() => {
      if (result.success) {
        // 成功：爆发光效
        crystalEl.style.animation = 'crystalBurst 0.6s ease-out';
        playSound('capture_success');
      } else {
        // 失败：破碎
        crystalEl.style.animation = 'crystalBreak 0.4s ease-out';
        playSound('capture_fail');
      }
      
      setTimeout(() => crystalEl.remove(), 600);
    }, result.shakeCount * 500);
  }, 800);
}
```

### 2.5 牧场管理 UI

```javascript
function openRanchPanel() {
  const status = CaptureSystem.getRanchStatus(Terra.farm);
  
  const panel = document.createElement('div');
  panel.id = 'ranchPanel';
  panel.className = 'panel ranch-panel';
  
  panel.innerHTML = `
    <div class="panel-header">
      <h2>牧场</h2>
      <span class="capacity">${status.occupied} / ${status.capacity}</span>
      <button class="close-btn" onclick="closeRanchPanel()">×</button>
    </div>
    
    <div class="ranch-stats">
      <div class="stat">工作中: ${status.workingBeasts}</div>
      <div class="stat">休息中: ${status.restingBeasts}</div>
    </div>
    
    <div class="beast-grid">
      ${status.beasts.map(beast => createBeastCard(beast)).join('')}
    </div>
  `;
  
  document.body.appendChild(panel);
}

function createBeastCard(beast) {
  const species = CaptureSystem.getSpecies(beast.speciesId);
  const personality = beast.personality;
  
  return `
    <div class="beast-card ${beast.rarity}" data-id="${beast.id}">
      <img src="${beast.sprite}" alt="${beast.name}">
      <div class="beast-info">
        <div class="name">${beast.name}</div>
        <div class="rarity ${beast.rarity}">${beast.rarity}</div>
        <div class="element">${beast.element}</div>
        <div class="personality">${personality.name}</div>
        
        <div class="stats">
          <div>HP: ${beast.currentHP}/${beast.maxHP}</div>
          <div>ATK: ${beast.atk}</div>
          <div>DEF: ${beast.def}</div>
        </div>
        
        <div class="status">
          <div class="stamina">
            <label>体力</label>
            <div class="bar">
              <div style="width: ${beast.stamina}%"></div>
            </div>
            <span>${beast.stamina}/100</span>
          </div>
          
          <div class="assignment">
            ${beast.assignment 
              ? `<span class="working">工作中: ${beast.assignment}</span>`
              : '<span class="resting">休息中</span>'
            }
          </div>
        </div>
        
        <div class="actions">
          ${!beast.assignment 
            ? `<select onchange="assignBeastWork('${beast.id}', this.value)">
                <option value="">分配工作...</option>
                ${species.workTypes.map(w => `<option value="${w}">${w}</option>`).join('')}
              </select>`
            : `<button onclick="unassignBeastWork('${beast.id}')">停止工作</button>`
          }
          <button onclick="releaseBeast('${beast.id}')" class="danger">放生</button>
        </div>
      </div>
    </div>
  `;
}

function assignBeastWork(beastId, workType) {
  if (!workType) return;
  
  const result = CaptureSystem.assignWork(Terra.farm, beastId, workType);
  if (result.ok) {
    showMessage(`${result.beast.name} 开始工作: ${workType}`);
    refreshRanchPanel();
  } else {
    showMessage(result.reason);
  }
}

function unassignBeastWork(beastId) {
  const result = CaptureSystem.unassignWork(Terra.farm, beastId);
  if (result.ok) {
    showMessage(`${result.beast.name} 停止工作，开始休息。`);
    refreshRanchPanel();
  }
}

function releaseBeast(beastId) {
  if (!confirm('确定要放生这只灵兽吗？此操作不可撤销！')) return;
  
  const result = CaptureSystem.releaseBeast(Terra.farm, beastId);
  if (result.ok) {
    showMessage(`${result.beast.name} 回归自然了...`);
    refreshRanchPanel();
  } else {
    showMessage(result.reason);
  }
}
```

## 3. 状态更新

在主游戏循环中更新灵兽状态：

```javascript
// 在 main.js 的 tick() 函数中
function updateBeasts(deltaTime) {
  if (!Terra.farm || !Terra.farm.beasts) return;
  
  for (const beast of Terra.farm.beasts) {
    CaptureSystem.updateBeast(beast, deltaTime);
    
    // 如果正在工作，执行工作逻辑
    if (beast.assignment) {
      executeBeastWork(beast, deltaTime);
    }
  }
}

function executeBeastWork(beast, deltaTime) {
  const efficiency = beast.personality.workEfficiency || 1.0;
  
  switch (beast.assignment) {
    case 'irrigate':
      // 自动浇水逻辑 (类似现有 beast_water AI)
      autoIrrigate(beast, efficiency);
      break;
      
    case 'farming':
      // 提升附近作物生长速度
      boostNearbyGrowth(beast, efficiency, deltaTime);
      break;
      
    case 'forge':
      // 提升锻造品质加成
      addForgeBonus(beast, efficiency);
      break;
      
    case 'guard':
      // 降低虫害压力
      reducePestPressure(beast, efficiency, deltaTime);
      break;
      
    // ... 其他工作类型
  }
}
```

## 4. CSS 样式

```css
/* 捕获战斗 UI */
.capture-panel {
  position: absolute;
  bottom: 120px;
  right: 40px;
  width: 320px;
  background: linear-gradient(135deg, #f4ecd8, #e8dcbf);
  border: 3px double #8b7355;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.capture-info {
  margin-bottom: 16px;
}

.beast-name {
  font-size: 20px;
  font-weight: bold;
  color: #2a2520;
  margin-bottom: 4px;
}

.beast-rarity {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  margin-bottom: 8px;
}

.beast-rarity.common { background: #9ca3af; color: white; }
.beast-rarity.uncommon { background: #3b82f6; color: white; }
.beast-rarity.rare { background: #8b5cf6; color: white; }
.beast-rarity.epic { background: #f59e0b; color: white; }
.beast-rarity.legendary { background: #ef4444; color: white; }

.capture-rate {
  font-size: 16px;
  margin-top: 8px;
}

.capture-rate .low { color: #dc2626; }
.capture-rate .good { color: #16a34a; }

.crystal-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.crystal-btn {
  padding: 10px;
  border: 2px solid #8b7355;
  border-radius: 6px;
  font-family: 'Noto Serif SC', serif;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.crystal-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.crystal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.crystal-btn.basic { background: #e0e7ff; }
.crystal-btn.advanced { background: #ddd6fe; }
.crystal-btn.perfect { background: #fef3c7; }

.warning {
  margin-top: 12px;
  padding: 8px;
  background: #fef3c7;
  border-left: 3px solid #f59e0b;
  font-size: 12px;
  color: #92400e;
}

/* 牧场面板 */
.ranch-panel {
  position: fixed;
  inset: 40px;
  background: linear-gradient(135deg, #f4ecd8, #e8dcbf);
  border: 4px double #8b7355;
  border-radius: 12px;
  padding: 24px;
  overflow-y: auto;
  z-index: 90;
}

.beast-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.beast-card {
  background: white;
  border: 2px solid #8b7355;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.beast-card img {
  width: 100%;
  height: 180px;
  object-fit: contain;
  margin-bottom: 12px;
}

/* 捕获动画 */
@keyframes crystalThrow {
  0% {
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%) scale(0.5);
    opacity: 0;
  }
  100% {
    bottom: 50%;
    left: 50%;
    transform: translateX(-50%) scale(1);
    opacity: 1;
  }
}

@keyframes crystalShake {
  0%, 100% { transform: translateX(-50%) rotate(0deg); }
  25% { transform: translateX(-50%) rotate(-15deg); }
  75% { transform: translateX(-50%) rotate(15deg); }
}

@keyframes crystalBurst {
  0% { transform: translateX(-50%) scale(1); opacity: 1; }
  100% { transform: translateX(-50%) scale(3); opacity: 0; }
}

@keyframes crystalBreak {
  0% { transform: translateX(-50%) scale(1); opacity: 1; }
  100% { transform: translateX(-50%) scale(0.3) rotate(180deg); opacity: 0; }
}
```

## 5. 数据持久化

确保灵兽数据保存到 `state.js`：

```javascript
// 在 Terra.save() 中已自动包含 farm.beasts
Terra.save(); // 完整保存包括灵兽

// 加载时恢复
Terra.load();
```

## 6. 测试

在浏览器控制台测试：

```javascript
// 测试生成遭遇
const encounter = CaptureSystem.trySpawnEncounter(
  { x: 10, y: 10, biome: 'forest' },
  1.0  // 100% 触发
);
console.log(encounter);

// 测试捕获率计算
const testBeast = encounter.beast;
testBeast.currentHP = testBeast.maxHP * 0.25;  // 降低到 25%
const rate = CaptureSystem.calculateCaptureRate(testBeast, 'basic');
console.log('捕获率:', rate);

// 测试捕获
const result = CaptureSystem.attemptCapture(testBeast, 'perfect');
console.log('捕获结果:', result);

// 测试添加到牧场
if (result.success) {
  CaptureSystem.addBeastToRanch(Terra.farm, result.beast);
  console.log('牧场状态:', CaptureSystem.getRanchStatus(Terra.farm));
}
```

## 7. 后续扩展

### 7.1 灵兽进化系统

```javascript
CaptureSystem.evolveBeast = function(farm, beastId, evolutionPath) {
  // 消耗材料，灵兽进化到新形态
};
```

### 7.2 生态食物链

```javascript
CaptureSystem.updateEcosystem = function(captureHistory) {
  // 根据玩家捕获历史调整各物种出现率
  // 过度捕获某物种 → 其天敌减少 → 害虫爆发
};
```

### 7.3 灵兽繁殖

```javascript
CaptureSystem.breedBeasts = function(parent1, parent2) {
  // 两只灵兽繁殖后代，继承性格特质和属性
};
```

---

**完成清单**：
- [x] `capture_system.js` 核心模块
- [x] `beast_species.json` 数据库 (14/200 物种)
- [x] 集成指南文档
- [ ] UI 集成到 `main.js`
- [ ] CSS 样式添加到 `index.html`
- [ ] 精灵图生成 (使用 `tools/gen_sprites.py`)
- [ ] 音效对接
- [ ] 存档兼容性测试
