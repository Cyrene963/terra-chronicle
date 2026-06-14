/* =========================================================
   Terra Chronicle — Main.js Integration Points
   This file documents the required changes to main.js
   ========================================================= */

// STEP 1: Add script import to index.html (before main.js)
// <script src="src/capture_system.js"></script>
// <script src="src/capture_integration.js"></script>

// STEP 2: Initialize capture system after game setup
// Add this code after player initialization (around line 489):
/*
// Initialize capture system
if (window.CaptureIntegration) {
  CaptureIntegration.init({
    player: player,
    objL: objL,
    overlayL: overlayL,
    world: world,
    app: app,
    farm: farm
  });
}
*/

// STEP 3: Hook encounter trigger into commandTo() function
// Replace the commandTo() function (around line 653) with this enhanced version:

function commandTo(wx, wy) {
  // Try to trigger encounter first (5% chance on grass tiles)
  if (window.CaptureIntegration && CaptureIntegration.tryTriggerEncounter(wx, wy, grid)) {
    return; // Encounter triggered, stop pathfinding
  }

  // Original commandTo logic below...
  const tx = Math.floor(wx / TS), ty = Math.floor(wy / TS);
  const sx = Math.floor(player.x / TS), sy = Math.floor(player.y / TS);
  const o = objectAtTile(tx, ty);

  if (o && (o.kind === 'tree' || o.kind === 'cherry')) {
    rebuildSolidTiles();
    const nw = nearestWalkable(tx, ty);
    if (!nw) return;
    const path = tilePath(sx, sy, nw.x, nw.y);
    if (path) {
      player._path = path;
      pendingAction = { type: 'chop', obj: o };
      toastHint('前往伐木…');
    }
    return;
  }

  if (o && o.kind === 'portal') {
    rebuildSolidTiles();
    const nw = nearestWalkable(tx, ty);
    if (!nw) return;
    const path = tilePath(sx, sy, nw.x, nw.y);
    if (path) {
      player._path = path;
      pendingAction = { type: 'portal' };
      toastHint('前往深渊之门…');
    }
    return;
  }

  if (o && o.kind === 'incubator') {
    rebuildSolidTiles();
    const nw = nearestWalkable(tx, ty);
    if (!nw) return;
    const path = tilePath(sx, sy, nw.x, nw.y);
    if (path) {
      player._path = path;
      pendingAction = { type: 'breed' };
      toastHint('前往孵化阵…');
    }
    return;
  }

  if (o && o.kind === 'furnace') {
    rebuildSolidTiles();
    const nw = nearestWalkable(tx, ty);
    if (!nw) return;
    const path = tilePath(sx, sy, nw.x, nw.y);
    if (path) {
      player._path = path;
      pendingAction = { type: 'upgrade' };
      toastHint('前往工坊升级…');
    }
    return;
  }

  if (tileMeta[tx + ',' + ty]) {
    const path = tilePath(sx, sy, tx, ty);
    if (path) {
      player._path = path;
      pendingAction = { type: 'farm', key: tx + ',' + ty };
    }
    return;
  }

  const path = tilePath(sx, sy, tx, ty);
  if (path) {
    player._path = path;
    pendingAction = null;
  }
}

// STEP 4: Update farm state to include beasts array
// Add this after Terra.load() or Terra.newGame() (around line 1303):
/*
if (!farm.beasts) {
  farm.beasts = [];
}
*/

// That's it! The capture system is now integrated.
