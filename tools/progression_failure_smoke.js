const { chromium } = require('playwright');

const BASE = process.env.TERRA_PUBLIC_BASE_URL || 'http://127.0.0.1:8871';
const CHROME = process.env.TERRA_CHROMIUM_PATH;

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-gpu', '--disable-gpu-compositing'],
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await context.addInitScript(() => localStorage.clear());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${BASE}/?progression-failure=${Date.now()}`, { waitUntil: 'domcontentloaded' });
  await page.click('#enter');
  await page.waitForFunction(() => window.__dbg?.ready, null, { timeout: 60000 });

  const breed = await page.evaluate(() => {
    Terra.farm.inventory.materials.beast_soul = 9;
    Terra.farm.inventory.materials.blight_seed = 9;
    const originalSave = Terra.save;
    Terra.save = () => false;
    const before = {
      materials: { ...Terra.farm.inventory.materials },
      beasts: structuredClone(Terra.farm.beasts),
      fireVisible: !!__dbg.fireBeast,
    };
    __dbg.openBreed();
    const buttons = Array.from(document.querySelectorAll('#breedOpts button'));
    buttons.find(button => button.textContent.includes('孵化 火灵兽'))?.click();
    const afterHatch = {
      materials: { ...Terra.farm.inventory.materials },
      beasts: structuredClone(Terra.farm.beasts),
      fireVisible: !!__dbg.fireBeast,
      whisper: document.querySelector('#whisper')?.textContent || '',
    };
    Array.from(document.querySelectorAll('#breedOpts button')).find(button => button.textContent.includes('巡田进化'))?.click();
    const afterEvolution = {
      materials: { ...Terra.farm.inventory.materials },
      beasts: structuredClone(Terra.farm.beasts),
      whisper: document.querySelector('#whisper')?.textContent || '',
    };
    Terra.save = originalSave;
    return { before, afterHatch, afterEvolution };
  });

  const upgrade = await page.evaluate(() => {
    Terra.farm.inventory.materials.wood = 999;
    Terra.farm.inventory.materials.beast_soul = 999;
    Terra.farm.upgrades = [];
    const originalSave = Terra.save;
    Terra.save = () => false;
    FarmUpgrade.open();
    const before = {
      materials: { ...Terra.farm.inventory.materials },
      upgrades: [...Terra.farm.upgrades],
    };
    document.querySelector('#upgradePanel .upg:not(.locked):not(.owned)')?.click();
    const after = {
      materials: { ...Terra.farm.inventory.materials },
      upgrades: [...Terra.farm.upgrades],
      toast: document.querySelector('#upgradePanel .toast')?.textContent || '',
    };
    Terra.save = originalSave;
    return { before, after };
  });

  const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
  const report = {
    testClass: 'api-transaction-smoke',
    base: BASE,
    breed,
    upgrade,
    errors,
  };
  report.ok = !errors.length
    && same(breed.before.materials, breed.afterHatch.materials)
    && same(breed.before.beasts, breed.afterHatch.beasts)
    && breed.afterHatch.fireVisible === breed.before.fireVisible
    && breed.afterHatch.whisper.includes('状态未提交')
    && same(breed.before.materials, breed.afterEvolution.materials)
    && same(breed.before.beasts, breed.afterEvolution.beasts)
    && breed.afterEvolution.whisper.includes('状态未提交')
    && same(upgrade.before.materials, upgrade.after.materials)
    && same(upgrade.before.upgrades, upgrade.after.upgrades)
    && upgrade.after.toast.includes('升级状态均未提交');

  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  if (!report.ok) process.exit(1);
})().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});
