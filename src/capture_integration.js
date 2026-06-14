/* =========================================================
   Terra Chronicle — Capture System Integration
   Integrates capture_system.js into main.js game loop
   ========================================================= */
'use strict';

const CaptureIntegration = {
  // Configuration
  ENCOUNTER_RATE: 0.05, // 5% chance per tile click on grass/forest

  // State
  activeEncounter: null,
  captureUIOpen: false,
  ranchUIOpen: false,

  /**
   * Initialize the capture system integration
   * Called from main.js after game setup
   */
  init(gameContext) {
    this.game = gameContext; // { player, objL, overlayL, world, app, farm }
    this.buildCaptureUI();
    this.buildRanchUI();
    this.addRanchButton();
    console.info('[Capture] Integration initialized');
  },

  /**
   * Check for random encounter when player clicks grass/forest tiles
   * Called from commandTo() in main.js
   */
  tryTriggerEncounter(wx, wy, grid) {
    if (!window.CaptureSystem) return false;

    const tx = Math.floor(wx / 64);
    const ty = Math.floor(wy / 64);
    const tileKey = grid[ty]?.[tx];

    // Only trigger on grass tiles (g, G)
    if (!tileKey || (tileKey !== 'g' && tileKey !== 'G')) return false;

    // 5% chance
    if (Math.random() > this.ENCOUNTER_RATE) return false;

    // Generate encounter
    const plot = { x: tx, y: ty, biome: 'forest' }; // Map grass to forest biome
    const encounter = window.CaptureSystem.trySpawnEncounter(plot, 1.0);

    if (!encounter) return false;

    this.activeEncounter = encounter;
    this.showCaptureUI(encounter);
    return true;
  },

  /**
   * Build the capture UI overlay
   */
  buildCaptureUI() {
    const ui = document.createElement('div');
    ui.id = 'captureUI';
    ui.style.cssText = `
      position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.85);
      display: none; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.4s;
    `;

    ui.innerHTML = `
      <div id="capturePanel" style="
        background: linear-gradient(135deg, #2a2520 0%, #1a1815 100%);
        border: 3px solid #c9a24b; border-radius: 12px; padding: 40px;
        max-width: 600px; width: 90vw; color: #f6f1e7;
        box-shadow: 0 20px 60px rgba(0,0,0,0.9);
      ">
        <h2 id="captureTitle" style="
          font-size: 28px; margin-bottom: 20px; text-align: center;
          color: #c9a24b; letter-spacing: 0.2em;
        ">野生灵兽出现！</h2>

        <div id="beastInfo" style="
          background: rgba(246,241,231,0.05); border: 1px solid rgba(201,162,75,0.3);
          border-radius: 8px; padding: 20px; margin-bottom: 24px;
        ">
          <div id="beastName" style="font-size: 22px; margin-bottom: 12px;"></div>
          <div id="beastStats" style="font-size: 14px; opacity: 0.8;"></div>
          <div id="beastHP" style="margin-top: 12px;">
            <div style="background: rgba(0,0,0,0.3); height: 12px; border-radius: 6px; overflow: hidden;">
              <div id="beastHPBar" style="background: linear-gradient(90deg, #4ade80, #22c55e);
                height: 100%; width: 100%; transition: width 0.3s;"></div>
            </div>
            <div id="beastHPText" style="font-size: 12px; margin-top: 4px; text-align: right;"></div>
          </div>
        </div>

        <div id="captureActions" style="display: flex; gap: 12px; flex-wrap: wrap;">
          <button id="weakenBtn" style="
            flex: 1; min-width: 140px; padding: 14px 24px; font-size: 15px;
            background: linear-gradient(135deg, #c9a24b, #a88a3e);
            border: none; border-radius: 6px; color: #fff; cursor: pointer;
            font-family: 'Noto Serif SC', serif; letter-spacing: 0.2em;
            transition: transform 0.2s, box-shadow 0.2s;
          " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(201,162,75,0.4)'"
             onmouseout="this.style.transform=''; this.style.boxShadow=''">
            削弱 (攻击)
          </button>

          <button id="captureBtn" style="
            flex: 1; min-width: 140px; padding: 14px 24px; font-size: 15px;
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            border: none; border-radius: 6px; color: #fff; cursor: pointer;
            font-family: 'Noto Serif SC', serif; letter-spacing: 0.2em;
            transition: transform 0.2s, box-shadow 0.2s;
          " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(59,130,246,0.4)'"
             onmouseout="this.style.transform=''; this.style.boxShadow=''">
            投掷魂晶
          </button>

          <button id="fleeBtn" style="
            flex: 1; min-width: 140px; padding: 14px 24px; font-size: 15px;
            background: linear-gradient(135deg, #6b7280, #4b5563);
            border: none; border-radius: 6px; color: #fff; cursor: pointer;
            font-family: 'Noto Serif SC', serif; letter-spacing: 0.2em;
            transition: transform 0.2s, box-shadow 0.2s;
          " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(107,114,128,0.4)'"
             onmouseout="this.style.transform=''; this.style.boxShadow=''">
            逃跑
          </button>
        </div>

        <div id="captureMessage" style="
          margin-top: 20px; padding: 12px; border-radius: 6px;
          background: rgba(201,162,75,0.1); border: 1px solid rgba(201,162,75,0.3);
          font-size: 13px; text-align: center; display: none;
        "></div>
      </div>
    `;

    document.body.appendChild(ui);

    // Event listeners
    ui.querySelector('#weakenBtn').onclick = () => this.weakenBeast();
    ui.querySelector('#captureBtn').onclick = () => this.attemptCapture();
    ui.querySelector('#fleeBtn').onclick = () => this.closeCaptureUI();
  },

  /**
   * Show capture UI with encounter data
   */
  showCaptureUI(encounter) {
    const ui = document.getElementById('captureUI');
    const beast = encounter.beast;

    // Update UI
    document.getElementById('beastName').textContent = `${beast.name} (${beast.rarity})`;
    document.getElementById('beastStats').textContent =
      `元素: ${beast.element} | 攻击: ${beast.atk} | 防御: ${beast.def} | 性格: ${beast.personality.name}`;

    this.updateBeastHP();

    // Show UI
    ui.style.display = 'flex';
    setTimeout(() => ui.style.opacity = '1', 10);
    this.captureUIOpen = true;
  },

  /**
   * Update beast HP bar
   */
  updateBeastHP() {
    if (!this.activeEncounter) return;
    const beast = this.activeEncounter.beast;
    const hpPercent = (beast.currentHP / beast.maxHP) * 100;

    document.getElementById('beastHPBar').style.width = hpPercent + '%';
    document.getElementById('beastHPText').textContent =
      `${beast.currentHP} / ${beast.maxHP} HP (${Math.round(hpPercent)}%)`;

    // Change color based on HP
    const bar = document.getElementById('beastHPBar');
    if (hpPercent <= 30) {
      bar.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
    } else if (hpPercent <= 60) {
      bar.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
    } else {
      bar.style.background = 'linear-gradient(90deg, #4ade80, #22c55e)';
    }
  },

  /**
   * Weaken the beast (reduce HP)
   */
  weakenBeast() {
    if (!this.activeEncounter) return;
    const beast = this.activeEncounter.beast;

    // Reduce HP by 15-25%
    const damage = Math.floor(beast.maxHP * (0.15 + Math.random() * 0.1));
    beast.currentHP = Math.max(1, beast.currentHP - damage);

    this.updateBeastHP();
    this.showMessage(`造成了 ${damage} 点伤害！`, '#f59e0b');

    // Check if too weak
    if (beast.currentHP === 1) {
      this.showMessage('已经非常虚弱了，快投掷魂晶！', '#3b82f6');
    }
  },

  /**
   * Attempt to capture the beast
   */
  attemptCapture() {
    if (!this.activeEncounter || !window.CaptureSystem) return;
    const beast = this.activeEncounter.beast;

    const result = window.CaptureSystem.attemptCapture(beast, 'basic');

    if (result.success) {
      this.showMessage(result.message, '#22c55e');

      // Add to ranch
      setTimeout(() => {
        const addResult = window.CaptureSystem.addBeastToRanch(this.game.farm, result.beast);
        if (addResult.ok) {
          this.showMessage('灵兽已加入牧场！', '#22c55e');
          window.Terra.save();
          setTimeout(() => this.closeCaptureUI(), 1500);
        } else {
          this.showMessage(addResult.reason, '#ef4444');
        }
      }, 1000);
    } else {
      this.showMessage(result.message, '#ef4444');
      this.updateBeastHP();
    }
  },

  /**
   * Show message in capture UI
   */
  showMessage(text, color) {
    const msg = document.getElementById('captureMessage');
    msg.textContent = text;
    msg.style.borderColor = color;
    msg.style.display = 'block';
  },

  /**
   * Close capture UI
   */
  closeCaptureUI() {
    const ui = document.getElementById('captureUI');
    ui.style.opacity = '0';
    setTimeout(() => {
      ui.style.display = 'none';
      this.activeEncounter = null;
      this.captureUIOpen = false;
    }, 400);
  },

  /**
   * Build the ranch UI
   */
  buildRanchUI() {
    const ui = document.createElement('div');
    ui.id = 'ranchUI';
    ui.style.cssText = `
      position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.85);
      display: none; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.4s; overflow-y: auto;
    `;

    ui.innerHTML = `
      <div id="ranchPanel" style="
        background: linear-gradient(135deg, #2a2520 0%, #1a1815 100%);
        border: 3px solid #c9a24b; border-radius: 12px; padding: 40px;
        max-width: 900px; width: 90vw; max-height: 85vh; overflow-y: auto;
        color: #f6f1e7; box-shadow: 0 20px 60px rgba(0,0,0,0.9);
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <h2 style="font-size: 28px; color: #c9a24b; letter-spacing: 0.2em;">灵兽牧场</h2>
          <button id="ranchCloseBtn" style="
            background: none; border: 2px solid #c9a24b; color: #c9a24b;
            width: 36px; height: 36px; border-radius: 50%; cursor: pointer;
            font-size: 20px; display: flex; align-items: center; justify-content: center;
            transition: all 0.3s;
          " onmouseover="this.style.background='#c9a24b'; this.style.color='#fff'"
             onmouseout="this.style.background='none'; this.style.color='#c9a24b'">×</button>
        </div>

        <div id="ranchStatus" style="
          background: rgba(201,162,75,0.1); border: 1px solid rgba(201,162,75,0.3);
          border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 14px;
        "></div>

        <div id="ranchGrid" style="
          display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        "></div>

        <div id="ranchEmpty" style="
          text-align: center; padding: 60px 20px; opacity: 0.6; display: none;
        ">
          <div style="font-size: 48px; margin-bottom: 16px;">🐾</div>
          <div style="font-size: 16px; letter-spacing: 0.2em;">牧场空空如也</div>
          <div style="font-size: 13px; margin-top: 8px; opacity: 0.7;">探索草地和森林寻找野生灵兽吧！</div>
        </div>
      </div>
    `;

    document.body.appendChild(ui);

    ui.querySelector('#ranchCloseBtn').onclick = () => this.closeRanchUI();
  },

  /**
   * Add ranch button to HUD dock
   */
  addRanchButton() {
    const dock = document.getElementById('dock');
    if (!dock) return;

    const sep = document.createElement('div');
    sep.className = 'sep';
    dock.insertBefore(sep, dock.querySelector('#craftBtn'));

    const btn = document.createElement('button');
    btn.id = 'ranchBtn';
    btn.textContent = '牧场';
    btn.style.cssText = `
      border: 1px solid #c9a24b; background: none; color: #2b2722; cursor: pointer;
      font-family: 'Noto Serif SC', serif; font-size: 12px; letter-spacing: 0.3em;
      padding: 9px 20px; border-radius: 999px; position: relative; overflow: hidden;
      transition: color 0.45s; z-index: 0;
    `;

    const before = document.createElement('div');
    before.style.cssText = `
      content: ''; position: absolute; inset: 0; background: #c9a24b;
      transform: scaleX(0); transform-origin: left;
      transition: transform 0.45s cubic-bezier(0.65, 0, 0.35, 1); z-index: -1;
    `;
    btn.appendChild(before);

    btn.onmouseover = () => {
      btn.style.color = '#fff';
      before.style.transform = 'scaleX(1)';
    };
    btn.onmouseout = () => {
      btn.style.color = '#2b2722';
      before.style.transform = 'scaleX(0)';
    };
    btn.onclick = () => this.openRanchUI();

    dock.insertBefore(btn, dock.querySelector('#craftBtn'));
  },

  /**
   * Open ranch UI
   */
  openRanchUI() {
    if (!window.CaptureSystem) return;

    const ui = document.getElementById('ranchUI');
    const status = window.CaptureSystem.getRanchStatus(this.game.farm);

    // Update status
    document.getElementById('ranchStatus').innerHTML = `
      <div style="display: flex; justify-content: space-around; flex-wrap: wrap; gap: 16px;">
        <div><strong>容量:</strong> ${status.occupied} / ${status.capacity}</div>
        <div><strong>工作中:</strong> ${status.workingBeasts}</div>
        <div><strong>休息中:</strong> ${status.restingBeasts}</div>
      </div>
    `;

    // Update grid
    const grid = document.getElementById('ranchGrid');
    const empty = document.getElementById('ranchEmpty');

    if (status.beasts.length === 0) {
      grid.style.display = 'none';
      empty.style.display = 'block';
    } else {
      grid.style.display = 'grid';
      empty.style.display = 'none';
      grid.innerHTML = '';

      status.beasts.forEach(beast => {
        grid.appendChild(this.createBeastCard(beast));
      });
    }

    // Show UI
    ui.style.display = 'flex';
    setTimeout(() => ui.style.opacity = '1', 10);
    this.ranchUIOpen = true;
  },

  /**
   * Create a beast card for the ranch UI
   */
  createBeastCard(beast) {
    const card = document.createElement('div');
    card.style.cssText = `
      background: rgba(246,241,231,0.05); border: 2px solid rgba(201,162,75,0.3);
      border-radius: 12px; padding: 20px; transition: all 0.3s;
    `;

    const rarityColors = {
      common: '#9ca3af',
      uncommon: '#22c55e',
      rare: '#3b82f6',
      epic: '#a855f7',
      legendary: '#f59e0b'
    };

    const color = rarityColors[beast.rarity] || '#9ca3af';

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
        <div>
          <div style="font-size: 18px; font-weight: bold; color: ${color}; margin-bottom: 4px;">
            ${beast.name}
          </div>
          <div style="font-size: 12px; opacity: 0.7;">
            ${beast.element} · ${beast.personality.name}
          </div>
        </div>
        <div style="font-size: 11px; padding: 4px 10px; background: ${color}20;
                    border: 1px solid ${color}; border-radius: 12px; color: ${color};">
          ${beast.rarity}
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
                  margin-bottom: 12px; font-size: 13px;">
        <div><span style="opacity: 0.7;">HP:</span> ${beast.maxHP}</div>
        <div><span style="opacity: 0.7;">攻击:</span> ${beast.atk}</div>
        <div><span style="opacity: 0.7;">防御:</span> ${beast.def}</div>
      </div>

      <div style="margin-bottom: 12px;">
        <div style="font-size: 12px; opacity: 0.7; margin-bottom: 4px;">体力</div>
        <div style="background: rgba(0,0,0,0.3); height: 8px; border-radius: 4px; overflow: hidden;">
          <div style="background: linear-gradient(90deg, #3b82f6, #2563eb);
                      height: 100%; width: ${beast.stamina || 100}%; transition: width 0.3s;"></div>
        </div>
      </div>

      <div style="font-size: 12px; opacity: 0.8; margin-bottom: 12px;">
        ${beast.assignment ? `🔧 工作中: ${beast.assignment}` : '💤 休息中'}
      </div>

      <div style="display: flex; gap: 8px;">
        <button class="evolveBtn" data-beast-id="${beast.id}" style="
          flex: 1; padding: 8px 16px; font-size: 12px;
          background: linear-gradient(135deg, #c9a24b, #a88a3e);
          border: none; border-radius: 6px; color: #fff; cursor: pointer;
          font-family: 'Noto Serif SC', serif; letter-spacing: 0.1em;
          transition: transform 0.2s;
        " onmouseover="this.style.transform='translateY(-2px)'"
           onmouseout="this.style.transform=''">
          进化
        </button>
        <button class="releaseBtn" data-beast-id="${beast.id}" style="
          padding: 8px 16px; font-size: 12px;
          background: rgba(239,68,68,0.2); border: 1px solid #ef4444;
          border-radius: 6px; color: #ef4444; cursor: pointer;
          font-family: 'Noto Serif SC', serif; letter-spacing: 0.1em;
          transition: all 0.2s;
        " onmouseover="this.style.background='#ef4444'; this.style.color='#fff'"
           onmouseout="this.style.background='rgba(239,68,68,0.2)'; this.style.color='#ef4444'">
          放生
        </button>
      </div>
    `;

    // Event listeners
    card.querySelector('.evolveBtn').onclick = () => this.evolveBeast(beast.id);
    card.querySelector('.releaseBtn').onclick = () => this.releaseBeast(beast.id);

    card.onmouseover = () => {
      card.style.borderColor = color;
      card.style.transform = 'translateY(-4px)';
      card.style.boxShadow = `0 8px 24px ${color}40`;
    };
    card.onmouseout = () => {
      card.style.borderColor = 'rgba(201,162,75,0.3)';
      card.style.transform = '';
      card.style.boxShadow = '';
    };

    return card;
  },

  /**
   * Evolve a beast (placeholder)
   */
  evolveBeast(beastId) {
    // TODO: Implement evolution system
    alert('进化系统开发中...');
  },

  /**
   * Release a beast
   */
  releaseBeast(beastId) {
    if (!window.CaptureSystem) return;
    if (!confirm('确定要放生这只灵兽吗？此操作不可撤销。')) return;

    const result = window.CaptureSystem.releaseBeast(this.game.farm, beastId);

    if (result.ok) {
      window.Terra.save();
      this.openRanchUI(); // Refresh
      alert(`${result.beast.name} 已被放生`);
    } else {
      alert(result.reason);
    }
  },

  /**
   * Close ranch UI
   */
  closeRanchUI() {
    const ui = document.getElementById('ranchUI');
    ui.style.opacity = '0';
    setTimeout(() => {
      ui.style.display = 'none';
      this.ranchUIOpen = false;
    }, 400);
  }
};

// Export to global
if (typeof window !== 'undefined') {
  window.CaptureIntegration = CaptureIntegration;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CaptureIntegration;
}

