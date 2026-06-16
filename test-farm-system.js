/**
 * Terra Chronicle - Farm System Test
 * 农场系统完整体验测试 - 种植、收获、地块交互、资源管理
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const TEST_URL = 'https://terra.bz9.me';
const SCREENSHOT_DIR = path.join(__dirname, 'test-screenshots', 'farm-system');

// 确保截图目录存在
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testFarmSystem() {
  console.log('🚀 启动 Terra Chronicle 农场系统测试...\n');

  const browser = await chromium.launch({
    headless: true, // 服务器环境需要 headless 模式
    slowMo: 500 // 放慢操作以便观察
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  // 监听控制台消息
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') {
      console.log(`[浏览器 ${type.toUpperCase()}] ${msg.text()}`);
    }
  });

  // 监听页面错误
  page.on('pageerror', error => {
    console.error(`[页面错误] ${error.message}`);
  });

  try {
    console.log('📍 步骤 1: 访问游戏页面');
    await page.goto(TEST_URL, { waitUntil: 'networkidle' });
    await sleep(2000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-title-screen.png'),
      fullPage: true
    });
    console.log('✅ 截图: 标题页面\n');

    console.log('📍 步骤 2: 点击"踏上大陆"进入游戏');
    const startButton = await page.locator('text=踏上大陆').first();
    if (await startButton.isVisible()) {
      await startButton.click();
      console.log('✅ 点击了开始按钮');
    } else {
      console.log('⚠️  未找到"踏上大陆"按钮，尝试其他方式');
      await page.click('button');
    }

    // 等待加载和转场
    await sleep(5000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-game-world-loaded.png'),
      fullPage: true
    });
    console.log('✅ 截图: 游戏世界加载完成\n');

    console.log('📍 步骤 3: 探索农场 - 使用 WASD 移动');
    // 模拟移动
    await page.keyboard.press('w');
    await sleep(1000);
    await page.keyboard.press('a');
    await sleep(1000);
    await page.keyboard.press('s');
    await sleep(1000);
    await page.keyboard.press('d');
    await sleep(1000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '03-after-movement.png'),
      fullPage: true
    });
    console.log('✅ 截图: 角色移动后\n');

    console.log('📍 步骤 4: 寻找并交互农田地块');
    // 尝试点击画布中心位置（可能是农田）
    const canvas = await page.locator('canvas').first();
    const box = await canvas.boundingBox();

    if (box) {
      // 点击画布中心偏上的位置（更可能是农田）
      const clickX = box.x + box.width * 0.5;
      const clickY = box.y + box.height * 0.4;

      console.log(`  尝试点击位置 (${Math.round(clickX)}, ${Math.round(clickY)})`);
      await page.mouse.click(clickX, clickY);
      await sleep(1500);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '04-clicked-tile.png'),
        fullPage: true
      });
      console.log('✅ 截图: 点击地块后\n');

      console.log('📍 步骤 5: 尝试种植作物');
      // 尝试按 E 键（通常是交互键）
      await page.keyboard.press('e');
      await sleep(2000);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '05-planting-attempt.png'),
        fullPage: true
      });
      console.log('✅ 截图: 尝试种植\n');

      console.log('📍 步骤 6: 右键查看地块详情');
      await page.mouse.click(clickX, clickY, { button: 'right' });
      await sleep(2000);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '06-tile-details.png'),
        fullPage: true
      });
      console.log('✅ 截图: 地块详情界面\n');

      // 关闭详情面板（如果有）
      await page.keyboard.press('Escape');
      await sleep(1000);
    }

    console.log('📍 步骤 7: 寻找已有作物并尝试收获');
    // 移动到不同位置寻找作物
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('w');
      await sleep(500);
      await page.keyboard.press('d');
      await sleep(500);

      // 尝试按空格或 E 收获
      await page.keyboard.press('e');
      await sleep(500);
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '07-harvest-attempt.png'),
      fullPage: true
    });
    console.log('✅ 截图: 收获尝试\n');

    console.log('📍 步骤 8: 查看资源库存');
    // 尝试打开库存（通常是 I 或 Tab）
    await page.keyboard.press('i');
    await sleep(2000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '08-inventory.png'),
      fullPage: true
    });
    console.log('✅ 截图: 库存界面\n');

    await page.keyboard.press('Escape');
    await sleep(1000);

    console.log('📍 步骤 9: 寻找灵兽交互');
    // 移动寻找灵兽
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('a');
      await sleep(800);
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '09-spirit-beast-area.png'),
      fullPage: true
    });
    console.log('✅ 截图: 灵兽区域\n');

    console.log('📍 步骤 10: 观察昼夜和季节系统');
    console.log('  等待观察时间流逝和视觉变化...');
    await sleep(5000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '10-time-cycle.png'),
      fullPage: true
    });
    console.log('✅ 截图: 时间循环效果\n');

    console.log('📍 步骤 11: 尝试访问炼金工坊');
    // 尝试打开炼金界面
    await page.keyboard.press('c');
    await sleep(2000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '11-alchemy-workshop.png'),
      fullPage: true
    });
    console.log('✅ 截图: 炼金工坊\n');

    await page.keyboard.press('Escape');
    await sleep(1000);

    console.log('📍 步骤 12: 最终全景截图');
    // 移动到一个好的视角
    await page.keyboard.press('w');
    await sleep(1000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '12-final-overview.png'),
      fullPage: true
    });
    console.log('✅ 截图: 最终全景\n');

    console.log('📍 步骤 13: 收集页面状态信息');
    const pageState = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        canvasCount: document.querySelectorAll('canvas').length,
        errors: window.__errors || [],
        localStorage: Object.keys(localStorage).length > 0 ?
          Object.keys(localStorage).map(k => ({ key: k, valueLength: localStorage[k].length })) :
          []
      };
    });

    console.log('\n📊 页面状态:');
    console.log(`  标题: ${pageState.title}`);
    console.log(`  Canvas 数量: ${pageState.canvasCount}`);
    console.log(`  LocalStorage 键: ${pageState.localStorage.length}`);

    // 保持浏览器打开一段时间供手动观察
    console.log('\n⏳ 保持浏览器打开 30 秒供手动观察...');
    await sleep(30000);

  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'error-state.png'),
      fullPage: true
    });
  } finally {
    await browser.close();
    console.log('\n✅ 测试完成，截图已保存到:', SCREENSHOT_DIR);
  }
}

// 执行测试
testFarmSystem().catch(console.error);
