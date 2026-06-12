const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome' });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE:', m.text()); });
  await page.goto('http://127.0.0.1:8867/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/root/terra-chronicle-game/shots/01_title.png' });
  await page.evaluate(() => document.getElementById('enter').click());
  await page.waitForTimeout(4500);
  await page.screenshot({ path: '/root/terra-chronicle-game/shots/02_spawn.png' });

  // WASD 移动 + 镜头跟随验证
  const posBefore = await page.evaluate(() => window.__pp || null);
  await page.keyboard.down('d');
  await page.waitForTimeout(1800);
  await page.keyboard.up('d');
  await page.keyboard.down('w');
  await page.waitForTimeout(900);
  await page.keyboard.up('w');
  await page.screenshot({ path: '/root/terra-chronicle-game/shots/03_walked.png' });

  // 走到树后验证遮挡
  await page.keyboard.down('d');
  await page.waitForTimeout(2500);
  await page.keyboard.up('d');
  await page.screenshot({ path: '/root/terra-chronicle-game/shots/04_east.png' });

  // 点击耕地开面板
  await page.keyboard.down('a'); await page.keyboard.down('s');
  await page.waitForTimeout(2600);
  await page.keyboard.up('a'); await page.keyboard.up('s');
  await page.screenshot({ path: '/root/terra-chronicle-game/shots/05_back.png' });

  // 季节切换
  await page.keyboard.press('4');
  await page.waitForTimeout(1800);
  await page.screenshot({ path: '/root/terra-chronicle-game/shots/06_winter.png' });
  await page.keyboard.press('1');
  await browser.close();
  console.log('SHOTS_DONE');
})().catch(e => { console.error(e); process.exit(1); });
