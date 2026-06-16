import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ 
    headless: true  // Must use headless on server without display
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  // Capture console messages
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  
  // Capture page errors
  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));
  
  console.log('📱 Navigating to Terra Chronicle...');
  await page.goto('https://terra.bz9.me', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Screenshot 1: Title screen
  console.log('📸 Screenshot 1: Title screen');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/root/terra-chronicle-game/screenshots/alchemy-test/01-title.png', fullPage: false });
  
  // Click start button
  console.log('🎮 Looking for start button...');
  const startButton = await page.locator('text=/踏上大陆|开始游戏|Start/i').first();
  if (await startButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await startButton.click();
    console.log('✅ Clicked start button');
  } else {
    // Try clicking canvas center
    await page.mouse.click(960, 540);
    console.log('✅ Clicked canvas center');
  }
  
  // Wait for game world to load
  console.log('⏳ Waiting for game world to load...');
  await page.waitForTimeout(5000);
  
  // Screenshot 2: Game world loaded
  console.log('📸 Screenshot 2: Game world');
  await page.screenshot({ path: '/root/terra-chronicle-game/screenshots/alchemy-test/02-game-world.png', fullPage: false });
  
  // Check inventory state
  console.log('🔍 Checking inventory state...');
  const inventoryInfo = await page.evaluate(() => {
    if (window.gameState) {
      return {
        starWheat: window.gameState.starWheat || 0,
        wood: window.gameState.wood || 0,
        souls: window.gameState.souls || 0,
        hasAlchemy: typeof window.openAlchemy === 'function'
      };
    }
    return null;
  });
  console.log('📦 Inventory:', JSON.stringify(inventoryInfo, null, 2));
  
  // Add test materials
  if (inventoryInfo && inventoryInfo.starWheat < 10) {
    console.log('🌾 Adding test materials...');
    await page.evaluate(() => {
      if (window.gameState) {
        window.gameState.starWheat = 20;
        window.gameState.wood = 20;
        window.gameState.souls = 10;
      }
    });
  }
  
  // Open alchemy interface
  console.log('🧪 Attempting to open alchemy interface...');
  
  // Try pressing 'A' key first
  await page.keyboard.press('a');
  await page.waitForTimeout(1000);
  
  let alchemyVisible = await page.locator('.alchemy-panel, #alchemyUI, [class*="alchemy"]').isVisible().catch(() => false);
  
  if (!alchemyVisible) {
    // Try direct function call
    console.log('🔧 Trying direct openAlchemy() call...');
    await page.evaluate(() => {
      if (typeof window.openAlchemy === 'function') {
        window.openAlchemy();
      }
    });
    await page.waitForTimeout(1000);
  }
  
  // Screenshot 3: Alchemy UI attempt
  console.log('📸 Screenshot 3: Alchemy interface');
  await page.screenshot({ path: '/root/terra-chronicle-game/screenshots/alchemy-test/03-alchemy-open.png', fullPage: false });
  
  // Check if alchemy UI is visible
  alchemyVisible = await page.locator('.alchemy-panel, #alchemyUI, [class*="alchemy"]').isVisible().catch(() => false);
  
  if (alchemyVisible) {
    console.log('✅ Alchemy UI is visible!');
    
    // Analyze UI elements
    const alchemyUI = await page.evaluate(() => {
      const panel = document.querySelector('.alchemy-panel, #alchemyUI, [class*="alchemy"]');
      if (!panel) return null;
      
      const styles = window.getComputedStyle(panel);
      const rect = panel.getBoundingClientRect();
      
      return {
        visible: rect.width > 0 && rect.height > 0,
        dimensions: { width: rect.width, height: rect.height },
        backgroundColor: styles.backgroundColor,
        backgroundImage: styles.backgroundImage,
        border: styles.border,
        fontFamily: styles.fontFamily,
        hasGoldAccents: document.querySelectorAll('[style*="gold"], [style*="#d4af37"], [class*="gold"]').length,
        hasParchmentBg: styles.background.includes('f4ecd8') || styles.background.includes('e8dcbf'),
        materialSlots: document.querySelectorAll('.material-slot, [class*="slot"]').length,
        buttons: Array.from(document.querySelectorAll('button')).map(b => ({
          text: b.textContent.trim(),
          visible: b.offsetWidth > 0
        })).filter(b => b.text)
      };
    });
    console.log('🎨 Alchemy UI analysis:', JSON.stringify(alchemyUI, null, 2));
    
    // Test material input
    console.log('🧪 Testing material input...');
    
    // Get all clickable material buttons
    const materialButtons = await page.locator('button:has-text("星麦"), button:has-text("木材")').all();
    console.log(`Found ${materialButtons.length} material buttons`);
    
    if (materialButtons.length > 0) {
      // Click first material button
      await materialButtons[0].click();
      await page.waitForTimeout(500);
      console.log('✅ Clicked first material button');
      
      // Screenshot 4: After material input
      console.log('📸 Screenshot 4: Material input');
      await page.screenshot({ path: '/root/terra-chronicle-game/screenshots/alchemy-test/04-material-input.png', fullPage: false });
      
      // Add more materials
      for (let i = 0; i < 2; i++) {
        if (i < materialButtons.length) {
          await materialButtons[i].click();
          await page.waitForTimeout(300);
        }
      }
      
      // Screenshot 5: Multiple materials
      console.log('📸 Screenshot 5: Multiple materials added');
      await page.screenshot({ path: '/root/terra-chronicle-game/screenshots/alchemy-test/05-multiple-materials.png', fullPage: false });
    }
    
    // Try crafting
    const craftButton = await page.locator('button:has-text("合成"), button:has-text("炼金"), button:has-text("制作"), button:has-text("Craft")').first();
    if (await craftButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('🎯 Attempting to craft...');
      await craftButton.click();
      await page.waitForTimeout(2000);
      
      // Screenshot 6: Crafting result
      console.log('📸 Screenshot 6: Crafting result');
      await page.screenshot({ path: '/root/terra-chronicle-game/screenshots/alchemy-test/06-craft-result.png', fullPage: false });
      
      // Check for discovery animation
      const hasDiscoveryAnimation = await page.evaluate(() => {
        const discovery = document.querySelector('.discovery, [class*="gold"], [class*="shine"], [class*="glow"]');
        return discovery !== null;
      });
      console.log('✨ Discovery animation:', hasDiscoveryAnimation ? '✅ Present' : '❌ Not detected');
      
      // Get crafting result
      const craftResult = await page.evaluate(() => {
        return {
          newCardsCount: window.gameState?.deck?.length || 0,
          discoveredRecipes: window.gameState?.discoveredRecipes?.length || 0
        };
      });
      console.log('📊 Craft result:', JSON.stringify(craftResult, null, 2));
    }
    
  } else {
    console.log('❌ Failed to open alchemy UI');
    
    // Debug: check what's on screen
    const debugInfo = await page.evaluate(() => {
      return {
        bodyText: document.body.innerText.substring(0, 300),
        allDivs: Array.from(document.querySelectorAll('div')).length,
        visibleDivs: Array.from(document.querySelectorAll('div')).filter(d => d.offsetWidth > 0).length,
        canvasCount: document.querySelectorAll('canvas').length,
        hasGameState: !!window.gameState,
        hasOpenAlchemy: typeof window.openAlchemy === 'function'
      };
    });
    console.log('🔍 Debug info:', JSON.stringify(debugInfo, null, 2));
  }
  
  // Final screenshot
  console.log('📸 Screenshot 8: Final state');
  await page.screenshot({ path: '/root/terra-chronicle-game/screenshots/alchemy-test/08-final.png', fullPage: false });
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('================');
  console.log(`Screenshots saved: /root/terra-chronicle-game/screenshots/alchemy-test/`);
  console.log(`Alchemy UI visible: ${alchemyVisible ? '✅ YES' : '❌ NO'}`);
  console.log(`Console logs: ${consoleLogs.length} messages`);
  console.log(`Page errors: ${pageErrors.length} errors`);
  
  if (pageErrors.length > 0) {
    console.log('\n⚠️ Page Errors:');
    pageErrors.forEach(err => console.log(`  - ${err}`));
  }
  
  if (consoleLogs.length > 0) {
    console.log('\n📝 Recent console logs:');
    consoleLogs.slice(-10).forEach(log => console.log(`  ${log}`));
  }
  
  await browser.close();
  console.log('\n✅ Test complete');
})();
