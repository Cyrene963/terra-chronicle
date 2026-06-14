const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log('🎮 Terra Chronicle Feature Test Suite\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('❌ Browser Error:', msg.text());
  });

  const results = {
    sound: {},
    tutorial: {},
    recipes: {},
    ecology: {},
    animations: {},
    rivers: {},
    events: {}
  };

  try {
    console.log('📍 Loading game at http://localhost:8867...');
    await page.goto('http://localhost:8867', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    await page.waitForFunction(() => typeof PIXI !== 'undefined', { timeout: 10000 });
    console.log('  PIXI loaded ✅');
    await sleep(3000);

    // 1. SOUND SYSTEM
    console.log('\n🔊 Testing Sound System...');
    const soundCheck = await page.evaluate(() => {
      return {
        controls_exist: !!document.querySelector('#soundControls'),
        mute_button_exists: !!document.querySelector('#muteBtn'),
        volume_slider_exists: !!document.querySelector('#volumeSlider'),
        has_sound_js: typeof SoundSystem !== 'undefined',
        sound_initialized: window.soundSystem && typeof window.soundSystem.play === 'function'
      };
    });

    Object.assign(results.sound, soundCheck);
    console.log(`  Controls exist: ${soundCheck.controls_exist ? '✅' : '❌'}`);
    console.log(`  Mute button: ${soundCheck.mute_button_exists ? '✅' : '❌'}`);
    console.log(`  Volume slider: ${soundCheck.volume_slider_exists ? '✅' : '❌'}`);
    console.log(`  Sound system loaded: ${soundCheck.has_sound_js ? '✅' : '❌'}`);
    console.log(`  Sound initialized: ${soundCheck.sound_initialized ? '✅' : '❌'}`);

    // 2. ENTER GAME
    console.log('\n🎮 Entering game...');
    await page.evaluate(() => {
      const btn = document.querySelector('#enter');
      if (btn) btn.click();
    });
    await sleep(4000);
    console.log('  Game entered ✅');

    const soundInGame = await page.evaluate(() => {
      const muteBtn = document.querySelector('#muteBtn');
      if (!muteBtn) return { mute_toggle_works: false };
      const initial = muteBtn.textContent;
      muteBtn.click();
      const muted = muteBtn.textContent;
      muteBtn.click();
      return { mute_toggle_works: initial !== muted };
    });
    results.sound.mute_toggle_works = soundInGame.mute_toggle_works;
    console.log(`  Mute toggle: ${soundInGame.mute_toggle_works ? '✅' : '❌'}`);

    // 3. TUTORIAL
    console.log('\n📚 Testing Tutorial System...');
    await sleep(2000);
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
    console.log(`  System exists: ${tutorialCheck.system_exists ? '✅' : '❌'}`);
    console.log(`  Initialized: ${tutorialCheck.tutorial_instance ? '✅' : '❌'}`);
    console.log(`  Whisper element: ${tutorialCheck.whisper_element ? '✅' : '❌'}`);
    console.log(`  Hint element: ${tutorialCheck.hint_action_element ? '✅' : '❌'}`);
    console.log(`  Has hints: ${tutorialCheck.tutorial_has_hints ? '✅' : '❌'}`);

    // 4. RECIPES
    console.log('\n🎴 Testing Recipe System...');
    const recipeCheck = await page.evaluate(() => {
      if (typeof RECIPES === 'undefined' || !Array.isArray(RECIPES)) {
        return { count: 0, has_15_recipes: false, correct_structure: false, unique_recipes: 0 };
      }
      const count = RECIPES.length;
      const firstRecipe = RECIPES[0] || {};
      const hasStructure = 'wheat' in firstRecipe && 'wood' in firstRecipe && 'name' in firstRecipe;
      const uniqueNames = new Set(RECIPES.map(r => r.name));
      return {
        count: count,
        has_15_recipes: count >= 15,
        correct_structure: hasStructure,
        unique_recipes: uniqueNames.size
      };
    });

    Object.assign(results.recipes, recipeCheck);
    console.log(`  Recipe count: ${recipeCheck.count} ${recipeCheck.has_15_recipes ? '✅' : '❌'}`);
    console.log(`  Structure: ${recipeCheck.correct_structure ? '✅' : '❌'}`);
    console.log(`  Unique: ${recipeCheck.unique_recipes} ${recipeCheck.unique_recipes >= 15 ? '✅' : '❌'}`);

    // 5. ECOLOGY
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
    console.log(`  Check function: ${ecologyCheck.check_function_exists ? '✅' : '❌'}`);
    console.log(`  Greenhouse effect: ${ecologyCheck.greenhouse_function_exists ? '✅' : '❌'}`);
    console.log(`  Steam effect: ${ecologyCheck.steam_function_exists ? '✅' : '❌'}`);
    console.log(`  Integration: ${ecologyCheck.ecology_integration ? '✅' : '❌'}`);

    // 6. ANIMATIONS
    console.log('\n🚶 Testing Walk Animations...');
    const animationCheck = await page.evaluate(() => {
      const hasPlayer = !!window.player;
      const playerHasSprite = window.player && window.player.sprite;
      const hasBeast = window.beasts && window.beasts.length > 0;
      const beastHasSprite = hasBeast && window.beasts[0].sprite;
      
      return {
        player_exists: hasPlayer,
        player_has_sprite: playerHasSprite,
        player_has_walk_animation: playerHasSprite && !!(window.player.sprite.textures || window.player.walkFrames),
        beast_exists: hasBeast,
        beast_has_sprite: beastHasSprite,
        beast_has_walk_animation: beastHasSprite && !!(window.beasts[0].sprite.textures || window.beasts[0].walkFrames)
      };
    });

    Object.assign(results.animations, animationCheck);
    console.log(`  Player exists: ${animationCheck.player_exists ? '✅' : '❌'}`);
    console.log(`  Player sprite: ${animationCheck.player_has_sprite ? '✅' : '❌'}`);
    console.log(`  Player animation: ${animationCheck.player_has_walk_animation ? '✅' : '❌'}`);
    console.log(`  Beast exists: ${animationCheck.beast_exists ? '✅' : '❌'}`);
    console.log(`  Beast sprite: ${animationCheck.beast_has_sprite ? '✅' : '❌'}`);
    console.log(`  Beast animation: ${animationCheck.beast_has_walk_animation ? '✅' : '❌'}`);

    // 7. RIVERS
    console.log('\n🌊 Testing Diagonal Rivers...');
    const riverCheck = await page.evaluate(() => {
      if (!window.tiles) return { tiles_exist: false, water_tiles_count: 0, has_diagonal_rivers: false, render_container_exists: false };
      let hasDiagonal = false;
      let waterCount = 0;
      for (let row of window.tiles) {
        for (let tile of row) {
          if (tile.type === 'water') {
            waterCount++;
            if (tile.isDiagonal || tile.diagonalDir) hasDiagonal = true;
          }
        }
      }
      return {
        tiles_exist: true,
        water_tiles_count: waterCount,
        has_diagonal_rivers: hasDiagonal,
        render_container_exists: !!window.app && !!window.app.stage
      };
    });

    Object.assign(results.rivers, riverCheck);
    console.log(`  Tiles exist: ${riverCheck.tiles_exist ? '✅' : '❌'}`);
    console.log(`  Water tiles: ${riverCheck.water_tiles_count} ${riverCheck.water_tiles_count > 0 ? '✅' : '❌'}`);
    console.log(`  Diagonal rivers: ${riverCheck.has_diagonal_rivers ? '✅' : '❌'}`);
    console.log(`  Render container: ${riverCheck.render_container_exists ? '✅' : '❌'}`);

    // 8. EVENTS
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
    console.log(`  System exists: ${eventsCheck.seasonal_events_exist ? '✅' : '❌'}`);
    console.log(`  Initialized: ${eventsCheck.events_initialized ? '✅' : '❌'}`);
    console.log(`  Indicator: ${eventsCheck.event_indicator_exists ? '✅' : '❌'}`);
    console.log(`  Button: ${eventsCheck.event_btn_exists ? '✅' : '❌'}`);

    // Screenshot
    console.log('\n📸 Taking screenshot...');
    await page.screenshot({ path: '/root/terra-chronicle-game/test_screenshot.png' });
    console.log('  Saved ✅');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();

    // REPORT
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
      { name: '🎊 Seasonal Events', data: results.events }
    ];

    let total = 0, passed = 0;
    sections.forEach(section => {
      console.log(`\n${section.name}:`);
      Object.entries(section.data).forEach(([key, value]) => {
        if (typeof value === 'boolean') {
          total++;
          if (value) passed++;
          console.log(`  ${value ? '✅' : '❌'} ${key.replace(/_/g, ' ')}`);
        }
      });
    });

    console.log('\n' + '='.repeat(60));
    console.log(`✅ OVERALL: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);
    console.log('='.repeat(60) + '\n');
  }
})();
