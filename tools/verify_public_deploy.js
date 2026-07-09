const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { ROOT, LIVE_ROOT, scriptVersions, hasExpectedScript, compareSourceLive, badConsole } = require('./smoke_common');

const OUT = path.join(ROOT, 'dogfood-output', 'public-deploy-verify');
fs.mkdirSync(OUT, { recursive: true });

const FILES = [
  'index.html',
  'src/state.js',
  'src/alchemy.js',
  'src/battle.js',
  'src/dungeon.js',
  'src/upgrade.js',
  'src/main.js',
  'assets/sprites/button_frame.png',
  'assets/sprites/crop_dewberry.png',
  'assets/sprites/scroll_paper.png',
  'assets/sprites/beast_water.png',
  'assets/sprites/beast_fire.png',
  'assets/sprites/enemy_root_worm.png',
  'assets/sprites/card_art_slash.png',
  'assets/ui/node_combat.png',
  'assets/ui/node_boss.png',
];

(async () => {
  const versions = scriptVersions(path.join(LIVE_ROOT, 'index.html'));
  const hashes = compareSourceLive(FILES).filter(row => row.sourceExists || row.liveExists);
  const mismatches = hashes.filter(row => !row.ok);

  const publicBase = process.env.TERRA_PUBLIC_BASE_URL || 'http://165.232.142.30:8867';
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const consoleErrors = [];
  page.on('console', msg => { if (badConsole(msg)) consoleErrors.push(`${msg.type()}: ${msg.text()}`); });
  page.on('pageerror', err => consoleErrors.push(`pageerror: ${err.message}`));
  const response = await page.goto(`${publicBase}/?verify=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.waitForFunction(() => {
    const enter = document.querySelector('#enter');
    const mode = document.querySelector('#modeSelector, .mode-card');
    return !!(mode || (enter && enter.isConnected));
  }, { timeout: 20000 });
  const scripts = await page.evaluate(() => [...document.scripts].map(s => s.src).filter(Boolean));
  const required = ['state.js', 'alchemy.js', 'battle.js', 'dungeon.js', 'upgrade.js', 'main.js'];
  const loaded = Object.fromEntries(required.map(name => [name, hasExpectedScript(scripts, name, versions)]));
  try {
    await page.screenshot({ path: path.join(OUT, 'public_landing.png'), fullPage: false, timeout: 15000 });
  } catch (err) {
    console.warn(`screenshot degraded: ${err.message}`);
  }
  await browser.close();

  const report = {
    ok: response && response.status() === 200 && mismatches.length === 0 && Object.values(loaded).every(Boolean) && consoleErrors.length === 0,
    url: publicBase,
    status: response ? response.status() : null,
    versions,
    scripts,
    loaded,
    hashes,
    mismatches,
    consoleErrors,
    outDir: OUT,
  };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
})().catch(err => {
  console.error(err.stack || err.message);
  process.exit(1);
});
