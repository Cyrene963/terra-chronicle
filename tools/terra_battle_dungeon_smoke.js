const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = '/root/terra-chronicle-game';
const OUT = path.join(ROOT, 'dogfood-output', 'terra-battle-dungeon-smoke');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') consoleErrors.push(`${msg.type()}: ${text}`);
    if (msg.type() === 'warning' && !/WebGL.*ReadPixels|GPU stall due to ReadPixels/i.test(text)) {
      consoleErrors.push(`${msg.type()}: ${text}`);
    }
  });
  page.on('pageerror', err => pageErrors.push(err.stack || String(err)));

  await page.goto('https://terra.bz9.me/?v=40-battle-dungeon-smoke', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#enter', { timeout: 20000 });
  await page.click('#enter');
  await page.waitForFunction(() => window.Battle && window.DungeonMap && window.__dbg?.ready, null, { timeout: 30000 });

  const scripts = await page.evaluate(() => Array.from(document.scripts).map(s => s.src).filter(Boolean));
  const versionsOk = scripts.some(s => s.includes('battle.js?v=52')) && scripts.some(s => s.includes('dungeon.js?v=42'));

  await page.evaluate(() => {
    window.Battle.enter({
      deck: [
        { name: '划击', type: 'atk', val: 6, cost: 1, desc: '造成 6 点伤害' },
        { name: '格挡', type: 'def', val: 5, cost: 1, desc: '获得 5 点护甲' },
        { name: '蓄能', type: 'atk', val: 9, cost: 2, desc: '造成 9 点伤害' },
        { name: '新芽愈合', type: 'heal', val: 5, cost: 1, desc: '恢复 5 点生命' }
      ],
      debugHand: [
        { name: '划击', type: 'atk', val: 6, cost: 1, desc: '造成 6 点伤害' },
        { name: '格挡', type: 'def', val: 5, cost: 1, desc: '获得 5 点护甲' },
        { name: '蓄能', type: 'atk', val: 9, cost: 2, desc: '造成 9 点伤害' },
        { name: '新芽愈合', type: 'heal', val: 5, cost: 1, desc: '恢复 5 点生命' }
      ],
      isElite: true,
      buffs: [{ id: 'abyss_vigor', hpMax: 8, fights: 2 }, { id: 'ember_focus', energyFirstTurn: 1, fights: 1 }, { id: 'root_guard', shield: 6, fights: 2 }],
      onWin() {},
      onLose() {}
    });
  });
  await page.waitForSelector('#battle.on .card', { timeout: 30000 });
  await page.screenshot({ path: path.join(OUT, '01_battle_cards.png'), fullPage: false });
  const battleState = await page.evaluate(() => {
    const card = document.querySelector('#battle .card');
    const rewardCard = document.querySelector('#battle .rewardChoice');
    const style = card ? getComputedStyle(card) : null;
    return {
      active: !!document.querySelector('#battle.on'),
      cardCount: document.querySelectorAll('#battle .card').length,
      cardBackground: style?.backgroundImage || '',
      cardText: card?.innerText || '',
      cardArtSources: Array.from(document.querySelectorAll('#battle .card .cartImg')).map(img => img.getAttribute('src')),
      hpText: document.querySelector('#b_vnum')?.textContent || '',
      energy: document.querySelector('#b_orb')?.textContent || '',
      buffLine: document.querySelector('#b_buffs')?.textContent || '',
      shieldBar: document.querySelector('#b_shbar')?.style.transform || '',
      turnText: document.querySelector('#b_turn')?.textContent || '',
      enemyName: document.querySelector('#b_ename')?.textContent || '',
      enemySrc: document.querySelector('#b_eimg')?.getAttribute('src') || '',
    };
  });
  if (!battleState.cardBackground.includes('card_template.png')) throw new Error('battle card template not applied');
  for (const requiredArt of ['card_art_slash.png', 'card_art_guard.png', 'card_art_charge.png', 'card_art_heal.png']) {
    if (!battleState.cardArtSources.some(src => src.includes(requiredArt))) throw new Error(`missing battle card art ${requiredArt}: ${JSON.stringify(battleState)}`);
  }
  if (!battleState.enemyName.includes('菌甲精英') || !battleState.enemySrc.includes('enemy_root_worm.png')) {
    throw new Error(`root worm enemy not applied: ${JSON.stringify(battleState)}`);
  }
  if (!battleState.hpText.includes('68') || battleState.energy !== '4' || !battleState.buffLine.includes('深渊活力')) {
    throw new Error(`battle buffs not applied: ${JSON.stringify(battleState)}`);
  }

  await page.evaluate(() => {
    const battle = document.querySelector('#battle');
    if (battle) { battle.classList.remove('on'); battle.style.display = 'none'; }
    window.DungeonMap.open();
  });
  await page.waitForSelector('#dungeonMap.on .node .reward', { timeout: 30000 });
  await page.screenshot({ path: path.join(OUT, '02_dungeon_preview.png'), fullPage: false });
  const dungeonState = await page.evaluate(() => ({
    active: !!document.querySelector('#dungeonMap.on'),
    rewards: Array.from(document.querySelectorAll('#dungeonMap .node .reward')).map(e => e.textContent.trim()),
    hasSpecificPreview: Array.from(document.querySelectorAll('#dungeonMap .node .reward')).some(e => e.textContent.includes('临时祝福') || e.textContent.includes('根甲护佑') || e.textContent.includes('深渊核心'))
  }));
  if (!dungeonState.hasSpecificPreview) throw new Error('dungeon reward preview missing');

  await browser.close();
  const report = { ok: consoleErrors.length === 0 && pageErrors.length === 0, versionsOk, battleState, dungeonState, consoleErrors, pageErrors, outDir: OUT };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok || !versionsOk) process.exit(1);
})().catch(async err => {
  console.error(err.stack || err);
  process.exit(1);
});
