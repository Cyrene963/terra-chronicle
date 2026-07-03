# Terra Chronicle v10.0 — Multiplayer Update

## 新增功能

### 🌐 联机系统架构

**三种游戏模式**
- 离线探索：纯单机 + AI 邻居填充
- 好友私服：2-8 人共享经济圈  
- 全服大陆：文明级外交博弈

**核心特性**
- 单机/联机无缝切换
- 所有进度完全共享
- 双层世界模型（私人农场 + 公共世界）
- 防脚本隔离设计

### 🔧 技术实现

**服务器端** (`/server`)
- ✅ Node.js WebSocket 服务器
- ✅ 六边形邻居自动发现
- ✅ 实时位置与状态同步
- ✅ 心跳保活（30s 间隔）
- ✅ PM2 生产部署支持

**客户端** (`/src`)
- ✅ WebSocket 客户端（自动重连 + 离线队列）
- ✅ 邻居系统（气候传播 + 虫害扩散 + 资源互助）
- ✅ 联机 UI（模式选择 + 在线状态 + 邻居面板）

### 📦 新增文件

**服务器**
- `server/server.js` - WebSocket 服务器主程序
- `server/package.json` - 服务器依赖配置
- `server/README.md` - 服务器部署文档
- `server/.env.example` - 环境变量模板

**客户端**
- `src/websocket_client.js` - WebSocket 客户端（已存在，已集成）
- `src/neighbor_system.js` - 邻居系统（已存在，已集成）
- `src/multiplayer_ui.js` - 联机 UI 系统（新增）

**文档**
- `docs/MULTIPLAYER.md` - 联机系统完整文档

### 🎨 UI 改进

**标题界面**
- 新增模式选择卡片（3 种模式）
- 精美悬停动画与交互反馈
- 保留原有视觉风格

**游戏 HUD**
- 在线状态指示器（右上角）
- 邻居面板触发按钮（右下角）
- 邻居列表浮动面板
- 邻居互动按钮（发送资源/请求援助）

### 🔄 邻居系统

**环境影响**
- 砍伐干旱传播（+10%/邻居）
- 虫害传染（20%/天/感染邻居）
- 降雨增益（+5% 湿度/邻居）

**社交系统**
- 资源互助（24h 冷却）
- 声望系统（5 级进阶）
- 援助请求机制

## 部署说明

### 服务器启动

```bash
# 开发环境
cd server
npm install
npm run dev

# 生产环境（PM2）
pm2 start server/server.js --name terra-server
pm2 save
```

### Nginx 配置

```nginx
# WebSocket
location /ws {
  proxy_pass http://localhost:8866;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_read_timeout 86400;
}
```

### 客户端配置

服务器地址自动选择：
- 本地开发：`ws://localhost:8866`
- 生产环境：`wss://terra.bz9.me/ws`

## 技术细节

### 数据同步策略

**上行同步**（客户端 → 服务器）
- 玩家位置（移动时）
- 环境状态摘要（每日）

**下行同步**（服务器 → 客户端）
- 邻居列表更新
- 玩家加入/离开广播
- 环境变化通知

### 防作弊设计

- 私人农场数据永不上传
- 服务器只存储位置和环境摘要
- 敏感数据（卡牌数值、作物质量）客户端独占

## 开发路线图

### v10.1（短期）
- [ ] AI 邻居行为逻辑
- [ ] 资源发送界面
- [ ] 声望等级视觉反馈
- [ ] 气候传播可视化

### v10.2（中期）
- [ ] 数据库持久化
- [ ] 云存档同步
- [ ] 好友列表系统
- [ ] 聊天频道

### v11.0（长期）
- [ ] 服务器集群
- [ ] 跨服赛季
- [ ] 公会系统
- [ ] 文明外交面板

## 文档更新

- 新增 `docs/MULTIPLAYER.md` - 联机系统完整指南
- 新增 `server/README.md` - 服务器部署文档
- 更新 `README.md` - 项目总览与快速开始

## 兼容性

- ✅ 完全向后兼容
- ✅ 现有存档无需迁移
- ✅ 可选择不使用联机功能
- ✅ 离线模式功能完整

## 致谢

本次更新实现了项目愿景中的核心特性：**单机联机无缝切换**。感谢所有测试和反馈的用户！

---

**版本**: v10.0  
**发布日期**: 2026-06-17  
**Git 标签**: `v10.0-multiplayer`
