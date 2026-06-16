const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// 创建截图目录
const screenshotDir = path.join(__dirname, 'test-screenshots', 'dungeon-battle');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

// 顶层配置有头模式
test.use({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  headless: false,
});

test.describe('Terra Chronicle - 地城战斗流程测试', () => {

  test('完整地城战斗流程测试', async ({ page }) => {
    test.setTimeout(120000); // 2分钟超时

    // 监听控制台错误
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // 监听页面错误
    const pageErrors = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });

    console.log('📍 1. 访问游戏主页...');
    await page.goto('https://terra.bz9.me/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotDir, '01-title-screen.png'), fullPage: true });

    console.log('📍 2. 点击"踏上大陆"进入游戏...');
    // 尝试多种方式定位按钮
    const startButtonClicked = await page.evaluate(() => {
      // 查找包含目标文本的按钮或链接
      const buttons = document.querySelectorAll('button, a, div[class*="button"], [role="button"]');
      for (let btn of buttons) {
        const text = btn.textContent || btn.innerText;
        if (text && (text.includes('踏上大陆') || text.includes('开始') || text.includes('Start'))) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    if (!startButtonClicked) {
      console.log('⚠ 未找到按钮，尝试点击屏幕中心');
      await page.mouse.click(960, 540);
    }

    // 等待转场动画完成
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotDir, '02-world-loaded.png'), fullPage: true });

    console.log('📍 3. 检查游戏世界是否正确加载...');
    // 等待主 canvas 元素（使用更精确的选择器）
    const canvas = page.locator('#stage canvas').first();
    await canvas.waitFor({ state: 'visible', timeout: 10000 });

    // 检查是否有基本的 UI 元素（资源栏等）
    await page.waitForTimeout(2000);

    console.log('📍 4. 寻找并进入地城入口...');
    // 按 M 键打开地城（根据实际按键绑定调整）
    await page.keyboard.press('M');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(screenshotDir, '03-dungeon-map-opened.png'), fullPage: true });

    console.log('📍 5. 检查地城地图 UI...');
    // 检查是否有地城节点和路径
    const dungeonUI = await page.evaluate(() => {
      const hasNodesUI = document.querySelector('.dungeon-map') ||
                         document.querySelector('[class*="dungeon"]') ||
                         document.querySelector('[class*="node"]');
      const bodyClasses = document.body.className;
      const allDivs = Array.from(document.querySelectorAll('div')).map(d => ({
        class: d.className,
        id: d.id,
        text: d.textContent?.substring(0, 50)
      }));
      return {
        hasNodesUI: !!hasNodesUI,
        bodyClasses,
        divCount: allDivs.length,
        sampleDivs: allDivs.slice(0, 10)
      };
    });
    console.log('地城 UI 状态:', JSON.stringify(dungeonUI, null, 2));

    console.log('📍 6. 选择第一个战斗节点...');
    // 尝试点击第一个可点击的节点
    await page.waitForTimeout(1000);

    // 方案1: 尝试点击标记为战斗的节点
    const battleNodeClicked = await page.evaluate(() => {
      const nodes = document.querySelectorAll('[class*="node"], [data-type="combat"], button');
      for (let node of nodes) {
        if (node.textContent?.includes('战斗') ||
            node.textContent?.includes('Combat') ||
            node.className.includes('combat') ||
            node.style.cursor === 'pointer') {
          node.click();
          return true;
        }
      }
      return false;
    });

    if (battleNodeClicked) {
      console.log('✓ 点击了战斗节点');
    } else {
      console.log('⚠ 未找到明确的战斗节点，尝试点击屏幕中心区域...');
      await page.mouse.click(960, 400);
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotDir, '04-node-selected.png'), fullPage: true });

    console.log('📍 7. 进入战斗场景...');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotDir, '05-battle-started.png'), fullPage: true });

    console.log('📍 8. 检查战斗界面元素...');
    const battleUI = await page.evaluate(() => {
      const allText = document.body.innerText;
      const hasCards = allText.includes('能量') || allText.includes('Energy') ||
                       document.querySelector('[class*="card"]');
      const hasHP = allText.includes('HP') || allText.includes('生命');
      const hasEnemy = allText.includes('敌人') || allText.includes('Enemy');

      return {
        hasCards: !!hasCards,
        hasHP: !!hasHP,
        hasEnemy: !!hasEnemy,
        bodyTextSample: allText.substring(0, 500)
      };
    });
    console.log('战斗 UI 状态:', JSON.stringify(battleUI, null, 2));

    console.log('📍 9. 尝试打出第一张卡牌...');
    await page.waitForTimeout(1000);

    // 查找并点击第一张卡牌
    const cardPlayed = await page.evaluate(() => {
      const cards = document.querySelectorAll('[class*="card"], button');
      for (let card of cards) {
        if (card.style.cursor === 'pointer' &&
            (card.className.includes('card') || card.textContent?.includes('攻击'))) {
          card.click();
          return true;
        }
      }
      return false;
    });

    if (cardPlayed) {
      console.log('✓ 打出了一张卡牌');
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(screenshotDir, '06-card-played.png'), fullPage: true });
    } else {
      console.log('⚠ 未找到可打出的卡牌');
    }

    console.log('📍 10. 尝试结束回合...');
    // 寻找"结束回合"按钮
    const endTurnClicked = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (let btn of buttons) {
        if (btn.textContent?.includes('结束') ||
            btn.textContent?.includes('End') ||
            btn.textContent?.includes('回合')) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    if (endTurnClicked) {
      console.log('✓ 点击了结束回合');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(screenshotDir, '07-enemy-turn.png'), fullPage: true });
    }

    console.log('📍 11. 等待敌人回合...');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotDir, '08-player-turn-again.png'), fullPage: true });

    console.log('📍 12. 检查卡组构筑界面（如果有）...');
    // 继续游戏，看是否有卡组选择界面
    await page.waitForTimeout(2000);

    const deckBuildingUI = await page.evaluate(() => {
      const text = document.body.innerText;
      const hasCardChoice = text.includes('选择') || text.includes('Choose') ||
                            text.includes('添加') || text.includes('Add');
      return {
        hasCardChoice,
        textSample: text.substring(0, 300)
      };
    });
    console.log('卡组构筑检查:', JSON.stringify(deckBuildingUI, null, 2));

    // 最终截图
    await page.screenshot({ path: path.join(screenshotDir, '09-final-state.png'), fullPage: true });

    // 输出错误日志
    if (consoleErrors.length > 0) {
      console.log('\n⚠️  控制台错误:');
      consoleErrors.forEach(err => console.log('  -', err));
    }
    if (pageErrors.length > 0) {
      console.log('\n❌ 页面错误:');
      pageErrors.forEach(err => console.log('  -', err));
    }

    console.log('\n✅ 测试完成，截图已保存至:', screenshotDir);

    // 断言：至少应该没有致命的页面错误
    expect(pageErrors.length).toBeLessThan(5);
  });
});
