# Terra Chronicle — 单机联机无缝切换系统

## 总览

Terra Chronicle 支持三种游戏模式的无缝切换，所有游戏进度在不同模式间完全共享。

### 三种游戏模式

1. **离线探索** 🏡
   - 纯单机体验
   - AI 自动控制邻居互动
   - NPC 填充周围六边形格子
   - 完整外交、气候传播、资源互助功能

2. **好友私服** 👥
   - 2-8 人小型经济圈
   - 私人大陆共享
   - 真实玩家替代 AI 邻居
   - 协作与竞争并存

3. **全服大陆** 🌍
   - 文明级外交博弈
   - 全服玩家共享世界地图
   - 政治联盟与战略节点争夺
   - 赛季排行与跨服活动

## 架构设计

### 双层世界模型

```
Private Farm (客户端权威)
├─ 个人农场数据
├─ 作物种植状态
├─ 背包与资源
├─ 卡牌收藏
└─ 灵兽队伍

Public Overworld (服务器权威)
├─ 世界地图六边形网格
├─ 玩家位置同步
├─ 邻居关系网络
├─ 环境状态广播
└─ 战略节点控制
```

### 数据同步策略

**上行同步（客户端 → 服务器）**
- 玩家位置更新（移动时）
- 环境状态摘要（每日）
  - 砍伐率（deforestation）
  - 是否下雨（hasRain）
  - 虫害状态（hasPest）

**下行同步（服务器 → 客户端）**
- 邻居列表更新（位置变化时）
- 玩家加入/离开广播
- 环境变化通知
- 资源传递消息
- 援助请求事件

**防脚本隔离**
- 私人农场数据永不上传完整状态
- 服务器只存储位置和环境摘要
- 卡牌数值、作物质量等敏感数据客户端独占
- 即使服务器被攻破，也无法获取玩家完整进度

## 已实装系统

### 1. WebSocket 服务器 ✅

**位置**: `/server/server.js`

**功能**:
- 玩家认证与会话管理
- 六边形邻居自动发现
- 实时位置与状态同步
- 心跳保活（30s 间隔）
- 优雅重连与离线队列

**API 示例**:
```javascript
// 连接服务器
ws.send({ type: 'auth', data: { playerId: 'uuid' } });

// 加入世界
ws.send({ 
  type: 'join', 
  data: { name: 'Player', level: 5, q: 0, r: 0 } 
});

// 更新位置
ws.send({ 
  type: 'position_update', 
  data: { q: 1, r: -1 } 
});
```

### 2. 邻居系统 ✅

**位置**: `/src/neighbor_system.js`

**功能**:
- 六边形网格邻居检测
- 气候负面传播（砍伐 → 干旱 +10%/邻居）
- 虫害传染（20%/天/感染邻居）
- 降雨增益（雨水溢出 +5% 湿度/邻居）
- 资源互助系统（24h 冷却）
- 声望系统（5 级：陌生人 → 传奇）

**邻居影响示例**:
```javascript
// 每日更新时计算邻居效应
const effects = NeighborSystem.dailyUpdate(
  playerId, worldMap, privateFarm, currentDay
);
// effects.droughtRisk: 1.3 (3个邻居砍伐 → +30%干旱)
// effects.moistureBonus: 1.15 (3个邻居下雨 → +15%湿度)
// effects.pestSpread: true (感染虫害)
```

### 3. 联机 UI 系统 ✅

**位置**: `/src/multiplayer_ui.js`

**功能**:
- 标题界面模式选择（三张卡片）
- HUD 在线状态指示器（右上角）
- 邻居面板（右下角浮动）
- 邻居互动按钮（发送资源/请求援助）
- AI 邻居自动生成（离线模式）

**UI 组件**:
- `#modeSelector` - 模式选择卡片
- `#onlineStatus` - 在线状态 HUD
- `#neighborPanel` - 邻居列表面板
- `#neighborTrigger` - 邻居面板触发按钮

### 4. WebSocket 客户端 ✅

**位置**: `/src/websocket_client.js`

**功能**:
- 自动连接与指数退避重连
- 心跳保活机制
- 离线消息队列（最多 100 条）
- 事件驱动 API
- 状态定时同步（5s 间隔）

## 使用指南

### 启动服务器

```bash
# 开发环境
cd server
npm install
npm run dev

# 生产环境（PM2）
pm2 start server/server.js --name terra-server
pm2 save
```

### 客户端集成

在 `index.html` 中已集成：
```html
<script src="src/websocket_client.js"></script>
<script src="src/neighbor_system.js"></script>
<script src="src/multiplayer_ui.js"></script>
```

在 `main.js` 中自动初始化：
```javascript
if (typeof MultiplayerUI !== 'undefined') {
  const wsUrl = window.location.hostname === 'localhost'
    ? 'ws://localhost:8866'
    : 'wss://terra.bz9.me/ws';
  MultiplayerUI.init(wsUrl);
}
```

### 模式切换流程

1. 用户进入标题界面
2. 看到三张模式选择卡片
3. 点击选择模式：
   - **离线探索**: 初始化 AI 邻居，不连接服务器
   - **好友私服/全服大陆**: 连接 WebSocket 服务器
4. 进入游戏世界
5. HUD 显示在线状态和玩家数
6. 点击邻居按钮查看周围玩家/AI

## 待完成功能

### 短期（1-2 周）

- [ ] AI 邻居行为逻辑（自动种植、收获、升级）
- [ ] 资源发送界面（选择物品和数量）
- [ ] 援助请求确认弹窗
- [ ] 声望等级视觉反馈（颜色编码）
- [ ] 气候传播可视化（箭头/粒子效果）

### 中期（3-4 周）

- [ ] 服务器端数据库持久化（PostgreSQL）
- [ ] 云存档同步机制
- [ ] 好友列表与邀请系统
- [ ] 聊天频道（世界/好友/附近）
- [ ] 战略节点争夺战（实时PvP）

### 长期（1-2 月）

- [ ] 服务器集群与分片（多世界支持）
- [ ] 跨服赛季与排行榜
- [ ] 公会/联盟系统
- [ ] 文明级外交面板
- [ ] 历史事件记录与回放

## 技术细节

### 六边形坐标系

使用轴向坐标（Axial Coordinates）：
```javascript
// 六个邻居方向
const directions = [
  { q: 1, r: 0 },   // 东
  { q: 1, r: -1 },  // 东北
  { q: 0, r: -1 },  // 西北
  { q: -1, r: 0 },  // 西
  { q: -1, r: 1 },  // 西南
  { q: 0, r: 1 },   // 东南
];
```

### 环境状态广播

每天游戏时间结束时：
```javascript
MultiplayerUI.wsClient.send({
  type: 'environment_update',
  data: {
    deforestation: treesCut / totalTrees,
    hasRain: currentWeather === 'rain',
    hasPest: pestOutbreakActive
  }
});
```

### 邻居效应计算

```javascript
// 在每日tick中
const neighborEffects = NeighborSystem.dailyUpdate(
  playerId, worldMap, farm, currentDay
);

// 应用效应
moistureRate *= neighborEffects.moistureBonus;
droughtChance *= neighborEffects.droughtRisk;

if (neighborEffects.pestSpread) {
  triggerPestOutbreak();
}
```

## 部署配置

### Nginx 反向代理

```nginx
# WebSocket
location /ws {
  proxy_pass http://localhost:8866;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_read_timeout 86400;
}

# HTTP API
location /api/ {
  proxy_pass http://localhost:8866/api/;
}
```

### PM2 配置

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'terra-server',
    script: './server/server.js',
    instances: 1,
    env: {
      NODE_ENV: 'production',
      PORT: 8866
    }
  }]
};
```

## 性能指标

**目标延迟**:
- 位置同步: < 100ms
- 邻居更新: < 200ms
- 环境广播: < 500ms

**目标并发**:
- 单服支持: 500+ 在线玩家
- 邻居查询: < 10ms
- 心跳开销: < 1KB/30s

## 常见问题

**Q: 单机进度如何切换到联机？**
A: 直接切换，私人农场数据保留在本地，只上传位置和环境摘要。

**Q: 联机断开后能继续玩吗？**
A: 可以，自动切换到 AI 邻居模式，所有功能正常运行。

**Q: AI 邻居和真人玩家有区别吗？**
A: 除了行为模式，其他完全一致。AI 使用相同的邻居系统 API。

**Q: 数据会丢失吗？**
A: 不会。核心进度（作物、卡牌、灵兽）都在客户端 localStorage，服务器只存位置。

**Q: 作弊怎么办？**
A: 私人农场客户端权威，无法防止本地修改。但公共世界（位置、战略节点）服务器权威，无法作弊。

## 参考文档

- [WebSocket 服务器 README](server/README.md)
- [邻居系统 API](src/neighbor_system.js)
- [WebSocket 客户端 API](src/websocket_client.js)
- [六边形网格算法](https://www.redblobgames.com/grids/hexagons/)
