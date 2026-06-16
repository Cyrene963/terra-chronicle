const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const GAME_URL = 'https://terra.bz9.me';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots-spirit-system');

// 确保截图目录存在
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForStable(page, ms = 1000) {
  await sleep(ms);
}

(async () => {
  console.log('🚀 启动 Playwright 测试: 灵兽系统');
  console.log(`📍 测试 URL: ${GAME_URL}`);
  console.log(`📸 截图目录: ${SCREENSHOTS_DIR}\n`);

  const browser = await chromium.launch({
    headless: true, // 无头模式（服务器环境无 X Server）
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });

  const page = await context.newPage();

  // 监听控制台错误
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log('❌ Console Error:', msg.text());
    }
  });

  // 监听页面错误
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push(error.message);
    console.log('❌ Page Error:', error.message);
  });

  try {
    console.log('1️⃣ 加载游戏页面...');
    await page.goto(GAME_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await waitForStable(page, 2000);

    console.log('📸 截图: 01-title-screen.png');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-title-screen.png'), fullPage: false });

    console.log('\n2️⃣ 点击"踏上大陆"按钮...');
    const startButton = await page.locator('button:has-text("踏上大陆"), button:has-text("Enter")').first();
    if (await startButton.count() > 0) {
      await startButton.click();
      console.log('✅ 点击成功，等待转场...');
      await waitForStable(page, 5000); // 等待转场动画
    } else {
      console.log('⚠️  未找到开始按钮，可能已在游戏中');
    }

    console.log('📸 截图: 02-game-world.png');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-game-world.png'), fullPage: false });

    console.log('\n3️⃣ 寻找灵兽系统入口...');
    await waitForStable(page, 2000);

    // 检查页面上是否有灵兽相关的 UI 元素
    console.log('🔍 检查页面上的灵兽...');

    // 尝试在场景中找到灵兽（可能是 canvas 渲染的）
    // 我们通过移动角色或等待来观察灵兽 AI 行为

    console.log('🎮 测试 WASD 移动（模拟探索）...');
    await page.keyboard.press('w');
    await sleep(500);
    await page.keyboard.press('d');
    await sleep(500);
    await page.keyboard.press('s');
    await sleep(500);
    await page.keyboard.press('a');
    await sleep(500);

    console.log('📸 截图: 03-explored-world.png');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-explored-world.png'), fullPage: false });

    console.log('\n4️⃣ 寻找灵兽培育面板入口...');

    // 尝试寻找孵化阵或培育相关的 UI
    const breedingElements = await page.locator('canvas, div:has-text("孵化"), div:has-text("培育"), div:has-text("灵兽"), button:has-text("孵化"), button:has-text("培育")').all();
    console.log(`找到 ${breedingElements.length} 个可能的灵兽相关元素`);

    // 尝试点击画布中的特定位置（孵化阵可能在地图上）
    // 根据 PROJECT_VISION 提到的孵化阵交互，我们尝试在地图上寻找
    console.log('🔍 尝试在地图上寻找孵化阵...');

    // 移动到地图中心偏下位置（孵化阵通常在农庄区域）
    const canvas = await page.locator('canvas').first();
    if (await canvas.count() > 0) {
      const box = await canvas.boundingBox();
      if (box) {
        // 点击画布中心偏下的位置
        await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.6);
        await sleep(500);
        console.log('📸 截图: 04-clicked-center.png');
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-clicked-center.png'), fullPage: false });

        // 尝试右键点击查看详情
        await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.6, { button: 'right' });
        await sleep(1000);
        console.log('📸 截图: 05-right-click-detail.png');
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-right-click-detail.png'), fullPage: false });
      }
    }

    console.log('\n5️⃣ 尝试通过键盘快捷键打开灵兽面板...');
    // 尝试常见的快捷键
    const testKeys = ['b', 'p', 'e', 'i', 'Tab'];
    for (const key of testKeys) {
      console.log(`  测试按键: ${key}`);
      await page.keyboard.press(key);
      await sleep(800);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `06-key-${key}.png`), fullPage: false });
    }

    console.log('\n6️⃣ 检查是否有灵兽在场景中自动工作...');
    // 观察一段时间，看是否有灵兽 AI 行为
    console.log('  观察 10 秒，监测灵兽 AI 行为...');
    for (let i = 0; i < 10; i++) {
      await sleep(1000);
      if (i % 3 === 0) {
        console.log(`  ${i + 1}/10 秒...`);
      }
    }

    console.log('📸 截图: 07-after-observation.png');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-after-observation.png'), fullPage: false });

    console.log('\n7️⃣ 尝试查找灵兽图鉴入口...');
    // 检查是否有图鉴按钮
    const codexElements = await page.locator('button:has-text("图鉴"), div:has-text("图鉴"), button:has-text("收藏"), button:has-text("Collection")').all();
    if (codexElements.length > 0) {
      console.log(`✅ 找到 ${codexElements.length} 个图鉴相关元素`);
      await codexElements[0].click();
      await sleep(1500);
      console.log('📸 截图: 08-codex-panel.png');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-codex-panel.png'), fullPage: false });
    } else {
      console.log('⚠️  未找到图鉴入口');
    }

    console.log('\n8️⃣ 尝试进入战斗系统（灵兽可能在战斗中展示）...');
    // 寻找地下城或战斗入口
    const dungeonElements = await page.locator('button:has-text("地下城"), button:has-text("探索"), button:has-text("Dungeon"), button:has-text("Explore")').all();
    if (dungeonElements.length > 0) {
      console.log(`✅ 找到 ${dungeonElements.length} 个地下城相关元素`);
      await dungeonElements[0].click();
      await sleep(2000);
      console.log('📸 截图: 09-dungeon-entry.png');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09-dungeon-entry.png'), fullPage: false });
    } else {
      console.log('⚠️  未找到地下城入口');
    }

    console.log('\n9️⃣ 尝试在地图上寻找并点击灵兽精灵...');
    // 在地图不同位置点击，寻找灵兽
    if (await canvas.count() > 0) {
      const box = await canvas.boundingBox();
      if (box) {
        const positions = [
          { x: 0.3, y: 0.4, name: 'left-area' },
          { x: 0.7, y: 0.4, name: 'right-area' },
          { x: 0.5, y: 0.3, name: 'top-area' },
          { x: 0.5, y: 0.7, name: 'bottom-area' }
        ];

        for (const pos of positions) {
          console.log(`  点击区域: ${pos.name}`);
          await page.mouse.click(box.x + box.width * pos.x, box.y + box.height * pos.y);
          await sleep(800);
          await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `10-click-${pos.name}.png`), fullPage: false });
        }
      }
    }

    console.log('\n🔟 最终状态截图...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11-final-state.png'), fullPage: false });

    // 生成测试报告
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试报告: 灵兽系统');
    console.log('='.repeat(60));

    console.log('\n✅ 测试完成项:');
    console.log('  • 游戏启动和标题画面');
    console.log('  • 进入游戏世界');
    console.log('  • WASD 移动探索');
    console.log('  • 地图多区域点击测试');
    console.log('  • 快捷键测试（b/p/e/i/tab）');
    console.log('  • 灵兽 AI 行为观察');
    console.log('  • 图鉴入口查找');
    console.log('  • 地下城入口查找');

    console.log('\n⚠️  控制台错误数量:', consoleErrors.length);
    if (consoleErrors.length > 0) {
      console.log('  错误详情:');
      consoleErrors.slice(0, 5).forEach(err => console.log(`    - ${err.substring(0, 100)}`));
    }

    console.log('\n⚠️  页面错误数量:', pageErrors.length);
    if (pageErrors.length > 0) {
      console.log('  错误详情:');
      pageErrors.slice(0, 5).forEach(err => console.log(`    - ${err.substring(0, 100)}`));
    }

    console.log('\n📸 截图保存位置:', SCREENSHOTS_DIR);
    console.log('💡 提示: 请查看截图文件以分析灵兽系统的实际状态\n');

  } catch (error) {
    console.error('\n❌ 测试过程中出现错误:', error.message);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'error-state.png'), fullPage: false });
  } finally {
    console.log('🔚 关闭浏览器...');
    await browser.close();

    console.log('✅ 测试结束\n');
  }
})();
