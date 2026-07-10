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
  leftRailSummary: null,
  rightRailSummary: null,

  // State
  isOpen: false,
  transitionToken: 0,
  currentPlayerId: null,
  neighbors: [],
  injectedNeighborIds: [],

  /* ================= 初始化 ================= */
  init() {
    if (this.mapButton || document.getElementById('worldMapButton')) return;
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
      background: radial-gradient(circle at 50% 46%, rgba(62,46,24,.18), transparent 28%), linear-gradient(180deg, rgba(24,20,14,.94), rgba(10,9,8,.97));
      backdrop-filter: blur(8px);
      display: none;
      opacity: 0;
      transition: opacity 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
      box-shadow: inset 0 0 0 14px rgba(106,79,37,.18), inset 0 0 0 1px rgba(214,184,111,.18);
    `;

    // Atlas frame / rail shell
    const atlasRail = document.createElement('div');
    atlasRail.style.cssText = `
      position:absolute;
      left:24px; right:24px; top:24px; bottom:24px;
      border:1px solid rgba(214,184,111,.12);
      border-radius:22px;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,.04), inset 0 0 0 18px rgba(0,0,0,.05);
      pointer-events:none;
    `;
    this.mapOverlay.appendChild(atlasRail);

    const leftRail = document.createElement('div');
    leftRail.style.cssText = `
      position:absolute;
      left:38px; top:130px; bottom:38px; width:248px;
      border-radius:18px;
      background:rgba(246,241,231,.045);
      border:1px solid rgba(214,184,111,.10);
      box-shadow: inset 0 0 0 1px rgba(255,255,255,.03);
      pointer-events:none;
      color:var(--ivory);
      font-family:'Noto Serif SC',serif;
      padding:18px 18px 14px;
    `;
    leftRail.innerHTML = `
      <div style="font-size:10px; letter-spacing:.22em; opacity:.72; color:#d6b86f; text-transform:uppercase;">图册摘要</div>
      <div style="margin-top:10px; font-size:15px; letter-spacing:.16em;">庄园群像与流域势能</div>
      <div style="margin-top:10px; font-size:11px; line-height:1.8; opacity:.66;">这里将汇聚庄园卷宗、边境压力、往来线路与关隘动势。当前版本先作为图册骨架保留。</div>
      <div id="atlasSummaryBlock" style="margin-top:16px"></div>
    `;
    this.leftRailSummary = leftRail.querySelector('#atlasSummaryBlock');
    this.mapOverlay.appendChild(leftRail);

    const rightRail = document.createElement('div');
    rightRail.style.cssText = `
      position:absolute;
      right:38px; top:130px; bottom:38px; width:170px;
      border-radius:18px;
      background:rgba(246,241,231,.03);
      border:1px solid rgba(214,184,111,.08);
      pointer-events:none;
      color:var(--ivory);
      font-family:'Noto Serif SC',serif;
      padding:16px 14px 12px;
    `;
    rightRail.innerHTML = `
      <div style="font-size:10px; letter-spacing:.18em; color:#d6b86f; text-transform:uppercase; margin-bottom:8px;">图册图例</div>
      <div id="atlasLegendBlock" style="font-size:11px; line-height:1.75; opacity:.68">这里将显示关隘、商路、邻邦势能与图例提示。</div>
    `;
    this.rightRailSummary = rightRail.querySelector('#atlasLegendBlock');
    this.mapOverlay.appendChild(rightRail);

    // Canvas container
    const canvasContainer = document.createElement('div');
    canvasContainer.style.cssText = `
      position: absolute;
      left:300px; right:220px; top:90px; bottom:42px;
      border-radius:16px;
      overflow:hidden;
      box-shadow: inset 0 0 0 1px rgba(214,184,111,.10);
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
      padding: 10px 14px;
      border-radius: 14px;
      background: rgba(246,241,231,.06);
      border: 1px solid rgba(214,184,111,.14);
    `;

    this.mapOverlay.appendChild(closeHint);

    // Title (top-left)
    const title = document.createElement('div');
    title.innerHTML = `
      <div style="font-family: 'Cormorant Garamond', serif; font-size: 12px; letter-spacing: 0.5em; opacity: 0.72; margin-bottom: 8px;">ATLAS OF ESTATES</div>
      <div style="font-size: 24px; font-weight: 500; letter-spacing: 0.2em;">大陆图册</div>
      <div style="font-size: 11px; letter-spacing: 0.18em; opacity: .58; margin-top: 6px;">流域 / 邻邦 / 关隘 / 往来势能</div>
    `;
    title.style.cssText = `
      position: absolute;
      top: 28px;
      left: 32px;
      color: var(--ivory);
      font-family: 'Noto Serif SC', serif;
      pointer-events: none;
      padding: 12px 16px;
      border-radius: 16px;
      background: rgba(246,241,231,.05);
      border: 1px solid rgba(214,184,111,.12);
      width: 248px;
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
      width: min(380px, calc(100vw - 64px));
      max-height: calc(100vh - 140px);
      background: linear-gradient(180deg, rgba(246, 241, 231, 0.96), rgba(232, 215, 183, 0.95));
      backdrop-filter: blur(14px) saturate(1.1);
      border: 1px solid rgba(143,109,66,.28);
      border-radius: 16px;
      padding: 28px 32px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255,255,255,.35);
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
    if (!this.mapOverlay || !this.mapButton) this.init();
    if (!this.mapOverlay) {
      console.error('[WorldMapIntegration] Map overlay unavailable');
      window.SurfaceLifecycle?.afterClose?.('worldmap');
      return;
    }
    const token=++this.transitionToken;
    window.SurfaceLifecycle?.beforeOpen?.('worldmap');

    this.isOpen = true;
    const tutorialOverlay = document.getElementById('tutorialOverlay');
    if (tutorialOverlay) tutorialOverlay.innerHTML = '';
    this.mapOverlay.style.display = 'block';

    // Fade in
    requestAnimationFrame(() => {
      if(token===this.transitionToken&&this.isOpen)this.mapOverlay.style.opacity = '1';
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
    this.updateAtlasSummary();

    console.log('[WorldMapIntegration] Map opened');
  },

  /* ================= 关闭地图 ================= */
  closeMap(options={}) {
    if (!this.isOpen) return;

    const token=++this.transitionToken;
    this.isOpen = false;
    this.mapOverlay.style.opacity = '0';

    this.hideProfilePanel();

    window.SurfaceLifecycle?.afterClose?.('worldmap');
    if(options.immediate)this.mapOverlay.style.display='none';
    else setTimeout(() => {
      if(token===this.transitionToken&&!this.isOpen)this.mapOverlay.style.display = 'none';
    }, 500);

    console.log('[WorldMapIntegration] Map closed');
  },

  clearInjectedNeighbors() {
    (this.injectedNeighborIds || []).forEach(id => {
      const p = WorldMap.players.get(id);
      if (p) {
        const key = `${p.q},${p.r}`;
        const terrain = WorldMap.terrain.get(key);
        if (terrain) terrain.occupied = false;
      }
      WorldMap.players.delete(id);
    });
    this.injectedNeighborIds = [];
    this.neighbors = [];
  },

  /* ================= 加载玩家数据 ================= */
  loadPlayerData() {
    if (!this.currentPlayerId) {
      this.currentPlayerId = localStorage.getItem('terra_worldmap_player_id') || `player_${Date.now().toString(36)}`;
      localStorage.setItem('terra_worldmap_player_id', this.currentPlayerId);
    }

    if (!WorldMap.players.has(this.currentPlayerId)) {
      const playerData = WorldMap.assignPlayerLocation(
        this.currentPlayerId,
        '旅行者',
        1
      );
      console.log('[WorldMapIntegration] Assigned location:', playerData);
    }

    this.clearInjectedNeighbors();
    this.loadAINeighbors();
    this.centerOnPlayer();
  },

  /* ================= 加载 AI 邻居 ================= */
  loadAINeighbors() {
    const player = WorldMap.players.get(this.currentPlayerId);
    if (!player) return;

    const neighborNames = ['林间农夫', '山谷猎人', '河畔织工', '古树守护', '星辰法师', '风行商人'];
    const neighborLevels = [1, 2, 1, 3, 2, 1];

    this.neighbors = [];
    this.injectedNeighborIds = [];

    const HEX_DIRECTIONS = [
      { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
      { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
    ];

    HEX_DIRECTIONS.forEach((dir, i) => {
      const nq = player.q + dir.q;
      const nr = player.r + dir.r;
      if (nq < 0 || nq >= WorldMap.mapWidth || nr < 0 || nr >= WorldMap.mapHeight) return;

      const key = `${nq},${nr}`;
      const terrain = WorldMap.terrain.get(key);
      if (!terrain || terrain.biome === 'water' || terrain.occupied) return;

      const neighborId = `ai_neighbor_${i}_${this.currentPlayerId}`;
      const color = WorldMap.generatePlayerColor(neighborId);
      const playstyle = ['农耕', '战斗', '魔法', '商业', '探索', '收集'][i];
      const neighborData = {
        playerId: neighborId,
        name: neighborNames[i],
        q: nq,
        r: nr,
        level: neighborLevels[i],
        color,
        playstyle,
        lastUpdate: Date.now(),
        isAI: true
      };

      WorldMap.players.set(neighborId, neighborData);
      terrain.occupied = true;
      this.injectedNeighborIds.push(neighborId);
      this.neighbors.push(neighborData);
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
    WorldMap.camera.scale = 1.5;
    WorldMap.camera.x = rect.width / 2 - centerPixel.x * WorldMap.camera.scale;
    WorldMap.camera.y = rect.height / 2 - centerPixel.y * WorldMap.camera.scale;
  },

  updateAtlasSummary() {
    if (!this.leftRailSummary) return;
    const current = this.currentPlayerId ? WorldMap.players.get(this.currentPlayerId) : null;
    const neighborCount = this.neighbors?.length || 0;
    this.leftRailSummary.innerHTML = `
      <div style="font-size:10px; letter-spacing:.22em; color:rgba(214,184,111,.82); text-transform:uppercase; margin-bottom:10px;">当前庄园</div>
      <div style="font-size:16px; letter-spacing:.16em; margin-bottom:8px;">${current?.name || '旅行者庄园'}</div>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px;">
        <span style="font-size:9px; letter-spacing:.12em; padding:3px 8px; border-radius:999px; background:rgba(246,241,231,.08); border:1px solid rgba(214,184,111,.12);">流域 ${current ? `${current.q},${current.r}` : '未定'}</span>
        <span style="font-size:9px; letter-spacing:.12em; padding:3px 8px; border-radius:999px; background:rgba(246,241,231,.08); border:1px solid rgba(214,184,111,.12);">邻邦 ${neighborCount}</span>
        <span style="font-size:9px; letter-spacing:.12em; padding:3px 8px; border-radius:999px; background:rgba(246,241,231,.08); border:1px solid rgba(214,184,111,.12);">位阶 Lv.${current?.level || 1}</span>
      </div>
      <div style="display:grid; gap:10px; margin-top:14px;">
        <div style="padding:10px 12px; border-radius:12px; background:rgba(246,241,231,.05); border:1px solid rgba(214,184,111,.08);">
          <div style="font-size:9px; letter-spacing:.16em; color:#d6b86f; text-transform:uppercase; margin-bottom:6px;">边境势能</div>
          <div style="font-size:11px; line-height:1.75; opacity:.72;">当前版本先保留势能位。未来这里会显示潮汐、水脉、虫潮与往来压力。</div>
        </div>
        <div style="padding:10px 12px; border-radius:12px; background:rgba(246,241,231,.05); border:1px solid rgba(214,184,111,.08);">
          <div style="font-size:9px; letter-spacing:.16em; color:#d6b86f; text-transform:uppercase; margin-bottom:6px;">关隘与往来</div>
          <div style="font-size:11px; line-height:1.75; opacity:.72;">未来 atlas 将在此汇总关隘、驿站、商路与邻邦往来线索。</div>
        </div>
        <div style="padding:10px 12px; border-radius:12px; background:rgba(246,241,231,.05); border:1px solid rgba(214,184,111,.08);">
          <div style="font-size:9px; letter-spacing:.16em; color:#d6b86f; text-transform:uppercase; margin-bottom:6px;">图册注记</div>
          <div style="font-size:11px; line-height:1.75; opacity:.72;">这里预留给流域图例、邻邦卷宗标签和未来的边境回响记录。</div>
        </div>
      </div>
    `;
    if (this.rightRailSummary) {
      this.rightRailSummary.innerHTML = `
        <div style="font-size:10px; letter-spacing:.16em; color:#d6b86f; text-transform:uppercase; margin-bottom:8px;">图册图例</div>
        <div style="display:grid; gap:8px; margin-bottom:12px;">
          <div style="padding:8px 10px; border-radius:10px; background:rgba(246,241,231,.05); border:1px solid rgba(214,184,111,.08);">庄园卷宗 · 当前地带的可查看条目</div>
          <div style="padding:8px 10px; border-radius:10px; background:rgba(246,241,231,.05); border:1px solid rgba(214,184,111,.08);">邻邦卷宗 · 周边势能与往来提示</div>
          <div style="padding:8px 10px; border-radius:10px; background:rgba(246,241,231,.05); border:1px solid rgba(214,184,111,.08);">关隘 / 商路 · 后续回归图例位</div>
        </div>
        <div style="font-size:11px; line-height:1.75; opacity:.68;">完整 atlas 回归后，这里会显示图例、热点与边境态势说明。</div>
      `;
    }
  },

  /* ================= 显示玩家档案 ================= */
  showPlayerProfile(player) {
    if (!player) return;

    const isCurrentPlayer = player.playerId === this.currentPlayerId;

    this.profilePanel.innerHTML = `
      <div style="font-family: 'Cormorant Garamond', serif; font-size: 10px; letter-spacing: 0.5em; color: var(--gold); text-transform: uppercase; margin-bottom: 12px;">
        ${isCurrentPlayer ? '庄园卷宗' : '邻邦卷宗'}
      </div>

      <h3 style="font-size: 24px; font-weight: 500; letter-spacing: 0.14em; margin-bottom: 8px; color: var(--ink);">
        ${player.name}
      </h3>

      <div style="font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 13px; opacity: 0.6; margin-bottom: 24px; color: var(--ink);">
        庄园坐标 (${player.q}, ${player.r})
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;">
        <div style="padding:12px 14px; border-radius:14px; background:rgba(255,255,255,.34); border:1px solid rgba(143,109,66,.14);">
          <div style="font-size:10px; letter-spacing:.18em; color:rgba(143,109,66,.78); text-transform:uppercase;">位阶</div>
          <div style="font-family:'Cormorant Garamond',serif; font-size:22px; margin-top:6px; color:var(--ink);">Lv.${player.level}</div>
        </div>
        <div style="padding:12px 14px; border-radius:14px; background:rgba(255,255,255,.34); border:1px solid rgba(143,109,66,.14);">
          <div style="font-size:10px; letter-spacing:.18em; color:rgba(143,109,66,.78); text-transform:uppercase;">庄园气质</div>
          <div style="font-family:'Cormorant Garamond',serif; font-size:18px; margin-top:8px; color:var(--ink);">${player.playstyle}</div>
        </div>
      </div>

      <div style="margin-bottom: 24px; padding:12px 14px; border-radius:14px; background:rgba(255,255,255,.28); border:1px solid rgba(143,109,66,.14);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 10px; letter-spacing: 0.18em; color: rgba(143,109,66,.78); text-transform:uppercase;">庄园徽色</span>
          <div style="width: 32px; height: 32px; border-radius: 6px; background: ${player.color}; border: 1px solid rgba(0,0,0,0.1);"></div>
        </div>
        <div style="height: 2px; background: rgba(43,39,34,0.12); position: relative; overflow: hidden; border-radius:2px;">
          <div style="position: absolute; inset: 0; background: var(--gold); transform-origin: left; transform: scaleX(${player.level / 10});"></div>
        </div>
      </div>

      <div style="border-top: 1px solid rgba(143,109,66,.18); padding-top: 16px; margin-top: 8px;">
        <div style="font-size: 10px; letter-spacing: 0.22em; color: rgba(143,109,66,.8); text-transform: uppercase; margin-bottom: 10px;">卷宗摘要</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px;">
          <span style="font-size:9px; letter-spacing:.12em; padding:3px 8px; border-radius:999px; background:rgba(255,255,255,.42); border:1px solid rgba(143,109,66,.16); color:rgba(43,39,34,.72);">流域 ${player.q},${player.r}</span>
          <span style="font-size:9px; letter-spacing:.12em; padding:3px 8px; border-radius:999px; background:rgba(255,255,255,.42); border:1px solid rgba(143,109,66,.16); color:rgba(43,39,34,.72);">气质 ${player.playstyle}</span>
          <span style="font-size:9px; letter-spacing:.12em; padding:3px 8px; border-radius:999px; background:rgba(255,255,255,.42); border:1px solid rgba(143,109,66,.16); color:rgba(43,39,34,.72);">位阶 Lv.${player.level}</span>
        </div>
        ${isCurrentPlayer ? '<div style="font-size:11px; line-height:1.8; color:rgba(43,39,34,.68);">你的庄园卷宗将用于未来的流域势能、边境往来与大陆图册记录。</div>' : `<div style="font-size:11px; line-height:1.8; color:rgba(43,39,34,.68);">${player.isAI ? '邻邦来信 · 边境影响、物资往来、气候回响待重建' : '真实庄园卷宗 · 未来将接入访问、物资与边境往来'}</div>`}
      </div>
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
  window.SurfaceLifecycle?.register?.('worldmap', { close: options => WorldMapIntegration.closeMap(options) });
}
