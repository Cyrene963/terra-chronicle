const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  console.log('📍 Navigating to https://terra.bz9.me ...');

  // Collect console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', error => {
    errors.push(`Page error: ${error.message}`);
  });

  await page.goto('https://terra.bz9.me', { waitUntil: 'networkidle' });

  // Wait for page to stabilize
  await page.waitForTimeout(3000);

  console.log('📸 Screenshot 1: Initial landing page');
  await page.screenshot({ path: '/root/terra-chronicle-game/screenshot-01-landing.png', fullPage: true });

  // Check DOM structure
  const htmlContent = await page.content();
  console.log('📝 Checking for title elements...');

  // Look for title in canvas or as text
  const titleText = await page.evaluate(() => {
    const body = document.body.innerText;
    return {
      hasTitle: body.includes('大地编年史') || body.includes('TERRA CHRONICLE'),
      hasButton: body.includes('踏上大陆'),
      canvasCount: document.querySelectorAll('canvas').length
    };
  });

  console.log('📝 Title check:', titleText);

  // Try to find any clickable element to start game
  const clickableElements = await page.evaluate(() => {
    const canvases = document.querySelectorAll('canvas');
    return {
      canvasCount: canvases.length,
      firstCanvasSize: canvases[0] ? { width: canvases[0].width, height: canvases[0].height } : null
    };
  });

  console.log('🎨 Canvas info:', clickableElements);

  const buttonVisible = titleText.hasButton;

  if (buttonVisible) {
    console.log('📸 Screenshot 2: Before clicking entry');
    await page.screenshot({ path: '/root/terra-chronicle-game/screenshot-02-before-entry.png', fullPage: true });

    console.log('🖱️  Clicking canvas to start game...');
    // Click canvas center to trigger title screen interaction
    await page.click('canvas', { position: { x: 960, y: 540 } });

    // Wait for transition
    console.log('⏳ Waiting for game world transition (10s)...');
    await page.waitForTimeout(10000);

    console.log('📸 Screenshot 3: After transition to game world');
    await page.screenshot({ path: '/root/terra-chronicle-game/screenshot-03-game-world.png', fullPage: true });

    // Wait a bit more to observe animation
    console.log('⏳ Waiting 5s to observe world rendering...');
    await page.waitForTimeout(5000);

    console.log('📸 Screenshot 4: Game world stable state');
    await page.screenshot({ path: '/root/terra-chronicle-game/screenshot-04-world-stable.png', fullPage: true });
  } else {
    console.log('⚠️  No button text found - game may be using canvas-based rendering');
    console.log('🖱️  Attempting to click title card...');

    // The title screen has a card element that intercepts clicks
    await page.click('div#title');
    await page.waitForTimeout(10000);

    console.log('📸 Screenshot 2: After title click');
    await page.screenshot({ path: '/root/terra-chronicle-game/screenshot-02-after-click.png', fullPage: true });

    await page.waitForTimeout(5000);

    console.log('📸 Screenshot 3: Final state');
    await page.screenshot({ path: '/root/terra-chronicle-game/screenshot-03-final.png', fullPage: true });
  }

  // Report errors
  if (errors.length > 0) {
    console.log('\n❌ Console errors detected:');
    errors.forEach(err => console.log('  -', err));
  } else {
    console.log('\n✅ No console errors detected');
  }

  console.log('\n✅ Test completed.');
  console.log('📂 Screenshots saved to /root/terra-chronicle-game/screenshot-*.png');

  await browser.close();

})();
