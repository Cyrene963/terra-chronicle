/* =========================================================
   Terra Chronicle — WebSocket Client Foundation v1
   联机状态同步 · 自动重连 · 心跳保活 · 离线消息队列
   ---------------------------------------------------------
   功能清单:
   1. 连接管理: 自动连接/重连/指数退避
   2. 心跳机制: 30s ping/pong 检测死连接
   3. 状态同步: 5s 定时发送玩家位置/农场摘要
   4. 消息队列: 离线时缓存待发消息,上线后批量发送
   5. 事件接收: 邻居更新/季节事件触发/战略节点变化
   6. 连接状态回调: 供 UI 层显示联机状态指示器
   ---------------------------------------------------------
   使用示例:
     const ws = new TerraWSClient('ws://server:8080');
     ws.on('connected', () => console.log('上线'));
     ws.on('neighborUpdate', data => updateNeighbors(data));
     ws.sendPlayerState({ x: 100, y: 200, farmStats: {...} });
   ========================================================= */
'use strict';

class TerraWSClient {
  constructor(serverUrl, options = {}) {
    this.serverUrl = serverUrl;
    this.options = {
      heartbeatInterval: options.heartbeatInterval || 30000,      // 30s 心跳
      stateUpdateInterval: options.stateUpdateInterval || 5000,   // 5s 状态同步
      reconnectBaseDelay: options.reconnectBaseDelay || 1000,     // 基础重连延迟
      reconnectMaxDelay: options.reconnectMaxDelay || 30000,      // 最大重连延迟
      maxReconnectAttempts: options.maxReconnectAttempts || -1,   // -1 = 无限重连
      offlineQueueSize: options.offlineQueueSize || 100,          // 离线队列容量
      autoConnect: options.autoConnect !== false,                 // 默认自动连接
    };

    // 连接状态
    this.ws = null;
    this.connected = false;
    this.connecting = false;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.destroyed = false;

    // 心跳/状态同步定时器
    this.heartbeatTimer = null;
    this.stateUpdateTimer = null;
    this.lastPongTime = null;
    this.lastStateUpdate = null;

    // 离线消息队列
    this.offlineQueue = [];

    // 事件监听器
    this.eventHandlers = {};

    // 玩家状态缓存(供定时发送)
    this.cachedPlayerState = null;

    // 自动连接
    if (this.options.autoConnect) {
      this.connect();
    }
  }

  /* ================= 连接管理 ================= */

  connect() {
    if (this.destroyed) {
      console.warn('[TerraWS] 客户端已销毁,无法连接');
      return;
    }
    if (this.connected || this.connecting) {
      console.warn('[TerraWS] 已在连接中');
      return;
    }

    this.connecting = true;
    this._emit('connecting', { attempts: this.reconnectAttempts });

    try {
      this.ws = new WebSocket(this.serverUrl);
      this._setupWebSocketHandlers();
    } catch (err) {
      console.error('[TerraWS] 连接失败:', err);
      this.connecting = false;
      this._scheduleReconnect();
    }
  }

  disconnect() {
    this._clearTimers();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.connected = false;
    this.connecting = false;
    this.reconnectAttempts = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  destroy() {
    this.disconnect();
    this.destroyed = true;
    this.eventHandlers = {};
    this.offlineQueue = [];
    this.cachedPlayerState = null;
  }

  /* ================= WebSocket 事件处理 ================= */

  _setupWebSocketHandlers() {
    this.ws.onopen = () => this._onOpen();
    this.ws.onclose = (evt) => this._onClose(evt);
    this.ws.onerror = (err) => this._onError(err);
    this.ws.onmessage = (evt) => this._onMessage(evt);
  }

  _onOpen() {
    console.log('[TerraWS] 连接成功');
    this.connected = true;
    this.connecting = false;
    this.reconnectAttempts = 0;
    this.lastPongTime = Date.now();

    // 启动心跳和状态同步
    this._startHeartbeat();
    this._startStateUpdate();

    // 发送离线队列
    this._flushOfflineQueue();

    this._emit('connected', { serverUrl: this.serverUrl });
  }

  _onClose(evt) {
    console.log(`[TerraWS] 连接关闭: code=${evt.code} reason=${evt.reason}`);
    const wasConnected = this.connected;
    this.connected = false;
    this.connecting = false;
    this._clearTimers();

    this._emit('disconnected', {
      code: evt.code,
      reason: evt.reason,
      wasConnected
    });

    // 非正常关闭且未销毁 → 自动重连
    if (evt.code !== 1000 && !this.destroyed) {
      this._scheduleReconnect();
    }
  }

  _onError(err) {
    console.error('[TerraWS] WebSocket 错误:', err);
    this._emit('error', { error: err, connected: this.connected });
  }

  _onMessage(evt) {
    let msg;
    try {
      msg = JSON.parse(evt.data);
    } catch (err) {
      console.error('[TerraWS] 解析消息失败:', evt.data);
      return;
    }

    // 心跳响应
    if (msg.type === 'pong') {
      this.lastPongTime = Date.now();
      return;
    }

    // 业务消息分发
    this._handleGameMessage(msg);
  }

  /* ================= 重连逻辑(指数退避) ================= */

  _scheduleReconnect() {
    const maxAttempts = this.options.maxReconnectAttempts;
    if (maxAttempts > 0 && this.reconnectAttempts >= maxAttempts) {
      console.warn('[TerraWS] 达到最大重连次数,停止重连');
      this._emit('reconnectFailed', { attempts: this.reconnectAttempts });
      return;
    }

    // 指数退避: 1s, 2s, 4s, 8s, ... 上限 30s
    const delay = Math.min(
      this.options.reconnectBaseDelay * Math.pow(2, this.reconnectAttempts),
      this.options.reconnectMaxDelay
    );

    this.reconnectAttempts++;
    console.log(`[TerraWS] ${delay}ms 后重连 (第 ${this.reconnectAttempts} 次)`);
    this._emit('reconnecting', { attempts: this.reconnectAttempts, delay });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  /* ================= 心跳机制 ================= */

  _startHeartbeat() {
    this._stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (!this.connected) return;

      const now = Date.now();
      const elapsed = now - this.lastPongTime;

      // 超过 2 倍心跳间隔未收到 pong → 判定死连接
      if (elapsed > this.options.heartbeatInterval * 2) {
        console.warn('[TerraWS] 心跳超时,主动关闭连接');
        this.ws.close(4000, 'Heartbeat timeout');
        return;
      }

      // 发送 ping
      this._send({ type: 'ping', timestamp: now });
    }, this.options.heartbeatInterval);
  }

  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /* ================= 状态同步定时器 ================= */

  _startStateUpdate() {
    this._stopStateUpdate();
    this.stateUpdateTimer = setInterval(() => {
      if (!this.connected || !this.cachedPlayerState) return;
      this._send({
        type: 'playerStateUpdate',
        timestamp: Date.now(),
        ...this.cachedPlayerState
      });
      this.lastStateUpdate = Date.now();
    }, this.options.stateUpdateInterval);
  }

  _stopStateUpdate() {
    if (this.stateUpdateTimer) {
      clearInterval(this.stateUpdateTimer);
      this.stateUpdateTimer = null;
    }
  }

  _clearTimers() {
    this._stopHeartbeat();
    this._stopStateUpdate();
  }

  /* ================= 发送消息(带离线队列) ================= */

  send(message) {
    if (this.connected) {
      this._send(message);
    } else {
      this._queueOffline(message);
    }
  }

  _send(message) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this._queueOffline(message);
      return;
    }
    try {
      this.ws.send(JSON.stringify(message));
    } catch (err) {
      console.error('[TerraWS] 发送失败:', err);
      this._queueOffline(message);
    }
  }

  _queueOffline(message) {
    if (this.offlineQueue.length >= this.options.offlineQueueSize) {
      console.warn('[TerraWS] 离线队列已满,丢弃旧消息');
      this.offlineQueue.shift();
    }
    message._queuedAt = Date.now();
    this.offlineQueue.push(message);
    this._emit('messageQueued', { queueSize: this.offlineQueue.length });
  }

  _flushOfflineQueue() {
    if (this.offlineQueue.length === 0) return;

    console.log(`[TerraWS] 发送离线队列: ${this.offlineQueue.length} 条消息`);
    const batch = this.offlineQueue.splice(0);

    this._send({
      type: 'offlineBatch',
      messages: batch,
      count: batch.length
    });

    this._emit('offlineQueueFlushed', { count: batch.length });
  }

  /* ================= 玩家状态更新(供游戏循环调用) ================= */

  /**
   * 更新玩家状态缓存,定时器会自动发送
   * @param {Object} state - { x, y, farmStats: { fertility, crops, beasts, ... } }
   */
  updatePlayerState(state) {
    this.cachedPlayerState = state;
  }

  /**
   * 立即发送一次状态(不等定时器)
   */
  sendPlayerState(state) {
    this.updatePlayerState(state);
    if (this.connected) {
      this._send({
        type: 'playerStateUpdate',
        timestamp: Date.now(),
        ...state
      });
      this.lastStateUpdate = Date.now();
    } else {
      this._queueOffline({
        type: 'playerStateUpdate',
        timestamp: Date.now(),
        ...state
      });
    }
  }

  /* ================= 业务消息处理 ================= */

  _handleGameMessage(msg) {
    switch (msg.type) {
      case 'neighborUpdate':
        // 邻居位置/状态更新
        this._emit('neighborUpdate', msg.data);
        break;

      case 'seasonEventTrigger':
        // 季节事件触发(春拍卖/夏天梯/秋丰收/冬虚空潮汐)
        this._emit('seasonEvent', msg.data);
        break;

      case 'strategicNodeChange':
        // 战略节点状态变化(占领/争夺/刷新)
        this._emit('strategicNode', msg.data);
        break;

      case 'watershedUpdate':
        // 流域政策/气候变化
        this._emit('watershedUpdate', msg.data);
        break;

      case 'chronicleEntry':
        // 编年史新条目(玩家集体决策)
        this._emit('chronicle', msg.data);
        break;

      case 'chatMessage':
        // 聊天消息
        this._emit('chat', msg.data);
        break;

      case 'serverAnnouncement':
        // 服务器公告
        this._emit('announcement', msg.data);
        break;

      case 'error':
        // 服务器错误消息
        this._emit('serverError', msg.data);
        break;

      default:
        console.warn('[TerraWS] 未知消息类型:', msg.type);
        this._emit('unknownMessage', msg);
    }
  }

  /* ================= 事件系统 ================= */

  on(event, handler) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
    return this; // 链式调用
  }

  off(event, handler) {
    if (!this.eventHandlers[event]) return this;
    if (!handler) {
      delete this.eventHandlers[event];
    } else {
      this.eventHandlers[event] = this.eventHandlers[event]
        .filter(h => h !== handler);
    }
    return this;
  }

  _emit(event, data) {
    const handlers = this.eventHandlers[event];
    if (!handlers || handlers.length === 0) return;

    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (err) {
        console.error(`[TerraWS] 事件处理器异常 (${event}):`, err);
      }
    });
  }

  /* ================= 便捷发送方法 ================= */

  /**
   * 发送聊天消息
   */
  sendChat(message) {
    this.send({ type: 'chat', content: message, timestamp: Date.now() });
  }

  /**
   * 请求邻居列表
   */
  requestNeighbors(radius = 500) {
    this.send({ type: 'requestNeighbors', radius });
  }

  /**
   * 加入/离开流域
   */
  joinWatershed(watershedId) {
    this.send({ type: 'joinWatershed', watershedId });
  }

  leaveWatershed(watershedId) {
    this.send({ type: 'leaveWatershed', watershedId });
  }

  /**
   * 参与季节事件
   */
  participateEvent(eventId, payload) {
    this.send({ type: 'eventAction', eventId, payload });
  }

  /**
   * 发起战略节点争夺
   */
  engageStrategicNode(nodeId, action) {
    this.send({ type: 'strategicNodeAction', nodeId, action });
  }

  /* ================= 状态查询 ================= */

  isConnected() {
    return this.connected;
  }

  isConnecting() {
    return this.connecting;
  }

  getReconnectAttempts() {
    return this.reconnectAttempts;
  }

  getOfflineQueueSize() {
    return this.offlineQueue.length;
  }

  getLastPongTime() {
    return this.lastPongTime;
  }

  getLastStateUpdate() {
    return this.lastStateUpdate;
  }

  getServerUrl() {
    return this.serverUrl;
  }
}

/* ================= 导出 ================= */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TerraWSClient;
}
if (typeof window !== 'undefined') {
  window.TerraWSClient = TerraWSClient;
}
