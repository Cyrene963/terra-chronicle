const { chromium } = require('playwright');

const BASE = process.env.TERRA_PUBLIC_BASE_URL || 'http://127.0.0.1:8871';
const CHROME = process.env.TERRA_CHROMIUM_PATH;

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-gpu', '--disable-gpu-compositing'],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  await context.addInitScript(() => {
    if (!sessionStorage.getItem('init')) {
      localStorage.clear();
      sessionStorage.setItem('init', '1');
    }
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  const enter = async () => {
    await page.click('#enter');
    await page.waitForFunction(() => window.__dbg?.ready);
  };

  await page.goto(`${BASE}/?loot=${Date.now()}`, { waitUntil: 'domcontentloaded' });
  await enter();
  const before = await page.evaluate(() => ({
    beasts: Terra.farm.beasts.length,
    wood: Terra.farm.inventory.materials.wood || 0,
  }));
  const granted = await page.evaluate(() => {
    const summary = DungeonMap.grantLoot({
      wood: 4,
      buff: { id: 'abyss_vigor', hpMax: 8, fights: 2 },
      beast: { species: 'spring_drop', element: 'water', level: 1, assignment: 'irrigate' },
    });
    return {
      summary,
      materials: { ...Terra.farm.inventory.materials },
      beasts: Terra.farm.beasts.map(beast => beast.species),
    };
  });

  const failedGrant = await page.evaluate(() => {
    const beforeFailure = {
      materials: { ...Terra.farm.inventory.materials },
      beasts: Terra.farm.beasts.map(beast => beast.species),
    };
    const originalSave = Terra.save;
    Terra.save = () => false;
    const result = DungeonMap.grantLoot({
      wood: 9,
      buff: { id: 'should_rollback', fights: 3 },
      beast: { species: 'should_rollback', element: 'fire', level: 1 },
    });
    Terra.save = originalSave;
    return {
      result,
      beforeFailure,
      materials: { ...Terra.farm.inventory.materials },
      beasts: Terra.farm.beasts.map(beast => beast.species),
    };
  });

  await page.evaluate(() => {
    const lethalCard = { name: '验收斩击', type: 'atk', atk: 9999, val: 9999, cost: 0, desc: '测试秒杀' };
    Terra.farm.inventory.cards = [lethalCard];
    const originalEnter = Battle.enter.bind(Battle);
    Battle.enter = options => {
      Battle.enter = originalEnter;
      originalEnter({ ...options, debugHand: [lethalCard] });
    };
    DungeonMap.open();
  });
  await page.waitForSelector('#dungeonMap.on .node.combat.current:not(.locked)', { timeout: 30000 });
  await page.locator('#dungeonMap.on .node.combat.current:not(.locked)').first().click();
  await page.waitForSelector('#battle.on .card', { timeout: 30000 });
  await page.locator('#battle.on .card', { hasText: '验收斩击' }).click();
  await page.waitForSelector('#battle .result.on', { timeout: 30000 });
  await page.waitForSelector('#battle .result.on .rewardChoice', { timeout: 30000 });
  await page.locator('#battle .result.on .rewardChoice').first().click();
  await page.waitForSelector('#dungeonMap.on .node.event.current:not(.locked)', { timeout: 30000 });
  const routeFailureState = await page.evaluate(() => {
    const beforeMaterials = { ...Terra.farm.inventory.materials };
    const originalSave = Terra.save;
    Terra.save = () => false;
    document.querySelector('#dungeonMap .node.event.current:not(.locked)')?.click();
    Terra.save = originalSave;
    const eventNode = document.querySelector('#dungeonMap .node.event');
    const bossNode = document.querySelector('#dungeonMap .node.boss');
    return {
      beforeMaterials,
      materials: { ...Terra.farm.inventory.materials },
      eventCurrent: eventNode?.classList.contains('current') || false,
      eventCompleted: eventNode?.classList.contains('completed') || false,
      bossLocked: bossNode?.classList.contains('locked') || false,
      toast: document.querySelector('#dungeonToast')?.textContent || '',
    };
  });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await enter();
  const after = await page.evaluate(() => ({
    materials: { ...Terra.farm.inventory.materials },
    beasts: Terra.farm.beasts.map(beast => beast.species),
  }));

  const report = { testClass: 'api-transaction-smoke', base: BASE, before, granted, failedGrant, routeFailureState, after, errors };
  report.ok = !errors.length
    && granted.materials.wood === before.wood + 4
    && !('buff' in granted.materials)
    && !('beast' in granted.materials)
    && granted.beasts.includes('spring_drop')
    && failedGrant.result === null
    && JSON.stringify(failedGrant.materials) === JSON.stringify(failedGrant.beforeFailure.materials)
    && JSON.stringify(failedGrant.beasts) === JSON.stringify(failedGrant.beforeFailure.beasts)
    && !failedGrant.beasts.includes('should_rollback')
    && routeFailureState.eventCurrent
    && !routeFailureState.eventCompleted
    && routeFailureState.bossLocked
    && routeFailureState.toast.includes('奖励与路线进度均未提交')
    && JSON.stringify(routeFailureState.materials) === JSON.stringify(routeFailureState.beforeMaterials)
    && after.beasts.includes('spring_drop')
    && !after.beasts.includes('should_rollback')
    && !('buff' in after.materials)
    && !('beast' in after.materials);

  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  if (!report.ok) process.exit(1);
})().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});
