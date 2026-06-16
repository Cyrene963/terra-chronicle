const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { scriptVersions, hasExpectedScript, badConsole, sha256 } = require('./smoke_common');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dogfood-output', 'soft-farm-crop-ui-20260615');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', msg => { if (badConsole(msg)) consoleErrors.push(`${msg.type()}: ${msg.text()}`); });
  page.on('pageerror', err => pageErrors.push(String(err)));
  await page.goto('https://terra.bz9.me/?crop_ui_unification=20260615', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => {
    const enter = document.querySelector('#enter');
    return !!enter && getComputedStyle(enter).visibility !== 'hidden' && getComputedStyle(enter).display !== 'none';
  }, null, { timeout: 20000 });
  await page.click('#enter');
  await page.waitForFunction(() => window.__dbg && window.__dbg.ready, null, { timeout: 15000 });
  await page.evaluate(() => {
    const farm = window.__dbg.farm;
    farm.inventory.materials.starwheat = Math.max(farm.inventory.materials.starwheat || 0, 3);
    farm.inventory.materials.dewberry = Math.max(farm.inventory.materials.dewberry || 0, 3);
    window.Alchemy?.open?.();
  });
  await page.waitForFunction(() => {
    const ui = document.querySelector('#alchemyUI');
    const img = document.querySelector('#addDewberry img');
    return ui && ui.classList.contains('on') && img && img.complete && img.naturalWidth > 1;
  }, null, { timeout: 10000 });
  await page.waitForTimeout(800);
  const state = await page.evaluate(() => ({
    scripts: [...document.scripts].map(s => s.src).filter(Boolean),
    dewberryImg: document.querySelector('#addDewberry img')?.getAttribute('src') || null,
    dewberryNatural: (() => { const img = document.querySelector('#addDewberry img'); return img ? { w: img.naturalWidth, h: img.naturalHeight, complete: img.complete } : null; })(),
    alchemyVisible: !!document.querySelector('#alchemyUI') && document.querySelector('#alchemyUI').classList.contains('on'),
    alchemyText: document.querySelector('#alchemyUI')?.textContent?.slice(0, 300) || ''
  }));
  await page.screenshot({ path: path.join(OUT, 'public_alchemy_dewberry.png'), fullPage: false });
  const files = ['crop_dewberry.png', 'button_frame.png', 'scroll_paper.png'];
  const hashes = Object.fromEntries(files.map(f => [f, {
    source: sha256(path.join(ROOT, 'assets/sprites', f)),
    live: sha256(path.join('/var/www/terra-pixijs/assets/sprites', f))
  }]));
  const versions = scriptVersions();
  if (!hasExpectedScript(state.scripts, 'main.js', versions)) throw new Error(`expected main.js version not loaded: ${JSON.stringify({ versions, scripts: state.scripts })}`);
  if (!state.dewberryNatural || state.dewberryNatural.w <= 1) throw new Error(`dewberry image did not load: ${JSON.stringify(state)}`);
  for (const [name, pair] of Object.entries(hashes)) if (pair.source !== pair.live) throw new Error(`hash mismatch ${name}`);
  if (consoleErrors.length || pageErrors.length) throw new Error(JSON.stringify({ consoleErrors, pageErrors }));
  const report = { ok: true, versions, state, hashes, consoleErrors, pageErrors, screenshot: path.join(OUT, 'public_alchemy_dewberry.png') };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})().catch(err => { console.error(err); process.exit(1); });
