/* =========================================================
   Terra Chronicle — Ecology System Usage Example
   ---------------------------------------------------------
   How to integrate the ecology system into main.js
   ========================================================= */

// ============================================================
// STEP 1: Add script tags to index.html
// ============================================================
/*
Add these before main.js:
<script src="src/ecology_system.js"></script>
<script src="src/ecology_integration.js"></script>
*/

// ============================================================
// STEP 2: Initialize in main.js setup
// ============================================================

/* In your main initialization (after creating gameState and pixiApp): */

let ecologyIntegration = null;

// Inside init() or setupGame() function:
function initGame() {
  // ... existing initialization code ...

  // Initialize ecology system
  if (typeof initializeEcology !== 'undefined') {
    ecologyIntegration = initializeEcology(
      gameState,           // Your main game state
      app,                 // PixiJS app
      document.body        // UI container
    );

    console.log('Ecology system initialized');
  }

  // If you have a predator assignment UI container:
  if (ecologyIntegration && gameState.farm && gameState.farm.beasts) {
    const predatorUI = createPredatorAssignmentUI(
      ecologyIntegration,
      gameState.farm.beasts,
      (beast) => {
        console.log('Predator assignment changed:', beast.id);
        // Optional: trigger UI update or save game
      }
    );
    document.body.appendChild(predatorUI);
  }
}

// ============================================================
// STEP 3: Update in game loop
// ============================================================

/* In your main update loop: */

function update(dt) {
  // ... existing game update code ...

  // Update ecology system
  if (ecologyIntegration && gameState.farm) {
    const ecologyResult = ecologyIntegration.update(
      dt,
      gameState.farm,
      gameState.farm.beasts || []
    );

    // Optional: React to warnings
    if (ecologyResult.warnings && ecologyResult.warnings.length > 0) {
      for (const warning of ecologyResult.warnings) {
        // Show notification or alert
        console.warn(warning.message);
      }
    }
  }

  // ... rest of update code ...
}

// ============================================================
// STEP 4: Save/Load integration
// ============================================================

/* When saving game: */
function saveGame() {
  // ... existing save code ...

  if (ecologyIntegration) {
    ecologyIntegration.save(gameState);
  }

  localStorage.setItem('terraChronicle_save', JSON.stringify(gameState));
}

/* When loading game: */
function loadGame() {
  const saved = localStorage.getItem('terraChronicle_save');
  if (saved) {
    gameState = JSON.parse(saved);

    // Ecology system will auto-load from gameState.ecology
    if (ecologyIntegration) {
      ecologyIntegration.ecology.load(gameState.ecology);
    }
  }
}

// ============================================================
// STEP 5: Add predator species to BEAST_SPECIES
// ============================================================

/* In capture_system.js, add predator beasts: */

const BEAST_SPECIES_ADDITIONS = {
  // Field Cat - Common predator
  field_cat: {
    id: 'field_cat',
    name: '田猫',
    nameEn: 'Field Cat',
    element: 'earth',
    biome: 'plains',
    rarity: RARITY.COMMON,
    baseHP: 52,
    baseAtk: 16,
    baseDef: 10,
    abilities: ['狩猎', '夜视'],
    workTypes: ['pest_control', 'guard'],
    sprite: 'assets/sprites/beasts/field_cat.png',
  },

  // Shadow Lynx - Uncommon predator with high hunting power
  shadow_lynx: {
    id: 'shadow_lynx',
    name: '影山猫',
    nameEn: 'Shadow Lynx',
    element: 'dark',
    biome: 'forest',
    rarity: RARITY.UNCOMMON,
    baseHP: 48,
    baseAtk: 22,
    baseDef: 8,
    abilities: ['暗影狩猎', '潜行'],
    workTypes: ['pest_control', 'scout'],
    sprite: 'assets/sprites/beasts/shadow_lynx.png',
  },

  // Jade Ferret - Rare predator specializing in burrowing pests
  jade_ferret: {
    id: 'jade_ferret',
    name: '翠鼬',
    nameEn: 'Jade Ferret',
    element: 'wood',
    biome: 'forest',
    rarity: RARITY.RARE,
    baseHP: 40,
    baseAtk: 18,
    baseDef: 6,
    abilities: ['掘洞', '敏捷'],
    workTypes: ['pest_control', 'gather_wood'],
    sprite: 'assets/sprites/beasts/jade_ferret.png',
  },
};

// ============================================================
// STEP 6: UI Interaction Examples
// ============================================================

/* Click handler for plot to show pest info: */
function onPlotClick(tileKey, plotSprite) {
  if (!ecologyIntegration) return;

  const pestInfo = ecologyIntegration.getPestInfo(tileKey);
  if (pestInfo) {
    // Show pest tooltip or modal
    showTooltip(plotSprite.x, plotSprite.y, `
      ${pestInfo.visual} ${pestInfo.type.name}
      严重度: ${pestInfo.severityPercent}%
      年龄: ${Math.round(pestInfo.age)}秒
    `);

    // Option to treat with pesticide
    if (confirm('使用除虫剂处理？(会降低作物品质)')) {
      const result = ecologyIntegration.treatPest(tileKey);
      alert(result.message);
    }
  }

  // Show predator coverage
  const coverage = ecologyIntegration.getPredatorCoverage(tileKey);
  console.log(`Predator coverage at ${tileKey}: ${coverage.toFixed(2)}x`);
}

/* Manual predator deployment: */
function deployPredatorToPlot(beastId, tileKey) {
  if (!ecologyIntegration) return;

  const beast = gameState.farm.beasts.find(b => b.id === beastId);
  if (!beast) {
    console.error('Beast not found');
    return;
  }

  const [x, y] = tileKey.split(',').map(Number);
  const result = ecologyIntegration.deployPredator(beast, { x, y });

  if (result.success) {
    console.log(result.message);
    // Update beast sprite position
    updateBeastSprite(beast);
  } else {
    console.error(result.message);
  }
}

// ============================================================
// STEP 7: Visual Feedback on Plots
// ============================================================

/* Add pest visual indicators to plot rendering: */
function renderPlots() {
  for (const tileKey in gameState.farm.plots) {
    const plot = gameState.farm.plots[tileKey];
    const [x, y] = tileKey.split(',').map(Number);

    // ... existing plot rendering ...

    // Add pest indicator
    if (ecologyIntegration) {
      const pestInfo = ecologyIntegration.getPestInfo(tileKey);
      if (pestInfo) {
        // Draw pest overlay
        const pestSprite = new PIXI.Graphics();
        pestSprite.beginFill(pestInfo.type.color || 0xff0000, 0.3 + pestInfo.severity * 0.4);
        pestSprite.drawCircle(0, 0, 12 + pestInfo.severity * 8);
        pestSprite.endFill();
        pestSprite.x = x * TS;
        pestSprite.y = y * TS - 10;
        app.stage.addChild(pestSprite);

        // Animate
        pestSprite.alpha = 0.5 + Math.sin(Date.now() * 0.003) * 0.3;
      }

      // Show predator coverage (optional green glow)
      const coverage = ecologyIntegration.getPredatorCoverage(tileKey);
      if (coverage > 0) {
        const glowSprite = new PIXI.Graphics();
        glowSprite.beginFill(0x4ade80, 0.1 * coverage);
        glowSprite.drawCircle(0, 0, 20);
        glowSprite.endFill();
        glowSprite.x = x * TS;
        glowSprite.y = y * TS;
        app.stage.addChild(glowSprite);
      }
    }
  }
}

// ============================================================
// STEP 8: Keyboard Shortcuts (Optional)
// ============================================================

/* Add to your keyboard event handler: */
document.addEventListener('keydown', (e) => {
  // Toggle ecology panel with 'E' key
  if (e.key === 'e' || e.key === 'E') {
    const panel = document.getElementById('ecology-panel');
    if (panel) {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
  }

  // Toggle predator assignment panel with 'P' key
  if (e.key === 'p' || e.key === 'P') {
    const panel = document.getElementById('predator-assignment-panel');
    if (panel) {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
  }
});

// ============================================================
// STEP 9: Testing & Debug Commands
// ============================================================

/* Add debug commands to browser console: */

// Test: spawn pests manually
window.debugSpawnPest = function(x, y) {
  const tileKey = `${x},${y}`;
  ecologyIntegration.ecology.pests.set(tileKey, {
    type: 'locust',
    severity: 0.5,
    growthRate: 0.15,
    lastDamageTime: Date.now(),
    spawnTime: Date.now(),
  });
  console.log(`Pest spawned at ${tileKey}`);
};

// Test: force pest explosion
window.debugPestExplosion = function() {
  ecologyIntegration.ecology.metrics.overhuntingActive = true;
  console.log('Pest explosion activated');
};

// Test: clear all pests
window.debugClearPests = function() {
  ecologyIntegration.ecology.pests.clear();
  console.log('All pests cleared');
};

// Test: show balance details
window.debugEcologyStatus = function() {
  const balance = ecologyIntegration.getBalance();
  console.log('Ecology Status:', balance);
  console.log('Warnings:', ecologyIntegration.getWarnings());
};

// ============================================================
// Complete minimal integration example:
// ============================================================

/*
// In main.js, add this block after game state setup:

// Initialize ecology
if (typeof initializeEcology !== 'undefined') {
  window.ecologyIntegration = initializeEcology(gameState, app, document.body);

  // Create predator UI
  if (gameState.farm && gameState.farm.beasts) {
    const predUI = createPredatorAssignmentUI(
      window.ecologyIntegration,
      gameState.farm.beasts,
      () => saveGame() // Auto-save on assignment change
    );
    document.body.appendChild(predUI);
  }
}

// In update loop (usually inside requestAnimationFrame):
function gameLoop() {
  const dt = getDeltaTime(); // Your delta time calculation

  // Update ecology
  if (window.ecologyIntegration && gameState.farm) {
    window.ecologyIntegration.update(dt, gameState.farm, gameState.farm.beasts || []);
  }

  // ... rest of game loop ...
  requestAnimationFrame(gameLoop);
}

// In save function:
function saveGame() {
  if (window.ecologyIntegration) {
    window.ecologyIntegration.save(gameState);
  }
  localStorage.setItem('save', JSON.stringify(gameState));
}
*/
