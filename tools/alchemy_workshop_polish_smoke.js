const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { ROOT, scriptVersions, hasExpectedScript, badConsole } = require('./smoke_common');

const OUT = path.join(ROOT, 'dogfood-output', 'alchemy-workshop-polish-20260616');
fs.mkdirSync(OUT, { recursive: true });
const PUBLIC_BASE = process.env.TERRA_PUBLIC_BASE_URL || 'http://165.232.142.30:8867';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const consoleErrors = [];
  page.on('console', msg => { if (badConsole(msg)) consoleErrors.push(`${msg.type()}: ${msg.text()}`); });
  page.on('pageerror', err => consoleErrors.push(`pageerror: ${err.message}`));
  await page.goto(`${PUBLIC_BASE}/?alchemy_workshop_polish=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#enter', { timeout: 20000 });
  const scripts = await page.evaluate(() => [...document.scripts].map(s => s.src).filter(Boolean));
  const versions = scriptVersions();
  if (!hasExpectedScript(scripts, 'alchemy.js', versions)) throw new Error(`expected alchemy.js version not loaded: ${JSON.stringify({ versions, scripts })}`);
  await page.click('#enter');
  await page.waitForFunction(() => window.__dbg?.ready, null, { timeout: 20000 });
  await page.evaluate(() => {
    const farm = window.__dbg.farm;
    farm.inventory.crops.starwheat = [{ originFertility: 96 }, { originFertility: 92 }, { originFertility: 89 }];
    farm.inventory.crops.dewberry = [{ originFertility: 94 }, { originFertility: 91 }, { originFertility: 88 }];
    farm.inventory.materials.wood = 5;
    window.updateDock && window.updateDock();
    window.Alchemy.open();
  });
  await page.waitForSelector('#alchemyUI.on', { timeout: 20000 });
  await page.screenshot({ path: path.join(OUT, 'alchemy_panel.png'), fullPage: false });
  await page.click('#addWheat');
  await page.click('#addWheat');
  await page.click('#addWheat');
  await page.click('#addWood');
  await page.click('#addWood');
  await page.click('#alchemyBrew');
  await page.waitForSelector('#cardReveal.on', { timeout: 30000 });
  await page.screenshot({ path: path.join(OUT, 'card_reveal.png'), fullPage: false });
  const state = await page.evaluate(() => ({
    alchemyTitle: document.querySelector('#alchemyUI .title')?.textContent || '',
    cauldron: document.querySelector('#cauldronDisplay')?.textContent || '',
    cardName: document.querySelector('#cvName')?.textContent || '',
    cardArt: document.querySelector('#cvArt')?.getAttribute('src') || '',
    cardStats: document.querySelector('#cvAffix')?.textContent || '',
    scripts: [...document.scripts].map(s => s.src).filter(Boolean),
  }));
  const report = { ok: consoleErrors.length === 0 && !!state.cardName && !!state.cardArt, versions, state, consoleErrors, screenshots: fs.readdirSync(OUT).filter(f => f.endsWith('.png')).map(f => path.join(OUT, f)) };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  if (!report.ok) process.exit(1);
})().catch(err => { console.error(err.stack || err.message); process.exit(1); });
