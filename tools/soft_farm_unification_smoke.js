const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dogfood-output', 'soft-farm-unification-20260615');
fs.mkdirSync(OUT, { recursive: true });

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => pageErrors.push(String(err)));
  await page.goto('https://terra.bz9.me/?soft_farm_unification=20260615', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => {
    const enter = document.querySelector('#enter');
    return !!enter && getComputedStyle(enter).visibility !== 'hidden' && getComputedStyle(enter).display !== 'none';
  }, null, { timeout: 20000 });
  await page.waitForTimeout(1000);
  await page.click('#enter');
  await page.waitForFunction(() => window.__dbg && window.__dbg.ready, null, { timeout: 15000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    window.__dbg?.hatchFire?.();
    window.__dbg?.grantSelectedPet?.('water_serpent', 'soft_farm_visual_smoke');
    window.__dbg?.grantSelectedPet?.('fire_fox', 'soft_farm_visual_smoke');
    window.__dbg?.syncCompanionPets?.();
  });
  await page.waitForFunction(() => {
    const water = window.__dbg?.beast?._body;
    const fire = window.__dbg?.fireBeast?._body;
    const firstVisibleFrame = body => body && [...body.children].find(child => child.visible);
    const waterFrame = firstVisibleFrame(water);
    const fireFrame = firstVisibleFrame(fire);
    return waterFrame && fireFrame && waterFrame.texture?.width > 1 && fireFrame.texture?.width > 1;
  }, null, { timeout: 10000 });
  await page.waitForTimeout(1500);
  const state = await page.evaluate(() => {
    const beasts = (window.__dbg?.beasts || []).map(b => ({ species: b.species, assignment: b.assignment, obtainedFrom: b.obtainedFrom || b.source || null }));
    const selected = (window.__dbg?.selectedPets || []).map(p => ({ species: p.species, name: p.name, level: p.level }));
    const companions = (window.__dbg?.companionPets || []).map(p => ({
      kind: p._kind || p.species,
      textureWidth: p._body?.texture?.width || p.node?.texture?.width || 0,
      textureHeight: p._body?.texture?.height || p.node?.texture?.height || 0,
      scaleX: p.node?.scale?.x,
      scaleY: p.node?.scale?.y,
      bodyScaleX: p._body?.scale?.x,
      bodyScaleY: p._body?.scale?.y
    }));
    const water = window.__dbg?.beast?._body;
    const fire = window.__dbg?.fireBeast?._body;
    const frameState = body => {
      if (!body) return null;
      const frame = [...body.children].find(child => child.visible) || body.children[0];
      return frame ? { texW: frame.texture?.width || 0, texH: frame.texture?.height || 0, w: frame.width, h: frame.height, sx: body.scale?.x, sy: body.scale?.y, ratio: body.scale?.x / body.scale?.y } : null;
    };
    return {
      beasts,
      selected,
      companions,
      elemental: {
        water: frameState(water),
        fire: frameState(fire)
      },
      scripts: [...document.scripts].map(s => s.src).filter(Boolean)
    };
  });
  await page.screenshot({ path: path.join(OUT, 'public_soft_farm_water_fire.png'), fullPage: false });
  const srcWater = path.join(ROOT, 'assets/sprites/beast_water.png');
  const liveWater = '/var/www/terra-pixijs/assets/sprites/beast_water.png';
  const srcFire = path.join(ROOT, 'assets/sprites/beast_fire.png');
  const liveFire = '/var/www/terra-pixijs/assets/sprites/beast_fire.png';
  const report = {
    ok: true,
    state,
    hashes: {
      sourceWater: sha256(srcWater),
      liveWater: sha256(liveWater),
      sourceFire: sha256(srcFire),
      liveFire: sha256(liveFire)
    },
    consoleErrors,
    pageErrors,
    screenshot: path.join(OUT, 'public_soft_farm_water_fire.png')
  };
  if (report.hashes.sourceWater !== report.hashes.liveWater || report.hashes.sourceFire !== report.hashes.liveFire) {
    throw new Error(`deployed asset hash mismatch: ${JSON.stringify(report.hashes)}`);
  }
  if (!state.scripts.some(src => src.includes('src/main.js?v=61'))) throw new Error(`public page did not load main.js?v=61: ${JSON.stringify(state.scripts)}`);
  if (!state.elemental.water || !state.elemental.fire || state.elemental.water.texW <= 1 || state.elemental.fire.texW <= 1) {
    throw new Error(`elemental beast sheets did not load: ${JSON.stringify(state.elemental)}`);
  }
  if (Math.abs(state.elemental.water.ratio - 1) > 0.0001 || Math.abs(state.elemental.fire.ratio - 1) > 0.0001) {
    throw new Error(`elemental beast non-uniform scale detected: ${JSON.stringify(state.elemental)}`);
  }
  if (consoleErrors.length || pageErrors.length) {
    throw new Error(`page errors: ${JSON.stringify({ consoleErrors, pageErrors })}`);
  }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
