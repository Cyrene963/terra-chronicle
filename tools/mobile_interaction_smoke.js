const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { badConsole } = require('./smoke_common');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dogfood-output', 'mobile-interaction-smoke');
const BASE = process.env.TERRA_PUBLIC_BASE_URL || 'http://127.0.0.1:8871';
const executablePath = process.env.TERRA_CHROMIUM_PATH || '/root/.cloakbrowser/chromium-146.0.7680.177.5/chrome';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-gpu', '--disable-gpu-compositing'] });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(`pageerror: ${err.message}`));
  page.on('console', msg => { if (badConsole(msg)) errors.push(`${msg.type()}: ${msg.text()}`); });
  await page.goto(`${BASE}/?mobile-interaction=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.click('#enter');
  await page.waitForFunction(() => window.__dbg?.ready && document.body.classList.contains('hud-on'), null, { timeout: 90000 });

  const states = [];
  const capture = async (label, selector) => {
    states.push(await page.evaluate(({ label, selector }) => {
      const el = document.querySelector(selector);
      const rect = el?.getBoundingClientRect();
      return {
        label, surface: window.SurfaceLifecycle?.active || null,
        locked: window.SurfaceLifecycle?.isInputLocked?.() || false,
        rect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom } : null,
        scroll: el ? { width: el.scrollWidth, height: el.scrollHeight, clientWidth: el.clientWidth, clientHeight: el.clientHeight } : null,
      };
    }, { label, selector }));
  };

  await page.evaluate(() => Alchemy.open());
  await page.waitForTimeout(120);
  await capture('alchemy-open', '#alchemyUI .panel');
  await page.evaluate(() => Alchemy.close({ immediate: true }));
  await capture('alchemy-close', '#alchemyUI');

  await page.evaluate(() => FarmUpgrade.open());
  await page.waitForTimeout(120);
  await capture('upgrade-open', '#upgradePanel .shell');
  await page.evaluate(() => FarmUpgrade.close({ immediate: true }));
  await capture('upgrade-close', '#upgradePanel');

  await page.evaluate(() => WorldMapIntegration.openMap());
  await page.waitForTimeout(200);
  await capture('map-open', '#worldMapOverlay');
  await page.evaluate(() => WorldMapIntegration.closeMap());
  await page.waitForTimeout(650);
  await capture('map-close', '#worldMapOverlay');

  await page.evaluate(() => DungeonMap.open());
  await page.waitForTimeout(180);
  await capture('dungeon-open', '#dungeonMap .mapCanvas');
  await page.evaluate(() => DungeonMap.close({ immediate: true }));
  await page.waitForTimeout(550);
  await capture('dungeon-close', '#dungeonMap');

  await page.evaluate(() => Battle.enter({ deck: [
    { name: '划击', type: 'atk', val: 6, cost: 1, desc: '造成伤害' },
    { name: '格挡', type: 'def', val: 5, cost: 1, desc: '获得护甲' },
    { name: '新芽', type: 'heal', val: 4, cost: 1, desc: '恢复生命' },
    { name: '蓄能', type: 'atk', val: 9, cost: 2, desc: '造成伤害' },
  ], debugHand: [
    { name: '划击', type: 'atk', val: 6, cost: 1, desc: '造成伤害' },
    { name: '格挡', type: 'def', val: 5, cost: 1, desc: '获得护甲' },
    { name: '新芽', type: 'heal', val: 4, cost: 1, desc: '恢复生命' },
    { name: '蓄能', type: 'atk', val: 9, cost: 2, desc: '造成伤害' },
  ], isElite: true, onWin() {}, onLose() {} }));
  await page.waitForSelector('#battle.on .card', { timeout: 30000 });
  await capture('battle-open', '#battle .hand');
  const battle = await page.evaluate(() => {
    const hand = document.querySelector('#battle .hand');
    const cards = [...document.querySelectorAll('#battle .card')].map(el => { const r = el.getBoundingClientRect(); return { width: r.width, height: r.height }; });
    const end = document.querySelector('#battle .endBtn')?.getBoundingClientRect();
    return { cardCount: cards.length, cards, handScrollable: hand.scrollWidth > hand.clientWidth, endHeight: end?.height || 0 };
  });
  await page.evaluate(() => SurfaceLifecycle.beforeOpen('alchemy'));
  await page.waitForTimeout(700);
  await capture('battle-closed-by-switch', '#battle');
  const battleClosedBySwitch = await page.evaluate(() => !document.querySelector('#battle')?.classList.contains('on'));
  await page.evaluate(() => Alchemy.close({ immediate: true }));

  const viewportFailures = states.filter(s => s.label.endsWith('-open') && s.rect && (s.rect.x < -1 || s.rect.right > 391 || s.rect.width > 391));
  const closeFailures = states.filter(s => s.label.endsWith('-close') && (s.surface || s.locked));
  const switched = states.find(s => s.label === 'battle-closed-by-switch');
  const report = { baseUrl: BASE, states, battle, battleClosedBySwitch, viewportFailures, closeFailures, errors };
  report.ok = errors.length === 0 && viewportFailures.length === 0 && closeFailures.length === 0 &&
    battleClosedBySwitch && switched?.surface === 'alchemy' && switched?.locked === true &&
    battle.cardCount >= 4 && battle.handScrollable && battle.cards.every(c => c.width <= 130 && c.height <= 190) && battle.endHeight >= 44;
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  if (!report.ok) process.exit(1);
})().catch(err => { console.error(err.stack || err); process.exit(1); });
