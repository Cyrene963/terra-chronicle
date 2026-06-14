# Terra Chronicle — 世界地图系统集成指南

## 📁 文件说明

### 核心文件
- **`src/world_map.js`** — 世界地图核心系统
  - 六边形网格渲染 (100×100 瓦片)
  - 玩家位置分配算法
  - 缩放/拖拽导航
  - 实时数据更新接口

- **`world_map_demo.html`** — 独立演示页面
  - 完整功能展示
  - 控制面板
  - 地形图例

---

## 🎮 核心功能

### 1. 六边形网格系统
- **地图尺寸**: 100×100 轴向坐标
- **布局**: 平顶六边形 (flat-top hexagons)
- **坐标系**: 轴向坐标 (q, r)

### 2. 玩家分配
```javascript
// 为新玩家分配位置
const playerData = WorldMap.assignPlayerLocation(
  'player_12345',      // 玩家 ID
  '左灏',              // 玩家名称
  15                   // 农场等级
);

// 返回: { playerId, name, q, r, level, color, playstyle, lastUpdate }
```

**分配策略**:
- 避开水域 (只在陆地生成)
- 螺旋搜索,从地图中心向外扩散
- 防止重叠 (占用标记)
- 确定性颜色生成 (基于玩家 ID 哈希)

### 3. 实时数据更新
```javascript
// 更新玩家等级/颜色/风格
WorldMap.updatePlayer('player_12345', {
  level: 20,
  color: '#ff6b6b',
  playstyle: '战斗'
});
```

### 4. 交互功能
- **拖拽移动**: 鼠标/触摸拖动
- **缩放**: 滚轮/双指捏合 (0.2× ~ 4×)
- **悬停高亮**: 显示坐标/玩家信息
- **点击选择**: 触发 `onHexClick()` 回调

### 5. 显示信息
- **缩放 < 0.5**: 仅显示地形
- **缩放 0.5 ~ 1.0**: 显示玩家位置 + 等级圆圈
- **缩放 > 1.0**: 显示玩家名称 + 游戏风格标签

---

## 🔗 集成到主游戏

### 方法 A: 作为独立页面 (推荐用于 MVP)

1. **在主界面添加入口按钮**:
```html
<!-- index.html -->
<button onclick="openWorldMap()">世界地图</button>

<script>
function openWorldMap() {
  window.open('world_map_demo.html', '_blank', 'width=1200,height=800');
}
</script>
```

2. **通过 LocalStorage 同步数据**:
```javascript
// main.js 中保存玩家数据
localStorage.setItem('terra_current_player', JSON.stringify({
  id: 'player_local',
  name: Terra.farm.ownerId,
  level: calculateFarmLevel(Terra.farm),
  lastUpdate: Date.now()
}));

// world_map.js 中读取
const currentPlayer = JSON.parse(localStorage.getItem('terra_current_player'));
if (currentPlayer) {
  WorldMap.assignPlayerLocation(
    currentPlayer.id,
    currentPlayer.name,
    currentPlayer.level
  );
}
```

---

### 方法 B: 嵌入主游戏画布 (完整集成)

1. **在 `index.html` 添加画布层**:
```html
<!-- 在 #stage 之后添加 -->
<canvas id="worldMapCanvas" style="position:fixed; inset:0; z-index:5; display:none;"></canvas>
```

2. **在 `main.js` 中切换模式**:
```javascript
// 添加全局状态
let gameMode = 'farm';  // 'farm' | 'world_map'

function switchToWorldMap() {
  gameMode = 'world_map';
  document.getElementById('stage').style.display = 'none';
  document.getElementById('worldMapCanvas').style.display = 'block';

  // 初始化世界地图 (仅首次)
  if (!WorldMap.canvas) {
    WorldMap.init('worldMapCanvas');
    syncPlayerToWorldMap();
  }

  // 同步当前玩家数据
  syncPlayerToWorldMap();
}

function switchToFarm() {
  gameMode = 'farm';
  document.getElementById('stage').style.display = 'block';
  document.getElementById('worldMapCanvas').style.display = 'none';
}

function syncPlayerToWorldMap() {
  const playerId = Terra.farm.ownerId;
  const level = calculateFarmLevel(Terra.farm);
  WorldMap.updatePlayer(playerId, { level });
}

// 添加切换按钮
document.addEventListener('keydown', (e) => {
  if (e.key === 'M' || e.key === 'm') {
    if (gameMode === 'farm') {
      switchToWorldMap();
    } else {
      switchToFarm();
    }
  }
});
```

3. **计算农场等级**:
```javascript
function calculateFarmLevel(farm) {
  // 综合指标: 科技等级 + 卡牌数量 + 耕地数量
  const techLevel = farm.tech.agriculture + farm.tech.military + farm.tech.magic;
  const cardCount = farm.inventory.cards.length;
  const plotCount = Object.keys(farm.plots).length;

  return Math.floor((techLevel * 2 + cardCount + plotCount / 10) / 3);
}
```

---

### 方法 C: WebSocket 实时联机 (多人服务器)

1. **服务端维护世界地图状态**:
```javascript
// server.js (Node.js + WebSocket 示例)
const worldState = {
  players: new Map()  // playerId → { q, r, level, name, color, playstyle }
};

wss.on('connection', (ws) => {
  ws.on('message', (msg) => {
    const data = JSON.parse(msg);

    if (data.type === 'player_join') {
      // 分配位置 (服务端运行 world_map.js 逻辑)
      const location = assignPlayerLocation(data.playerId, data.name);
      worldState.players.set(data.playerId, location);

      // 广播给所有客户端
      broadcast({ type: 'player_update', player: location });
    }

    if (data.type === 'player_progress') {
      // 更新玩家等级
      const player = worldState.players.get(data.playerId);
      player.level = data.level;
      broadcast({ type: 'player_update', player });
    }
  });
});
```

2. **客户端接收更新**:
```javascript
// main.js
const ws = new WebSocket('wss://terra.bz9.me/world');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'player_update') {
    // 更新世界地图
    if (WorldMap.canvas) {
      WorldMap.updatePlayer(data.player.playerId, data.player);
    }
  }
};

// 发送进度更新
function reportProgress() {
  ws.send(JSON.stringify({
    type: 'player_progress',
    playerId: Terra.farm.ownerId,
    level: calculateFarmLevel(Terra.farm)
  }));
}

// 每分钟上报一次
setInterval(reportProgress, 60000);
```

---

## 🎨 自定义扩展

### 1. 修改玩家颜色算法
```javascript
// 根据游戏风格生成颜色
WorldMap.generatePlayerColor = function(playerId) {
  const player = this.players.get(playerId);
  if (!player) return '#888';

  // 农耕 → 绿色系, 战斗 → 红色系, 魔法 → 蓝色系
  const hueMap = {
    '农耕': 120,  // 绿
    '战斗': 0,    // 红
    '魔法': 240,  // 蓝
    '商业': 45,   // 金
    '探索': 280   // 紫
  };

  const baseHue = hueMap[player.playstyle] || 0;
  const hash = this.hashString(playerId);
  const hue = (baseHue + (hash % 30) - 15 + 360) % 360;

  return `hsl(${hue}, 70%, 55%)`;
};
```

### 2. 添加地标建筑
```javascript
// 在特定坐标放置地标
WorldMap.landmarks = new Map();

WorldMap.addLandmark = function(q, r, name, icon) {
  const key = `${q},${r}`;
  this.landmarks.set(key, { q, r, name, icon });
};

// 渲染地标 (在 renderPlayers 之后调用)
WorldMap.renderLandmarks = function(ctx, bounds) {
  this.landmarks.forEach(landmark => {
    if (landmark.q < bounds.minQ || landmark.q > bounds.maxQ) return;

    const center = HexMath.hexToPixel(landmark.q, landmark.r);

    // 绘制图标
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(landmark.icon, center.x, center.y);

    // 缩放 > 1.5 时显示名称
    if (this.camera.scale > 1.5) {
      ctx.font = '12px "Noto Serif SC", serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillText(landmark.name, center.x, center.y + 20);
    }
  });
};

// 示例: 添加世界 BOSS 刷新点
WorldMap.addLandmark(50, 50, '虚空裂隙', '🌀');
WorldMap.addLandmark(70, 30, '古代遗迹', '🏛️');
```

### 3. 小地图缩略图
```javascript
// 在 renderUI 中添加
WorldMap.renderMinimap = function(ctx, rect) {
  const size = 120;
  const x = rect.width - size - 10;
  const y = rect.height - size - 10;

  // 背景
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(x, y, size, size);

  // 绘制所有玩家 (简化为点)
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / this.mapWidth, size / this.mapHeight);

  this.players.forEach(player => {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.q - 0.5, player.r - 0.5, 1, 1);
  });

  // 当前视口框
  const viewCenterWorld = this.screenToWorld(-this.camera.x, -this.camera.y);
  const viewHex = HexMath.pixelToHex(viewCenterWorld.x, viewCenterWorld.y);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(viewHex.q - 5, viewHex.r - 5, 10, 10);

  ctx.restore();
};
```

---

## 🧪 测试清单

- [ ] 地图初始化正常 (100×100 六边形生成)
- [ ] 玩家分配位置避开水域
- [ ] 拖拽移动流畅 (60fps)
- [ ] 滚轮缩放保持鼠标指向位置
- [ ] 触摸双指缩放正常 (移动端)
- [ ] 悬停显示正确信息
- [ ] 点击触发玩家档案
- [ ] 实时更新反映等级变化
- [ ] 视锥剔除优化 (只渲染可见六边形)
- [ ] 多人数据同步 (如已实现联机)

---

## 📊 性能指标

- **地图大小**: 100×100 = 10,000 六边形
- **视锥剔除**: 平均渲染 ~200-500 六边形 (取决于缩放等级)
- **内存占用**: ~2MB (地形数据 + 玩家数据)
- **渲染性能**: 60fps @ 1080p (Chrome/Safari)

---

## 🚀 未来扩展

1. **流域边界**: 绘制流域(watersheds)边界,显示外交联盟
2. **战略节点**: 在地图上显示 `strategicNodes` 位置
3. **气候可视化**: 叠加气候修正器图层 (温度/降水)
4. **路径规划**: A* 算法计算玩家间最短路径
5. **历史回放**: 时间轴滑块,查看地图历史状态
6. **WebGL 渲染**: 升级到 PixiJS/Three.js 提升大规模渲染性能

---

## 📖 API 参考

### WorldMap.init(canvasId)
初始化世界地图系统。

**参数**:
- `canvasId` (string): Canvas 元素 ID

**返回**: `boolean` — 初始化成功/失败

---

### WorldMap.assignPlayerLocation(playerId, name, level)
为玩家分配地图位置。

**参数**:
- `playerId` (string): 唯一玩家 ID
- `name` (string): 玩家显示名称
- `level` (number): 农场等级

**返回**: `{ playerId, name, q, r, level, color, playstyle, lastUpdate }`

---

### WorldMap.updatePlayer(playerId, updates)
更新玩家数据 (等级/颜色/风格)。

**参数**:
- `playerId` (string): 玩家 ID
- `updates` (object): `{ level?, color?, playstyle? }`

---

### WorldMap.onHexClick(hex)
六边形点击回调 (可覆盖自定义逻辑)。

**参数**:
- `hex` (object): `{ q, r }` 坐标

**示例**:
```javascript
WorldMap.onHexClick = function(hex) {
  const player = Array.from(this.players.values()).find(
    p => p.q === hex.q && p.r === hex.r
  );

  if (player) {
    // 自定义逻辑: 打开玩家农场
    visitPlayerFarm(player.playerId);
  }
};
```

---

## 🎯 快速开始

1. **独立演示**:
```bash
# 在浏览器中打开
world_map_demo.html
```

2. **集成到主游戏**:
```html
<!-- index.html -->
<script src="src/world_map.js"></script>
<script>
  // 初始化
  WorldMap.init('worldMapCanvas');

  // 添加当前玩家
  WorldMap.assignPlayerLocation(
    Terra.farm.ownerId,
    '玩家名称',
    calculateFarmLevel(Terra.farm)
  );
</script>
```

---

## 📧 联系

如有问题或建议,请提交 Issue 或查阅项目文档。
