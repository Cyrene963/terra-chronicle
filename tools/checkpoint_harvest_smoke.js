const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const BASE = process.env.TERRA_PUBLIC_BASE_URL || 'http://127.0.0.1:8871';
const BATCH = process.env.TERRA_BATCH_ID || 'standalone';
const checkpointPath = process.env.TERRA_ULTRA_PLANT_CHECKPOINT || path.join(ROOT, 'tools/fixtures/ultra/run-15-plant.json');
const checkpoint = JSON.parse(fs.readFileSync(checkpointPath));
const sourceFarm = JSON.parse(checkpoint.data);
const sourceKeys = Object.entries(sourceFarm.fieldState || {})
  .filter(([, state]) => state?.species === 'starwheat')
  .map(([key]) => key);
const out = path.join(ROOT, 'dogfood-output/ultra-20run', BATCH, 'checkpoints/run-15-harvest.json');
fs.mkdirSync(path.dirname(out), { recursive: true });

if (sourceKeys.length !== 3) {
  console.error(`checkpoint must contain exactly 3 planted starwheat plots: ${JSON.stringify({ checkpointPath, sourceKeys })}`);
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.TERRA_CHROMIUM_PATH,
    args: ['--no-sandbox', '--disable-gpu', '--disable-gpu-compositing'],
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await context.addInitScript(data => localStorage.setItem('terra_farm', data), checkpoint.data);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${BASE}/?checkpoint-harvest=${Date.now()}`, { waitUntil: 'domcontentloaded' });
  await page.click('#enter');
  await page.waitForFunction(() => window.__dbg?.ready, null, { timeout: 60000 });
  await page.waitForFunction(
    keys => keys.every(key => Terra.farm.fieldState?.[key]?.mature),
    sourceKeys,
    { timeout: 45000 },
  );
  for (const key of sourceKeys) {
    const point = await page.evaluate(plotKey => {
      const [tx, ty] = plotKey.split(',').map(Number);
      return __dbg.worldToClient(tx * 64 + 32, ty * 64 + 32);
    }, key);
    await page.touchscreen.tap(point.x, point.y);
    await page.waitForFunction(plotKey => !Terra.farm.fieldState?.[plotKey], key, { timeout: 15000 });
  }
  const data = await page.evaluate(() => localStorage.getItem('terra_farm'));
  const farm = JSON.parse(data);
  const report = {
    testClass: 'checkpoint-resume-smoke',
    base: BASE,
    stage: 'harvest',
    sourceCheckpoint: checkpointPath,
    sourceKeys,
    data,
    savedAt: new Date().toISOString(),
    evidence: {
      star: (farm.inventory.crops.starwheat || []).length,
      wood: farm.inventory.materials.wood || 0,
      fieldKeys: Object.keys(farm.fieldState || {}),
      stamina: farm.runtimeState?.staminaUsed,
      tutorial: farm.tutorialProgress,
    },
    errors,
  };
  report.ok = !errors.length
    && report.sourceKeys.length === 3
    && report.evidence.star === 3
    && report.evidence.fieldKeys.length === 0;
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: report.ok, sourceKeys, evidence: report.evidence, errors }, null, 2));
  await browser.close();
  if (!report.ok) process.exit(1);
})().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});
