/* =========================================================
   Terra Chronicle — 灵兽遭遇与捕获集成模块
   将 capture_system.js 整合到主游戏循环
   ========================================================= */

// 在 main.js 中添加的代码片段

/* ================= 野外遭遇系统集成 ================= */

// 全局捕获管理器实例
let captureManager = null;

// 遭遇冷却时间 (防止频繁触发)
let encounterCooldown = 0;
const ENCOUNTER_COOLDOWN_MS = 30000; // 30秒

// 当前遭遇状态
let activeEncounter = null;

/**
 * 初始化捕获系统
 */
function initCaptureSystem() {
  if (typeof CaptureSystem === 'undefined') {
    console.warn('[Capture] capture_system.js 未加载');
    return;
  }

  captureManager = new CaptureSystem({
    maxPasture: 20,
    initialCrystals: 5,
  });

  console.log('[Capture] 灵兽捕获系统已初始化');
}

/**
 * 每帧检测野外遭遇
 * 在主游戏循环 tick() 中调用
 */
function updateEncounterSystem(delta) {
  if (!captureManager) return;

  // 冷却计时
  if (encounterCooldown > 0) {
    encounterCooldown -= delta;
    return;
  }

  // 只在玩家移动时检测遭遇
  if (!player._path || player._path.length === 0) return;

  // 获取当前地块生物群落
  const tx = Math.floor(player.x / TS);
  const ty = Math.floor(player.y / TS);
  const biome = getBiomeAtTile(tx, ty);

  // 尝试生成遭遇 (基础概率 2%/秒)
  const encounterChance = 0.02 * (delta / 1000);
  if (Math.random() > encounterChance) return;

  const encounter = captureManager.trySpawnEncounter(
    { x: tx, y: ty, biome },
    0.15 // 15% 遭遇率权重
  );

  if (encounter) {
    triggerEncounter(encounter);
    encounterCooldown = ENCOUNTER_COOLDOWN_MS;
  }
}

/**
 * 触发遭遇事件
 */
function triggerEncounter(encounter) {
  activeEncounter = encounter;

  // 停止玩家移动
  player._path = [];
  pendingAction = null;

  // 显示遭遇弹窗
  showEncounterDialog(encounter);

  // 粒子特效
  spawnWorldRipple(player.x, player.y, 0xff6b9d, '野生灵兽出没!');

  // 震屏
  if (window.FeedbackSystem) {
    FeedbackSystem.screenShake(8);
  }
}

/**
 * 显示遭遇对话框
 */
function showEncounterDialog(encounter) {
  const beast = encounter.beast;

  // 移除旧对话框
  let dialog = document.getElementById('encounterDialog');
  if (dialog) dialog.remove();

  // 创建对话框
  dialog = document.createElement('div');
  dialog.id = 'encounterDialog';
  dialog.className = 'encounter-dialog panel-on';
  dialog.innerHTML = `
    <div class="encounter-shell">
      <div class="encounter-bg"></div>
      <div class="encounter-content">
        <div class="encounter-header">
          <span class="rarity-badge rarity-${beast.rarity}">${beast.rarity.toUpperCase()}</span>
          <h2>${beast.name}</h2>
          <span class="element-badge element-${beast.element}">${beast.element}</span>
        </div>

        <div class="encounter-beast-preview">
          <img src="${beast.sprite}" alt="${beast.name}" class="beast-sprite" />
          <div class="beast-stats">
            <div class="stat"><span>HP</span> <b>${beast.maxHP}</b></div>
            <div class="stat"><span>ATK</span> <b>${beast.atk}</b></div>
            <div class="stat"><span>DEF</span> <b>${beast.def}</b></div>
          </div>
        </div>

        <div class="encounter-info">
          <p class="personality">性格: <strong>${beast.personality.name}</strong></p>
          <p class="abilities">能力: ${beast.abilities.join(' · ')}</p>
          <p class="hint">削弱至 HP < 30% 后可投掷魂晶捕获</p>
        </div>

        <div class="encounter-actions">
          <button class="btn-primary" onclick="startCaptureBattle()">
            <span class="icon">⚔️</span> 捕获战斗
          </button>
          <button class="btn-secondary" onclick="fleeEncounter()">
            <span class="icon">🏃</span> 逃跑
          </button>
        </div>
      </div>
      <button class="close-btn" onclick="fleeEncounter()">✕</button>
    </div>
  `;

  document.body.appendChild(dialog);

  // 添加样式
  injectEncounterStyles();
}

/**
 * 开始捕获战斗
 */
function startCaptureBattle() {
  if (!activeEncounter) return;

  // 隐藏遭遇对话框
  const dialog = document.getElementById('encounterDialog');
  if (dialog) dialog.style.display = 'none';

  // 获取玩家卡组
  const playerDeck = getPlayerDeck();

  // 初始化捕获战斗
  const battleData = captureManager.startCaptureBattle(activeEncounter, playerDeck);

  // 启动战斗界面 (复用现有战斗系统,添加捕获模式)
  if (window.BattleSystem) {
    window.BattleSystem.startCaptureBattle(battleData, onCaptureBattleEnd);
  } else {
    console.error('[Capture] 战斗系统未加载');
  }
}

/**
 * 捕获战斗结束回调
 */
function onCaptureBattleEnd(result) {
  const dialog = document.getElementById('encounterDialog');
  if (dialog) dialog.remove();

  if (result.outcome === 'captured') {
    // 捕获成功
    const beast = result.beast;
    toastHint(`成功捕获 ${beast.name}!`, 'success');

    // 添加到牧场
    captureManager.addToPasture(beast);

    // 奖励特效
    spawnWorldRipple(player.x, player.y, 0x4ecdc4, '✨ 捕获成功 ✨');

    // 保存到状态
    if (!STATE.capturedBeasts) STATE.capturedBeasts = [];
    STATE.capturedBeasts.push({
      id: beast.id,
      speciesId: beast.speciesId,
      name: beast.name,
      capturedAt: Date.now(),
    });

  } else if (result.outcome === 'fled') {
    toastHint('灵兽逃跑了...', 'warning');
  } else if (result.outcome === 'killed') {
    toastHint('灵兽被击杀,捕获失败', 'error');
  } else if (result.outcome === 'player_defeated') {
    toastHint('捕获失败', 'error');
  }

  activeEncounter = null;
}

/**
 * 逃离遭遇
 */
function fleeEncounter() {
  const dialog = document.getElementById('encounterDialog');
  if (dialog) dialog.remove();

  activeEncounter = null;
  toastHint('成功逃离');
}

/**
 * 获取当前地块生物群落
 */
function getBiomeAtTile(tx, ty) {
  const key = tiles[tx + ',' + ty];

  // 根据地形类型判断生物群落
  if (key === 'w') return 'river';      // 水域
  if (key === 'b') return 'plains';     // 沙地
  if (key === 's') return 'plains';     // 土壤

  // 根据周围物体判断
  const nearby = OBJECTS.filter(o => {
    const dx = Math.abs(o.x - tx);
    const dy = Math.abs(o.y - ty);
    return dx <= 3 && dy <= 3;
  });

  const hasTree = nearby.some(o => o.kind === 'tree' || o.kind === 'cherry');
  const hasRock = nearby.some(o => o.kind === 'rock');

  if (hasTree) return 'forest';
  if (hasRock) return 'mountain';

  return 'plains';
}

/**
 * 获取玩家卡组
 */
function getPlayerDeck() {
  // 从炼金系统获取已制作的卡牌
  if (!STATE.deck) STATE.deck = [];

  // 如果卡组为空,添加默认卡牌
  if (STATE.deck.length === 0) {
    STATE.deck = [
      { name: '基础攻击', atk: 6, cost: 1 },
      { name: '基础防御', def: 5, cost: 1 },
      { name: '基础攻击', atk: 6, cost: 1 },
    ];
  }

  return STATE.deck;
}

/**
 * 注入遭遇对话框样式
 */
function injectEncounterStyles() {
  if (document.getElementById('encounterStyles')) return;

  const style = document.createElement('style');
  style.id = 'encounterStyles';
  style.textContent = `
    .encounter-dialog {
      position: fixed;
      inset: 0;
      z-index: 95;
      display: grid;
      place-items: center;
      background: rgba(15, 10, 8, 0.85);
      backdrop-filter: blur(12px);
      opacity: 0;
      animation: fadeIn 0.4s forwards;
    }

    @keyframes fadeIn {
      to { opacity: 1; }
    }

    .encounter-shell {
      position: relative;
      width: min(520px, 90vw);
      background: linear-gradient(155deg, rgba(58, 42, 30, 0.95), rgba(28, 20, 15, 0.98));
      border: 2px solid rgba(236, 201, 126, 0.4);
      border-radius: 24px;
      padding: 32px;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6),
                  inset 0 1px 0 rgba(255, 246, 210, 0.12);
      animation: slideUp 0.4s cubic-bezier(0.2, 0.85, 0.2, 1);
    }

    @keyframes slideUp {
      from {
        transform: translateY(40px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .encounter-bg {
      position: absolute;
      inset: 0;
      border-radius: 24px;
      background: radial-gradient(circle at 50% 0%, rgba(244, 208, 117, 0.08), transparent 60%);
      pointer-events: none;
    }

    .encounter-content {
      position: relative;
      z-index: 1;
      font-family: 'Cormorant Garamond', serif;
      color: #f4ecd8;
    }

    .encounter-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 24px;
    }

    .encounter-header h2 {
      font-size: 32px;
      font-weight: 600;
      letter-spacing: 0.12em;
      margin: 0;
      color: #fff3d2;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    }

    .rarity-badge {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.15em;
      padding: 4px 10px;
      border-radius: 999px;
      text-transform: uppercase;
    }

    .rarity-common { background: rgba(158, 158, 158, 0.3); color: #d4d4d4; }
    .rarity-uncommon { background: rgba(30, 255, 0, 0.2); color: #7dff6f; }
    .rarity-rare { background: rgba(0, 112, 221, 0.3); color: #5ab9ff; }
    .rarity-epic { background: rgba(163, 53, 238, 0.3); color: #c084fc; }
    .rarity-legendary { background: rgba(255, 128, 0, 0.3); color: #ffa94d; }

    .element-badge {
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.1);
      color: #e0d4c4;
    }

    .encounter-beast-preview {
      display: flex;
      gap: 24px;
      align-items: center;
      margin-bottom: 24px;
      padding: 20px;
      background: rgba(255, 249, 226, 0.05);
      border-radius: 16px;
      border: 1px solid rgba(236, 201, 126, 0.2);
    }

    .beast-sprite {
      width: 120px;
      height: 120px;
      object-fit: contain;
      filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.4));
      animation: float 3s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }

    .beast-stats {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .beast-stats .stat {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
      padding: 8px 14px;
      background: rgba(139, 91, 43, 0.2);
      border-radius: 8px;
    }

    .beast-stats .stat span {
      color: #b8a482;
      letter-spacing: 0.08em;
    }

    .beast-stats .stat b {
      color: #f4d075;
      font-size: 18px;
    }

    .encounter-info {
      margin-bottom: 24px;
    }

    .encounter-info p {
      margin: 8px 0;
      font-size: 14px;
      line-height: 1.8;
      color: #d7c3a0;
    }

    .encounter-info .personality strong,
    .encounter-info .abilities {
      color: #f0e0c8;
    }

    .encounter-info .hint {
      margin-top: 12px;
      padding: 10px 14px;
      background: rgba(244, 208, 117, 0.1);
      border-left: 3px solid rgba(244, 208, 117, 0.5);
      border-radius: 6px;
      font-size: 13px;
      color: #e8d6b8;
    }

    .encounter-actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }

    .encounter-actions button {
      flex: 1;
      padding: 14px 20px;
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 0.08em;
      border-radius: 12px;
      border: none;
      cursor: pointer;
      transition: all 0.25s;
      font-family: 'Cormorant Garamond', serif;
    }

    .btn-primary {
      background: linear-gradient(135deg, rgba(244, 208, 117, 0.9), rgba(212, 175, 55, 0.9));
      color: #3a2a1e;
      box-shadow: 0 4px 12px rgba(244, 208, 117, 0.3);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(244, 208, 117, 0.5);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: #d7c3a0;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.12);
      transform: translateY(-2px);
    }

    .close-btn {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 36px;
      height: 36px;
      border: none;
      background: rgba(255, 255, 255, 0.1);
      color: #d7c3a0;
      font-size: 20px;
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.2s;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: rotate(90deg);
    }
  `;

  document.head.appendChild(style);
}

// 导出给 main.js 使用
if (typeof window !== 'undefined') {
  window.CaptureIntegration = {
    init: initCaptureSystem,
    update: updateEncounterSystem,
    triggerEncounter,
    startCaptureBattle,
    fleeEncounter,
  };
}
