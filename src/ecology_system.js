/* =========================================================
   Terra Chronicle — Ecology & Food Chain System
   ---------------------------------------------------------
   Features:
   1. Pest creatures spawn if no predator beasts nearby
   2. Predator beasts (cat-type) reduce pest pressure in 5-tile radius
   3. Over-hunting predators causes pest explosion
   4. Pests eat 10% of crop yield per day if untreated
   5. Balance tracker shows ecosystem health (green/yellow/red)
   6. Player gets warnings when balance tips
   ========================================================= */
'use strict';

/* ================= ECOLOGY CONSTANTS ================= */
const ECOLOGY_CONFIG = {
  PEST_SPAWN_BASE_CHANCE: 0.03,        // 3% per plot per day without predators
  PREDATOR_RANGE: 5,                   // Tiles of pest suppression radius
  PEST_CROP_DAMAGE: 0.10,              // 10% yield loss per day
  PEST_GROWTH_RATE: 0.15,              // Severity increase per day
  PREDATOR_CONSUMPTION: 0.8,           // Pest severity reduction per predator per day
  OVERHUNTING_THRESHOLD: 0.3,          // Below this predator ratio = pest explosion
  PEST_EXPLOSION_MULTIPLIER: 3.0,      // Spawn rate increase when overhunted
  BALANCE_UPDATE_INTERVAL: 2.0,        // Seconds between balance calculations
  WARNING_COOLDOWN: 10.0,              // Seconds between warnings
};

const PEST_TYPES = {
  locust: {
    id: 'locust',
    name: '蝗虫',
    nameEn: 'Locust',
    damageType: 'foliage',              // Eats leaves/stems
    sprite: 'pest_locust',
    color: 0x8b7355,
    visual: '🦗',
  },
  aphid: {
    id: 'aphid',
    name: '蚜虫',
    nameEn: 'Aphid',
    damageType: 'sap',                  // Sucks plant sap
    sprite: 'pest_aphid',
    color: 0x90a955,
    visual: '🐛',
  },
  weevil: {
    id: 'weevil',
    name: '象鼻虫',
    nameEn: 'Weevil',
    damageType: 'grain',                // Attacks stored grains
    sprite: 'pest_weevil',
    color: 0x654321,
    visual: '🪲',
  },
  moth: {
    id: 'moth',
    name: '粉蝶',
    nameEn: 'Moth',
    damageType: 'flower',               // Larvae eat flowers/fruit
    sprite: 'pest_moth',
    color: 0xd4a574,
    visual: '🦋',
  },
};

const PREDATOR_TYPES = {
  field_cat: {
    id: 'field_cat',
    name: '田猫',
    nameEn: 'Field Cat',
    element: 'earth',
    huntingPower: 1.0,                  // Base effectiveness
    preyPreference: ['locust', 'weevil'],
    sprite: 'beast_field_cat',
    visual: '🐱',
  },
  shadow_lynx: {
    id: 'shadow_lynx',
    name: '影山猫',
    nameEn: 'Shadow Lynx',
    element: 'dark',
    huntingPower: 1.4,
    preyPreference: ['moth', 'aphid'],
    sprite: 'beast_shadow_lynx',
    visual: '🐈',
  },
  jade_ferret: {
    id: 'jade_ferret',
    name: '翠鼬',
    nameEn: 'Jade Ferret',
    element: 'wood',
    huntingPower: 0.9,
    preyPreference: ['aphid', 'weevil'],
    sprite: 'beast_jade_ferret',
    visual: '🦦',
  },
};

/* ================= ECOLOGY SYSTEM MANAGER ================= */
class EcologySystem {
  constructor() {
    this.pests = new Map();              // tileKey -> { type, severity, growthRate, lastDamageTime }
    this.predators = new Map();          // beastId -> { position, type, huntingRadius, lastHuntTime }
    this.ecosystemBalance = 1.0;         // 0-1 scale: 0=collapsed, 1=perfect
    this.balanceHistory = [];            // Track balance over time
    this.lastBalanceUpdate = 0;
    this.lastWarningTime = 0;
    this.warnings = [];
    this.metrics = {
      totalPests: 0,
      totalPredators: 0,
      pestDamageToday: 0,
      predatorKillsToday: 0,
      overhuntingActive: false,
    };
  }

  /* ================= PEST MANAGEMENT ================= */

  /**
   * Update pest populations based on predator presence and environmental factors
   * @param {number} dt - Delta time in seconds
   * @param {object} plots - Farm plots object { "x,y": { crop, fertility, ... } }
   * @param {array} beasts - Array of player's beasts with positions
   */
  update(dt, plots, beasts, currentDay) {
    const dtDays = dt / 30; // Convert to game days (30 seconds = 1 day)

    // Update predator positions from beasts
    this.updatePredators(beasts);

    // Calculate predator coverage map
    const predatorCoverage = this.calculatePredatorCoverage(plots);

    // Update existing pests
    this.updateExistingPests(dt, dtDays, predatorCoverage, plots);

    // Spawn new pests
    this.spawnNewPests(dtDays, plots, predatorCoverage);

    // Apply crop damage
    this.applyCropDamage(dtDays, plots);

    // Update ecosystem balance
    this.lastBalanceUpdate += dt;
    if (this.lastBalanceUpdate >= ECOLOGY_CONFIG.BALANCE_UPDATE_INTERVAL) {
      this.updateEcosystemBalance(plots);
      this.lastBalanceUpdate = 0;
    }

    // Check for warnings
    this.checkWarnings(dt);

    return {
      balance: this.ecosystemBalance,
      metrics: this.metrics,
      warnings: this.warnings,
    };
  }

  updatePredators(beasts) {
    this.predators.clear();

    if (!beasts || !Array.isArray(beasts)) return;

    for (const beast of beasts) {
      // Check if this beast is a predator type
      const predatorType = PREDATOR_TYPES[beast.species];
      if (!predatorType) continue;

      // Skip if beast is not assigned to pest control or if no position
      if (!beast.position && beast.assignment !== 'pest_control') continue;

      const position = beast.position || { x: 0, y: 0 };

      this.predators.set(beast.id, {
        beastId: beast.id,
        position,
        type: predatorType,
        huntingRadius: ECOLOGY_CONFIG.PREDATOR_RANGE,
        lastHuntTime: beast.lastHuntTime || 0,
        stamina: beast.stamina || 100,
      });
    }

    this.metrics.totalPredators = this.predators.size;
  }

  calculatePredatorCoverage(plots) {
    const coverage = new Map(); // tileKey -> predatorCount

    for (const [predatorId, predator] of this.predators.entries()) {
      if (predator.stamina < 10) continue; // Exhausted predators don't hunt

      const px = predator.position.x;
      const py = predator.position.y;
      const radius = predator.huntingRadius;

      // Check all plots within radius
      for (const tileKey in plots) {
        const [tx, ty] = tileKey.split(',').map(Number);
        const dist = Math.sqrt((tx - px) ** 2 + (ty - py) ** 2);

        if (dist <= radius) {
          const current = coverage.get(tileKey) || 0;
          coverage.set(tileKey, current + predator.type.huntingPower);
        }
      }
    }

    return coverage;
  }

  updateExistingPests(dt, dtDays, predatorCoverage, plots) {
    for (const [tileKey, pest] of this.pests.entries()) {
      const plot = plots[tileKey];
      if (!plot || !plot.crop) {
        // No crop = pests leave
        this.pests.delete(tileKey);
        continue;
      }

      // Predator hunting reduces pest severity
      const predatorPressure = predatorCoverage.get(tileKey) || 0;
      if (predatorPressure > 0) {
        const reduction = predatorPressure * ECOLOGY_CONFIG.PREDATOR_CONSUMPTION * dtDays;
        pest.severity = Math.max(0, pest.severity - reduction);

        if (pest.severity < 0.05) {
          this.pests.delete(tileKey);
          this.metrics.predatorKillsToday += 1;
          continue;
        }
      } else {
        // No predators = pests grow
        pest.severity = Math.min(1.0, pest.severity + pest.growthRate * dtDays);
      }

      // Natural death rate
      if (Math.random() < 0.01 * dtDays) {
        this.pests.delete(tileKey);
      }
    }

    this.metrics.totalPests = this.pests.size;
  }

  spawnNewPests(dtDays, plots, predatorCoverage) {
    for (const tileKey in plots) {
      const plot = plots[tileKey];

      // Only spawn on plots with crops
      if (!plot.crop) continue;

      // Already infested
      if (this.pests.has(tileKey)) continue;

      // Calculate spawn chance based on predator presence
      const predatorPressure = predatorCoverage.get(tileKey) || 0;
      let spawnChance = ECOLOGY_CONFIG.PEST_SPAWN_BASE_CHANCE;

      // Overhunting check: too few predators globally
      const plotCount = Object.keys(plots).filter(k => plots[k].crop).length;
      const predatorRatio = this.metrics.totalPredators / Math.max(1, plotCount / 10);

      if (predatorRatio < ECOLOGY_CONFIG.OVERHUNTING_THRESHOLD) {
        spawnChance *= ECOLOGY_CONFIG.PEST_EXPLOSION_MULTIPLIER;
        this.metrics.overhuntingActive = true;
      } else {
        this.metrics.overhuntingActive = false;
      }

      // Predators suppress spawning locally
      if (predatorPressure > 0) {
        spawnChance *= Math.max(0.1, 1 - predatorPressure * 0.5);
      }

      // Roll for spawn
      if (Math.random() < spawnChance * dtDays) {
        const pestType = this.selectPestType(plot.crop);
        this.pests.set(tileKey, {
          type: pestType,
          severity: 0.2 + Math.random() * 0.3, // Start at 20-50%
          growthRate: ECOLOGY_CONFIG.PEST_GROWTH_RATE,
          lastDamageTime: Date.now(),
          spawnTime: Date.now(),
        });
      }
    }
  }

  selectPestType(crop) {
    // Different crops attract different pests
    const weights = {
      starwheat: ['locust', 'weevil'],
      goldcorn: ['locust', 'aphid'],
      rubyberry: ['moth', 'aphid'],
      magicroot: ['aphid', 'weevil'],
    };

    const options = weights[crop.species] || Object.keys(PEST_TYPES);
    return options[Math.floor(Math.random() * options.length)];
  }

  applyCropDamage(dtDays, plots) {
    let totalDamage = 0;

    for (const [tileKey, pest] of this.pests.entries()) {
      const plot = plots[tileKey];
      if (!plot || !plot.crop) continue;

      // Damage scales with severity
      const damageRate = ECOLOGY_CONFIG.PEST_CROP_DAMAGE * pest.severity;

      // Reduce crop quality or growth
      if (plot.crop.quality !== undefined) {
        plot.crop.quality = Math.max(0, plot.crop.quality - damageRate * dtDays);
      }

      // Slow growth
      if (plot.crop.growth !== undefined) {
        plot.crop.growth = Math.max(0, plot.crop.growth - damageRate * dtDays * 0.5);
      }

      totalDamage += damageRate * dtDays;
    }

    this.metrics.pestDamageToday = totalDamage;
  }

  /* ================= ECOSYSTEM BALANCE TRACKING ================= */

  updateEcosystemBalance(plots) {
    const cropCount = Object.keys(plots).filter(k => plots[k].crop).length;
    if (cropCount === 0) {
      this.ecosystemBalance = 1.0; // No crops = no ecosystem stress
      return;
    }

    // Ideal ratio: ~1 predator per 10 crop plots
    const idealPredators = cropCount / 10;
    const predatorScore = Math.min(1.0, this.metrics.totalPredators / Math.max(1, idealPredators));

    // Pest pressure score (fewer pests = better)
    const pestRatio = this.metrics.totalPests / Math.max(1, cropCount);
    const pestScore = Math.max(0, 1.0 - pestRatio);

    // Overhunting penalty
    const overhuntingPenalty = this.metrics.overhuntingActive ? -0.3 : 0;

    // Combined balance (weighted average)
    this.ecosystemBalance = Math.max(0, Math.min(1.0,
      predatorScore * 0.4 + pestScore * 0.5 + 0.1 + overhuntingPenalty
    ));

    // Track history
    this.balanceHistory.push({
      time: Date.now(),
      balance: this.ecosystemBalance,
      pests: this.metrics.totalPests,
      predators: this.metrics.totalPredators,
    });

    // Keep last 100 entries
    if (this.balanceHistory.length > 100) {
      this.balanceHistory.shift();
    }
  }

  getBalanceStatus() {
    if (this.ecosystemBalance >= 0.7) return { level: 'green', text: '健康', textEn: 'Healthy' };
    if (this.ecosystemBalance >= 0.4) return { level: 'yellow', text: '警戒', textEn: 'Warning' };
    return { level: 'red', text: '崩溃', textEn: 'Critical' };
  }

  getBalanceColor() {
    if (this.ecosystemBalance >= 0.7) return 0x4ade80; // green
    if (this.ecosystemBalance >= 0.4) return 0xfbbf24; // yellow
    return 0xef4444; // red
  }

  /* ================= WARNING SYSTEM ================= */

  checkWarnings(dt) {
    this.lastWarningTime += dt;

    if (this.lastWarningTime < ECOLOGY_CONFIG.WARNING_COOLDOWN) {
      return;
    }

    // Clear old warnings
    this.warnings = [];

    // Pest explosion warning
    if (this.metrics.overhuntingActive) {
      this.warnings.push({
        type: 'pest_explosion',
        severity: 'high',
        message: '⚠️ 掠食者不足！虫害爆发中',
        messageEn: '⚠️ Predator shortage! Pest explosion in progress',
        suggestion: '需要更多猫科灵兽来控制虫害',
        suggestionEn: 'Deploy more feline beasts to control pests',
      });
      this.lastWarningTime = 0;
      return;
    }

    // Heavy infestation warning
    const infestationRate = this.metrics.totalPests / Math.max(1, this.metrics.totalPredators + 1);
    if (infestationRate > 5) {
      this.warnings.push({
        type: 'heavy_infestation',
        severity: 'medium',
        message: '🐛 虫害严重，作物受损中',
        messageEn: '🐛 Heavy pest infestation, crops being damaged',
        suggestion: '增派掠食者或使用除虫剂',
        suggestionEn: 'Deploy predators or use pesticides',
      });
      this.lastWarningTime = 0;
      return;
    }

    // Balance tipping warning
    const status = this.getBalanceStatus();
    if (status.level === 'red') {
      this.warnings.push({
        type: 'ecosystem_collapse',
        severity: 'high',
        message: '🔴 生态系统崩溃！',
        messageEn: '🔴 Ecosystem collapse!',
        suggestion: '立即调整掠食者数量',
        suggestionEn: 'Adjust predator population immediately',
      });
      this.lastWarningTime = 0;
    }
  }

  /* ================= PLAYER ACTIONS ================= */

  /**
   * Manually treat a pest infestation with pesticide
   * @param {string} tileKey - "x,y" plot key
   * @returns {object} Result with success and side effects
   */
  treatWithPesticide(tileKey) {
    const pest = this.pests.get(tileKey);
    if (!pest) {
      return { success: false, message: 'No pest infestation found' };
    }

    this.pests.delete(tileKey);

    return {
      success: true,
      message: '虫害已清除',
      messageEn: 'Pest infestation cleared',
      sideEffects: {
        qualityPenalty: 0.15,      // Chemical residue reduces quality
        soilDamage: 0.05,          // Slight fertility damage
      },
    };
  }

  /**
   * Deploy a predator beast to a specific location
   * @param {object} beast - Beast object
   * @param {object} position - {x, y} coordinates
   */
  deployPredator(beast, position) {
    const predatorType = PREDATOR_TYPES[beast.species];
    if (!predatorType) {
      return { success: false, message: 'Not a predator species' };
    }

    beast.position = position;
    beast.assignment = 'pest_control';
    beast.lastHuntTime = Date.now();

    return {
      success: true,
      message: `${predatorType.name} 已部署到 (${position.x}, ${position.y})`,
      messageEn: `${predatorType.nameEn} deployed to (${position.x}, ${position.y})`,
    };
  }

  /**
   * Get pest information for a specific tile
   */
  getPestInfo(tileKey) {
    const pest = this.pests.get(tileKey);
    if (!pest) return null;

    const pestType = PEST_TYPES[pest.type];
    return {
      type: pestType,
      severity: pest.severity,
      severityPercent: Math.round(pest.severity * 100),
      age: (Date.now() - pest.spawnTime) / 1000,
      visual: pestType.visual,
    };
  }

  /**
   * Get predator coverage for a specific tile
   */
  getPredatorCoverage(tileKey) {
    const [x, y] = tileKey.split(',').map(Number);
    let coverage = 0;

    for (const [id, predator] of this.predators.entries()) {
      const dist = Math.sqrt(
        (x - predator.position.x) ** 2 +
        (y - predator.position.y) ** 2
      );

      if (dist <= predator.huntingRadius) {
        coverage += predator.type.huntingPower;
      }
    }

    return coverage;
  }

  /* ================= SERIALIZATION ================= */

  save() {
    return {
      pests: Array.from(this.pests.entries()),
      balance: this.ecosystemBalance,
      balanceHistory: this.balanceHistory.slice(-20), // Save last 20 entries
      metrics: this.metrics,
    };
  }

  load(data) {
    if (!data) return;

    this.pests = new Map(data.pests || []);
    this.ecosystemBalance = data.balance || 1.0;
    this.balanceHistory = data.balanceHistory || [];
    this.metrics = data.metrics || {
      totalPests: 0,
      totalPredators: 0,
      pestDamageToday: 0,
      predatorKillsToday: 0,
      overhuntingActive: false,
    };
  }
}

/* ================= VISUAL FEEDBACK SYSTEM ================= */

/**
 * Create ecology UI panel showing balance and warnings
 */
function createEcologyUI(ecologySystem, container) {
  const panel = document.createElement('div');
  panel.id = 'ecology-panel';
  panel.style.cssText = `
    position: fixed;
    top: 120px;
    right: 20px;
    width: 280px;
    background: rgba(20, 20, 30, 0.92);
    border: 2px solid rgba(100, 200, 150, 0.4);
    border-radius: 8px;
    padding: 12px;
    font-family: 'Arial', sans-serif;
    color: #e0e0e0;
    font-size: 13px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    z-index: 100;
  `;

  panel.innerHTML = `
    <div style="font-weight: bold; font-size: 15px; margin-bottom: 8px; color: #90ee90;">
      🌿 生态系统状态
    </div>
    <div id="ecology-balance" style="margin-bottom: 10px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span>平衡度:</span>
        <span id="balance-value" style="font-weight: bold;">100%</span>
      </div>
      <div style="width: 100%; height: 8px; background: rgba(50,50,50,0.8); border-radius: 4px; overflow: hidden;">
        <div id="balance-bar" style="height: 100%; background: #4ade80; transition: width 0.3s, background 0.3s;"></div>
      </div>
      <div id="balance-status" style="margin-top: 4px; font-size: 11px; opacity: 0.8;"></div>
    </div>
    <div id="ecology-metrics" style="margin-bottom: 10px; font-size: 12px; line-height: 1.6;">
      <div>🐛 虫害: <span id="pest-count">0</span></div>
      <div>🐱 掠食者: <span id="predator-count">0</span></div>
      <div>📉 今日损失: <span id="damage-today">0%</span></div>
    </div>
    <div id="ecology-warnings" style="font-size: 12px;"></div>
  `;

  container.appendChild(panel);

  // Update function
  function update() {
    const status = ecologySystem.getBalanceStatus();
    const metrics = ecologySystem.metrics;
    const warnings = ecologySystem.warnings;

    // Update balance bar
    const balancePercent = Math.round(ecologySystem.ecosystemBalance * 100);
    document.getElementById('balance-value').textContent = balancePercent + '%';
    document.getElementById('balance-bar').style.width = balancePercent + '%';
    document.getElementById('balance-bar').style.background =
      status.level === 'green' ? '#4ade80' :
      status.level === 'yellow' ? '#fbbf24' : '#ef4444';

    document.getElementById('balance-status').textContent =
      status.level === 'green' ? '✓ 健康' :
      status.level === 'yellow' ? '⚠ 警戒' : '🔴 危险';

    // Update metrics
    document.getElementById('pest-count').textContent = metrics.totalPests;
    document.getElementById('predator-count').textContent = metrics.totalPredators;
    document.getElementById('damage-today').textContent =
      Math.round(metrics.pestDamageToday * 100) + '%';

    // Update warnings
    const warningsDiv = document.getElementById('ecology-warnings');
    if (warnings.length > 0) {
      warningsDiv.innerHTML = warnings.map(w => `
        <div style="background: rgba(239, 68, 68, 0.2); border-left: 3px solid #ef4444; padding: 6px; margin-top: 6px; border-radius: 4px;">
          <div style="font-weight: bold;">${w.message}</div>
          <div style="font-size: 11px; opacity: 0.8; margin-top: 2px;">${w.suggestion}</div>
        </div>
      `).join('');
    } else {
      warningsDiv.innerHTML = '';
    }
  }

  // Update every 2 seconds
  setInterval(update, 2000);
  update();

  return panel;
}

/**
 * Add pest visual indicators to infested plots
 */
function addPestVisuals(ecologySystem, plotSprites, pixiApp) {
  const pestOverlays = new Map();

  function update() {
    // Remove old overlays
    for (const [tileKey, overlay] of pestOverlays.entries()) {
      if (!ecologySystem.pests.has(tileKey)) {
        overlay.destroy();
        pestOverlays.delete(tileKey);
      }
    }

    // Add new overlays
    for (const [tileKey, pest] of ecologySystem.pests.entries()) {
      if (pestOverlays.has(tileKey)) {
        // Update existing
        const overlay = pestOverlays.get(tileKey);
        overlay.alpha = 0.3 + pest.severity * 0.5;
      } else {
        // Create new
        const plot = plotSprites.get(tileKey);
        if (!plot) continue;

        const pestType = PEST_TYPES[pest.type];
        const overlay = new PIXI.Graphics();
        overlay.beginFill(pestType.color, 0.3 + pest.severity * 0.5);
        overlay.drawCircle(0, 0, 16);
        overlay.endFill();

        overlay.x = plot.x;
        overlay.y = plot.y - 20;

        pixiApp.stage.addChild(overlay);
        pestOverlays.set(tileKey, overlay);
      }
    }
  }

  return { update, destroy: () => pestOverlays.forEach(o => o.destroy()) };
}

/* ================= EXPORT ================= */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    EcologySystem,
    createEcologyUI,
    addPestVisuals,
    PEST_TYPES,
    PREDATOR_TYPES,
    ECOLOGY_CONFIG,
  };
}

// Browser global export
if (typeof window !== 'undefined') {
  window.EcologySystem = EcologySystem;
  window.createEcologyUI = createEcologyUI;
  window.addPestVisuals = addPestVisuals;
  window.PEST_TYPES = PEST_TYPES;
  window.PREDATOR_TYPES = PREDATOR_TYPES;
  window.ECOLOGY_CONFIG = ECOLOGY_CONFIG;
}
