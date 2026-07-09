const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { scriptVersions, hasExpectedScript, badConsole } = require('./smoke_common');

const ROOT = '/root/terra-chronicle-game';
const OUT = path.join(ROOT, 'dogfood-output', 'terra-battle-dungeon-smoke');
const PUBLIC_BASE = process.env.TERRA_PUBLIC_BASE_URL || 'http://165.232.142.30:8867';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', msg => { if (badConsole(msg)) consoleErrors.push(`${msg.type()}: ${msg.text()}`); });
  page.on('pageerror', err => pageErrors.push(err.stack || String(err)));

  await page.goto(`${PUBLIC_BASE}/?v=40-battle-dungeon-smoke`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#enter', { timeout: 20000 });
  await page.click('#enter');
  await page.waitForFunction(() => window.Battle && window.DungeonMap && window.__dbg?.ready, null, { timeout: 30000 });

  const scripts = await page.evaluate(() => Array.from(document.scripts).map(s => s.src).filter(Boolean));
  const versions = scriptVersions();
  const versionsOk = hasExpectedScript(scripts, 'battle.js', versions) && hasExpectedScript(scripts, 'dungeon.js', versions);

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
  await page.waitForFunction(() => {
    const fade = document.querySelector('#sceneFade');
    return !fade || Number(getComputedStyle(fade).opacity) < 0.05;
  }, null, { timeout: 5000 }).catch(() => {});
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
  if (!battleState.cardBackground.includes('card_frame_terra_real.png')) throw new Error('battle real card frame not applied');
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
  await page.waitForSelector('#dungeonMap.on .node img.icon', { timeout: 30000 });
  await page.screenshot({ path: path.join(OUT, '02_dungeon_preview.png'), fullPage: false });
  const dungeonState = await page.evaluate(() => ({
    active: !!document.querySelector('#dungeonMap.on'),
    rewards: Array.from(document.querySelectorAll('#dungeonMap .node')).map(e => e.title.trim()),
    iconSources: Array.from(document.querySelectorAll('#dungeonMap .node img.icon')).map(e => e.getAttribute('src')),
    hasSpecificPreview: Array.from(document.querySelectorAll('#dungeonMap .node')).some(e => e.title.includes('临时祝福') || e.title.includes('根甲护佑') || e.title.includes('深渊核心'))
  }));
  if (!dungeonState.hasSpecificPreview) throw new Error('dungeon reward preview missing');
  if (!dungeonState.iconSources.some(src => src.includes('node_combat.png')) || !dungeonState.iconSources.some(src => src.includes('node_boss.png'))) throw new Error(`dungeon generated node icons missing: ${JSON.stringify(dungeonState)}`);

  const dungeonLoot = await page.evaluate(() => {
    return window.DungeonMap.grantLoot({ wood: 2, beast_soul: 1, buff: { id: 'ember_focus', energyFirstTurn: 1, fights: 1 } });
  });
  if (!dungeonLoot.includes('wood×2') || !dungeonLoot.includes('beast_soul×1')) throw new Error(`grantLoot failed: ${dungeonLoot}`);

  const capturePage = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  capturePage.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') consoleErrors.push(`${msg.type()}: ${text}`);
  });
  capturePage.on('pageerror', err => pageErrors.push(err.stack || String(err)));
  await capturePage.goto(`${PUBLIC_BASE}/?v=54-capture-smoke`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await capturePage.waitForSelector('#enter', { timeout: 20000 });
  await capturePage.click('#enter');
  await capturePage.waitForFunction(() => window.Battle && window.__dbg?.ready, null, { timeout: 30000 });
  await capturePage.evaluate(() => {
    window.Battle.enter({
      deck: [{ name: '划击', type: 'atk', val: 60, cost: 0, desc: '测试秒杀' }],
      debugHand: [{ name: '划击', type: 'atk', val: 60, cost: 0, desc: '测试秒杀' }],
      onWin(loot) {
        window.__captureLoot = loot;
        const f = window.Terra.farm;
        if (loot?.beast) {
          f.beasts ??= [];
          f.beasts.push({ id: `smoke_${Date.now()}`, ...loot.beast, stamina: 100, xp: 0, evolution: { diet: {}, laborHistory: {} } });
          window.normalizeBeasts?.();
          window.updateBeastRosterUI?.();
          window.Terra.save();
        }
      },
      onLose() {}
    });
  });
  await capturePage.waitForSelector('#battle.on .card', { timeout: 30000 });
  await capturePage.click('#battle .card');
  await capturePage.waitForSelector('#battle .result.on .rewardChoice', { timeout: 30000 });
  const captureRewardTexts = await capturePage.evaluate(() => Array.from(document.querySelectorAll('#battle .rewardChoice')).map(el => el.textContent.trim()));
  await capturePage.evaluate(() => {
    if (!window.Battle.pickRewardByName('驯化春露兽')) throw new Error('capture reward missing');
  });
  await capturePage.waitForFunction(() => window.__captureLoot || (JSON.parse(localStorage.getItem('terra_farm') || '{}').beasts || []).some(b => b.species === 'spring_drop'), null, { timeout: 8000 });
  const captureState = await capturePage.evaluate(() => ({
    rewardTexts: window.__captureRewardTexts || [],
    captureLoot: window.__captureLoot || null,
    waterBeasts: window.Terra.farm.beasts.filter(b => b.element === 'water' || b.species === 'water_spirit' || b.species === 'spring_drop').length,
    beastName: document.querySelector('#beastName')?.textContent || '',
    savedBeasts: JSON.parse(localStorage.getItem('terra_farm') || '{}').beasts?.filter(b => b.element === 'water' || b.species === 'water_spirit' || b.species === 'spring_drop').length || 0,
  }));
  if (captureState.waterBeasts < 2 || captureState.savedBeasts < 2 || !captureState.beastName.includes('春露兽群')) {
    throw new Error(`capture loop failed: ${JSON.stringify({...captureState, captureRewardTexts})}`);
  }
  await capturePage.close();

  await browser.close();
  const report = { ok: consoleErrors.length === 0 && pageErrors.length === 0, versionsOk, versions, battleState, dungeonState, captureState, consoleErrors, pageErrors, outDir: OUT };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok || !versionsOk) process.exit(1);
})().catch(async err => {
  console.error(err.stack || err);
  process.exit(1);
});
