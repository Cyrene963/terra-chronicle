const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const GAME_URL = 'https://terra.bz9.me';
const SCREENSHOTS_DIR = path.join(__dirname, 'visual-audit-screenshots');

// 确保截图目录存在
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// 顶层配置 - 无头模式（服务器环境没有 X server）
test.use({
  viewport: { width: 1920, height: 1080 },
  headless: true,
});

test.describe('Terra Chronicle Visual & UI Audit', () => {

  test('Complete visual audit with gameplay interaction', async ({ page }) => {
    test.setTimeout(120000); // 2分钟超时
    console.log('\n=== Terra Chronicle Visual Audit Starting ===\n');

    // 1. 加载页面
    console.log('Loading game page...');
    await page.goto(GAME_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // 截图：标题页
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '01-title-page.png'),
      fullPage: false
    });
    console.log('✓ Screenshot: Title page');

    // 检查字体加载
    const fontFamilies = await page.evaluate(() => {
      const body = document.body;
      const computed = window.getComputedStyle(body);
      return {
        body: computed.fontFamily,
        title: window.getComputedStyle(document.querySelector('h1') || body).fontFamily
      };
    });
    console.log('Font families:', fontFamilies);

    // 2. 点击"踏上大陆"按钮
    console.log('\nClicking "Enter Game" button...');
    const enterButton = page.locator('#enter');
    await enterButton.waitFor({ state: 'visible', timeout: 5000 });

    // 截图：悬停状态
    await enterButton.hover();
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '02-button-hover.png'),
      fullPage: false
    });
    console.log('✓ Screenshot: Button hover state');

    await enterButton.click({ force: true, timeout: 10000 });
    console.log('✓ Clicked enter button');

    // 3. 等待转场和游戏世界加载
    console.log('\nWaiting for game world transition...');
    await page.waitForTimeout(3000);

    // 截图：转场中
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '03-transition.png'),
      fullPage: false
    });
    console.log('✓ Screenshot: Transition');

    await page.waitForTimeout(2000);

    // 截图：游戏世界初始视图
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '04-game-world-initial.png'),
      fullPage: false
    });
    console.log('✓ Screenshot: Game world loaded');

    // 4. 检查 Canvas 渲染
    const canvasInfo = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return null;
      return {
        width: canvas.width,
        height: canvas.height,
        styleWidth: canvas.style.width,
        styleHeight: canvas.style.height,
        visible: canvas.offsetParent !== null
      };
    });
    console.log('\nCanvas info:', canvasInfo);

    // 5. 移动角色 - WASD 测试
    console.log('\nTesting WASD movement...');
    await page.keyboard.press('KeyD');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '05-movement-right.png'),
      fullPage: false
    });
    console.log('✓ Screenshot: After moving right');

    await page.keyboard.press('KeyW');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '06-movement-up.png'),
      fullPage: false
    });
    console.log('✓ Screenshot: After moving up');

    // 6. 测试交互 - 寻找并交互地块
    console.log('\nTesting tile interaction...');
    const centerX = 1920 / 2;
    const centerY = 1080 / 2;

    // 移动到中心偏上位置
    await page.mouse.move(centerX, centerY - 100);
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '07-hover-tile.png'),
      fullPage: false
    });
    console.log('✓ Screenshot: Hovering over tile');

    // 右键查看地块详情
    await page.mouse.click(centerX, centerY - 100, { button: 'right' });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '08-tile-details.png'),
      fullPage: false
    });
    console.log('✓ Screenshot: Tile details panel');

    // 关闭详情（如果有关闭按钮）
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // 7. 寻找并交互炼金大釜
    console.log('\nSearching for alchemy cauldron...');
    // 移动角色寻找炼金大釜位置
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('KeyA');
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(500);

    // 尝试按 E 或点击交互
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(1500);

    const alchemyVisible = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('炼金') || text.includes('Alchemy') || text.includes('大釜');
    });

    if (alchemyVisible) {
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '09-alchemy-ui.png'),
        fullPage: false
      });
      console.log('✓ Screenshot: Alchemy UI');

      // 关闭炼金界面
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } else {
      console.log('⚠ Alchemy UI not found in current position');
    }

    // 8. 寻找并进入地城
    console.log('\nSearching for dungeon entrance...');
    // 向下移动寻找地城入口
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('KeyS');
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(500);

    await page.keyboard.press('KeyE');
    await page.waitForTimeout(2000);

    const dungeonVisible = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('地城') || text.includes('Dungeon') || text.includes('Start') || text.includes('开始');
    });

    if (dungeonVisible) {
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '10-dungeon-map.png'),
        fullPage: false
      });
      console.log('✓ Screenshot: Dungeon map');

      // 点击一个节点进入战斗
      await page.mouse.click(centerX, centerY);
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '11-battle-scene.png'),
        fullPage: false
      });
      console.log('✓ Screenshot: Battle scene');

      // 等待战斗界面完全加载
      await page.waitForTimeout(1000);

      // 尝试打一张牌
      const cardPlayed = await page.evaluate(() => {
        const cards = document.querySelectorAll('[class*="card"], [data-card]');
        if (cards.length > 0) {
          cards[0].click();
          return true;
        }
        return false;
      });

      if (cardPlayed) {
        await page.waitForTimeout(1000);
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, '12-card-played.png'),
          fullPage: false
        });
        console.log('✓ Screenshot: After playing card');
      }
    } else {
      console.log('⚠ Dungeon entrance not found in current position');
    }

    // 9. 最终截图 - 返回游戏世界
    console.log('\nReturning to game world...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '13-final-game-state.png'),
      fullPage: false
    });
    console.log('✓ Screenshot: Final game state');

    // 10. 收集 Console 日志和错误
    console.log('\n=== Collecting browser console logs ===');
    const logs = [];
    page.on('console', msg => logs.push(`${msg.type()}: ${msg.text()}`));

    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.waitForTimeout(2000);

    // 11. 分析渲染性能
    const performanceMetrics = await page.evaluate(() => {
      const perf = window.performance;
      const nav = perf.getEntriesByType('navigation')[0];
      return {
        loadTime: nav ? nav.loadEventEnd - nav.loadEventStart : 0,
        domContentLoaded: nav ? nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart : 0,
        memory: performance.memory ? {
          usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB',
          totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1048576) + ' MB'
        } : 'N/A'
      };
    });

    console.log('\nPerformance metrics:', performanceMetrics);

    console.log('\n=== Visual Audit Complete ===');
    console.log(`Screenshots saved to: ${SCREENSHOTS_DIR}`);
    console.log(`Total screenshots: 13+`);
  });
});
