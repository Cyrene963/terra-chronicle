const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { scriptVersions } = require('./smoke_common');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dogfood-output', 'entry-responsiveness-smoke');
const BASE = process.env.TERRA_PUBLIC_BASE_URL || 'http://127.0.0.1:8867';
const configuredChromium = process.env.TERRA_CHROMIUM_PATH;
const bundledChromium = '/root/.cloakbrowser/chromium-146.0.7680.177.5/chrome';
const selectedDevice = process.env.TERRA_ENTRY_DEVICE;
const captureScreenshots = process.env.TERRA_CAPTURE_SCREENSHOTS === '1';
const expectedMainVersion = scriptVersions(path.join(ROOT, 'index.html'))['main.js'];

fs.mkdirSync(OUT, { recursive: true });

const devices = [
  {
    name: 'desktop',
    context: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
  },
  {
    name: 'mobile',
    context: {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
    },
  },
];

(async () => {
  const executablePath = configuredChromium || (fs.existsSync(bundledChromium) ? bundledChromium : undefined);
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-gpu-compositing'],
    ...(executablePath ? { executablePath } : {}),
  });
  const results = [];

  const activeDevices = selectedDevice ? devices.filter(device => device.name === selectedDevice) : devices;
  if (!activeDevices.length) throw new Error(`Unknown TERRA_ENTRY_DEVICE: ${selectedDevice}`);
  for (const device of activeDevices) {
    const context = await browser.newContext(device.context);
    const page = await context.newPage();
    const errors = [];
    const entryLogs = [];
    page.on('pageerror', err => errors.push(`pageerror: ${err.message}`));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
      if (msg.text().includes('[Terra] Entering world')) entryLogs.push(msg.text());
    });

    // Slow only main.js so the click exercises the early title-page listener.
    await page.route('**/src/main.js?v=*', async route => {
      await new Promise(resolve => setTimeout(resolve, 900));
      await route.continue();
    });

    const startedAt = Date.now();
    const response = await page.goto(`${BASE}/?entry-smoke=${device.name}-${Date.now()}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    const immediate = await page.evaluate(() => {
      const enter = document.querySelector('#enter');
      enter.click();
      return {
        text: enter.textContent.trim(),
        busy: enter.getAttribute('aria-busy'),
        pointerEvents: enter.style.pointerEvents,
        requested: window.__terraEnterRequested,
      };
    });
    const clickedAt = Date.now();
    await page.waitForFunction(() => window.__dbg?.ready && document.body.classList.contains('hud-on'), null, {
      timeout: 90000,
    });
    const readyAt = Date.now();
    await page.waitForTimeout(250);
    const final = await page.evaluate(() => ({
      titlePresent: Boolean(document.querySelector('#title')),
      mainScripts: [...document.scripts].map(script => script.src).filter(src => src.includes('/src/main.js')),
      bodyClass: document.body.className,
      enterCount: window.__terraEnterCount,
    }));
    let screenshot = 'disabled';
    if (captureScreenshots) {
      try {
        await page.screenshot({ path: path.join(OUT, `${device.name}.png`), timeout: 10000 });
        screenshot = 'captured';
      } catch (err) {
        screenshot = `degraded: ${err.message}`;
      }
    }

    const result = {
      device: device.name,
      status: response?.status() || null,
      domReadyMs: clickedAt - startedAt,
      clickToWorldReadyMs: readyAt - clickedAt,
      immediate,
      final,
      entryLogCount: entryLogs.length,
      screenshot,
      errors,
    };
    result.ok = result.status === 200 && immediate.requested === true &&
      immediate.busy === 'true' && immediate.text === '大陆苏醒中' &&
      final.titlePresent === false && final.mainScripts.length === 1 &&
      final.mainScripts[0].includes(`main.js?v=${expectedMainVersion}`) &&
      final.enterCount === 1 && errors.length === 0;
    results.push(result);
    await context.close();
  }

  await browser.close();
  const reportPath = path.join(OUT, 'report.json');
  let mergedResults = results;
  if (selectedDevice && fs.existsSync(reportPath)) {
    try {
      const previous = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      const byDevice = new Map((previous.results || []).map(result => [result.device, result]));
      for (const result of results) byDevice.set(result.device, result);
      mergedResults = devices.map(device => byDevice.get(device.name)).filter(Boolean);
    } catch (_) {
      mergedResults = results;
    }
  }
  const report = { baseUrl: BASE, results: mergedResults, ok: mergedResults.every(result => result.ok) };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
})().catch(err => {
  console.error(err.stack || err);
  process.exit(1);
});