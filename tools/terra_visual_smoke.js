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

  await page.goto('https://terra.bz9.me/?smoke=v58-obtainment-gate', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForFunction(() => {
    const enter = document.querySelector('#enter');
    return !!enter && getComputedStyle(enter).visibility !== 'hidden' && getComputedStyle(enter).display !== 'none';
  }, null, { timeout: 20000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, '01_title.png'), fullPage: false });

  const scripts = await page.evaluate(() => [...document.scripts].map(s => s.src).filter(Boolean));
  if (!scripts.some(src => src.includes('alchemy.js?v=40'))) throw new Error('public page did not load alchemy.js?v=40');
  if (!scripts.some(src => src.includes('main.js?v=58'))) throw new Error('public page did not load main.js?v=58');

  await page.click('#enter');
  await page.waitForFunction(() => window.__dbg && window.__dbg.ready, null, { timeout: 12000 });
  await page.waitForTimeout(1800);
  const petState = await page.evaluate(() => {
    const required = ['beast_shrine_fox_spirit', 'beast_sacred_fawnling', 'beast_white_serpent_shrine', 'beast_deepsea_noble'];
    const beastSpecies = (window.__dbg?.beasts || []).map(b => b.species);
    const petKinds = (window.__dbg?.companionPets || []).map(p => p._kind);
    const behaviorModes = required.map(id => window.__dbg?.companionBehaviors?.[id]?.mode || '');
    return { required, beastSpecies, petKinds, behaviorModes };
  });
  const wronglyOwned = petState.required.filter(id => petState.beastSpecies.includes(id) || petState.petKinds.includes(id));
  if (wronglyOwned.length) throw new Error(`selected pets should not be owned or visible before obtainment: ${JSON.stringify({ wronglyOwned, petState })}`);
  if (petState.behaviorModes.some(mode => !mode)) throw new Error(`missing pet behavior modes: ${JSON.stringify(petState)}`);
  const petLoopState = await page.evaluate(() => {
    const farm = window.__dbg.farm;
    farm.inventory.materials.beast_soul = Math.max(farm.inventory.materials.beast_soul || 0, 8);
    farm.inventory.materials.blight_seed = Math.max(farm.inventory.materials.blight_seed || 0, 3);
    const required = ['beast_shrine_fox_spirit', 'beast_sacred_fawnling', 'beast_white_serpent_shrine', 'beast_deepsea_noble'];
    required.forEach(id => window.__dbg.grantSelectedPet(id, 'smoke_obtainment'));
    window.__dbg.syncCompanionPets();
    window.__dbg.openBreed();
    const before = window.__dbg.selectedPets;
    const options = Array.from(document.querySelectorAll('#breedOpts button')).map(btn => btn.innerText);
    const target = Array.from(document.querySelectorAll('#breedOpts button')).find(btn => btn.innerText.includes('神社狐灵'));
    if (target && !target.disabled) target.click();
    const after = window.__dbg.selectedPets;
    const petKinds = (window.__dbg?.companionPets || []).map(p => p._kind);
    return { before, after, options, petKinds, ecoDetail: document.querySelector('#ecoDetail')?.textContent || '' };
  });
  const requiredPetNames = ['神社狐灵', '御鹿幼灵', '白蛇社灵', '深海贵族'];
  if (!requiredPetNames.every(name => petLoopState.options.some(text => text.includes(name)))) throw new Error(`selected pet awakening options missing after obtainment: ${JSON.stringify(petLoopState)}`);
  if (petLoopState.petKinds.length !== 4) throw new Error(`selected pets not visible after obtainment: ${JSON.stringify(petLoopState)}`);
  const foxAfter = petLoopState.after.find(p => p.name === '神社狐灵');
  if (!foxAfter || foxAfter.level < 2 || foxAfter.branch === '未分支' || foxAfter.passive !== '狐火巡界') throw new Error(`selected pet awakening failed: ${JSON.stringify(petLoopState)}`);
  const petMotion = await page.evaluate(async () => {
    await new Promise(resolve => {
      const start = performance.now();
      const tick = () => {
        const pets = window.__dbg?.companionPets || [];
        const ready = pets.length === 4 && pets.every(p => p._body && p._body.texture && p._body.texture.width > 1);
        if (ready || performance.now() - start > 3000) resolve();
        else requestAnimationFrame(tick);
      };
      tick();
    });
    const snap = () => (window.__dbg?.companionPets || []).map(p => ({ kind: p._kind, x: p.x, y: p.y, bodyY: p._body?.y || 0, sx: p._body?.scale?.x || 0, sy: p._body?.scale?.y || 0 }));
    const before = snap();
    await new Promise(resolve => setTimeout(resolve, 1200));
    const after = snap();
    return { before, after };
  });
  const moved = petMotion.before.filter((pt, idx) => {
    const other = petMotion.after[idx];
    return other && (Math.abs(pt.x - other.x) > 0.01 || Math.abs(pt.y - other.y) > 0.01 || Math.abs(pt.bodyY - other.bodyY) > 0.01 || Math.abs(pt.sx - other.sx) > 0.0001 || Math.abs(pt.sy - other.sy) > 0.0001);
  });
  if (moved.length < 4) throw new Error(`pet motion not visible enough after obtainment: ${JSON.stringify(petMotion)}`);
  if (!foxAfter || foxAfter.level < 2 || foxAfter.branch === '未分支' || foxAfter.passive !== '狐火巡界') throw new Error(`selected pet awakening failed: ${JSON.stringify(petLoopState)}`);
  await page.waitForTimeout(1800);
  const worldPath = path.join(OUT, '02_world.png');
  await page.screenshot({ path: worldPath, fullPage: false });
  await page.click('#beastPanel');
  await page.waitForTimeout(250);
  const petCodexState = await page.evaluate(() => ({
    rows: document.querySelectorAll('#petCodexList .pet').length,
    useButtons: document.querySelectorAll('#petCodexList .petUse').length,
    text: document.querySelector('#petCodexList')?.textContent || '',
  }));
  if (petCodexState.rows !== 4 || petCodexState.useButtons !== 4 || !petCodexState.text.includes('神社狐灵')) throw new Error(`pet codex missing: ${JSON.stringify(petCodexState)}`);
  const activeState = await page.evaluate(() => {
    const before={...window.__dbg.farm.inventory.materials};
    window.__dbg.useSelectedPetActive('beast_shrine_fox_spirit');
    window.__dbg.useSelectedPetActive('beast_white_serpent_shrine');
    return {before, after:{...window.__dbg.farm.inventory.materials}, pets:window.__dbg.beasts.filter(b=>b.species.startsWith('beast_')).map(b=>({species:b.species,activeUses:b.activeUses||0}))};
  });
  if ((activeState.after.spirit_charm||0) <= (activeState.before.spirit_charm||0) || (activeState.after.water_essence||0) <= (activeState.before.water_essence||0)) throw new Error(`pet active failed: ${JSON.stringify(activeState)}`);
  await page.click('#petCodexClose');
  const worldPixels = await visibleNonBlackPixels(page, worldPath);

  await page.evaluate(() => {
    const tx = 22, ty = 28;
    window.__dbg.commandTo(tx * 64 + 32, ty * 64 + 32);
  });
  await page.waitForTimeout(1200);

  const evolutionState = await page.evaluate(() => {
    const farm = window.__dbg.farm;
    farm.inventory.materials.beast_soul = Math.max(farm.inventory.materials.beast_soul || 0, 2);
    farm.inventory.materials.blight_seed = Math.max(farm.inventory.materials.blight_seed || 0, 1);
    window.__dbg.openBreed();
    const options = Array.from(document.querySelectorAll('#breedOpts button')).map(btn => btn.innerText);
    const branch = Array.from(document.querySelectorAll('#breedOpts button')).find(btn => btn.innerText.includes('巡田进化'));
    if (branch && !branch.disabled) branch.click();
    const water = farm.beasts.find(b => b.species === 'water_spirit');
    return { options, level: water?.level || 0, branch: water?.evolutionBranch || '', panelOpen: getComputedStyle(document.querySelector('#breedPanel')).opacity };
  });
  if (!evolutionState.options.some(t => t.includes('巡田进化')) || !evolutionState.options.some(t => t.includes('灵脉进化')) || evolutionState.level < 2 || evolutionState.branch !== 'irrigation') {
    throw new Error(`evolution branch flow failed: ${JSON.stringify(evolutionState)}`);
  }

  await page.evaluate(() => {
    const farm = window.__dbg.farm;
    farm.inventory.crops.starwheat = [{ originFertility: 92 }, { originFertility: 88 }, { originFertility: 91 }];
    farm.inventory.crops.dewberry = [{ originFertility: 95 }, { originFertility: 90 }, { originFertility: 93 }];
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
  await page.waitForTimeout(1800);
  const firstCardName = await page.evaluate(() => document.querySelector('#cvName')?.textContent || '');
  if (firstCardName !== '新芽守卫') throw new Error(`first card missing: ${firstCardName}`);
  await page.screenshot({ path: path.join(OUT, '04_card_reveal.png'), fullPage: false });

  const result = await page.evaluate(() => ({
    titleVisible: !!document.querySelector('#title'),
    dbgReady: !!window.__dbg?.ready,
    ecoStatus: document.querySelector('#ecoStatus')?.textContent || '',
    ecoScore: document.querySelector('#ecoScore')?.textContent || '',
    ecoDetail: document.querySelector('#ecoDetail')?.textContent || '',
    dbgEcology: !!window.__dbg?.ecology,
    fpsBadge: document.querySelector('#fpsVal')?.textContent || '',
    qualityBadge: document.querySelector('#qualityVal')?.textContent || '',
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
  if (!result.ecoStatus || !result.ecoScore || !result.dbgEcology || !result.fpsBadge || !result.qualityBadge) throw new Error(`hud/debug missing: ${JSON.stringify(result)}`);
  if (!result.cardRevealOn || !result.cardName) throw new Error(`card reveal failed: ${JSON.stringify(result)}`);
  if (consoleErrors.length) throw new Error(`console/page errors: ${consoleErrors.join(' | ')}`);
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})().catch(async err => {
  console.error(err.stack || err.message);
  process.exit(1);
});
