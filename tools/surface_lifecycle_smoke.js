const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = '/root/terra-chronicle-game/dogfood-output/surface-lifecycle-smoke';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const url = `http://127.0.0.1:8867/index.html?surface-smoke=${Date.now()}`;
  let loaded = false;
  for (let attempt = 1; attempt <= 3 && !loaded; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'commit', timeout: 30000 });
      await page.waitForFunction(() => window.SurfaceLifecycle && window.Alchemy && window.DungeonMap && window.Battle && window.FarmUpgrade, null, { timeout: 30000 });
      loaded = true;
    } catch (err) {
      if (attempt === 3) throw err;
      await page.waitForTimeout(1000);
    }
  }
  await page.evaluate(() => window.enterWorld());
  await page.waitForFunction(() => window.__dbg?.ready, null, { timeout: 30000 });

  await page.evaluate(() => window.Alchemy.open());
  await page.waitForSelector('#alchemyUI.panel-on');
  await page.evaluate(() => window.FarmUpgrade.open());
  await page.waitForSelector('#upgradePanel.panel-on');
  await page.waitForTimeout(500);
  const afterUpgrade = await page.evaluate(() => ({
    active: SurfaceLifecycle.active,
    alchemyOpen: document.querySelector('#alchemyUI')?.classList.contains('panel-on'),
    upgradeOpen: document.querySelector('#upgradePanel')?.classList.contains('panel-on'),
    bodySurface: document.body.dataset.surface,
  }));

  await page.evaluate(() => window.DungeonMap.open());
  await page.waitForSelector('#dungeonMap.on');
  await page.waitForTimeout(500);
  const afterDungeon = await page.evaluate(() => ({
    active: SurfaceLifecycle.active,
    upgradeOpen: document.querySelector('#upgradePanel')?.classList.contains('panel-on'),
    dungeonOpen: document.querySelector('#dungeonMap')?.classList.contains('on'),
  }));

  await page.evaluate(() => window.Battle.enter({
    deck: [{ name:'Smoke', type:'atk', val:99, cost:0, desc:'smoke' }],
    debugHand: [{ name:'Smoke', type:'atk', val:99, cost:0, desc:'smoke' }],
    onWin(){}, onLose(){}
  }));
  await page.waitForSelector('#battle.on .card');
  await page.waitForTimeout(600);
  const duringBattle = await page.evaluate(() => ({
    active: SurfaceLifecycle.active,
    dungeonOpen: document.querySelector('#dungeonMap')?.classList.contains('on'),
    battleOpen: document.querySelector('#battle')?.classList.contains('on'),
    tutorialVisible: getComputedStyle(document.querySelector('#tutorialOverlay')).visibility,
  }));
  await page.screenshot({ path: path.join(OUT, 'battle-surface.png') });

  const report = { afterUpgrade, afterDungeon, duringBattle, errors };
  report.ok = afterUpgrade.active === 'upgrade' && !afterUpgrade.alchemyOpen && afterUpgrade.upgradeOpen &&
    afterDungeon.active === 'dungeon' && !afterDungeon.upgradeOpen && afterDungeon.dungeonOpen &&
    duringBattle.active === 'battle' && !duringBattle.dungeonOpen && duringBattle.battleOpen &&
    duringBattle.tutorialVisible === 'hidden' && errors.length === 0;
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  if (!report.ok) process.exit(1);
})().catch(err => { console.error(err.stack || err); process.exit(1); });
