const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-gpu',
      '--no-sandbox'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2, // High DPI for better screenshots
  });

  const page = await context.newPage();

  console.log('📸 Starting visual quality test for https://terra.bz9.me');
  console.log('='.repeat(60));

  const screenshotDir = '/root/terra-chronicle-game/screenshots';
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  let screenshotCount = 0;

  async function takeScreenshot(name, description) {
    screenshotCount++;
    const filename = path.join(screenshotDir, `${screenshotCount}-${name}.png`);
    await page.screenshot({ path: filename, fullPage: false });
    console.log(`✓ Screenshot ${screenshotCount}: ${description}`);
    console.log(`  → ${filename}`);
    return filename;
  }

  // Navigate to the site
  console.log('\n🌐 Loading https://terra.bz9.me...');
  await page.goto('https://terra.bz9.me', { waitUntil: 'networkidle' });

  // Wait for initial render
  await page.waitForTimeout(1000);

  // 1. Initial title screen - KV background
  console.log('\n📷 Phase 1: Title Screen - KV Background');
  await takeScreenshot('title-initial', 'Initial title screen load');

  // Wait a bit to let animations settle
  await page.waitForTimeout(2000);
  await takeScreenshot('title-settled', 'Title screen after animations settle');

  // 2. Check for cloud effects
  console.log('\n☁️  Phase 2: Cloud Effects');
  await page.waitForTimeout(3000);
  await takeScreenshot('clouds-1', 'Cloud effects - frame 1');
  await page.waitForTimeout(2000);
  await takeScreenshot('clouds-2', 'Cloud effects - frame 2');

  // 3. Title text and button quality
  console.log('\n📝 Phase 3: Title Text & Button');
  await takeScreenshot('title-text-button', 'Title text and entry button detail');

  // Try to find the entry button
  const buttonSelectors = [
    'text=踏上大陆',
    'button:has-text("踏上大陆")',
    'button:has-text("进入")',
    'button:has-text("开始")',
    '[class*="enter"]',
    '[class*="start"]',
    'button'
  ];

  let entryButton = null;
  for (const selector of buttonSelectors) {
    try {
      entryButton = await page.$(selector);
      if (entryButton) {
        console.log(`✓ Found entry button with selector: ${selector}`);
        break;
      }
    } catch (e) {
      // Try next selector
    }
  }

  if (!entryButton) {
    // Try to find any button
    const allButtons = await page.$$('button');
    if (allButtons.length > 0) {
      entryButton = allButtons[0];
      console.log(`✓ Using first button found (${allButtons.length} buttons total)`);
    }
  }

  if (entryButton) {
    // Hover over button to see hover state
    console.log('\n🖱️  Phase 4: Button Interaction');
    await entryButton.hover();
    await page.waitForTimeout(500);
    await takeScreenshot('button-hover', 'Entry button hover state');

    // Click the button to trigger transition
    console.log('\n🎬 Phase 5: Entrance Transition');
    await takeScreenshot('pre-transition', 'Pre-transition frame');

    await entryButton.click();
    console.log('✓ Entry button clicked');

    // Capture transition frames
    await page.waitForTimeout(500);
    await takeScreenshot('transition-1', 'Transition frame 1 (0.5s)');

    await page.waitForTimeout(500);
    await takeScreenshot('transition-2', 'Transition frame 2 (1.0s)');

    await page.waitForTimeout(500);
    await takeScreenshot('transition-3', 'Transition frame 3 (1.5s)');

    await page.waitForTimeout(500);
    await takeScreenshot('transition-4', 'Transition frame 4 (2.0s)');

    await page.waitForTimeout(1000);
    await takeScreenshot('transition-5', 'Transition frame 5 (3.0s)');

    // Wait for transition to complete
    await page.waitForTimeout(2000);

    console.log('\n🎮 Phase 6: Post-Transition State');
    await takeScreenshot('post-transition', 'After transition completes');

    await page.waitForTimeout(2000);
    await takeScreenshot('game-loaded', 'Game scene loaded');

  } else {
    console.log('⚠️  Warning: Could not find entry button - checking page structure');

    // Debug: capture HTML structure
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    fs.writeFileSync(
      path.join(screenshotDir, 'page-structure.html'),
      bodyHTML
    );
    console.log('  → Saved page structure to page-structure.html');
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Visual test complete! ${screenshotCount} screenshots captured.`);
  console.log(`📁 Screenshots saved to: ${screenshotDir}`);
  console.log('='.repeat(60));

  // Keep browser open for 5 seconds to allow manual inspection
  console.log('\n⏳ Keeping browser open for 5 seconds for manual inspection...');
  await page.waitForTimeout(5000);

  await browser.close();
  console.log('✅ Browser closed.');
})();
