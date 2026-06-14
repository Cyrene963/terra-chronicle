/* =========================================================
   Terra Chronicle — Continental Map System
   六边形世界地图 · 100x100 瓦片 · 玩家分布可视化
   ---------------------------------------------------------
   功能:
   1. 生成六边形网格世界地图 (100x100 瓦片)
   2. 首次登录时为玩家分配位置
   3. 显示: 玩家名 · 农场等级 · 主导颜色(游戏风格)
   4. 缩放导航 (滚轮/触摸)
   5. 点击瓦片查看玩家档案/访问农场(预留接口)
   6. 实时更新玩家进度
   ========================================================= */
'use strict';

/* ================= 1. 六边形网格数学 ================= */
/**
 * 六边形平顶布局 (flat-top hexagons)
 * q, r 为轴向坐标 (axial coordinates)
 */
const HexMath = {
  // 六边形尺寸常量
  size: 20,                          // 外接圆半径

  // 平顶六边形的宽高
  get width() { return this.size * 2; },
  get height() { return this.size * Math.sqrt(3); },

  // 轴向坐标 → 像素坐标
  hexToPixel(q, r) {
    const x = this.size * (3/2 * q);
    const y = this.size * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
    return { x, y };
  },

  // 像素坐标 → 轴向坐标 (鼠标拾取用)
  pixelToHex(x, y) {
    const q = (2/3 * x) / this.size;
    const r = (-1/3 * x + Math.sqrt(3)/3 * y) / this.size;
    return this.hexRound(q, r);
  },

  // 浮点坐标取整到最近六边形
  hexRound(q, r) {
    let s = -q - r;
    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(s);
    const qDiff = Math.abs(rq - q);
    const rDiff = Math.abs(rr - r);
    const sDiff = Math.abs(rs - s);
    if (qDiff > rDiff && qDiff > sDiff) {
      rq = -rr - rs;
    } else if (rDiff > sDiff) {
      rr = -rq - rs;
    }
    return { q: rq, r: rr };
  },

  // 六边形距离
  hexDistance(q1, r1, q2, r2) {
    return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
  },

  // 获取六边形六个顶点 (用于绘制)
  hexCorners(q, r) {
    const center = this.hexToPixel(q, r);
    const corners = [];
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 180 * (60 * i);
      corners.push({
        x: center.x + this.size * Math.cos(angle),
        y: center.y + this.size * Math.sin(angle)
      });
    }
    return corners;
  }
};

/* ================= 2. 世界地图状态 ================= */
const WorldMap = {
  // 地图尺寸 (轴向坐标范围)
  mapWidth: 100,
  mapHeight: 100,

  // 画布与渲染
  canvas: null,
  ctx: null,

  // 相机 (视口变换)
  camera: {
    x: 0,           // 世界坐标偏移
    y: 0,
    scale: 1.0,     // 缩放等级 (0.2 ~ 4.0)
    targetScale: 1.0,
    minScale: 0.2,
    maxScale: 4.0
  },

  // 玩家数据 { playerId: { q, r, name, level, color, lastUpdate } }
  players: new Map(),

  // 地形数据 (可扩展: 山脉、河流、气候带)
  terrain: new Map(),  // key: "q,r" → { biome, elevation }

  // 交互状态
  hoveredHex: null,
  selectedHex: null,
  isDragging: false,
  lastMousePos: { x: 0, y: 0 },

  // 初始化
  init(canvasId = 'worldMapCanvas') {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error('World map canvas not found:', canvasId);
      return false;
    }

    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();

    // 生成地形
    this.generateTerrain();

    // 居中视口到地图中心
    this.centerCamera();

    // 绑定事件
    this.bindEvents();

    // 开始渲染循环
    this.startRenderLoop();

    console.log('[WorldMap] Initialized: 100x100 hexagonal grid');
    return true;
  },

  // 响应式画布尺寸
  resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
  },

  // 生成程序化地形
  generateTerrain() {
    // 简单的柏林噪声模拟 (这里用哈希简化)
    for (let q = 0; q < this.mapWidth; q++) {
      for (let r = 0; r < this.mapHeight; r++) {
        const key = `${q},${r}`;
        const noise = this.pseudoNoise(q, r);

        let biome = 'plains';
        if (noise < 0.3) biome = 'water';
        else if (noise > 0.75) biome = 'mountain';
        else if (noise > 0.6) biome = 'forest';

        this.terrain.set(key, {
          biome,
          elevation: noise,
          occupied: false
        });
      }
    }
  },

  // 伪随机噪声 (确定性)
  pseudoNoise(q, r) {
    let h = (Math.imul(q, 374761393) + Math.imul(r, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    const base = (h >>> 0) / 4294967296;

    // 添加大陆形状: 中心陆地,边缘海洋
    const centerQ = this.mapWidth / 2;
    const centerR = this.mapHeight / 2;
    const distFromCenter = HexMath.hexDistance(q, r, centerQ, centerR);
    const maxDist = Math.max(this.mapWidth, this.mapHeight) / 2;
    const continentFactor = 1 - Math.pow(distFromCenter / maxDist, 1.5);

    return Math.max(0, Math.min(1, base * 0.6 + continentFactor * 0.4));
  },

  // 为新玩家分配位置 (避开水域,分散布局)
  assignPlayerLocation(playerId, playerName, level = 1) {
    // 检查是否已存在
    if (this.players.has(playerId)) {
      return this.players.get(playerId);
    }

    // 查找合适位置 (陆地 + 未被占用)
    let attempts = 0;
    let q, r, key;

    do {
      // 螺旋搜索,从中心向外
      const angle = Math.random() * Math.PI * 2;
      const radius = 20 + Math.random() * 30;
      q = Math.floor(this.mapWidth / 2 + Math.cos(angle) * radius);
      r = Math.floor(this.mapHeight / 2 + Math.sin(angle) * radius);
      key = `${q},${r}`;
      attempts++;

      if (attempts > 1000) {
        console.warn('Failed to find suitable location, using fallback');
        q = 50;
        r = 50;
        key = `${q},${r}`;
        break;
      }
    } while (
      q < 0 || q >= this.mapWidth ||
      r < 0 || r >= this.mapHeight ||
      !this.terrain.has(key) ||
      this.terrain.get(key).biome === 'water' ||
      this.terrain.get(key).occupied
    );

    // 标记占用
    const tile = this.terrain.get(key);
    if (tile) tile.occupied = true;

    // 生成玩家主导颜色 (基于 playerId 哈希)
    const color = this.generatePlayerColor(playerId);

    // 创建玩家数据
    const playerData = {
      playerId,
      name: playerName,
      q, r,
      level,
      color,
      playstyle: this.inferPlaystyle(playerId),  // 游戏风格标签
      lastUpdate: Date.now()
    };

    this.players.set(playerId, playerData);
    console.log(`[WorldMap] Assigned location (${q}, ${r}) to player: ${playerName}`);

    return playerData;
  },

  // 生成玩家主导颜色 (确定性)
  generatePlayerColor(playerId) {
    const hash = this.hashString(playerId);
    const hue = (hash % 360);
    const sat = 65 + (hash % 20);
    const light = 55 + (hash % 15);
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  },

  // 字符串哈希
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  },

  // 推断游戏风格 (基于未来数据: 农业/战斗/魔法倾向)
  inferPlaystyle(playerId) {
    // 占位实现: 随机分配
    const styles = ['农耕', '战斗', '魔法', '商业', '探索'];
    const hash = this.hashString(playerId);
    return styles[hash % styles.length];
  },

  // 更新玩家数据 (等级/颜色变化)
  updatePlayer(playerId, updates) {
    const player = this.players.get(playerId);
    if (!player) {
      console.warn('Player not found:', playerId);
      return;
    }

    Object.assign(player, updates, { lastUpdate: Date.now() });
    console.log(`[WorldMap] Updated player: ${player.name}`, updates);
  },

  // 居中相机到地图中心
  centerCamera() {
    const centerQ = this.mapWidth / 2;
    const centerR = this.mapHeight / 2;
    const centerPixel = HexMath.hexToPixel(centerQ, centerR);

    const rect = this.canvas.getBoundingClientRect();
    this.camera.x = rect.width / 2 - centerPixel.x;
    this.camera.y = rect.height / 2 - centerPixel.y;
  },

  /* ================= 3. 渲染系统 ================= */
  render() {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();

    // 清空画布
    ctx.clearRect(0, 0, rect.width, rect.height);

    // 背景 (深色太空/海洋)
    ctx.fillStyle = '#0a0d12';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // 应用相机变换
    ctx.save();
    ctx.translate(this.camera.x, this.camera.y);
    ctx.scale(this.camera.scale, this.camera.scale);

    // 计算可见范围 (视锥剔除)
    const visibleBounds = this.getVisibleHexBounds();

    // 绘制地形
    this.renderTerrain(ctx, visibleBounds);

    // 绘制玩家
    this.renderPlayers(ctx, visibleBounds);

    // 绘制悬停高亮
    if (this.hoveredHex) {
      this.renderHexHighlight(ctx, this.hoveredHex.q, this.hoveredHex.r, 'rgba(255, 255, 255, 0.3)');
    }

    // 绘制选中高亮
    if (this.selectedHex) {
      this.renderHexHighlight(ctx, this.selectedHex.q, this.selectedHex.r, 'rgba(255, 220, 100, 0.5)');
    }

    ctx.restore();

    // 绘制 UI (缩放等级、小地图等)
    this.renderUI(ctx, rect);
  },

  // 计算可见六边形范围 (优化渲染)
  getVisibleHexBounds() {
    const rect = this.canvas.getBoundingClientRect();
    const topLeft = this.screenToWorld(-this.camera.x, -this.camera.y);
    const bottomRight = this.screenToWorld(
      rect.width - this.camera.x,
      rect.height - this.camera.y
    );

    const tlHex = HexMath.pixelToHex(topLeft.x, topLeft.y);
    const brHex = HexMath.pixelToHex(bottomRight.x, bottomRight.y);

    return {
      minQ: Math.max(0, tlHex.q - 2),
      maxQ: Math.min(this.mapWidth - 1, brHex.q + 2),
      minR: Math.max(0, tlHex.r - 2),
      maxR: Math.min(this.mapHeight - 1, brHex.r + 2)
    };
  },

  // 屏幕坐标 → 世界坐标
  screenToWorld(screenX, screenY) {
    return {
      x: screenX / this.camera.scale,
      y: screenY / this.camera.scale
    };
  },

  // 渲染地形
  renderTerrain(ctx, bounds) {
    const biomeColors = {
      water: '#1a3a52',
      plains: '#3a5a3a',
      forest: '#2a4a2a',
      mountain: '#5a5a6a'
    };

    for (let q = bounds.minQ; q <= bounds.maxQ; q++) {
      for (let r = bounds.minR; r <= bounds.maxR; r++) {
        const key = `${q},${r}`;
        const tile = this.terrain.get(key);
        if (!tile) continue;

        const corners = HexMath.hexCorners(q, r);

        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < 6; i++) {
          ctx.lineTo(corners[i].x, corners[i].y);
        }
        ctx.closePath();

        // 填充颜色 (根据生物群系)
        ctx.fillStyle = biomeColors[tile.biome] || '#3a3a3a';
        ctx.fill();

        // 边框
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  },

  // 渲染玩家
  renderPlayers(ctx, bounds) {
    this.players.forEach(player => {
      // 视锥剔除
      if (player.q < bounds.minQ || player.q > bounds.maxQ ||
          player.r < bounds.minR || player.r > bounds.maxR) {
        return;
      }

      const center = HexMath.hexToPixel(player.q, player.r);
      const corners = HexMath.hexCorners(player.q, player.r);

      // 绘制六边形 (玩家主导颜色)
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < 6; i++) {
        ctx.lineTo(corners[i].x, corners[i].y);
      }
      ctx.closePath();

      ctx.fillStyle = player.color;
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 等级标记 (中心圆圈)
      if (this.camera.scale > 0.5) {
        ctx.beginPath();
        ctx.arc(center.x, center.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(player.level, center.x, center.y);
      }

      // 玩家名 (缩放 > 1.0 时显示)
      if (this.camera.scale > 1.0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.font = '11px "Noto Serif SC", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(player.name, center.x, center.y + 16);

        // 游戏风格标签
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '9px sans-serif';
        ctx.fillText(player.playstyle, center.x, center.y + 30);
      }
    });
  },

  // 绘制六边形高亮
  renderHexHighlight(ctx, q, r, color) {
    const corners = HexMath.hexCorners(q, r);

    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(corners[i].x, corners[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
  },

  // 渲染 UI 叠加层
  renderUI(ctx, rect) {
    // 缩放等级指示器
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`缩放: ${(this.camera.scale * 100).toFixed(0)}%`, rect.width - 10, 10);

    // 玩家总数
    ctx.textAlign = 'left';
    ctx.fillText(`玩家: ${this.players.size}`, 10, 10);

    // 显示悬停信息
    if (this.hoveredHex) {
      const key = `${this.hoveredHex.q},${this.hoveredHex.r}`;
      const player = Array.from(this.players.values()).find(
        p => p.q === this.hoveredHex.q && p.r === this.hoveredHex.r
      );

      let infoText = `坐标: (${this.hoveredHex.q}, ${this.hoveredHex.r})`;
      if (player) {
        infoText = `${player.name} | 等级 ${player.level} | ${player.playstyle}`;
      }

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, rect.height - 40, 300, 30);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.font = '13px "Noto Serif SC", serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(infoText, 15, rect.height - 25);
    }
  },

  /* ================= 4. 交互事件 ================= */
  bindEvents() {
    const canvas = this.canvas;

    // 鼠标移动 (悬停检测)
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (this.isDragging) {
        // 拖动地图
        const dx = mouseX - this.lastMousePos.x;
        const dy = mouseY - this.lastMousePos.y;
        this.camera.x += dx;
        this.camera.y += dy;
        this.lastMousePos = { x: mouseX, y: mouseY };
      } else {
        // 更新悬停六边形
        const worldPos = this.screenToWorld(mouseX - this.camera.x, mouseY - this.camera.y);
        const hex = HexMath.pixelToHex(worldPos.x, worldPos.y);

        if (hex.q >= 0 && hex.q < this.mapWidth && hex.r >= 0 && hex.r < this.mapHeight) {
          this.hoveredHex = hex;
        } else {
          this.hoveredHex = null;
        }
      }
    });

    // 鼠标按下 (开始拖动)
    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.isDragging = true;
      this.lastMousePos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    });

    // 鼠标释放 (结束拖动)
    canvas.addEventListener('mouseup', (e) => {
      this.isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
      this.hoveredHex = null;
    });

    // 鼠标点击 (选择六边形)
    canvas.addEventListener('click', (e) => {
      if (this.hoveredHex) {
        this.selectedHex = { ...this.hoveredHex };
        this.onHexClick(this.selectedHex);
      }
    });

    // 滚轮缩放
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // 计算缩放前鼠标指向的世界坐标
      const worldBeforeZoom = this.screenToWorld(mouseX - this.camera.x, mouseY - this.camera.y);

      // 更新缩放
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
      this.camera.scale = Math.max(
        this.camera.minScale,
        Math.min(this.camera.maxScale, this.camera.scale * zoomDelta)
      );

      // 调整相机位置,保持鼠标指向同一世界坐标
      const worldAfterZoom = this.screenToWorld(mouseX - this.camera.x, mouseY - this.camera.y);
      this.camera.x += (worldAfterZoom.x - worldBeforeZoom.x) * this.camera.scale;
      this.camera.y += (worldAfterZoom.y - worldBeforeZoom.y) * this.camera.scale;
    }, { passive: false });

    // 触摸支持 (移动端)
    let lastTouchDist = 0;

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        this.isDragging = true;
        this.lastMousePos = {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top
        };
      } else if (e.touches.length === 2) {
        // 双指缩放
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDist = Math.sqrt(dx * dx + dy * dy);
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();

      if (e.touches.length === 1 && this.isDragging) {
        const touch = e.touches[0];
        const mouseX = touch.clientX - rect.left;
        const mouseY = touch.clientY - rect.top;

        const dx = mouseX - this.lastMousePos.x;
        const dy = mouseY - this.lastMousePos.y;
        this.camera.x += dx;
        this.camera.y += dy;
        this.lastMousePos = { x: mouseX, y: mouseY };
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (lastTouchDist > 0) {
          const zoomDelta = dist / lastTouchDist;
          this.camera.scale = Math.max(
            this.camera.minScale,
            Math.min(this.camera.maxScale, this.camera.scale * zoomDelta)
          );
        }
        lastTouchDist = dist;
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      this.isDragging = false;
      if (e.touches.length < 2) {
        lastTouchDist = 0;
      }
    });

    // 窗口缩放
    window.addEventListener('resize', () => {
      this.resizeCanvas();
    });
  },

  // 六边形点击回调 (可由外部覆盖)
  onHexClick(hex) {
    const player = Array.from(this.players.values()).find(
      p => p.q === hex.q && p.r === hex.r
    );

    if (player) {
      console.log('[WorldMap] Clicked player:', player);
      // 触发事件: 查看玩家档案/访问农场
      this.showPlayerProfile(player);
    } else {
      console.log('[WorldMap] Clicked empty hex:', hex);
    }
  },

  // 显示玩家档案 (预留接口)
  showPlayerProfile(player) {
    // TODO: 打开模态框显示玩家详情
    alert(`玩家档案\n\n名称: ${player.name}\n等级: ${player.level}\n风格: ${player.playstyle}\n坐标: (${player.q}, ${player.r})`);
  },

  /* ================= 5. 渲染循环 ================= */
  startRenderLoop() {
    const loop = () => {
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
};

// Export HexMath to global for external access
if (typeof window !== 'undefined') {
  window.WorldMap = WorldMap;
  window.HexMath = HexMath;
}

// 自动初始化 (如果 DOM 已加载)
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // 等待外部调用 WorldMap.init()
    });
  }
}
