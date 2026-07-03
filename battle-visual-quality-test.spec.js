const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.use({
  headless: false,
  viewport: { width: 1280, height: 720 }
});

test.describe('Terra Chronicle Battle Visual Quality Audit', () => {
  test('Battle system visual quality comprehensive test', async ({ page }) => {
    const screenshotDir = path.join('/root/terra-chronicle-game/test-screenshots', 'battle-visual');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const visualIssues = [];
    let screenshotCount = 0;

    console.log('=== Starting Battle Visual Quality Test ===\n');

    // Navigate to game
    console.log('[1/9] Loading game...');
    await page.goto('http://localhost:8866', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Take initial screenshot
    const initialScreenshot = path.join(screenshotDir, '01-initial-load.png');
    await page.screenshot({ path: initialScreenshot, fullPage: false });
    screenshotCount++;
    console.log(`  Screenshot: ${initialScreenshot}`);

    // Wait for mode selector and enter offline mode
    console.log('[2/9] Entering offline battle mode...');
    await page.waitForSelector('#modeSelector', { state: 'visible', timeout: 15000 });
    await page.waitForTimeout(1000);

    const modeSelectorScreenshot = path.join(screenshotDir, '02-mode-selector.png');
    await page.screenshot({ path: modeSelectorScreenshot, fullPage: false });
    screenshotCount++;

    await page.click('.mode-card[data-mode="offline"]', { timeout: 10000 });
    console.log('  Entered offline mode, waiting for world initialization...');
    await page.waitForTimeout(4000);

    // Check if we're in world view or battle view
    const inBattle = await page.evaluate(() => {
      return document.getElementById('battle')?.style.display !== 'none';
    });

    if (!inBattle) {
      console.log('  Not in battle yet, looking for battle entry point...');

      // Try to find and click dungeon/battle button
      const dungeonBtn = await page.locator('button:has-text("地下城"), button:has-text("战斗"), button:has-text("探险")').first();
      const dungeonExists = await dungeonBtn.count() > 0;

      if (dungeonExists) {
        await dungeonBtn.click();
        await page.waitForTimeout(3000);
      } else {
        // Check for beast encounter or other battle trigger
        const beastEncounter = await page.evaluate(() => {
          // Try to trigger a battle through console
          if (window.Terra && window.Terra.encounter) {
            window.Terra.encounter('wolf', 1);
            return true;
          }
          return false;
        });

        if (!beastEncounter) {
          visualIssues.push({
            issue: 'Cannot find battle entry point from main menu',
            severity: 'critical',
            fix_needed: 'Add clear battle/dungeon button or ensure test can programmatically start battle',
            screenshot: modeSelectorScreenshot
          });
        }

        await page.waitForTimeout(2000);
      }
    }

    // Verify battle screen is now visible
    const battleVisible = await page.evaluate(() => {
      const battle = document.getElementById('battle');
      return battle && battle.style.display !== 'none';
    });

    if (!battleVisible) {
      visualIssues.push({
        issue: 'Battle screen not visible after entry attempt',
        severity: 'critical',
        fix_needed: 'Ensure battle initialization works in offline mode',
        screenshot: modeSelectorScreenshot
      });

      // Try to force battle state
      await page.evaluate(() => {
        if (window.startBattle) {
          window.startBattle({ name: '森林狼', level: 1, hp: 30, maxHp: 30 });
        }
      });
      await page.waitForTimeout(2000);
    }

    const battleScreenshot = path.join(screenshotDir, '03-battle-screen.png');
    await page.screenshot({ path: battleScreenshot, fullPage: false });
    screenshotCount++;
    console.log(`  Screenshot: ${battleScreenshot}`);

    // Test Area 1: Card clarity and readability
    console.log('[3/9] Testing card clarity (5 cards in hand)...');

    const handCardsVisible = await page.locator('#hand-cards').isVisible().catch(() => false);

    if (!handCardsVisible) {
      visualIssues.push({
        issue: 'Hand cards container (#hand-cards) not visible',
        severity: 'critical',
        fix_needed: 'Verify battle UI HTML structure and CSS display properties',
        screenshot: battleScreenshot
      });
    } else {
      const cardCount = await page.locator('#hand-cards > div').count();
      console.log(`  Found ${cardCount} cards in hand`);

      const handScreenshot = path.join(screenshotDir, '04-hand-cards.png');
      await page.locator('#hand-cards').screenshot({ path: handScreenshot });
      screenshotCount++;

      if (cardCount === 0) {
        visualIssues.push({
          issue: 'No cards in hand - card draw system not working',
          severity: 'critical',
          fix_needed: 'Check drawCard() function and initial hand generation',
          screenshot: handScreenshot
        });
      } else if (cardCount < 3) {
        visualIssues.push({
          issue: `Only ${cardCount} cards in hand (expected 3-5 for readability test)`,
          severity: 'high',
          fix_needed: 'Ensure initial hand draws sufficient cards',
          screenshot: handScreenshot
        });
      } else {
        // Check card visual quality
        const cardVisualData = await page.evaluate(() => {
          const cards = Array.from(document.querySelectorAll('#hand-cards > div'));
          return cards.map(card => {
            const rect = card.getBoundingClientRect();
            const style = window.getComputedStyle(card);
            const nameEl = card.querySelector('.card-name, [class*="name"]');
            return {
              width: rect.width,
              height: rect.height,
              fontSize: style.fontSize,
              hasName: !!nameEl,
              nameVisible: nameEl ? nameEl.offsetParent !== null : false,
              opacity: style.opacity
            };
          });
        });

        console.log('  Card visual data:', cardVisualData);

        if (cardVisualData.some(c => c.width < 60)) {
          visualIssues.push({
            issue: 'Cards too narrow when multiple cards in hand',
            severity: 'medium',
            fix_needed: 'Increase min-width in card CSS or adjust hand spacing',
            screenshot: handScreenshot
          });
        }

        if (cardVisualData.some(c => !c.hasName || !c.nameVisible)) {
          visualIssues.push({
            issue: 'Card names not visible or missing',
            severity: 'high',
            fix_needed: 'Check card HTML template includes name element with proper CSS',
            screenshot: handScreenshot
          });
        }
      }
    }

    // Test Area 2: Enemy sprite quality
    console.log('[4/9] Testing enemy sprite quality...');

    const enemyVisible = await page.locator('#b_eimg').isVisible().catch(() => false);

    if (!enemyVisible) {
      visualIssues.push({
        issue: 'Enemy sprite (#b_eimg) not visible',
        severity: 'critical',
        fix_needed: 'Check enemy image loading, src attribute, and CSS display',
        screenshot: battleScreenshot
      });
    } else {
      const enemyScreenshot = path.join(screenshotDir, '05-enemy-sprite.png');
      await page.locator('#b_eimg').screenshot({ path: enemyScreenshot });
      screenshotCount++;

      const enemyData = await page.evaluate(() => {
        const img = document.getElementById('b_eimg');
        const style = window.getComputedStyle(img);
        return {
          src: img.src,
          width: img.offsetWidth,
          height: img.offsetHeight,
          filter: style.filter,
          imageRendering: style.imageRendering,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          complete: img.complete
        };
      });

      console.log('  Enemy sprite data:', enemyData);

      if (!enemyData.complete || enemyData.naturalWidth === 0) {
        visualIssues.push({
          issue: 'Enemy sprite image failed to load',
          severity: 'critical',
          fix_needed: 'Check image path and ensure sprite assets are deployed',
          screenshot: enemyScreenshot
        });
      }

      if (enemyData.filter && enemyData.filter.includes('blur')) {
        visualIssues.push({
          issue: 'Enemy sprite has blur filter applied (causes dirty edges)',
          severity: 'high',
          fix_needed: 'Remove blur filters from enemy sprite CSS',
          screenshot: enemyScreenshot
        });
      }

      if (enemyData.width < 80 || enemyData.height < 80) {
        visualIssues.push({
          issue: 'Enemy sprite too small for visual impact',
          severity: 'medium',
          fix_needed: 'Increase enemy sprite size to 120x120 or larger',
          screenshot: enemyScreenshot
        });
      }
    }

    // Test Area 3: Hit effects (slash, particles, screen shake)
    console.log('[5/9] Testing hit effects...');

    const hasPlayableCard = await page.locator('#hand-cards > div').count() > 0;

    if (hasPlayableCard) {
      // Click first card
      await page.locator('#hand-cards > div').first().click();
      await page.waitForTimeout(100); // Capture mid-animation

      const hitEffectMid = path.join(screenshotDir, '06-hit-effect-mid.png');
      await page.screenshot({ path: hitEffectMid, fullPage: false });
      screenshotCount++;

      await page.waitForTimeout(600); // Wait for full animation

      const hitEffectEnd = path.join(screenshotDir, '07-hit-effect-end.png');
      await page.screenshot({ path: hitEffectEnd, fullPage: false });
      screenshotCount++;

      // Check if BattleEffects system exists
      const effectsData = await page.evaluate(() => {
        if (!window.BattleEffects) return { loaded: false };

        return {
          loaded: true,
          hasProjectile: typeof window.BattleEffects.createCardProjectile === 'function',
          hasImpact: typeof window.BattleEffects.createImpactExplosion === 'function',
          hasScreenShake: typeof window.BattleEffects.screenShake === 'function',
          hasSlashEffect: typeof window.BattleEffects.slashEffect === 'function'
        };
      });

      console.log('  Effects system:', effectsData);

      if (!effectsData.loaded) {
        visualIssues.push({
          issue: 'BattleEffects module not loaded',
          severity: 'critical',
          fix_needed: 'Add <script src="src/battle_effects.js"></script> to index.html',
          screenshot: hitEffectEnd
        });
      } else {
        if (!effectsData.hasProjectile || !effectsData.hasImpact) {
          visualIssues.push({
            issue: 'Core hit effect functions missing',
            severity: 'high',
            fix_needed: 'Implement createCardProjectile and createImpactExplosion in battle_effects.js',
            screenshot: hitEffectEnd
          });
        }

        if (!effectsData.hasScreenShake) {
          visualIssues.push({
            issue: 'Screen shake effect not implemented',
            severity: 'medium',
            fix_needed: 'Add screenShake function to battle_effects.js',
            screenshot: hitEffectEnd
          });
        }
      }
    } else {
      visualIssues.push({
        issue: 'No cards available to test hit effects',
        severity: 'high',
        fix_needed: 'Ensure battle starts with playable cards in hand',
        screenshot: battleScreenshot
      });
    }

    // Test Area 4: Damage numbers
    console.log('[6/9] Testing damage number quality...');

    await page.waitForTimeout(500);
    const damageNumScreenshot = path.join(screenshotDir, '08-damage-numbers.png');
    await page.screenshot({ path: damageNumScreenshot, fullPage: false });
    screenshotCount++;

    const damageNumData = await page.evaluate(() => {
      const damageNums = Array.from(document.querySelectorAll('[data-damage-number], .damage-number'));
      return {
        count: damageNums.length,
        hasDamageNumFunction: typeof window.BattleEffects?.spawnDamageNumber === 'function',
        visible: damageNums.filter(el => el.offsetParent !== null).length
      };
    });

    console.log('  Damage numbers:', damageNumData);

    if (!damageNumData.hasDamageNumFunction) {
      visualIssues.push({
        issue: 'Damage number spawn function not implemented',
        severity: 'high',
        fix_needed: 'Implement spawnDamageNumber in battle_effects.js',
        screenshot: damageNumScreenshot
      });
    } else if (damageNumData.visible === 0) {
      visualIssues.push({
        issue: 'Damage numbers not appearing after attack',
        severity: 'high',
        fix_needed: 'Verify spawnDamageNumber is called in attack handler',
        screenshot: damageNumScreenshot
      });
    }

    // Test Area 5: Hades-style multi-layered effects
    console.log('[7/9] Testing Hades-style multi-layer effects...');

    const hadesEffectsData = await page.evaluate(() => {
      if (!window.BattleEffects) return { loaded: false };

      return {
        loaded: true,
        hasLevelUpCeremony: typeof window.BattleEffects.levelUpCeremony === 'function',
        hasShieldBreak: typeof window.BattleEffects.shieldBreakEffect === 'function',
        hasMultiHit: typeof window.BattleEffects.multiHitEffect === 'function',
        hasCriticalEffect: typeof window.BattleEffects.criticalHitEffect === 'function'
      };
    });

    console.log('  Hades-style effects:', hadesEffectsData);

    if (!hadesEffectsData.loaded) {
      visualIssues.push({
        issue: 'BattleEffects system not available for Hades-style effects',
        severity: 'critical',
        fix_needed: 'Load battle_effects.js module',
        screenshot: battleScreenshot
      });
    } else {
      const missingEffects = [];
      if (!hadesEffectsData.hasLevelUpCeremony) missingEffects.push('levelUpCeremony');
      if (!hadesEffectsData.hasShieldBreak) missingEffects.push('shieldBreakEffect');

      if (missingEffects.length > 0) {
        visualIssues.push({
          issue: `Missing Hades-style effects: ${missingEffects.join(', ')}`,
          severity: 'medium',
          fix_needed: 'Implement multi-layered particle effects for special events',
          screenshot: battleScreenshot
        });
      }
    }

    // Test Area 6: Shield break animation
    console.log('[8/9] Testing shield break animation...');

    const enemyHasShield = await page.evaluate(() => {
      return window.S?.enemy?.block > 0;
    });

    if (enemyHasShield) {
      console.log('  Enemy has shield, testing break animation...');

      // Play cards until shield breaks
      let breakAttempts = 0;
      while (breakAttempts < 3) {
        const currentBlock = await page.evaluate(() => window.S?.enemy?.block || 0);
        if (currentBlock === 0) break;

        const nextCard = page.locator('#hand-cards > div').first();
        if (await nextCard.count() > 0) {
          await nextCard.click();
          await page.waitForTimeout(700);
        } else {
          break;
        }
        breakAttempts++;
      }

      const shieldBreakScreenshot = path.join(screenshotDir, '09-shield-break.png');
      await page.screenshot({ path: shieldBreakScreenshot, fullPage: false });
      screenshotCount++;
    } else {
      console.log('  Enemy has no shield, cannot test animation');
      visualIssues.push({
        issue: 'Cannot test shield break animation (enemy has no shield in this battle)',
        severity: 'low',
        fix_needed: 'Create test scenario with shielded enemy for full coverage',
        screenshot: battleScreenshot
      });
    }

    // Test Area 7: Battle background and atmosphere
    console.log('[9/9] Testing battle background and atmosphere...');

    const atmosphereScreenshot = path.join(screenshotDir, '10-atmosphere.png');
    await page.screenshot({ path: atmosphereScreenshot, fullPage: false });
    screenshotCount++;

    const atmosphereData = await page.evaluate(() => {
      const body = document.body;
      const bodyStyle = window.getComputedStyle(body);
      const stage = document.getElementById('stage');
      const battleDiv = document.getElementById('battle');

      return {
        bodyBg: bodyStyle.backgroundColor,
        bodyBgImage: bodyStyle.backgroundImage,
        stageExists: !!stage,
        stageVisible: stage ? stage.style.display !== 'none' : false,
        stageSize: stage ? { w: stage.offsetWidth, h: stage.offsetHeight } : null,
        battleBg: battleDiv ? window.getComputedStyle(battleDiv).backgroundColor : null
      };
    });

    console.log('  Atmosphere data:', atmosphereData);

    if (!atmosphereData.stageExists) {
      visualIssues.push({
        issue: 'PixiJS stage canvas (#stage) not found',
        severity: 'critical',
        fix_needed: 'Ensure PixiJS application initialization creates #stage canvas',
        screenshot: atmosphereScreenshot
      });
    } else if (!atmosphereData.stageVisible) {
      visualIssues.push({
        issue: 'PixiJS stage not visible',
        severity: 'high',
        fix_needed: 'Check #stage CSS - may be display:none or z-index issue',
        screenshot: atmosphereScreenshot
      });
    }

    if (atmosphereData.bodyBg === 'rgba(0, 0, 0, 0)' && atmosphereData.bodyBgImage === 'none') {
      visualIssues.push({
        issue: 'No background styling on battle screen',
        severity: 'medium',
        fix_needed: 'Add atmospheric background (gradient, texture, or parallax scene)',
        screenshot: atmosphereScreenshot
      });
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
      const counts = { critical: 0, high: 0, medium: 0, low: 0 };
      visualIssues.forEach(i => counts[i.severity]++);
      Object.entries(counts).forEach(([sev, count]) => {
        if (count > 0) console.log(`  ${sev}: ${count}`);
      });
    }

    // Write results
    const results = {
      test_area: 'Battle Visual Effects - Comprehensive 7-Area Audit',
      screenshots_taken: screenshotCount,
      visual_issues: visualIssues,
      visual_quality_score: score
    };

    const resultPath = '/root/terra-chronicle-game/battle-visual-result.json';
    fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));
    console.log(`\nResults written to: ${resultPath}`);

    expect(screenshotCount).toBeGreaterThan(0);
  });
});
