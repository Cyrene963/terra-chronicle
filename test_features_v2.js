const { chromium } = require('playwright');

(async () => {
  console.log('🎮 Starting Terra Chronicle Feature Test Suite V2\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('❌ Browser Error:', msg.text());
  });

  const results = {
    sound: {},
    tutorial: {},
    recipes: {},
    ecology: {},
    animations: {},
    rivers: {}
  };

  try {
    console.log('📍 Loading game at http://localhost:8867...');
    await page.goto('http://localhost:8867', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // =========================
    // 1. SOUND SYSTEM TESTS
    // =========================
    console.log('\n🔊 Testing Sound System...');

    const soundCheck = await page.evaluate(() => {
      const controls = document.querySelector('#soundControls');
      const muteBtn = document.querySelector('#muteBtn');
      const volumeSlider = document.querySelector('#volumeSlider');

      return {
        controls_exist: !!controls,
        mute_button_exists: !!muteBtn,
        volume_slider_exists: !!volumeSlider,
        has_sound_js: typeof SoundSystem !== 'undefined',
        sound_initialized: window.soundSystem && typeof window.soundSystem.play === 'function'
      };
    });

    Object.assign(results.sound, soundCheck);
    console.log(`  Controls exist: ${soundCheck.controls_exist ? '✅' : '❌'}`);
    console.log(`  Mute button exists: ${soundCheck.mute_button_exists ? '✅' : '❌'}`);
    console.log(`  Volume slider exists: ${soundCheck.volume_slider_exists ? '✅' : '❌'}`);
    console.log(`  Sound system loaded: ${soundCheck.has_sound_js ? '✅' : '❌'}`);
    console.log(`  Sound initialized: ${soundCheck.sound_initialized ? '✅' : '❌'}`);

    // =========================
    // 2. ENTER GAME
    // =========================
    console.log('\n🎮 Entering game...');

    await page.evaluate(() => {
      const btn = document.querySelector('#enter');
      if (btn) btn.click();
    });

    await page.waitForTimeout(4000); // Wait for transition
    console.log('  Game entered ✅');

    // Test sound controls work in-game
    const soundInGameTest = await page.evaluate(() => {
      const muteBtn = document.querySelector('#muteBtn');
      if (!muteBtn) return { mute_toggle_works: false };

      const initialText = muteBtn.textContent;
      muteBtn.click();
      const mutedText = muteBtn.textContent;

      // Toggle back
      muteBtn.click();

      return {
        mute_toggle_works: initialText !== mutedText,
        initial_icon: initialText,
        muted_icon: mutedText
      };
    });

    results.sound.mute_toggle_works = soundInGameTest.mute_toggle_works;
    console.log(`  Mute toggle works: ${soundInGameTest.mute_toggle_works ? '✅' : '❌'}`);

    // =========================
    // 3. TUTORIAL SYSTEM TESTS
    // =========================
    console.log('\n📚 Testing Tutorial System...');

    await page.waitForTimeout(2000);

    const tutorialCheck = await page.evaluate(() => {
      return {
        system_exists: typeof TutorialSystem !== 'undefined',
        tutorial_instance: !!window.tutorial,
        whisper_element: !!document.querySelector('#whisper'),
        hint_action_element: !!document.querySelector('#hintAction'),
        tutorial_has_hints: window.tutorial && window.tutorial.hints && window.tutorial.hints.length > 0
      };
    });

    Object.assign(results.tutorial, tutorialCheck);
    console.log(`  Tutorial system exists: ${tutorialCheck.system_exists ? '✅' : '❌'}`);
    console.log(`  Tutorial initialized: ${tutorialCheck.tutorial_instance ? '✅' : '❌'}`);
    console.log(`  Whisper element: ${tutorialCheck.whisper_element ? '✅' : '❌'}`);
    console.log(`  Hint action element: ${tutorialCheck.hint_action_element ? '✅' : '❌'}`);
    console.log(`  Has hints defined: ${tutorialCheck.tutorial_has_hints ? '✅' : '❌'}`);

    // =========================
    // 4. MORE RECIPES TEST
    // =========================
    console.log('\n🎴 Testing Recipe System...');

    const recipeCheck = await page.evaluate(() => {
      if (typeof RECIPES === 'undefined') return { count: 0, valid: false };

      const count = RECIPES.length;
      const firstRecipe = RECIPES[0] || {};
      const hasStructure = 'wheat' in firstRecipe && 'wood' in firstRecipe && 'name' in firstRecipe;

      // Check for variety
      const uniqueNames = new Set(RECIPES.map(r => r.name));

      return {
        count: count,
        has_15_recipes: count >= 15,
        correct_structure: hasStructure,
        unique_recipes: uniqueNames.size,
        sample_recipe: firstRecipe.name || 'unknown'
      };
    });

    Object.assign(results.recipes, recipeCheck);
    console.log(`  Recipe count: ${recipeCheck.count} ${recipeCheck.has_15_recipes ? '✅' : '❌'}`);
    console.log(`  Correct structure: ${recipeCheck.correct_structure ? '✅' : '❌'}`);
    console.log(`  Unique recipes: ${recipeCheck.unique_recipes} ${recipeCheck.unique_recipes >= 15 ? '✅' : '❌'}`);
    console.log(`  Sample recipe: ${recipeCheck.sample_recipe}`);

    // =========================
    // 5. ECOLOGICAL CHAINS TEST
    // =========================
    console.log('\n🌱 Testing Ecological Chains...');

    const ecologyCheck = await page.evaluate(() => {
      return {
        check_function_exists: typeof checkEcologicalChains === 'function',
        greenhouse_function_exists: typeof applyGreenhouseEffect === 'function',
        steam_function_exists: typeof applySteamEffect === 'function',
        ecology_integration: typeof window.ecologyEnabled !== 'undefined'
      };
    });

    Object.assign(results.ecology, ecologyCheck);
    console.log(`  Check function exists: ${ecologyCheck.check_function_exists ? '✅' : '❌'}`);
    console.log(`  Greenhouse effect: ${ecologyCheck.greenhouse_function_exists ? '✅' : '❌'}`);
    console.log(`  Steam effect: ${ecologyCheck.steam_function_exists ? '✅' : '❌'}`);
    console.log(`  Integration active: ${ecologyCheck.ecology_integration ? '✅' : '❌'}`);

    // =========================
    // 6. WALK ANIMATIONS TEST
    // =========================
    console.log('\n🚶 Testing Walk Animations...');

    // Simulate player movement and check
    const animationCheck = await page.evaluate(() => {
      const hasPlayer = !!window.player;
      const playerHasSprite = window.player && window.player.sprite;
      const playerHasTextures = playerHasSprite && window.player.sprite.textures;

      const hasBeast = window.beasts && window.beasts.length > 0;
      const beastHasSprite = hasBeast && window.beasts[0].sprite;
      const beastHasTextures = beastHasSprite && window.beasts[0].sprite.textures;

      return {
        player_exists: hasPlayer,
        player_has_sprite: playerHasSprite,
        player_has_walk_animation: playerHasTextures && (
          window.player.sprite.textures.length > 1 ||
          window.player.walkFrames ||
          window.player.animationFrames
        ),
        beast_exists: hasBeast,
        beast_has_sprite: beastHasSprite,
        beast_has_walk_animation: beastHasTextures && (
          window.beasts[0].sprite.textures.length > 1 ||
          window.beasts[0].walkFrames ||
          window.beasts[0].animationFrames
        )
      };
    });

    Object.assign(results.animations, animationCheck);
    console.log(`  Player exists: ${animationCheck.player_exists ? '✅' : '❌'}`);
    console.log(`  Player has sprite: ${animationCheck.player_has_sprite ? '✅' : '❌'}`);
    console.log(`  Player walk animation: ${animationCheck.player_has_walk_animation ? '✅' : '❌'}`);
    console.log(`  Beast exists: ${animationCheck.beast_exists ? '✅' : '❌'}`);
    console.log(`  Beast has sprite: ${animationCheck.beast_has_sprite ? '✅' : '❌'}`);
    console.log(`  Beast walk animation: ${animationCheck.beast_has_walk_animation ? '✅' : '❌'}`);

    // =========================
    // 7. DIAGONAL RIVERS TEST
    // =========================
    console.log('\n🌊 Testing Diagonal Rivers...');

    const riverCheck = await page.evaluate(() => {
      if (!window.tiles) return { tiles_exist: false };

      let hasDiagonalRivers = false;
      let waterTileCount = 0;

      for (let row of window.tiles) {
        for (let tile of row) {
          if (tile.type === 'water') {
            waterTileCount++;
            if (tile.isDiagonal || tile.diagonalDir) {
              hasDiagonalRivers = true;
            }
          }
        }
      }

      return {
        tiles_exist: true,
        water_tiles_count: waterTileCount,
        has_diagonal_rivers: hasDiagonalRivers,
        render_container_exists: !!window.app && !!window.app.stage
      };
    });

    Object.assign(results.rivers, riverCheck);
    console.log(`  Tiles exist: ${riverCheck.tiles_exist ? '✅' : '❌'}`);
    console.log(`  Water tiles: ${riverCheck.water_tiles_count}`);
    console.log(`  Diagonal rivers: ${riverCheck.has_diagonal_rivers ? '✅' : '❌'}`);
    console.log(`  Render container: ${riverCheck.render_container_exists ? '✅' : '❌'}`);

    // =========================
    // 8. SEASONAL EVENTS TEST
    // =========================
    console.log('\n🎊 Testing Seasonal Events...');

    const eventsCheck = await page.evaluate(() => {
      return {
        seasonal_events_exist: typeof SeasonalEvents !== 'undefined',
        events_initialized: !!window.seasonalEvents,
        event_indicator_exists: !!document.querySelector('#eventIndicator'),
        event_btn_exists: !!document.querySelector('#eventBtn')
      };
    });

    Object.assign(results.events, eventsCheck);
    console.log(`  Seasonal events system: ${eventsCheck.seasonal_events_exist ? '✅' : '❌'}`);
    console.log(`  Events initialized: ${eventsCheck.events_initialized ? '✅' : '❌'}`);
    console.log(`  Event indicator: ${eventsCheck.event_indicator_exists ? '✅' : '❌'}`);
    console.log(`  Event button: ${eventsCheck.event_btn_exists ? '✅' : '❌'}`);

    // =========================
    // VISUAL CHECKS
    // =========================
    console.log('\n📸 Taking screenshots...');
    await page.screenshot({ path: '/root/terra-chronicle-game/test_main_view.png', fullPage: false });
    console.log('  Main view captured ✅');

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();

    // =========================
    // GENERATE REPORT
    // =========================
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL TEST REPORT');
    console.log('='.repeat(60));

    const sections = [
      { name: '🔊 Sound System', data: results.sound },
      { name: '📚 Tutorial System', data: results.tutorial },
      { name: '🎴 Recipe System', data: results.recipes },
      { name: '🌱 Ecological Chains', data: results.ecology },
      { name: '🚶 Walk Animations', data: results.animations },
      { name: '🌊 Diagonal Rivers', data: results.rivers },
      { name: '🎊 Seasonal Events', data: results.events || {} }
    ];

    let totalTests = 0;
    let passedTests = 0;

    sections.forEach(section => {
      console.log(`\n${section.name}:`);
      Object.entries(section.data).forEach(([key, value]) => {
        if (typeof value === 'boolean' || (typeof value === 'number' && key.includes('count'))) {
          totalTests++;
          const passed = value === true || (typeof value === 'number' && value > 0);
          if (passed) passedTests++;
          const icon = passed ? '✅' : '❌';
          console.log(`  ${icon} ${key.replace(/_/g, ' ')}: ${value}`);
        } else {
          console.log(`  ℹ️  ${key.replace(/_/g, ' ')}: ${value}`);
        }
      });
    });

    console.log('\n' + '='.repeat(60));
    console.log(`Overall: ${passedTests}/${totalTests} tests passed (${Math.round(passedTests/totalTests*100)}%)`);
    console.log('='.repeat(60) + '\n');

    // Output JSON for parsing
    console.log('\n--- JSON RESULTS ---');
    console.log(JSON.stringify(results, null, 2));
  }
})();
