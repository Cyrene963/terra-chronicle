/* =========================================================
   Terra Chronicle — Multiplayer UI & Mode Selection
   单机/联机模式选择 + 邻居面板 + 在线状态 HUD
   ========================================================= */
'use strict';

const MultiplayerUI = {
  mode: 'offline', // Wave 1: public runtime defaults to honest single-player slice
  wsClient: null,
  neighbors: [],
  onlinePlayers: 0,
  publicScope: 'solo',

  /* ================= 初始化 ================= */
  init(wsServerUrl = 'ws://localhost:8866') {
    // Public Wave 1 is an honest single-player slice. Keep the primary title CTA visible;
    // multiplayer/world surfaces remain available from in-game controls when enabled.
    const staleSelector = document.getElementById('modeSelector');
    if (staleSelector) staleSelector.remove();
    const enterBtn = document.getElementById('enter');
    if (enterBtn) enterBtn.style.display = '';

    // 初始化 WebSocket 客户端（但不自动连接）
    if (typeof TerraWSClient !== 'undefined') {
      this.wsClient = new TerraWSClient(wsServerUrl, { autoConnect: false });
      this.setupWSHandlers();
    }

    // 初始化 HUD 在线状态指示器
    this.createOnlineStatusHUD();

    // 初始化邻居面板
    this.createNeighborPanel();
  },

  /* ================= 模式选择界面 ================= */
  injectModeSelection() {
    const enterBtn = document.getElementById('enter');
    if (!enterBtn) return;

    // 创建模式选择容器
    const modeSelector = document.createElement('div');
    modeSelector.id = 'modeSelector';
    modeSelector.innerHTML = `
      <div class="mode-card primary" data-mode="offline">
        <div class="mode-title">庄园启程</div>
        <div class="mode-desc">单人体验 · 种地、炼成、远征的第一轮循环</div>
      </div>
      <div class="mode-card locked" data-mode="friends">
        <div class="mode-title">共域预览</div>
        <div class="mode-desc">好友流域与邻邦系统重建中</div>
      </div>
      <div class="mode-card locked" data-mode="world">
        <div class="mode-title">大陆纪元</div>
        <div class="mode-desc">真实联机大陆暂未开放，后续以统一模拟重建</div>
      </div>
    `;

    // 替换原按钮
    const parent = enterBtn.parentNode;
    enterBtn.style.display = 'none';
    parent.appendChild(modeSelector);

    // 注入样式
    this.injectModeStyles();

    // 绑定点击事件
    modeSelector.querySelectorAll('.mode-card').forEach(card => {
      card.onclick = () => {
        if (card.classList.contains('locked')) return;
        this.selectMode(card.dataset.mode);
        modeSelector.style.opacity = '0';
        modeSelector.style.transform = 'translateY(-20px) scale(0.95)';
        setTimeout(() => {
          if (window.enterWorld) window.enterWorld();
        }, 300);
      };
    });
  },

  injectModeStyles() {
    if (document.getElementById('mp-ui-styles')) return;

    const style = document.createElement('style');
    style.id = 'mp-ui-styles';
    style.textContent = `
      #modeSelector {
        display: flex;
        gap: 20px;
        margin-top: 40px;
        opacity: 0;
        animation: riseIn 1.6s 2.1s cubic-bezier(.2,.8,.2,1) forwards;
        transition: opacity 0.4s, transform 0.4s;
      }

      .mode-card {
        background: rgba(246,241,231,0.08);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(246,241,231,0.2);
        border-radius: 12px;
        padding: 24px 18px;
        min-width: 180px;
        text-align: center;
        cursor: pointer;
        transition: all 0.35s cubic-bezier(.34,1.56,.64,1);
        position: relative;
        overflow: hidden;
      }
      .mode-card.primary { border-color: rgba(201,162,75,.48); box-shadow: 0 10px 26px rgba(201,162,75,.18); }
      .mode-card.locked { opacity: .72; filter: saturate(.65); }
      .mode-card.locked::after { content:'暂未开放'; position:absolute; top:10px; right:10px; font-size:10px; letter-spacing:.16em; color:rgba(246,241,231,.62); }

      .mode-card::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(246,241,231,0.12), rgba(201,162,75,0.08));
        opacity: 0;
        transition: opacity 0.35s;
      }

      .mode-card:hover {
        transform: translateY(-8px) scale(1.05);
        border-color: var(--gold);
        box-shadow: 0 12px 32px rgba(201,162,75,0.4);
      }

      .mode-card:hover::before {
        opacity: 1;
      }

      .mode-title {
        font-size: 16px;
        font-weight: 600;
        letter-spacing: 0.22em;
        color: var(--ivory);
        margin-bottom: 10px;
        text-shadow: 0 2px 8px rgba(0,0,0,0.8);
      }

      .mode-desc {
        font-family: 'Cormorant Garamond', serif;
        font-size: 12px;
        letter-spacing: 0.08em;
        color: rgba(246,241,231,0.76);
        line-height: 1.7;
      }

      /* 在线状态 HUD */
      #onlineStatus {
        position: absolute;
        top: 98px;
        right: 32px;
        display: flex;
        align-items: center;
        gap: 10px;
        background: var(--bg-soft);
        padding: 8px 14px;
        border-radius: 999px;
        backdrop-filter: blur(22px) saturate(1.2);
        border: 1px solid rgba(246,241,231,.08);
        filter: drop-shadow(0 4px 16px rgba(0,0,0,.75));
        font-size: 12px;
        letter-spacing: 0.2em;
        color: var(--fg-bright);
        opacity: 0;
        transition: opacity 0.4s;
      }

      #onlineStatus.visible {
        opacity: 1;
      }

      #onlineStatus .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #4ade80;
        box-shadow: 0 0 8px rgba(74, 222, 128, 0.6);
      }

      #onlineStatus.offline .status-dot {
        background: #94a3b8;
        box-shadow: none;
      }

      #onlineStatus .player-count {
        font-family: 'Cormorant Garamond', serif;
        font-size: 16px;
        font-weight: 600;
        color: var(--gold);
      }

      /* 邻居面板 */
      #neighborPanel {
        position: absolute;
        right: 32px;
        bottom: 24px;
        width: 320px;
        max-width: min(320px, calc(100vw - 64px));
        max-height: min(360px, calc(100vh - 140px));
        background: linear-gradient(180deg, rgba(246,241,231,.97), rgba(232,215,183,.95));
        backdrop-filter: blur(22px) saturate(1.2);
        border: 1px solid rgba(143,109,66,.28);
        border-radius: 18px;
        padding: 16px;
        box-shadow: 0 8px 24px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.35);
        pointer-events: auto;
        opacity: 0;
        transform: translateY(12px) scale(0.95);
        transition: opacity 0.3s, transform 0.3s;
      }

      #neighborPanel.visible {
        opacity: 1;
        transform: translateY(0) scale(1);
      }

      #neighborPanel .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 14px;
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(43,39,34,.15);
      }

      #neighborPanel .header .title {
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.26em;
        color: var(--gold);
        text-transform: uppercase;
      }
      #neighborPanel .header .title small{display:block;font-size:10px;letter-spacing:.18em;color:rgba(143,109,66,.72);margin-top:4px;font-weight:400;text-transform:none}

      #neighborPanel .header .close {
        cursor: pointer;
        font-size: 18px;
        opacity: 0.6;
        transition: opacity 0.2s;
      }

      #neighborPanel .header .close:hover {
        opacity: 1;
      }

      #neighborPanel .neighbor-list {
        max-height: 320px;
        overflow-y: auto;
      }

      #neighborPanel .neighbor-item {
        display: grid;
        grid-template-columns: 42px 1fr auto;
        align-items: start;
        gap: 12px;
        padding: 12px;
        margin-bottom: 10px;
        background: linear-gradient(180deg, rgba(255,255,255,0.42), rgba(246,241,231,0.34));
        border-radius: 12px;
        border: 1px solid rgba(43,39,34,0.1);
        transition: all 0.2s;
        cursor: pointer;
        box-shadow: inset 0 0 0 1px rgba(255,255,255,.28);
      }

      #neighborPanel .neighbor-item:hover {
        background: rgba(255,255,255,0.6);
        transform: translateX(-4px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }

      #neighborPanel .neighbor-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: linear-gradient(135deg, #c9a24b, #d4b76a);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        flex-shrink: 0;
      }

      #neighborPanel .neighbor-info {
        flex: 1;
      }
      #neighborPanel .neighbor-topline{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
      #neighborPanel .neighbor-rank{font-size:10px;letter-spacing:.16em;color:rgba(143,109,66,.76)}

      #neighborPanel .neighbor-name {
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.1em;
        color: var(--ink);
      }

      #neighborPanel .neighbor-status {
        font-size: 10px;
        letter-spacing: 0.08em;
        color: rgba(43,39,34,0.6);
        margin-top: 2px;
      }
      #neighborPanel .neighbor-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
      #neighborPanel .neighbor-chips span{font-size:9px;letter-spacing:.12em;padding:3px 8px;border-radius:999px;background:rgba(255,255,255,.42);border:1px solid rgba(143,109,66,.16);color:rgba(43,39,34,.72)}
      #neighborPanel .neighbor-consequence{margin-top:8px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.28);border:1px solid rgba(143,109,66,.12);font-size:10px;line-height:1.7;color:rgba(43,39,34,.66)}

      #neighborPanel .neighbor-actions {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      #neighborPanel .neighbor-action {
        min-width: 42px;
        height: 28px;
        border-radius: 999px;
        background: rgba(201,162,75,0.2);
        border: 1px solid rgba(201,162,75,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        letter-spacing:.12em;
        padding:0 10px;
        cursor: pointer;
        transition: all 0.2s;
      }

      #neighborPanel .neighbor-action:hover {
        background: var(--gold);
        transform: scale(1.1);
      }

      #neighborPanel .empty-state {
        text-align: center;
        padding: 40px 20px;
        color: rgba(43,39,34,0.5);
        font-size: 12px;
        letter-spacing: 0.16em;
        line-height: 1.8;
      }

      /* 邻居触发按钮 */
      #neighborTrigger {
        position: absolute;
        right: 32px;
        bottom: 380px;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: rgba(246,241,231,0.95);
        border: 1px solid rgba(43,39,34,0.28);
        box-shadow: 0 6px 20px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        cursor: pointer;
        pointer-events: auto;
        transition: all 0.3s cubic-bezier(.34,1.56,.64,1);
      }

      #neighborTrigger:hover {
        transform: translateY(-4px) scale(1.08);
        box-shadow: 0 10px 28px rgba(0,0,0,0.4);
      }

      #neighborTrigger .badge {
        position: absolute;
        top: -4px;
        right: -4px;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #ef4444;
        color: white;
        font-size: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        border: 2px solid var(--ivory);
      }
    `;

    document.head.appendChild(style);
  },

  /* ================= 模式选择 ================= */
  selectMode(mode) {
    this.mode = mode;
    console.log(`[MultiplayerUI] Selected mode: ${mode}`);

    if (mode === 'offline') {
      // 纯单机模式 - 不连接服务器，使用 AI 邻居
      this.initAINeighbors();
    } else {
      // 联机模式 - 连接服务器
      if (this.wsClient) {
        this.wsClient.connect();
      }
    }
  },

  /* ================= AI 邻居系统 ================= */
  initAINeighbors() {
    // 生成 AI 邻居（随机位置和属性）
    const aiNames = ['流云居士', '山谷农夫', '河畔织者', '林间游侠', '石田匠人', '晨露收集者'];
    const directions = [
      { q: 1, r: 0 },   // East
      { q: 1, r: -1 },  // Northeast
      { q: 0, r: -1 },  // Northwest
      { q: -1, r: 0 },  // West
      { q: -1, r: 1 },  // Southwest
      { q: 0, r: 1 },   // Southeast
    ];

    this.neighbors = directions.slice(0, Math.floor(Math.random() * 4) + 2).map((dir, i) => ({
      playerId: `ai_${i}`,
      name: aiNames[i % aiNames.length],
      level: Math.floor(Math.random() * 5) + 1,
      isAI: true,
      position: { q: dir.q, r: dir.r },
      environment: {
        deforested: Math.random() > 0.7,
        hasRain: Math.random() > 0.6,
        hasPest: Math.random() > 0.8
      },
      reputation: Math.floor(Math.random() * 100)
    }));

    this.updateNeighborPanel();
  },

  /* ================= WebSocket 事件处理 ================= */
  setupWSHandlers() {
    if (!this.wsClient) return;

    this.wsClient.on('connected', () => {
      console.log('[MultiplayerUI] Connected to server');
      this.updateOnlineStatus(true, 0);

      // 发送认证和加入请求
      this.wsClient.send({ type: 'auth', data: { playerId: this.getOrCreatePlayerId() } });
    });

    this.wsClient.on('auth_success', (data) => {
      console.log('[MultiplayerUI] Authenticated:', data.playerId);

      // 加入世界
      this.wsClient.send({
        type: 'join',
        data: {
          name: this.getPlayerName(),
          level: window.Terra?.farm?.level || 1,
          q: 0,
          r: 0
        }
      });
    });

    this.wsClient.on('join_success', (data) => {
      console.log('[MultiplayerUI] Joined world:', data);
      this.onlinePlayers = data.world.players.length;
      this.neighbors = data.world.neighbors;
      this.updateOnlineStatus(true, this.onlinePlayers);
      this.updateNeighborPanel();
    });

    this.wsClient.on('neighbors_update', (data) => {
      console.log('[MultiplayerUI] Neighbors updated:', data.neighbors);
      this.neighbors = data.neighbors;
      this.updateNeighborPanel();
    });

    this.wsClient.on('player_joined', (data) => {
      console.log('[MultiplayerUI] Player joined:', data.player.name);
      this.onlinePlayers++;
      this.updateOnlineStatus(true, this.onlinePlayers);
    });

    this.wsClient.on('player_left', (data) => {
      console.log('[MultiplayerUI] Player left:', data.playerId);
      this.onlinePlayers = Math.max(0, this.onlinePlayers - 1);
      this.updateOnlineStatus(true, this.onlinePlayers);
      this.neighbors = this.neighbors.filter(n => n.playerId !== data.playerId);
      this.updateNeighborPanel();
    });

    this.wsClient.on('disconnected', () => {
      console.log('[MultiplayerUI] Disconnected from server');
      this.updateOnlineStatus(false, 0);
    });

    this.wsClient.on('resources_received', (data) => {
      console.log('[MultiplayerUI] Received resources from:', data.senderId);
      this.showNotification(`收到来自邻居的资源！`, 'success');
    });

    this.wsClient.on('aid_request', (data) => {
      console.log('[MultiplayerUI] Aid request from:', data.requesterId);
      this.showNotification(`邻居请求援助: ${data.aidType}`, 'info');
    });
  },

  /* ================= HUD 在线状态 ================= */
  createOnlineStatusHUD() {
    if (this.publicScope === 'solo') return;
    const hud = document.getElementById('hud');
    if (!hud) return;

    const statusDiv = document.createElement('div');
    statusDiv.id = 'onlineStatus';
    statusDiv.innerHTML = `
      <div class="status-dot"></div>
      <span class="status-text">离线</span>
      <span class="player-count">0</span>
    `;

    hud.appendChild(statusDiv);
  },

  updateOnlineStatus(connected, playerCount) {
    const status = document.getElementById('onlineStatus');
    if (!status) return;

    const dot = status.querySelector('.status-dot');
    const text = status.querySelector('.status-text');
    const count = status.querySelector('.player-count');

    if (connected) {
      status.classList.remove('offline');
      status.classList.add('visible');
      text.textContent = this.mode === 'friends' ? '好友私服' : this.mode === 'world' ? '全服大陆' : '在线';
      count.textContent = playerCount;
    } else {
      status.classList.add('offline');
      if (this.mode === 'offline') {
        status.classList.remove('visible');
      } else {
        text.textContent = '离线';
        count.textContent = '0';
      }
    }
  },

  /* ================= 邻居面板 ================= */
  createNeighborPanel() {
    if (this.publicScope === 'solo') return;
    const hud = document.getElementById('hud');
    if (!hud) return;

    // 触发按钮
    const trigger = document.createElement('div');
    trigger.id = 'neighborTrigger';
    trigger.innerHTML = '👥<span class="badge" style="display:none;">0</span>';
    trigger.onclick = () => this.toggleNeighborPanel();
    hud.appendChild(trigger);

    // 面板
    const panel = document.createElement('div');
    panel.id = 'neighborPanel';
    panel.innerHTML = `
      <div class="header">
        <div class="title">邻邦往来 · Border Ledger<small>边境近况 / 物资往来 / 气候回响</small></div>
        <div class="close">×</div>
      </div>
      <div class="neighbor-list"></div>
    `;

    const closeBtn = panel.querySelector('.close');
    closeBtn.onclick = () => this.toggleNeighborPanel();

    hud.appendChild(panel);
  },

  toggleNeighborPanel() {
    const panel = document.getElementById('neighborPanel');
    if (!panel) return;

    panel.classList.toggle('visible');
  },

  updateNeighborPanel() {
    const panel = document.getElementById('neighborPanel');
    const trigger = document.getElementById('neighborTrigger');
    if (!panel) return;

    const list = panel.querySelector('.neighbor-list');
    if (!list) return;

    // 更新触发按钮徽章
    if (trigger) {
      const badge = trigger.querySelector('.badge');
      if (badge) {
        if (this.neighbors.length > 0) {
          badge.textContent = this.neighbors.length;
          badge.style.display = 'flex';
        } else {
          badge.style.display = 'none';
        }
      }
    }

    if (this.neighbors.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          ${this.mode === 'offline' ? '暂无邻邦卷宗抵达<br>等庄园进入更深季节后，再开启边境往来。' : '当前暂无在线庄园卷宗<br>待共享大陆重建后回归。'}
        </div>
      `;
      return;
    }

    list.innerHTML = this.neighbors.map(n => {
      const statusParts = [];
      if (n.environment?.hasRain) statusParts.push('🌧️ 雨');
      if (n.environment?.deforested) statusParts.push('🪓 林伐');
      if (n.environment?.hasPest) statusParts.push('🐛 虫');
      const statusText = statusParts.length > 0 ? statusParts.join(' · ') : '平静';

      return `
        <div class="neighbor-item" data-id="${n.playerId}">
          <div class="neighbor-avatar"><img src="assets/ui/avatar_${(String(n.playerId||n.name||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0)%4)+1}.png" alt="${n.name} 的手绘庄园头像" style="width:100%;height:100%;border-radius:50%;object-fit:cover" onerror="this.onerror=null;this.src='assets/ui/avatar_1.png'"></div>
          <div class="neighbor-info">
            <div class="neighbor-topline"><div class="neighbor-name">${n.name}</div><div class="neighbor-rank">Lv.${n.level}</div></div>
            <div class="neighbor-status">边境近况 · ${statusText}</div>
            <div class="neighbor-status" style="margin-top:4px; opacity:.72">往来摘要 · ${n.isAI?'流域观察中':'未来可访问庄园'}</div>
            <div class="neighbor-chips"><span>势能 ${n.level>=3?'活跃':'平缓'}</span><span>${n.isAI?'邻邦卷宗':'庄园卷宗'}</span><span>${n.isAI?'AI 边境':'共享往来'}</span></div>
            <div class="neighbor-consequence">${n.isAI?'卷宗判断 · 这片邻邦将来会把雨势、虫害或物资压力写回你的庄园。':'卷宗判断 · 未来这里会承载真实玩家庄园的互访、馈赠与边境回响。'}</div>
            <div class="neighbor-consequence" style="margin-top:6px">后果预位 · ${n.environment?.hasPest?'虫压上升':''}${n.environment?.hasRain?(n.environment?.hasPest?' / ':'')+'水势偏强':''}${!n.environment?.hasPest&&!n.environment?.hasRain?'当前平静，等待卷宗更新。':''}</div>
          </div>
          <div class="neighbor-actions">
            <div class="neighbor-action" data-action="send" title="馈赠物资">馈赠</div>
            <div class="neighbor-action" data-action="request" title="请求援助">求援</div>
          </div>
        </div>
      `;
    }).join('');

    // 绑定邻居操作
    list.querySelectorAll('.neighbor-action').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const item = btn.closest('.neighbor-item');
        const neighborId = item.dataset.id;
        const action = btn.dataset.action;
        this.handleNeighborAction(neighborId, action);
      };
    });
  },

  handleNeighborAction(neighborId, action) {
    const neighbor = this.neighbors.find(n => n.playerId === neighborId);
    if (!neighbor) return;

    if (action === 'send') {
      this.showNotification(`向 ${neighbor.name} 发送资源（功能开发中）`, 'info');
      // TODO: 打开资源发送面板
    } else if (action === 'request') {
      this.showNotification(`向 ${neighbor.name} 请求援助（功能开发中）`, 'info');
      // TODO: 打开援助请求面板
    }
  },

  /* ================= 工具函数 ================= */
  getOrCreatePlayerId() {
    let playerId = localStorage.getItem('terra_player_id');
    if (!playerId) {
      playerId = `player_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem('terra_player_id', playerId);
    }
    return playerId;
  },

  getPlayerName() {
    return localStorage.getItem('terra_player_name') || '旅行者';
  },

  showNotification(message, type = 'info') {
    // 简单的通知实现
    console.log(`[通知] ${message}`);
    if (window.toastHint) {
      window.toastHint(message);
    }
  }
};

// 暴露到全局
if (typeof window !== 'undefined') {
  window.MultiplayerUI = MultiplayerUI;
}
