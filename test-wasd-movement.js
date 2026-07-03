const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('🚀 Starting WASD movement test...\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: '/root/terra-chronicle-game/test-videos/',
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();

  // Store screenshots
  const screenshotDir = '/root/terra-chronicle-game/test-screenshots';
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  try {
    console.log('Step 1: Navigating to https://terra.bz9.me');
    await page.goto('https://terra.bz9.me', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotDir, '01-landing-page.png'), fullPage: false });
    console.log('✓ Screenshot saved: 01-landing-page.png\n');

    console.log('Step 2: Clicking "踏上大陆" button');
    const startButton = await page.locator('text=踏上大陆').first();
    await startButton.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, '02-after-start-click.png'), fullPage: false });
    console.log('✓ Screenshot saved: 02-after-start-click.png\n');

    console.log('Step 3: Waiting for transition to complete (8 seconds)');
    await page.waitForTimeout(8000);
    await page.screenshot({ path: path.join(screenshotDir, '03-transition-complete.png'), fullPage: false });
    console.log('✓ Screenshot saved: 03-transition-complete.png\n');

    // Check if canvas is visible and has content
    console.log('Step 4: Checking canvas visibility and brightness');
    const canvasInfo = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return { exists: false };

      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext('2d');

      // Sample pixels from center area
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const imageData = ctx.getImageData(centerX - 50, centerY - 50, 100, 100);
      const data = imageData.data;

      let totalBrightness = 0;
      let pixels = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        totalBrightness += (r + g + b) / 3;
        pixels++;
      }

      const avgBrightness = totalBrightness / pixels;

      return {
        exists: true,
        visible: rect.width > 0 && rect.height > 0,
        width: canvas.width,
        height: canvas.height,
        displayWidth: rect.width,
        displayHeight: rect.height,
        avgBrightness: avgBrightness.toFixed(2),
        isDark: avgBrightness < 10
      };
    });

    console.log('Canvas info:', JSON.stringify(canvasInfo, null, 2));

    if (canvasInfo.isDark) {
      console.warn('⚠ WARNING: Canvas appears very dark (avg brightness: ' + canvasInfo.avgBrightness + ')');
    } else {
      console.log('✓ Canvas appears visible with brightness:', canvasInfo.avgBrightness);
    }
    console.log();

    console.log('Step 5: Testing WASD movement');

    // Focus on the canvas
    await page.click('canvas');
    await page.waitForTimeout(500);

    // Test W key (forward)
    console.log('  Testing W key (forward)...');
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(2000);
    await page.keyboard.up('KeyW');
    await page.screenshot({ path: path.join(screenshotDir, '04-after-W-press.png'), fullPage: false });
    console.log('  ✓ Screenshot saved: 04-after-W-press.png');
    await page.waitForTimeout(500);

    // Test A key (left)
    console.log('  Testing A key (left)...');
    await page.keyboard.down('KeyA');
    await page.waitForTimeout(2000);
    await page.keyboard.up('KeyA');
    await page.screenshot({ path: path.join(screenshotDir, '05-after-A-press.png'), fullPage: false });
    console.log('  ✓ Screenshot saved: 05-after-A-press.png');
    await page.waitForTimeout(500);

    // Test S key (backward)
    console.log('  Testing S key (back)...');
    await page.keyboard.down('KeyS');
    await page.waitForTimeout(2000);
    await page.keyboard.up('KeyS');
    await page.screenshot({ path: path.join(screenshotDir, '06-after-S-press.png'), fullPage: false });
    console.log('  ✓ Screenshot saved: 06-after-S-press.png');
    await page.waitForTimeout(500);

    // Test D key (right)
    console.log('  Testing D key (right)...');
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(2000);
    await page.keyboard.up('KeyD');
    await page.screenshot({ path: path.join(screenshotDir, '07-after-D-press.png'), fullPage: false });
    console.log('  ✓ Screenshot saved: 07-after-D-press.png');
    console.log();

    // Check for console errors
    console.log('Step 6: Checking for console errors');
    const logs = [];
    page.on('console', msg => {
      logs.push({ type: msg.type(), text: msg.text() });
    });

    await page.waitForTimeout(2000);

    const errors = logs.filter(log => log.type === 'error');
    if (errors.length > 0) {
      console.log('⚠ Console errors detected:');
      errors.forEach(err => console.log('  -', err.text));
    } else {
      console.log('✓ No console errors detected');
    }
    console.log();

    // Get camera and character position info
    console.log('Step 7: Reading game state');
    const gameState = await page.evaluate(() => {
      return {
        hasThreeJS: typeof window.THREE !== 'undefined',
        hasScene: typeof window.scene !== 'undefined',
        hasCamera: typeof window.camera !== 'undefined',
        hasCharacter: typeof window.character !== 'undefined',
        cameraPosition: window.camera ? {
          x: window.camera.position.x.toFixed(2),
          y: window.camera.position.y.toFixed(2),
          z: window.camera.position.z.toFixed(2)
        } : null,
        characterPosition: window.character ? {
          x: window.character.position.x.toFixed(2),
          y: window.character.position.y.toFixed(2),
          z: window.character.position.z.toFixed(2)
        } : null
      };
    });

    console.log('Game state:', JSON.stringify(gameState, null, 2));
    console.log();

    // Final screenshot
    await page.screenshot({ path: path.join(screenshotDir, '08-final-state.png'), fullPage: false });
    console.log('✓ Screenshot saved: 08-final-state.png\n');

    console.log('='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log('Screenshots saved to:', screenshotDir);
    console.log('Canvas visible:', canvasInfo.visible);
    console.log('Canvas brightness:', canvasInfo.avgBrightness, canvasInfo.isDark ? '(DARK!)' : '(OK)');
    console.log('Console errors:', errors.length);
    console.log('ThreeJS loaded:', gameState.hasThreeJS);
    console.log('Scene exists:', gameState.hasScene);
    console.log('Camera exists:', gameState.hasCamera);
    console.log('Character exists:', gameState.hasCharacter);

    if (gameState.cameraPosition) {
      console.log('Camera position:', gameState.cameraPosition);
    }
    if (gameState.characterPosition) {
      console.log('Character position:', gameState.characterPosition);
    }
    console.log('='.repeat(60));

    // Keep browser open for manual inspection
    console.log('\n⏸  Browser will remain open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: path.join(screenshotDir, 'error-state.png'), fullPage: false });
    console.log('Error screenshot saved: error-state.png');
  } finally {
    await context.close();
    await browser.close();
    console.log('\n✓ Test complete');
  }
})();
