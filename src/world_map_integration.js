/* =========================================================
   Terra Chronicle — World Map Integration
   地图按钮 + 全屏叠加层 + 邻居显示 + 玩家档案
   ========================================================= */
'use strict';

const WorldMapIntegration = {
  // DOM elements
  mapOverlay: null,
  mapCanvas: null,
  mapButton: null,
  profilePanel: null,

  // State
  isOpen: false,
  currentPlayerId: null,
  neighbors: [],

  /* ================= 初始化 ================= */
  init() {
    this.createMapButton();
    this.createMapOverlay();
    this.createProfilePanel();
    this.bindEvents();

    console.log('[WorldMapIntegration] Initialized');
  },

  /* ================= 创建地图按钮 (HUD 右上角) ================= */
  createMapButton() {
    this.mapButton = document.createElement('div');
    this.mapButton.id = 'worldMapButton';
    this.mapButton.innerHTML = `
      <svg width="44" height="44" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="20" fill="rgba(246,241,231,0.92)" stroke="rgba(43,39,34,0.25)" stroke-width="1"/>
        <g transform="translate(22, 22)">
          <!-- Golden compass icon -->
          <circle cx="0" cy="0" r="12" fill="none" stroke="#c9a24b" stroke-width="1.5"/>
          <circle cx="0" cy="0" r="2" fill="#c9a24b"/>
          <line x1="0" y1="-12" x2="0" y2="-8" stroke="#c9a24b" stroke-width="2" stroke-linecap="round"/>
          <line x1="0" y1="8" x2="0" y2="12" stroke="#c9a24b" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="-12" y1="0" x2="-8" y2="0" stroke="#c9a24b" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="8" y1="0" x2="12" y2="0" stroke="#c9a24b" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M 0,-6 L 2,0 L 0,1 L -2,0 Z" fill="#d4af37"/>
        </g>
      </svg>
    `;

    this.mapButton.style.cssText = `
      position: absolute;
      top: 34px;
      right: 120px;
      width: 48px;
      height: 48px;
      cursor: pointer;
      pointer-events: auto;
      filter: drop-shadow(0 4px 12px rgba(0,0,0,0.25));
      transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), filter 0.3s;
    `;

    document.getElementById('hud').appendChild(this.mapButton);
  },

  /* ================= 创建全屏地图叠加层 ================= */
  createMapOverlay() {
    this.mapOverlay = document.createElement('div');
    this.mapOverlay.id = 'worldMapOverlay';
    this.mapOverlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 60;
      background: rgba(8, 10, 14, 0.95);
      backdrop-filter: blur(8px);
      display: none;
      opacity: 0;
      transition: opacity 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
    `;

    // Canvas container
    const canvasContainer = document.createElement('div');
    canvasContainer.style.cssText = `
      position: absolute;
      inset: 0;
    `;

    this.mapCanvas = document.createElement('canvas');
    this.mapCanvas.id = 'worldMapCanvas';
    this.mapCanvas.style.cssText = `
      width: 100%;
      height: 100%;
      display: block;
    `;

    canvasContainer.appendChild(this.mapCanvas);
    this.mapOverlay.appendChild(canvasContainer);

    // Close hint (top-right)
    const closeHint = document.createElement('div');
    closeHint.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 11px; letter-spacing: 0.4em; opacity: 0.7;">按 ESC 关闭</span>
        <div style="width: 28px; height: 28px; cursor: pointer; opacity: 0.7; transition: opacity 0.3s, transform 0.3s;" id="mapCloseBtn">
          <svg width="28" height="28" viewBox="0 0 28 28">
            <line x1="7" y1="7" x2="21" y2="21" stroke="#f6f1e7" stroke-width="2" stroke-linecap="round"/>
            <line x1="21" y1="7" x2="7" y2="21" stroke="#f6f1e7" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
      </div>
    `;
    closeHint.style.cssText = `
      position: absolute;
      top: 28px;
      right: 32px;
      color: var(--ivory);
      font-family: 'Noto Serif SC', serif;
      pointer-events: auto;
    `;

    this.mapOverlay.appendChild(closeHint);

    // Title (top-left)
    const title = document.createElement('div');
    title.innerHTML = `
      <div style="font-family: 'Cormorant Garamond', serif; font-size: 12px; letter-spacing: 0.5em; opacity: 0.6; margin-bottom: 8px;">CONTINENTAL MAP</div>
      <div style="font-size: 24px; font-weight: 500; letter-spacing: 0.2em;">大陆地图</div>
    `;
    title.style.cssText = `
      position: absolute;
      top: 28px;
      left: 32px;
      color: var(--ivory);
      font-family: 'Noto Serif SC', serif;
      pointer-events: none;
    `;

    this.mapOverlay.appendChild(title);

    document.body.appendChild(this.mapOverlay);
  },

  /* ================= 创建玩家档案面板 ================= */
  createProfilePanel() {
    this.profilePanel = document.createElement('div');
    this.profilePanel.id = 'playerProfilePanel';
    this.profilePanel.style.cssText = `
      position: absolute;
      left: 32px;
      bottom: 32px;
      width: min(360px, calc(100vw - 64px));
      max-height: calc(100vh - 140px);
      background: rgba(246, 241, 231, 0.95);
      backdrop-filter: blur(14px) saturate(1.1);
      border: 1px solid var(--hairline);
      border-radius: 12px;
      padding: 28px 32px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
      opacity: 0;
      transform: translateY(20px);
      pointer-events: none;
      transition: opacity 0.4s, transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
      overflow-y: auto;
    `;

    this.mapOverlay.appendChild(this.profilePanel);
  },

  /* ================= 绑定事件 ================= */
  bindEvents() {
    // Map button click
    this.mapButton.addEventListener('click', () => {
      this.openMap();
    });

    // Map button hover
    this.mapButton.addEventListener('mouseenter', () => {
      this.mapButton.style.transform = 'scale(1.1) rotate(15deg)';
      this.mapButton.style.filter = 'drop-shadow(0 6px 16px rgba(212, 175, 55, 0.4))';
    });

    this.mapButton.addEventListener('mouseleave', () => {
      this.mapButton.style.transform = 'scale(1) rotate(0deg)';
      this.mapButton.style.filter = 'drop-shadow(0 4px 12px rgba(0,0,0,0.25))';
    });

    // Close button
    const closeBtn = document.getElementById('mapCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeMap();
      });

      closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.opacity = '1';
        closeBtn.style.transform = 'rotate(90deg)';
      });

      closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.opacity = '0.7';
        closeBtn.style.transform = 'rotate(0deg)';
      });
    }

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeMap();
      }
    });

    // Override WorldMap's onHexClick to show profile panel
    const originalOnHexClick = WorldMap.onHexClick.bind(WorldMap);
    WorldMap.onHexClick = (hex) => {
      const player = Array.from(WorldMap.players.values()).find(
        p => p.q === hex.q && p.r === hex.r
      );

      if (player) {
        this.showPlayerProfile(player);
      }
    };
  },

  /* ================= 打开地图 ================= */
  openMap() {
    if (this.isOpen) return;

    this.isOpen = true;
    this.mapOverlay.style.display = 'block';

    // Fade in
    requestAnimationFrame(() => {
      this.mapOverlay.style.opacity = '1';
    });

    // Initialize WorldMap if not already
    if (!WorldMap.canvas) {
      const success = WorldMap.init('worldMapCanvas');
      if (!success) {
        console.error('[WorldMapIntegration] Failed to initialize WorldMap');
        this.closeMap();
        return;
      }
    }

    // Load current player and neighbors
    this.loadPlayerData();

    console.log('[WorldMapIntegration] Map opened');
  },

  /* ================= 关闭地图 ================= */
  closeMap() {
    if (!this.isOpen) return;

    this.isOpen = false;
    this.mapOverlay.style.opacity = '0';

    // Hide profile panel
    this.hideProfilePanel();

    setTimeout(() => {
      this.mapOverlay.style.display = 'none';
    }, 500);

    console.log('[WorldMapIntegration] Map closed');
  },

  /* ================= 加载玩家数据 ================= */
  loadPlayerData() {
    // Get current player ID from game state
    // For now, use a demo player ID (can be replaced with actual user ID)
    this.currentPlayerId = 'player_' + (Math.random() * 1000 | 0);

    // Check if player already exists in WorldMap
    if (!WorldMap.players.has(this.currentPlayerId)) {
      // Assign new location
      const playerData = WorldMap.assignPlayerLocation(
        this.currentPlayerId,
        '旅行者',  // Can be replaced with actual player name
        1  // Can be replaced with actual player level
      );

      console.log('[WorldMapIntegration] Assigned location:', playerData);
    }

    // Load AI neighbors
    this.loadAINeighbors();

    // Center camera on player
    this.centerOnPlayer();
  },

  /* ================= 加载 AI 邻居 ================= */
  loadAINeighbors() {
    const player = WorldMap.players.get(this.currentPlayerId);
    if (!player) return;

    // Generate 6 AI neighbors around the player
    const neighborNames = ['林间农夫', '山谷猎人', '河畔织工', '古树守护', '星辰法师', '风行商人'];
    const neighborLevels = [1, 2, 1, 3, 2, 1];

    this.neighbors = [];

    // Get the 6 hex directions
    const HEX_DIRECTIONS = [
      { q: 1, r: 0 },   // East
      { q: 1, r: -1 },  // Northeast
      { q: 0, r: -1 },  // Northwest
      { q: -1, r: 0 },  // West
      { q: -1, r: 1 },  // Southwest
      { q: 0, r: 1 },   // Southeast
    ];

    HEX_DIRECTIONS.forEach((dir, i) => {
      const nq = player.q + dir.q;
      const nr = player.r + dir.r;

      // Check if within bounds
      if (nq < 0 || nq >= WorldMap.mapWidth || nr < 0 || nr >= WorldMap.mapHeight) {
        return;
      }

      // Check if position is already occupied
      const key = `${nq},${nr}`;
      const terrain = WorldMap.terrain.get(key);
      if (!terrain || terrain.biome === 'water' || terrain.occupied) {
        return;
      }

      // Create AI neighbor
      const neighborId = `ai_neighbor_${i}_${this.currentPlayerId}`;

      if (!WorldMap.players.has(neighborId)) {
        const color = WorldMap.generatePlayerColor(neighborId);
        const playstyle = ['农耕', '战斗', '魔法', '商业', '探索', '收集'][i];

        const neighborData = {
          playerId: neighborId,
          name: neighborNames[i],
          q: nq,
          r: nr,
          level: neighborLevels[i],
          color: color,
          playstyle: playstyle,
          lastUpdate: Date.now(),
          isAI: true
        };

        WorldMap.players.set(neighborId, neighborData);

        // Mark terrain as occupied
        terrain.occupied = true;

        this.neighbors.push(neighborData);
      }
    });

    console.log('[WorldMapIntegration] Loaded', this.neighbors.length, 'AI neighbors');
  },

  /* ================= 居中到玩家位置 ================= */
  centerOnPlayer() {
    const player = WorldMap.players.get(this.currentPlayerId);
    if (!player) return;

    const HexMath = window.HexMath || WorldMap.HexMath;
    const centerPixel = HexMath.hexToPixel(player.q, player.r);

    const rect = WorldMap.canvas.getBoundingClientRect();
    WorldMap.camera.x = rect.width / 2 - centerPixel.x * WorldMap.camera.scale;
    WorldMap.camera.y = rect.height / 2 - centerPixel.y * WorldMap.camera.scale;
    WorldMap.camera.scale = 1.5; // Zoom in a bit
  },

  /* ================= 显示玩家档案 ================= */
  showPlayerProfile(player) {
    if (!player) return;

    const isCurrentPlayer = player.playerId === this.currentPlayerId;

    this.profilePanel.innerHTML = `
      <div style="font-family: 'Cormorant Garamond', serif; font-size: 10px; letter-spacing: 0.5em; color: var(--gold); text-transform: uppercase; margin-bottom: 12px;">
        ${isCurrentPlayer ? 'YOUR LOCATION' : 'NEIGHBOR'}
      </div>

      <h3 style="font-size: 24px; font-weight: 500; letter-spacing: 0.14em; margin-bottom: 8px; color: var(--ink);">
        ${player.name}
      </h3>

      <div style="font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 13px; opacity: 0.6; margin-bottom: 24px; color: var(--ink);">
        坐标 (${player.q}, ${player.r})
      </div>

      <div style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
          <span style="font-size: 12px; letter-spacing: 0.26em; color: var(--ink);">等 级</span>
          <span style="font-family: 'Cormorant Garamond', serif; font-size: 20px; color: var(--ink);">${player.level}</span>
        </div>
        <div style="height: 2px; background: rgba(43,39,34,0.12); position: relative; overflow: hidden;">
          <div style="position: absolute; inset: 0; background: var(--gold); transform-origin: left; transform: scaleX(${player.level / 10});"></div>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
          <span style="font-size: 12px; letter-spacing: 0.26em; color: var(--ink);">游戏风格</span>
          <span style="font-family: 'Cormorant Garamond', serif; font-size: 18px; color: var(--ink);">${player.playstyle}</span>
        </div>
      </div>

      <div style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
          <span style="font-size: 12px; letter-spacing: 0.26em; color: var(--ink);">主导颜色</span>
          <div style="width: 32px; height: 32px; border-radius: 6px; background: ${player.color}; border: 1px solid rgba(0,0,0,0.1);"></div>
        </div>
      </div>

      ${isCurrentPlayer ? '' : `
        <div style="border-top: 1px solid var(--hairline); padding-top: 20px; font-size: 11px; letter-spacing: 0.18em; line-height: 2; opacity: 0.6; color: var(--ink);">
          ${player.isAI ? 'AI 邻居 · 可以互动交流资源' : '真实玩家 · 可以访问农场'}
        </div>
      `}
    `;

    this.profilePanel.style.opacity = '1';
    this.profilePanel.style.transform = 'translateY(0)';
    this.profilePanel.style.pointerEvents = 'auto';
  },

  /* ================= 隐藏档案面板 ================= */
  hideProfilePanel() {
    this.profilePanel.style.opacity = '0';
    this.profilePanel.style.transform = 'translateY(20px)';
    this.profilePanel.style.pointerEvents = 'none';
  },

  /* ================= 更新玩家等级 ================= */
  updatePlayerLevel(level) {
    if (!this.currentPlayerId) return;

    WorldMap.updatePlayer(this.currentPlayerId, { level });
    console.log('[WorldMapIntegration] Updated player level to', level);
  }
};

// Export to global
if (typeof window !== 'undefined') {
  window.WorldMapIntegration = WorldMapIntegration;
}
