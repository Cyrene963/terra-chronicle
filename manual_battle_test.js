/**
 * 手动战斗系统深度测试
 * 体验：地城地图交互、战斗入场转场、卡牌交互、打击感、回合流程、胜利/失败反馈
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('🎮 启动战斗系统手动测试...\n');

  const browser = await chromium.launch({
    headless: true, // 无头模式，服务器环境
    args: ['--window-size=1920,1080']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });

  const page = await context.newPage();

  // 创建截图目录
  const screenshotDir = path.join(__dirname, 'battle_test_screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir);
  }

  let stepCounter = 0;
  async function screenshot(name) {
    stepCounter++;
    const filename = `${stepCounter.toString().padStart(2, '0')}_${name}.png`;
    await page.screenshot({
      path: path.join(screenshotDir, filename),
      fullPage: false,
      timeout: 60000 // 增加超时到60秒
    });
    console.log(`📸 截图: ${filename}`);
  }

  try {
    console.log('📍 步骤 1: 加载游戏');
    await page.goto('http://localhost:8867', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await screenshot('01_initial_load');

    console.log('\n📍 步骤 2: 进入游戏（跳过标题界面）');
    // 尝试点击标题界面的开始按钮
    const titleVisible = await page.isVisible('#title').catch(() => false);
    if (titleVisible) {
      await page.click('#title button, #title .start-btn', { timeout: 5000 }).catch(() => {
        console.log('   未找到标题按钮，尝试点击标题区域');
        page.click('#title');
      });
      await page.waitForTimeout(1500);
    }
    await screenshot('02_after_title');

    console.log('\n📍 步骤 3: 寻找并进入地城入口');
    // 尝试找到地城按钮/入口
    const dungeonSelectors = [
      'text=地城', 'text=副本', 'text=探险', 'text=战斗',
      '[data-dungeon]', '.dungeon-btn', '#dungeon-btn',
      'button:has-text("地城")', 'button:has-text("副本")'
    ];

    let foundDungeon = false;
    for (const selector of dungeonSelectors) {
      try {
        if (await page.isVisible(selector, { timeout: 1000 })) {
          console.log(`   找到地城入口: ${selector}`);
          await page.click(selector);
          foundDungeon = true;
          break;
        }
      } catch (e) {
        // 继续尝试
      }
    }

    if (!foundDungeon) {
      console.log('   ⚠️  未找到明确的地城按钮，尝试通过UI探索');
      // 截图当前状态以便分析
      await screenshot('03_searching_dungeon_entrance');
    }

    await page.waitForTimeout(2000);
    await screenshot('04_dungeon_map_or_entrance');

    console.log('\n📍 步骤 4: 地城地图交互测试');
    console.log('   检查节点选择、路径显示等');

    // 尝试查找地城节点
    const nodeSelectors = [
      '.dungeon-node', '.map-node', '[data-node]',
      'circle[data-node]', 'g[data-node]',
      'svg circle', 'canvas' // 如果是 canvas 渲染
    ];

    let foundNodes = false;
    for (const selector of nodeSelectors) {
      const nodes = await page.$$(selector);
      if (nodes.length > 0) {
        console.log(`   找到 ${nodes.length} 个地城节点`);
        foundNodes = true;

        // 点击第一个节点
        if (nodes.length > 0) {
          await nodes[0].click();
          await page.waitForTimeout(1000);
          await screenshot('05_node_selected');
          console.log('   ✓ 点击了第一个节点');
        }
        break;
      }
    }

    if (!foundNodes) {
      console.log('   ⚠️  未找到明确的地城节点，可能使用 canvas 渲染');
      // 尝试点击画布中心区域
      const canvas = await page.$('canvas');
      if (canvas) {
        const box = await canvas.boundingBox();
        if (box) {
          await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.4);
          await page.waitForTimeout(1000);
          await screenshot('05_canvas_click_attempt');
        }
      }
    }

    console.log('\n📍 步骤 5: 进入战斗');
    // 寻找确认/开始战斗按钮
    const battleStartSelectors = [
      'text=开始战斗', 'text=确认', 'text=进入',
      'button:has-text("战斗")', 'button:has-text("确认")',
      '.confirm-btn', '.start-battle-btn'
    ];

    let battleStarted = false;
    for (const selector of battleStartSelectors) {
      try {
        if (await page.isVisible(selector, { timeout: 1000 })) {
          console.log(`   找到战斗开始按钮: ${selector}`);
          await page.click(selector);
          battleStarted = true;
          break;
        }
      } catch (e) {
        // 继续
      }
    }

    await page.waitForTimeout(3000); // 等待转场动画
    await screenshot('06_battle_transition');

    console.log('\n📍 步骤 6: 战斗界面加载完成');
    await page.waitForTimeout(2000);
    await screenshot('07_battle_initial_state');

    // 分析战斗界面元素
    console.log('\n   分析战斗界面元素:');
    const battleElements = await page.evaluate(() => {
      const elements = {
        cards: document.querySelectorAll('.card, [data-card]').length,
        enemies: document.querySelectorAll('.enemy, [data-enemy]').length,
        player: document.querySelectorAll('.player, [data-player]').length,
        energyDisplay: document.querySelector('[data-energy], .energy, .mana') !== null,
        endTurnBtn: document.querySelector('button:has-text("结束"), .end-turn-btn') !== null,
        canvas: document.querySelectorAll('canvas').length
      };
      return elements;
    });
    console.log('   ', battleElements);

    console.log('\n📍 步骤 7: 卡牌交互测试');

    // 查找手牌
    const cardSelectors = ['.card', '[data-card]', '.hand-card'];
    let cards = [];
    for (const selector of cardSelectors) {
      cards = await page.$$(selector);
      if (cards.length > 0) {
        console.log(`   找到 ${cards.length} 张手牌`);
        break;
      }
    }

    if (cards.length > 0) {
      // 测试 hover
      console.log('   测试卡牌 hover 效果');
      await cards[0].hover();
      await page.waitForTimeout(800);
      await screenshot('08_card_hover');

      // 测试点击选择
      console.log('   测试卡牌点击选择');
      await cards[0].click();
      await page.waitForTimeout(500);
      await screenshot('09_card_selected');

      // 测试拖拽到敌人
      console.log('   测试卡牌拖拽');
      const enemies = await page.$$('.enemy, [data-enemy]');
      if (enemies.length > 0) {
        const cardBox = await cards[0].boundingBox();
        const enemyBox = await enemies[0].boundingBox();

        if (cardBox && enemyBox) {
          await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
          await page.mouse.down();
          await page.waitForTimeout(200);

          // 拖动到敌人位置
          await page.mouse.move(enemyBox.x + enemyBox.width / 2, enemyBox.y + enemyBox.height / 2, { steps: 20 });
          await page.waitForTimeout(300);
          await screenshot('10_card_dragging');

          await page.mouse.up();
          await page.waitForTimeout(1000); // 等待攻击动画
          await screenshot('11_card_played_attack');
          console.log('   ✓ 完成卡牌拖拽打出');
        }
      } else {
        console.log('   ⚠️  未找到敌人目标');
      }
    } else {
      console.log('   ⚠️  未找到手牌元素');
      // 如果是 canvas 实现，尝试点击手牌区域
      const canvas = await page.$('canvas');
      if (canvas) {
        const box = await canvas.boundingBox();
        if (box) {
          // 点击底部中央（通常是手牌区域）
          await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.85);
          await page.waitForTimeout(800);
          await screenshot('08_canvas_hand_area_click');
        }
      }
    }

    console.log('\n📍 步骤 8: 测试多回合战斗流程');

    // 尝试打出更多卡牌或结束回合
    for (let turn = 1; turn <= 3; turn++) {
      console.log(`\n   回合 ${turn}:`);

      // 尝试打出一张卡
      cards = await page.$$(cardSelectors.find(s => true));
      if (cards.length > 0) {
        try {
          await cards[0].click();
          await page.waitForTimeout(300);

          // 点击敌人或画布中敌人位置
          const enemies = await page.$$('.enemy, [data-enemy]');
          if (enemies.length > 0) {
            await enemies[0].click();
          } else {
            const canvas = await page.$('canvas');
            if (canvas) {
              const box = await canvas.boundingBox();
              await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.3);
            }
          }

          await page.waitForTimeout(1200);
          await screenshot(`12_turn${turn}_card_played`);
        } catch (e) {
          console.log(`   卡牌打出失败: ${e.message}`);
        }
      }

      // 结束回合
      const endTurnSelectors = [
        'text=结束回合', 'text=结束', 'text=END TURN',
        '.end-turn-btn', '[data-end-turn]',
        'button:has-text("结束")'
      ];

      for (const selector of endTurnSelectors) {
        try {
          if (await page.isVisible(selector, { timeout: 500 })) {
            console.log(`   点击结束回合`);
            await page.click(selector);
            await page.waitForTimeout(2000); // 等待敌人回合
            await screenshot(`13_turn${turn}_enemy_phase`);
            break;
          }
        } catch (e) {
          // 继续
        }
      }

      await page.waitForTimeout(1000);
    }

    console.log('\n📍 步骤 9: 等待战斗结果');
    await page.waitForTimeout(5000);

    // 检查是否出现胜利/失败界面
    const resultSelectors = [
      'text=胜利', 'text=失败', 'text=VICTORY', 'text=DEFEAT',
      '.victory', '.defeat', '[data-result]'
    ];

    for (const selector of resultSelectors) {
      if (await page.isVisible(selector, { timeout: 1000 }).catch(() => false)) {
        console.log(`   ✓ 检测到战斗结果: ${selector}`);
        break;
      }
    }

    await screenshot('14_battle_result');

    console.log('\n📍 步骤 10: 测试打击感细节');
    console.log('   请在浏览器中手动操作，测试以下内容:');
    console.log('   1. 卡牌拖拽手感（是否跟手、有无延迟）');
    console.log('   2. 打击时的震屏效果');
    console.log('   3. 粒子特效（是否有、是否流畅）');
    console.log('   4. 音效反馈（虽然此测试无法验证声音，但可以检查是否有音效触发的迹象）');
    console.log('   5. 伤害数字显示');
    console.log('   6. 动画流畅度（帧率、卡顿）');

    console.log('\n\n✅ 测试完成！');
    console.log(`📁 截图保存在: ${screenshotDir}`);

    // 最后等待一段时间确保所有动画完成
    await page.waitForTimeout(3000);
    await screenshot('15_final_state');

  } catch (error) {
    console.error('\n❌ 测试过程中出错:', error);
    await screenshot('error_state');
  } finally {
    await browser.close();
    console.log('\n浏览器已关闭');
  }
})();
