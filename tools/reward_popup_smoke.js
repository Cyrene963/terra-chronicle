const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { ROOT, scriptVersions, hasExpectedScript, badConsole } = require('./smoke_common');

const OUT = path.join(ROOT, 'dogfood-output', 'reward-popup-smoke-20260616');
fs.mkdirSync(OUT, { recursive: true });
const PUBLIC_BASE = process.env.TERRA_PUBLIC_BASE_URL || 'http://165.232.142.30:8867';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const consoleErrors = [];
  page.on('console', msg => { if (badConsole(msg)) consoleErrors.push(`${msg.type()}: ${msg.text()}`); });
  page.on('pageerror', err => consoleErrors.push(`pageerror: ${err.message}`));
  await page.goto(`${PUBLIC_BASE}/?reward_popup_smoke=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#enter', { timeout: 20000 });
  const scripts = await page.evaluate(() => [...document.scripts].map(s => s.src).filter(Boolean));
  const versions = scriptVersions();
  if (!hasExpectedScript(scripts, 'battle.js', versions)) throw new Error(`expected battle.js version not loaded: ${JSON.stringify({ versions, scripts })}`);
  await page.click('#enter');
  await page.waitForFunction(() => window.Battle && window.__dbg?.ready, null, { timeout: 20000 });
  await page.evaluate(() => {
    window.Battle.enter({
      deck: [{ name: '划击', type: 'atk', val: 120, cost: 0, desc: '测试秒杀' }],
      debugHand: [{ name: '划击', type: 'atk', val: 120, cost: 0, desc: '测试秒杀' }],
      isElite: true,
      onWin() {},
      onLose() {},
    });
  });
  await page.waitForSelector('#battle.on .card', { timeout: 30000 });
  await page.click('#battle .card');
  await page.waitForSelector('#battle .result.on', { timeout: 30000 });
  await page.screenshot({ path: path.join(OUT, 'reward_popup.png'), fullPage: false });
  const state = await page.evaluate(() => ({
    title: document.querySelector('#b_rtitle')?.textContent || '',
    loot: document.querySelector('#b_loot')?.textContent || '',
    rewards: [...document.querySelectorAll('#b_rewards .rewardChoice')].map(el => el.innerText.trim()),
    panel: document.querySelector('#b_result .rewardPanel')?.getBoundingClientRect() ? true : false,
    scripts: [...document.scripts].map(s => s.src).filter(Boolean),
  }));
  const report = { ok: consoleErrors.length === 0 && !!state.panel && state.rewards.length >= 5, versions, state, consoleErrors, screenshot: path.join(OUT, 'reward_popup.png') };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  if (!report.ok) process.exit(1);
})().catch(err => { console.error(err.stack || err.message); process.exit(1); });
