/* =========================================================
   Terra Chronicle — Ecology System Integration
   ---------------------------------------------------------
   Integrates ecology_system.js into main game loop
   ========================================================= */
'use strict';

/**
 * Initialize ecology system and integrate with game state
 * @param {object} gameState - Main game state object
 * @param {object} pixiApp - PixiJS application
 * @param {HTMLElement} uiContainer - DOM container for UI panels
 * @returns {object} Integration handle with update/cleanup methods
 */
function initializeEcology(gameState, pixiApp, uiContainer) {
  // Check if EcologySystem is available
  if (typeof EcologySystem === 'undefined') {
    console.error('EcologySystem not loaded! Include ecology_system.js first');
    return null;
  }

  const ecology = new EcologySystem();

  // Load saved ecology state if exists
  if (gameState.ecology) {
    ecology.load(gameState.ecology);
  }

  // Create UI panel
  const ecologyUI = createEcologyUI(ecology, uiContainer || document.body);

  // Track plot sprites for visual feedback
  const plotSprites = new Map();

  // Integration interface
  const integration = {
    ecology,
    ecologyUI,
    plotSprites,

    /**
     * Main update loop - call this from game's update()
     */
    update(dt, farm, beasts) {
      if (!farm || !farm.plots) return;

      // Update ecology system
      const result = ecology.update(dt, farm.plots, beasts, farm.day || 1);

      // Update visuals
      this.updateVisuals();

      return result;
    },

    /**
     * Update visual indicators for pests
     */
    updateVisuals() {
      // This will be called to update pest overlays on plots
      // Implementation depends on how plots are rendered in main.js
    },

    /**
     * Add a plot sprite for tracking
     */
    registerPlot(tileKey, sprite) {
      this.plotSprites.set(tileKey, sprite);
    },

    /**
     * Deploy a predator beast to hunt pests
     */
    deployPredator(beast, position) {
      return ecology.deployPredator(beast, position);
    },

    /**
     * Treat pest infestation with pesticide
     */
    treatPest(tileKey) {
      const result = ecology.treatWithPesticide(tileKey);

      // Apply side effects to plot if successful
      if (result.success && result.sideEffects && gameState.farm) {
        const plot = gameState.farm.plots[tileKey];
        if (plot) {
          if (plot.crop && result.sideEffects.qualityPenalty) {
            plot.crop.quality = Math.max(0,
              (plot.crop.quality || 1.0) - result.sideEffects.qualityPenalty
            );
          }
          if (result.sideEffects.soilDamage) {
            plot.fertility = Math.max(0,
              (plot.fertility || 100) - result.sideEffects.soilDamage * 100
            );
          }
        }
      }

      return result;
    },

    /**
     * Get pest info for UI tooltip
     */
    getPestInfo(tileKey) {
      return ecology.getPestInfo(tileKey);
    },

    /**
     * Get predator coverage for a tile
     */
    getPredatorCoverage(tileKey) {
      return ecology.getPredatorCoverage(tileKey);
    },

    /**
     * Get current warnings
     */
    getWarnings() {
      return ecology.warnings;
    },

    /**
     * Get balance status
     */
    getBalance() {
      return {
        value: ecology.ecosystemBalance,
        status: ecology.getBalanceStatus(),
        color: ecology.getBalanceColor(),
        metrics: ecology.metrics,
      };
    },

    /**
     * Save ecology state to game state
     */
    save(gameState) {
      gameState.ecology = ecology.save();
    },

    /**
     * Clean up
     */
    destroy() {
      if (this.ecologyUI && this.ecologyUI.parentElement) {
        this.ecologyUI.parentElement.removeChild(this.ecologyUI);
      }
      this.plotSprites.clear();
    },
  };

  return integration;
}

/**
 * Add ecology system to EnhancedFarming integration
 * This modifies the existing farming system to include ecology
 */
function integrateWithFarming(farmingSystem, ecologyIntegration) {
  if (!farmingSystem || !ecologyIntegration) return;

  // Wrap the original update function
  const originalUpdate = farmingSystem.update;
  if (typeof originalUpdate === 'function') {
    farmingSystem.update = function(dt, gameState, ...args) {
      // Call original farming update
      const result = originalUpdate.call(this, dt, gameState, ...args);

      // Update ecology
      if (gameState.farm && gameState.farm.beasts) {
        ecologyIntegration.update(dt, gameState.farm, gameState.farm.beasts);
      }

      return result;
    };
  }

  // Add ecology actions to farming system
  farmingSystem.ecology = ecologyIntegration;

  return farmingSystem;
}

/**
 * Create predator beast assignment UI
 */
function createPredatorAssignmentUI(ecologyIntegration, beasts, onAssign) {
  const panel = document.createElement('div');
  panel.id = 'predator-assignment-panel';
  panel.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    width: 300px;
    background: rgba(20, 20, 30, 0.95);
    border: 2px solid rgba(150, 100, 200, 0.5);
    border-radius: 8px;
    padding: 12px;
    font-family: 'Arial', sans-serif;
    color: #e0e0e0;
    font-size: 13px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    z-index: 100;
    max-height: 300px;
    overflow-y: auto;
  `;

  function render() {
    const predators = beasts.filter(b => PREDATOR_TYPES[b.species]);

    if (predators.length === 0) {
      panel.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 8px; color: #d0b0ff;">
          🐱 掠食者管理
        </div>
        <div style="opacity: 0.6; font-size: 12px;">
          没有可用的掠食者灵兽。<br>
          捕获猫科灵兽来控制虫害。
        </div>
      `;
      return;
    }

    let html = `
      <div style="font-weight: bold; margin-bottom: 8px; color: #d0b0ff;">
        🐱 掠食者管理 (${predators.length})
      </div>
    `;

    for (const beast of predators) {
      const predType = PREDATOR_TYPES[beast.species];
      const isActive = beast.assignment === 'pest_control';
      const stamina = beast.stamina || 100;

      html += `
        <div style="
          background: ${isActive ? 'rgba(74, 222, 128, 0.15)' : 'rgba(50, 50, 60, 0.3)'};
          border-left: 3px solid ${isActive ? '#4ade80' : '#666'};
          padding: 8px;
          margin-bottom: 6px;
          border-radius: 4px;
          cursor: pointer;
        " onclick="window.togglePredator('${beast.id}')">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="font-weight: bold;">${predType.visual} ${predType.name}</span>
              <div style="font-size: 11px; opacity: 0.7; margin-top: 2px;">
                狩猎力: ${predType.huntingPower.toFixed(1)}x |
                体力: ${Math.round(stamina)}%
              </div>
            </div>
            <div style="
              padding: 4px 8px;
              background: ${isActive ? '#4ade80' : '#666'};
              color: white;
              border-radius: 4px;
              font-size: 11px;
              font-weight: bold;
            ">
              ${isActive ? '工作中' : '待命'}
            </div>
          </div>
        </div>
      `;
    }

    panel.innerHTML = html;
  }

  // Toggle predator assignment
  window.togglePredator = function(beastId) {
    const beast = beasts.find(b => b.id === beastId);
    if (!beast) return;

    if (beast.assignment === 'pest_control') {
      // Remove from duty
      beast.assignment = null;
      beast.position = null;
      console.log(`${beast.species} removed from pest control`);
    } else {
      // Assign to pest control at current position or farm center
      beast.assignment = 'pest_control';
      beast.position = beast.position || { x: 28, y: 28 }; // Farm center

      const result = ecologyIntegration.deployPredator(beast, beast.position);
      console.log(result.message);
    }

    render();

    if (typeof onAssign === 'function') {
      onAssign(beast);
    }
  };

  render();

  // Auto-refresh every 3 seconds
  setInterval(render, 3000);

  return panel;
}

/**
 * Add ecology commands to game console/chat
 */
function registerEcologyCommands(ecologyIntegration, commandHandler) {
  if (!commandHandler) return;

  commandHandler.register('ecology', function(args) {
    const balance = ecologyIntegration.getBalance();
    return `
生态系统状态:
- 平衡度: ${Math.round(balance.value * 100)}% (${balance.status.text})
- 虫害数量: ${balance.metrics.totalPests}
- 掠食者: ${balance.metrics.totalPredators}
- 今日损失: ${Math.round(balance.metrics.pestDamageToday * 100)}%
${balance.metrics.overhuntingActive ? '\n⚠️ 警告: 掠食者不足，虫害爆发中！' : ''}
    `.trim();
  });

  commandHandler.register('pesticide', function(args) {
    if (args.length < 2) {
      return '用法: /pesticide <x> <y>';
    }
    const tileKey = `${args[0]},${args[1]}`;
    const result = ecologyIntegration.treatPest(tileKey);
    return result.message || result.messageEn;
  });

  commandHandler.register('deploy_predator', function(args) {
    if (args.length < 3) {
      return '用法: /deploy_predator <beast_id> <x> <y>';
    }
    // This would need access to beast list
    return '见掠食者管理面板';
  });
}

/* ================= EXPORT ================= */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeEcology,
    integrateWithFarming,
    createPredatorAssignmentUI,
    registerEcologyCommands,
  };
}

// Browser global export
if (typeof window !== 'undefined') {
  window.initializeEcology = initializeEcology;
  window.integrateWithFarming = integrateWithFarming;
  window.createPredatorAssignmentUI = createPredatorAssignmentUI;
  window.registerEcologyCommands = registerEcologyCommands;
}
