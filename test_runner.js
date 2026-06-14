const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Set viewport to simulate a real screen
  await page.setViewportSize({ width: 1920, height: 1080 });

  // Capture console logs from the page
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    console.log(`[BROWSER] ${text}`);
  });

  // Navigate to test page
  console.log('\n🚀 Loading test page...\n');
  await page.goto('http://localhost:9999/test_blackscreen_fix.html');

  // Wait for initialization to complete (need 100ms + 100ms from timeouts)
  await page.waitForTimeout(300);

  // Wait for the final verdict to be written to the DOM
  await page.waitForFunction(() => {
    const el = document.getElementById('test-results');
    return el && el.innerHTML.includes('PASS') || el.innerHTML.includes('FAIL');
  }, { timeout: 5000 });

  // Extract test results from the page
  const results = await page.evaluate(() => {
    const debugEl = document.getElementById('test-results');
    const canvasEl = document.querySelector('canvas');

    return {
      debugHTML: debugEl ? debugEl.innerHTML : 'NOT FOUND',
      canvasExists: !!canvasEl,
      canvasWidth: canvasEl ? canvasEl.width : 0,
      canvasHeight: canvasEl ? canvasEl.height : 0,
      canvasStyleWidth: canvasEl ? canvasEl.style.width : 'N/A',
      canvasStyleHeight: canvasEl ? canvasEl.style.height : 'N/A',
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight
    };
  });

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║              BLACK SCREEN FIX TEST RESULTS                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('🖼️  CANVAS STATE:');
  console.log(`   • Exists: ${results.canvasExists ? '✓ YES' : '✗ NO'}`);
  console.log(`   • Canvas dimensions: ${results.canvasWidth} × ${results.canvasHeight}`);
  console.log(`   • Canvas CSS: ${results.canvasStyleWidth} × ${results.canvasStyleHeight}`);
  console.log(`   • Window size: ${results.windowWidth} × ${results.windowHeight}\n`);

  // Take screenshot
  const screenshotPath = '/root/terra-chronicle-game/test_screenshot.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`📸 Screenshot saved: ${screenshotPath}\n`);

  // Parse verdict from debug overlay
  const verdictMatch = results.debugHTML.match(/VERDICT:.*?>(.*?)<\/span>/);
  const verdict = verdictMatch ? verdictMatch[1] : 'UNKNOWN';

  console.log('📊 TEST RESULTS FROM PAGE:');
  console.log(results.debugHTML.replace(/<[^>]*>/g, '\n   ').replace(/\n\s*\n/g, '\n'));

  console.log('\n' + '═'.repeat(60));
  console.log(`FINAL VERDICT: ${verdict}`);
  console.log('═'.repeat(60) + '\n');

  // Determine if test passed
  const passed = verdict.includes('PASS') &&
                 results.canvasWidth === results.windowWidth &&
                 results.canvasHeight === results.windowHeight;

  await browser.close();

  process.exit(passed ? 0 : 1);
})();
