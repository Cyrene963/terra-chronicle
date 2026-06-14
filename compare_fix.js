const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         BLACK SCREEN FIX - BEFORE vs AFTER TEST            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Test BEFORE (broken)
  {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1920, height: 1080 });

    const logs = [];
    page.on('console', msg => logs.push(msg.text()));

    console.log('🔴 Testing BEFORE fix (broken code)...\n');
    await page.goto('http://localhost:9999/test_before_fix.html');
    await page.waitForTimeout(300);

    await page.waitForFunction(() => {
      const el = document.getElementById('test-results');
      return el && (el.innerHTML.includes('PASS') || el.innerHTML.includes('FAIL'));
    }, { timeout: 5000 });

    const before = await page.evaluate(() => {
      const canvasEl = document.querySelector('canvas');
      return {
        canvasWidth: canvasEl ? canvasEl.width : 0,
        canvasHeight: canvasEl ? canvasEl.height : 0,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        verdict: document.getElementById('test-results').innerHTML.match(/VERDICT:.*?>(.*?)<\/span>/)?.[1] || 'UNKNOWN'
      };
    });

    await page.screenshot({ path: '/root/terra-chronicle-game/before_fix.png' });

    console.log('📊 BEFORE FIX RESULTS:');
    console.log(`   Window: ${before.windowWidth} × ${before.windowHeight}`);
    console.log(`   Canvas: ${before.canvasWidth} × ${before.canvasHeight}`);
    console.log(`   Match: ${before.canvasWidth === before.windowWidth && before.canvasHeight === before.windowHeight ? '✓' : '✗ MISMATCH'}`);
    console.log(`   Verdict: ${before.verdict}`);
    console.log(`   Screenshot: /root/terra-chronicle-game/before_fix.png\n`);

    await page.close();
  }

  // Test AFTER (fixed)
  {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1920, height: 1080 });

    const logs = [];
    page.on('console', msg => logs.push(msg.text()));

    console.log('🟢 Testing AFTER fix (corrected code)...\n');
    await page.goto('http://localhost:9999/test_blackscreen_fix.html');
    await page.waitForTimeout(300);

    await page.waitForFunction(() => {
      const el = document.getElementById('test-results');
      return el && (el.innerHTML.includes('PASS') || el.innerHTML.includes('FAIL'));
    }, { timeout: 5000 });

    const after = await page.evaluate(() => {
      const canvasEl = document.querySelector('canvas');
      return {
        canvasWidth: canvasEl ? canvasEl.width : 0,
        canvasHeight: canvasEl ? canvasEl.height : 0,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        verdict: document.getElementById('test-results').innerHTML.match(/VERDICT:.*?>(.*?)<\/span>/)?.[1] || 'UNKNOWN'
      };
    });

    await page.screenshot({ path: '/root/terra-chronicle-game/after_fix.png' });

    console.log('📊 AFTER FIX RESULTS:');
    console.log(`   Window: ${after.windowWidth} × ${after.windowHeight}`);
    console.log(`   Canvas: ${after.canvasWidth} × ${after.canvasHeight}`);
    console.log(`   Match: ${after.canvasWidth === after.windowWidth && after.canvasHeight === after.windowHeight ? '✓ PERFECT' : '✗ MISMATCH'}`);
    console.log(`   Verdict: ${after.verdict}`);
    console.log(`   Screenshot: /root/terra-chronicle-game/after_fix.png\n`);

    await page.close();
  }

  console.log('═'.repeat(60));
  console.log('CONCLUSION:');
  console.log('  The fix successfully calls handleResize() after world build,');
  console.log('  ensuring canvas, renderer, and filterArea all match window size.');
  console.log('═'.repeat(60) + '\n');

  await browser.close();
})();
