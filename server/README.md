# Terra Chronicle WebSocket Server

权威服务器，支持单机/联机无缝切换。

## 功能特性

1. **玩家会话管理** - 认证、心跳、超时检测
2. **世界地图同步** - 六边形网格位置追踪
3. **邻居系统** - 自动发现相邻玩家
4. **实时通信** - 位置更新、环境状态广播
5. **资源互助** - 玩家间资源传递
6. **援助请求** - 邻居间协作机制

## 快速开始

### 安装依赖

```bash
cd server
npm install
```

### 启动服务器

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

### PM2 部署（生产环境）

```bash
# 安装 PM2
npm install -g pm2

# 启动服务器
pm2 start server.js --name terra-server

# 查看状态
pm2 status

# 查看日志
pm2 logs terra-server

# 重启
pm2 restart terra-server

# 开机自启动
pm2 startup
pm2 save
```

## API 文档

### WebSocket 协议

**连接地址**: `ws://localhost:8866`

#### 客户端 → 服务器

##### 1. 认证
```json
{
  "type": "auth",
  "data": {
    "playerId": "optional-existing-id",
    "token": "optional-auth-token"
  }
}
```

##### 2. 加入世界
```json
{
  "type": "join",
  "data": {
    "name": "Player Name",
    "level": 5,
    "q": 0,
    "r": 0
  }
}
```

##### 3. 位置更新
```json
{
  "type": "position_update",
  "data": {
    "q": 1,
    "r": -1
  }
}
```

##### 4. 环境状态更新
```json
{
  "type": "environment_update",
  "data": {
    "deforestation": 0.3,
    "hasRain": true,
    "hasPest": false
  }
}
```

##### 5. 获取邻居
```json
{
  "type": "get_neighbors"
}
```

##### 6. 发送资源
```json
{
  "type": "send_resources",
  "data": {
    "receiverId": "neighbor-player-id",
    "resources": {
      "crops": { "starwheat": 10 },
      "materials": { "wood": 5 }
    }
  }
}
```

##### 7. 请求援助
```json
{
  "type": "request_aid",
  "data": {
    "neighborId": "neighbor-player-id",
    "aidType": "irrigation"
  }
}
```

##### 8. 心跳
```json
{
  "type": "ping"
}
```

#### 服务器 → 客户端

##### 1. 连接成功
```json
{
  "type": "connected",
  "sessionId": "uuid",
  "serverTime": 1234567890
}
```

##### 2. 认证成功
```json
{
  "type": "auth_success",
  "playerId": "uuid",
  "sessionId": "uuid"
}
```

##### 3. 加入成功
```json
{
  "type": "join_success",
  "player": {
    "playerId": "uuid",
    "name": "Player Name",
    "level": 5,
    "position": { "q": 0, "r": 0 }
  },
  "world": {
    "players": [...],
    "neighbors": [...]
  }
}
```

##### 4. 邻居更新
```json
{
  "type": "neighbors_update",
  "neighbors": [
    {
      "playerId": "uuid",
      "name": "Neighbor",
      "level": 3,
      "position": { "q": 1, "r": 0 },
      "environment": { ... }
    }
  ]
}
```

##### 5. 玩家加入广播
```json
{
  "type": "player_joined",
  "player": { ... }
}
```

##### 6. 玩家移动广播
```json
{
  "type": "player_moved",
  "playerId": "uuid",
  "position": { "q": 1, "r": -1 }
}
```

##### 7. 玩家离开广播
```json
{
  "type": "player_left",
  "playerId": "uuid"
}
```

##### 8. 收到资源
```json
{
  "type": "resources_received",
  "senderId": "uuid",
  "resources": { ... },
  "timestamp": 1234567890
}
```

##### 9. 援助请求
```json
{
  "type": "aid_request",
  "requesterId": "uuid",
  "aidType": "irrigation",
  "timestamp": 1234567890
}
```

### HTTP API

#### GET /health
服务器健康检查
```json
{
  "status": "ok",
  "players": 42,
  "online": 38,
  "uptime": 3600.5
}
```

#### GET /api/world
获取当前世界状态
```json
{
  "players": [
    {
      "playerId": "uuid",
      "name": "Player",
      "level": 5,
      "position": { "q": 0, "r": 0 }
    }
  ],
  "timestamp": 1234567890
}
```

## 架构设计

### 数据模型

**WorldState** - 全局世界状态
- `players: Map<playerId, PlayerState>` - 所有玩家数据
- `hexMap: Map<"q,r", playerId>` - 六边形网格索引
- `sessions: Map<sessionId, playerId>` - 会话映射

**PlayerState** - 单个玩家状态
```javascript
{
  playerId: "uuid",
  sessionId: "uuid",
  name: "Player Name",
  level: 5,
  position: { q: 0, r: 0 },
  environment: {
    deforestation: 0.3,
    hasRain: true,
    hasPest: false,
    lastUpdate: 1234567890
  },
  lastSeen: 1234567890,
  online: true
}
```

### 六边形邻居算法

使用轴向坐标系 (Axial Coordinates)，六个方向偏移：
```javascript
[
  { q: 1, r: 0 },   // East
  { q: 1, r: -1 },  // Northeast
  { q: 0, r: -1 },  // Northwest
  { q: -1, r: 0 },  // West
  { q: -1, r: 1 },  // Southwest
  { q: 0, r: 1 },   // Southeast
]
```

## 部署配置

### Nginx 反向代理

```nginx
# HTTP API
location /api/ {
  proxy_pass http://localhost:8866/api/;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
}

# WebSocket
location /ws {
  proxy_pass http://localhost:8866;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_read_timeout 86400;
}
```

### PM2 Ecosystem 文件

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'terra-server',
    script: './server.js',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    env: {
      NODE_ENV: 'production',
      PORT: 8866
    }
  }]
};
```

## 监控与日志

```bash
# PM2 监控
pm2 monit

# 实时日志
pm2 logs terra-server --lines 100

# 错误日志
pm2 logs terra-server --err

# 日志文件位置
~/.pm2/logs/terra-server-out.log
~/.pm2/logs/terra-server-error.log
```

## 故障排查

### 连接失败
1. 检查服务器是否运行: `pm2 status`
2. 检查端口是否被占用: `netstat -tlnp | grep 8866`
3. 检查防火墙规则: `ufw status`

### 延迟过高
1. 检查心跳间隔配置
2. 查看服务器负载: `pm2 monit`
3. 检查网络质量: `ping terra.bz9.me`

### 玩家状态不同步
1. 检查客户端 WebSocket 连接状态
2. 查看服务器日志: `pm2 logs terra-server`
3. 验证消息格式是否正确

## 开发路线图

- [ ] 数据库持久化（PostgreSQL/MongoDB）
- [ ] JWT 认证系统
- [ ] 云存档同步
- [ ] 服务器集群支持（多世界/分片）
- [ ] 反作弊系统
- [ ] 管理员工具
- [ ] 统计与分析面板
