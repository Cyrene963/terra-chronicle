const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.use({
  headless: false,
  viewport: { width: 1280, height: 720 }
});

test.describe('Terra Chronicle Battle Visual Quality Test', () => {
  test('Complete battle visual quality audit', async ({ page }) => {
    const screenshotDir = path.join(__dirname, 'test-screenshots', 'battle-visual');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const visualIssues = [];
    let screenshotCount = 0;

    function captureIssue(issue, severity, fixNeeded, screenshotPath) {
      visualIssues.push({ issue, severity, fix_needed: fixNeeded, screenshot: screenshotPath });
    }

    await page.goto('http://localhost:8866', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // 1. Check title screen quality
    console.log('[1/8] Checking title screen...');
    const titleVisible = await page.locator('#title').isVisible();
    if (!titleVisible) {
      captureIssue('Title screen not visible on load', 'critical', 'Check #title element display logic', null);
    } else {
      const titleScreenshot = path.join(screenshotDir, `01-title-screen.png`);
      await page.screenshot({ path: titleScreenshot, fullPage: false });
      screenshotCount++;
      console.log(`  Screenshot: ${titleScreenshot}`);
    }

    // Wait for mode selector (multiplayer UI replaces enter button)
    console.log('  Waiting for mode selector...');
    await page.waitForSelector('#modeSelector', { state: 'visible', timeout: 15000 });
    await page.waitForTimeout(1000); // Wait for animations to settle

    // Click offline mode card (solo is offline mode)
    await page.click('.mode-card[data-mode="offline"]', { timeout: 10000 });
    console.log('  Clicked offline mode, waiting for battle to initialize...');
    await page.waitForTimeout(3000);

    // 2. Check card readability with 5 cards in hand
    console.log('[2/8] Checking card readability (5 cards in hand)...');
    const cardContainer = await page.locator('#hand-cards').isVisible();
    if (!cardContainer) {
      captureIssue('Hand cards container not visible', 'critical', 'Check battle UI initialization', null);
    } else {
      const cards = await page.locator('#hand-cards > div').count();
      console.log(`  Found ${cards} cards in hand`);

      const handScreenshot = path.join(screenshotDir, `02-hand-cards-${cards}.png`);
      await page.screenshot({ path: handScreenshot, fullPage: false });
      screenshotCount++;

      if (cards < 3) {
        captureIssue('Too few cards in hand for readability test', 'medium', 'Ensure initial hand draw is working', handScreenshot);
      }

      // Check card text visibility
      const firstCard = page.locator('#hand-cards > div').first();
      const cardNameVisible = await firstCard.locator('text=/[\\u4e00-\\u9fa5]+/').isVisible().catch(() => false);
      if (!cardNameVisible) {
        captureIssue('Card name text not visible', 'high', 'Check card rendering CSS and font loading', handScreenshot);
      }

      // Check card size and overlap
      const cardBounds = await firstCard.boundingBox();
      if (cardBounds && cardBounds.width < 80) {
        captureIssue('Cards too small when 5 in hand', 'medium', 'Increase minimum card width in hand layout', handScreenshot);
      }
    }

    // 3. Check enemy sprite quality
    console.log('[3/8] Checking enemy sprite quality...');
    const enemySprite = page.locator('#b_eimg');
    const enemyVisible = await enemySprite.isVisible().catch(() => false);

    if (!enemyVisible) {
      captureIssue('Enemy sprite not visible', 'critical', 'Check enemy image loading and CSS', null);
    } else {
      const enemyScreenshot = path.join(screenshotDir, `03-enemy-sprite.png`);
      await enemySprite.screenshot({ path: enemyScreenshot });
      screenshotCount++;

      // Check for dirty edges (filter artifacts)
      const enemyStyle = await enemySprite.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          filter: computed.filter,
          imageRendering: computed.imageRendering,
          width: el.offsetWidth,
          height: el.offsetHeight
        };
      });

      console.log(`  Enemy sprite: ${enemyStyle.width}x${enemyStyle.height}, filter: ${enemyStyle.filter}`);

      if (enemyStyle.filter && enemyStyle.filter !== 'none' && enemyStyle.filter.includes('blur')) {
        captureIssue('Enemy sprite has blur filter (may cause dirty edges)', 'medium', 'Remove or reduce blur filters on enemy sprites', enemyScreenshot);
      }

      if (enemyStyle.imageRendering === 'auto' || enemyStyle.imageRendering === '') {
        captureIssue('Enemy sprite using default image-rendering (may be blurry)', 'low', 'Set image-rendering: pixelated or crisp-edges for pixel art', enemyScreenshot);
      }
    }

    // 4. Play a card and check impact effects
    console.log('[4/8] Checking impact effects...');
    const attackCard = page.locator('#hand-cards > div').first();
    const attackCardExists = await attackCard.count() > 0;

    if (!attackCardExists) {
      captureIssue('No attack card available to test impact effects', 'high', 'Ensure battle starts with playable cards', null);
    } else {
      await attackCard.click();
      await page.waitForTimeout(800); // Wait for full impact animation

      const impactScreenshot = path.join(screenshotDir, `04-impact-effects.png`);
      await page.screenshot({ path: impactScreenshot, fullPage: false });
      screenshotCount++;
      console.log(`  Screenshot: ${impactScreenshot}`);

      // Check if BattleEffects exists
      const battleEffectsExists = await page.evaluate(() => {
        return typeof window.BattleEffects !== 'undefined';
      });

      if (!battleEffectsExists) {
        captureIssue('BattleEffects system not loaded', 'critical', 'Ensure src/battle_effects.js is loaded before battle.js', impactScreenshot);
      } else {
        console.log('  BattleEffects system is loaded');
      }
    }

    // 5. Check damage number quality
    console.log('[5/8] Checking damage number quality...');
    await page.waitForTimeout(500);
    const damageNumberScreenshot = path.join(screenshotDir, `05-damage-numbers.png`);
    await page.screenshot({ path: damageNumberScreenshot, fullPage: false });
    screenshotCount++;

    // Check if damage numbers are visible and animated
    const damageNumberExists = await page.evaluate(() => {
      const dmgNums = document.querySelectorAll('[data-damage-number]');
      return dmgNums.length > 0;
    });

    if (!damageNumberExists) {
      captureIssue('Damage numbers not appearing after attack', 'high', 'Check spawnDamageNumber function and animation triggers', damageNumberScreenshot);
    }

    // 6. Check shield break animation (if enemy has block)
    console.log('[6/8] Checking shield break animation...');
    const enemyBlock = await page.evaluate(() => {
      return window.S?.enemy?.block || 0;
    });

    console.log(`  Enemy block: ${enemyBlock}`);

    if (enemyBlock > 0) {
      // Play cards until block is broken
      let attempts = 0;
      while (attempts < 5) {
        const currentBlock = await page.evaluate(() => window.S?.enemy?.block || 0);
        if (currentBlock === 0) break;

        const nextCard = page.locator('#hand-cards > div').first();
        const cardExists = await nextCard.count() > 0;
        if (!cardExists) {
          await page.click('#b_end'); // End turn to draw new cards
          await page.waitForTimeout(1500);
        } else {
          await nextCard.click();
          await page.waitForTimeout(600);
        }
        attempts++;
      }

      await page.waitForTimeout(500);
      const shieldBreakScreenshot = path.join(screenshotDir, `06-shield-break.png`);
      await page.screenshot({ path: shieldBreakScreenshot, fullPage: false });
      screenshotCount++;

      // Check if shield break effect was called
      const shieldBreakCalled = await page.evaluate(() => {
        return window.BattleEffects && typeof window.BattleEffects.shieldBreakEffect === 'function';
      });

      if (!shieldBreakCalled) {
        captureIssue('Shield break effect function not available', 'medium', 'Verify shieldBreakEffect is defined in battle_effects.js', shieldBreakScreenshot);
      }
    } else {
      console.log('  Enemy has no shield, skipping shield break test');
      const noShieldScreenshot = path.join(screenshotDir, `06-no-shield.png`);
      await page.screenshot({ path: noShieldScreenshot, fullPage: false });
      screenshotCount++;
      captureIssue('Cannot test shield break animation (enemy has no shield)', 'low', 'Add test scenario with shielded enemy', noShieldScreenshot);
    }

    // 7. Check multi-layer Hades-style effects
    console.log('[7/8] Checking Hades-style multi-layer effects...');

    // Check effect functions exist
    const effectsStatus = await page.evaluate(() => {
      if (!window.BattleEffects) return { loaded: false };
      return {
        loaded: true,
        createCardProjectile: typeof window.BattleEffects.createCardProjectile === 'function',
        createImpactExplosion: typeof window.BattleEffects.createImpactExplosion === 'function',
        spawnDamageNumber: typeof window.BattleEffects.spawnDamageNumber === 'function',
        screenShake: typeof window.BattleEffects.screenShake === 'function',
        shieldBreakEffect: typeof window.BattleEffects.shieldBreakEffect === 'function',
        levelUpCeremony: typeof window.BattleEffects.levelUpCeremony === 'function'
      };
    });

    console.log('  Effect functions status:', effectsStatus);

    if (!effectsStatus.loaded) {
      captureIssue('BattleEffects module not loaded', 'critical', 'Load src/battle_effects.js in index.html', null);
    } else {
      const missingEffects = [];
      for (const [key, value] of Object.entries(effectsStatus)) {
        if (key !== 'loaded' && !value) {
          missingEffects.push(key);
        }
      }
      if (missingEffects.length > 0) {
        captureIssue(`Missing Hades effect functions: ${missingEffects.join(', ')}`, 'high', 'Implement missing effect functions in battle_effects.js', null);
      }
    }

    // Play one more card to capture full effect cycle
    const finalCard = page.locator('#hand-cards > div').first();
    const finalCardExists = await finalCard.count() > 0;
    if (finalCardExists) {
      await finalCard.click();
      await page.waitForTimeout(400);
      const fullEffectScreenshot = path.join(screenshotDir, `07-hades-effects-full.png`);
      await page.screenshot({ path: fullEffectScreenshot, fullPage: false });
      screenshotCount++;
    }

    // 8. Check battle background and overall atmosphere
    console.log('[8/8] Checking battle background and atmosphere...');
    const atmosphereScreenshot = path.join(screenshotDir, `08-atmosphere.png`);
    await page.screenshot({ path: atmosphereScreenshot, fullPage: false });
    screenshotCount++;

    const backgroundStyle = await page.evaluate(() => {
      const body = document.body;
      const computed = window.getComputedStyle(body);
      const stage = document.querySelector('#stage');
      return {
        bodyBackground: computed.background,
        bodyBackgroundColor: computed.backgroundColor,
        stageExists: !!stage,
        stageVisible: stage ? window.getComputedStyle(stage).display !== 'none' : false
      };
    });

    console.log('  Background style:', backgroundStyle);

    if (!backgroundStyle.stageExists) {
      captureIssue('PixiJS stage canvas not found', 'critical', 'Ensure PixiJS application is initialized', atmosphereScreenshot);
    } else if (!backgroundStyle.stageVisible) {
      captureIssue('PixiJS stage canvas not visible', 'high', 'Check #stage CSS display property', atmosphereScreenshot);
    }

    // Calculate visual quality score
    let score = 100;
    visualIssues.forEach(issue => {
      switch (issue.severity) {
        case 'critical': score -= 20; break;
        case 'high': score -= 10; break;
        case 'medium': score -= 5; break;
        case 'low': score -= 2; break;
      }
    });
    score = Math.max(0, score);

    console.log('\n=== Battle Visual Quality Test Complete ===');
    console.log(`Screenshots taken: ${screenshotCount}`);
    console.log(`Visual issues found: ${visualIssues.length}`);
    console.log(`Visual quality score: ${score}/100`);

    if (visualIssues.length > 0) {
      console.log('\nIssues by severity:');
      const bySeverity = {};
      visualIssues.forEach(i => {
        bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
      });
      Object.entries(bySeverity).forEach(([sev, count]) => {
        console.log(`  ${sev}: ${count}`);
      });
    }

    // Write results to JSON
    const results = {
      test_area: 'Battle Visual Effects',
      screenshots_taken: screenshotCount,
      visual_issues: visualIssues,
      visual_quality_score: score
    };

    const resultPath = path.join(__dirname, 'battle-visual-test-result.json');
    fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));
    console.log(`\nResults written to: ${resultPath}`);

    // Test should pass even if there are visual issues (we're auditing, not blocking)
    expect(screenshotCount).toBeGreaterThan(0);
  });
});
