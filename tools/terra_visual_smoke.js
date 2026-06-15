const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = '/root/terra-chronicle-game';
const OUT = path.join(ROOT, 'dogfood-output', 'terra-visual-smoke');
fs.mkdirSync(OUT, { recursive: true });

function badConsole(msg) {
  const text = msg.text();
  return msg.type() === 'error' && !/Failed to load resource.*favicon/i.test(text);
}

async function visibleNonBlackPixels(page, screenshotPath) {
  const canvasInfo = await page.evaluate(() => {
    const canvas = document.querySelector('#stage canvas, canvas');
    return canvas ? { exists: true, width: canvas.width, height: canvas.height } : { exists: false, width: 0, height: 0 };
  });
  const png = fs.readFileSync(screenshotPath);
  const { PNG } = require('pngjs');
  const img = PNG.sync.read(png);
  let sample = 0, nonBlack = 0, colored = 0;
  for (let y = Math.floor(img.height * 0.18); y < img.height; y += Math.max(12, Math.floor(img.height / 36))) {
    for (let x = Math.floor(img.width * 0.08); x < img.width; x += Math.max(12, Math.floor(img.width / 48))) {
      const i = (img.width * y + x) * 4;
      const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2], a = img.data[i + 3];
      sample++;
      if (a > 8 && (r > 12 || g > 12 || b > 12)) nonBlack++;
      if (a > 8 && Math.max(r, g, b) - Math.min(r, g, b) > 8) colored++;
    }
  }
  return { ...canvasInfo, screenshotWidth: img.width, screenshotHeight: img.height, sample, nonBlack, colored };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const consoleErrors = [];
  page.on('console', msg => { if (badConsole(msg)) consoleErrors.push(`${msg.type()}: ${msg.text()}`); });
  page.on('pageerror', err => consoleErrors.push(`pageerror: ${err.message}`));

  await page.goto('https://terra.bz9.me/?smoke=v39-visual', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('#enter', { timeout: 20000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, '01_title.png'), fullPage: false });

  const scripts = await page.evaluate(() => [...document.scripts].map(s => s.src).filter(Boolean));
  if (!scripts.some(src => src.includes('alchemy.js?v=38'))) throw new Error('public page did not load alchemy.js?v=38');
  if (!scripts.some(src => src.includes('main.js?v=40'))) throw new Error('public page did not load main.js?v=40');

  await page.click('#enter');
  await page.waitForFunction(() => window.__dbg && window.__dbg.ready, null, { timeout: 12000 });
  await page.waitForTimeout(1800);
  const worldPath = path.join(OUT, '02_world.png');
  await page.screenshot({ path: worldPath, fullPage: false });
  const worldPixels = await visibleNonBlackPixels(page, worldPath);

  await page.evaluate(() => {
    const farm = window.__dbg.farm;
    farm.inventory.crops.starwheat = [
      { originFertility: 92 }, { originFertility: 88 }, { originFertility: 91 }
    ];
    farm.inventory.materials.wood = 2;
    window.updateDock && window.updateDock();
    window.Alchemy.open();
  });
  await page.waitForSelector('#alchemyUI.on', { timeout: 5000 });
  await page.screenshot({ path: path.join(OUT, '03_alchemy.png'), fullPage: false });

  await page.click('#addWheat');
  await page.click('#addWheat');
  await page.click('#addWheat');
  await page.click('#addWood');
  await page.click('#addWood');
  await page.click('#alchemyBrew');
  await page.waitForSelector('#cardReveal.on', { timeout: 7000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, '04_card_reveal.png'), fullPage: false });

  const result = await page.evaluate(() => ({
    titleVisible: !!document.querySelector('#title'),
    dbgReady: !!window.__dbg?.ready,
    cardRevealOn: document.querySelector('#cardReveal')?.classList.contains('on') || false,
    cardName: document.querySelector('#cvName')?.textContent || '',
    cardAffix: document.querySelector('#cvAffix')?.textContent || '',
    alchemyHasAlert: /alert\(/.test([...document.scripts].map(s => s.textContent).join('\n')),
    cardCount: window.__dbg?.cardCount || 0,
    bodyClass: document.body.className,
  }));

  await browser.close();

  const report = { ok: true, url: 'https://terra.bz9.me/', scripts, worldPixels, result, consoleErrors, screenshots: fs.readdirSync(OUT).filter(f => f.endsWith('.png')).map(f => path.join(OUT, f)) };
  if (!worldPixels.exists || worldPixels.nonBlack < Math.max(20, Math.floor(worldPixels.sample * 0.08))) throw new Error(`canvas appears black/empty: ${JSON.stringify(worldPixels)}`);
  if (!result.cardRevealOn || !result.cardName) throw new Error(`card reveal failed: ${JSON.stringify(result)}`);
  if (consoleErrors.length) throw new Error(`console/page errors: ${consoleErrors.join(' | ')}`);
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})().catch(async err => {
  console.error(err.stack || err.message);
  process.exit(1);
});
