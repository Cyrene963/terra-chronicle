const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('Terra Chronicle Game Feel Audit', () => {
  test('Complete game feel evaluation with screenshots', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes for thorough testing

    const screenshotDir = path.join(__dirname, 'game-feel-screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    // Navigate to the game
    console.log('Loading game at https://terra.bz9.me');
    await page.goto('https://terra.bz9.me', { waitUntil: 'networkidle', timeout: 30000 });

    await page.waitForTimeout(3000); // Wait for initial load
    await page.screenshot({ path: path.join(screenshotDir, '01-initial-load.png'), fullPage: true });

    // Check for title screen and dismiss it
    const titleElement = await page.locator('#title').first();
    if (await titleElement.isVisible()) {
      console.log('Title screen detected, clicking to dismiss...');
      await titleElement.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(screenshotDir, '01b-title-dismissed.png'), fullPage: true });
    }

    // Test 1: WASD Movement Feel
    console.log('\n=== Testing WASD Movement Feel ===');

    // Find canvas and click to focus
    const canvas = await page.locator('canvas').first();
    await canvas.click({ force: true }); // Focus the game
    await page.waitForTimeout(500);

    await page.screenshot({ path: path.join(screenshotDir, '02-before-movement.png'), fullPage: true });

    // Test acceleration and friction
    console.log('Testing W key (forward movement)...');
    await page.keyboard.down('w');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, '03-w-key-accel-500ms.png'), fullPage: true });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, '04-w-key-accel-1500ms.png'), fullPage: true });
    await page.keyboard.up('w');

    // Test friction/deceleration
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, '05-friction-500ms.png'), fullPage: true });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, '06-friction-1500ms.png'), fullPage: true });

    // Test turning
    console.log('Testing A key (left turn)...');
    await page.keyboard.down('w');
    await page.keyboard.down('a');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, '07-turning-left.png'), fullPage: true });
    await page.keyboard.up('a');
    await page.keyboard.up('w');

    // Test quick direction changes
    console.log('Testing rapid direction changes...');
    await page.keyboard.down('d');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, '08-turn-right-quick.png'), fullPage: true });
    await page.keyboard.up('d');
    await page.keyboard.down('a');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, '09-turn-left-quick.png'), fullPage: true });
    await page.keyboard.up('a');

    await page.waitForTimeout(1000);

    // Test 2: Click Pathfinding Feedback
    console.log('\n=== Testing Click Pathfinding ===');

    // Get canvas bounds
    const canvasBox = await canvas.boundingBox();
    if (canvasBox) {
      // Click to a distant point
      const targetX = canvasBox.x + canvasBox.width * 0.7;
      const targetY = canvasBox.y + canvasBox.height * 0.3;

      console.log(`Clicking pathfinding target at (${targetX}, ${targetY})...`);
      await page.mouse.click(targetX, targetY);
      await page.waitForTimeout(100);
      await page.screenshot({ path: path.join(screenshotDir, '10-pathfinding-initiated.png'), fullPage: true });

      // Capture movement sequence
      for (let i = 1; i <= 5; i++) {
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(screenshotDir, `11-pathfinding-move-${i}.png`), fullPage: true });
      }
    }

    await page.waitForTimeout(1000);

    // Test 3: Planting Interaction
    console.log('\n=== Testing Planting Interaction ===');

    // Try to find and click on farmable land
    // First, look for UI elements that might indicate farm plots
    await page.screenshot({ path: path.join(screenshotDir, '12-before-planting.png'), fullPage: true });

    // Try clicking on different areas to find farm plots
    if (canvasBox) {
      // Try center-left area (common farm location)
      const farmX = canvasBox.x + canvasBox.width * 0.3;
      const farmY = canvasBox.y + canvasBox.height * 0.5;

      console.log('Looking for farm plot...');
      await page.mouse.click(farmX, farmY);
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(screenshotDir, '13-search-farm-plot.png'), fullPage: true });

      // Try pressing planting hotkey (if exists)
      console.log('Attempting planting interaction (E key)...');
      await page.keyboard.press('e');
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(screenshotDir, '14-planting-attempt-1.png'), fullPage: true });

      // Try space bar
      console.log('Attempting planting interaction (Space)...');
      await page.keyboard.press(' ');
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(screenshotDir, '15-planting-attempt-2.png'), fullPage: true });

      // Try clicking multiple times
      console.log('Attempting planting interaction (multiple clicks)...');
      await page.mouse.click(farmX, farmY);
      await page.mouse.click(farmX, farmY);
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(screenshotDir, '16-planting-attempt-3.png'), fullPage: true });
    }

    // Test 4: UI and Information Display
    console.log('\n=== Testing UI and Information Display ===');

    // Try right-click menu
    if (canvasBox) {
      const contextX = canvasBox.x + canvasBox.width * 0.5;
      const contextY = canvasBox.y + canvasBox.height * 0.5;

      console.log('Testing right-click context menu...');
      await page.mouse.click(contextX, contextY, { button: 'right' });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(screenshotDir, '17-right-click-menu.png'), fullPage: true });

      // Click away to close
      await page.mouse.click(contextX - 100, contextY - 100);
      await page.waitForTimeout(500);
    }

    // Check for inventory/resource UI
    console.log('Checking UI elements...');
    await page.screenshot({ path: path.join(screenshotDir, '18-ui-overview.png'), fullPage: true });

    // Try pressing common UI hotkeys
    const hotkeys = ['i', 'c', 'b', 'm', 'Tab', 'Escape'];
    for (let i = 0; i < hotkeys.length; i++) {
      const key = hotkeys[i];
      console.log(`Testing hotkey: ${key}`);
      await page.keyboard.press(key);
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(screenshotDir, `19-hotkey-${key}.png`), fullPage: true });

      // Close any opened UI
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // Test 5: Overall Rhythm and Polish
    console.log('\n=== Testing Overall Game Rhythm ===');

    // Perform a sequence of mixed actions
    console.log('Testing mixed action sequence...');
    await page.keyboard.down('w');
    await page.waitForTimeout(1000);
    await page.keyboard.down('d');
    await page.waitForTimeout(500);
    await page.keyboard.up('d');
    await page.waitForTimeout(500);
    await page.keyboard.up('w');
    await page.screenshot({ path: path.join(screenshotDir, '20-mixed-movement-sequence.png'), fullPage: true });

    // Try some rapid inputs
    console.log('Testing rapid input response...');
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('w');
      await page.waitForTimeout(100);
    }
    await page.screenshot({ path: path.join(screenshotDir, '21-rapid-input-test.png'), fullPage: true });

    // Final state
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotDir, '22-final-state.png'), fullPage: true });

    console.log('\n=== Audit Complete ===');
    console.log(`Screenshots saved to: ${screenshotDir}`);
  });
});
