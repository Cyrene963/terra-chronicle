const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args:['--no-sandbox'], executablePath: '/root/.cloakbrowser/chromium-146.0.7680.177.5/chrome' });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errs=[];
  page.on('pageerror', e => errs.push('PAGEERROR: '+e.message));
  page.on('console', m => { if (m.type()==='error') errs.push('CONSOLE: '+m.text()); });
  await page.goto('http://127.0.0.1:8867/index.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.getElementById('enter').click());
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'shots/v1_spawn.png' });
  // 行走中连拍两帧验证序列帧
  await page.keyboard.down('d');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'shots/v2_walkA.png' });
  await page.waitForTimeout(350);
  await page.screenshot({ path: 'shots/v2_walkB.png' });
  await page.keyboard.up('d');
  await page.waitForTimeout(600);
  // 大陆地图
  await page.evaluate(() => window.WorldMapIntegration && WorldMapIntegration.openMap());
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'shots/v3_worldmap.png' });
  await page.evaluate(() => window.WorldMapIntegration && WorldMapIntegration.closeMap());
  await page.waitForTimeout(500);
  // 邻居图鉴
  await page.evaluate(() => { const t=document.getElementById('neighborTrigger'); if(t) t.click(); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'shots/v4_neighbors.png' });
  await page.keyboard.press('Escape');
  await page.evaluate(() => { const p=document.getElementById('neighborPanel'); if(p) p.style.display='none'; });
  // 战斗
  await page.evaluate(() => window.Battle && Battle.enter({deck:[], onWin:()=>{}, onLose:()=>{}}));
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'shots/v5_battle.png' });
  console.log('ERRS:'+errs.length); errs.slice(0,5).forEach(e=>console.log(e));
  await browser.close();
})();
