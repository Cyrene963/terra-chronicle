/**
 * 灵兽系统与交互反馈视觉质量审计
 * 使用 Puppeteer 进行真实浏览器测试
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'spirit-beast-audit');
const SERVER_URL = 'http://127.0.0.1:9999';

// 确保目录存在
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runVisualAudit() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/root/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const issues = [];
  let screenshotCount = 0;

  console.log('========================================');
  console.log('灵兽系统与交互反馈视觉质量审计');
  console.log('========================================\n');

  try {
    // 监听控制台错误
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('   [浏览器错误]', msg.text());
      }
    });

    page.on('pageerror', error => {
      console.log('   [页面错误]', error.message);
    });

    // ==================== 1. 加载游戏 ====================
    console.log('1. 加载游戏...');
    await page.goto(SERVER_URL, { waitUntil: 'networkidle2', timeout: 30000 });

    // 等待标题页
    await page.waitForSelector('#title', { timeout: 15000 });
    console.log('   ✓ 标题页已加载');

    // 等待动画完成
    await wait(5000);

    // 截图标题页
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-title-screen.png')
    });
    screenshotCount++;
    console.log('   ✓ 截图 1: 标题页\n');

    // ==================== 2. 进入游戏 ====================
    console.log('2. 进入游戏世界...');

    // 直接通过JS触发点击
    await page.evaluate(() => {
      const btn = document.getElementById('enter');
      if (btn) btn.click();
    });

    // 等待游戏初始化 - 使用更灵活的等待策略
    let gameLoaded = false;
    for (let i = 0; i < 60; i++) {
      const loaded = await page.evaluate(() => {
        return !!(window.PIXI && window.app && window.gameState);
      });

      if (loaded) {
        gameLoaded = true;
        break;
      }
      await wait(1000);
    }

    if (!gameLoaded) {
      issues.push({
        issue: '游戏未能在60秒内加载完成',
        severity: 'critical',
        screenshot: '01-title-screen.png',
        fix_needed: '检查PixiJS加载和游戏初始化逻辑'
      });

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '02-loading-timeout.png')
      });
      screenshotCount++;

      throw new Error('Game failed to load');
    }

    await wait(3000);
    console.log('   ✓ 游戏世界已加载\n');

    // ==================== 3. 初始状态截图 ====================
    console.log('3. 捕获初始游戏状态...');
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-initial-state.png')
    });
    screenshotCount++;
    console.log('   ✓ 截图 2: 初始状态\n');

    // ==================== 4. 检查HUD元素 ====================
    console.log('4. 检查HUD元素...');

    const hudCheck = await page.evaluate(() => {
      return {
        beastPanel: !!document.getElementById('beastPanel')?.offsetParent,
        dock: !!document.getElementById('dock')?.offsetParent,
        seasonDial: !!document.getElementById('seasonDial')?.offsetParent,
        craftFAB: !!document.getElementById('craftFAB')?.offsetParent,
        ecoPanel: !!document.getElementById('ecoPanel')?.offsetParent
      };
    });

    console.log('   HUD元素检查:', hudCheck);

    if (!hudCheck.beastPanel) {
      issues.push({
        issue: '灵兽面板未显示',
        severity: 'high',
        screenshot: '02-initial-state.png',
        fix_needed: '确保灵兽系统初始化并显示面板'
      });
    }

    if (!hudCheck.craftFAB) {
      issues.push({
        issue: '炼金FAB未显示',
        severity: 'high',
        screenshot: '02-initial-state.png',
        fix_needed: '确保炼金FAB正确初始化'
      });
    }

    if (!hudCheck.ecoPanel) {
      issues.push({
        issue: '生态面板未显示',
        severity: 'medium',
        screenshot: '02-initial-state.png',
        fix_needed: '确保生态系统面板正确显示'
      });
    }

    console.log('   ✓ HUD检查完成\n');

    // ==================== 5. 检查PixiJS舞台精灵 ====================
    console.log('5. 检查PixiJS舞台精灵...');

    const spriteCheck = await page.evaluate(() => {
      if (!window.app || !window.app.stage) return null;

      const stage = window.app.stage;
      const children = stage.children;

      const counts = {
        total: children.length,
        player: 0,
        beasts: 0,
        trees: 0,
        crops: 0,
        buildings: 0,
        particles: 0
      };

      for (const child of children) {
        if (child.isPlayer) counts.player++;
        if (child.beastType || (child.name && child.name.includes('beast'))) counts.beasts++;
        if (child.isTree) counts.trees++;
        if (child.isCrop) counts.crops++;
        if (child.isBuilding) counts.buildings++;
        if (child.isParticle) counts.particles++;
      }

      return counts;
    });

    console.log('   精灵统计:', spriteCheck);

    if (!spriteCheck || spriteCheck.player === 0) {
      issues.push({
        issue: '玩家精灵未找到',
        severity: 'critical',
        screenshot: '02-initial-state.png',
        fix_needed: '确保玩家精灵正确生成'
      });
    }

    if (!spriteCheck || spriteCheck.beasts === 0) {
      issues.push({
        issue: '灵兽精灵未找到',
        severity: 'critical',
        screenshot: '02-initial-state.png',
        fix_needed: '确保灵兽精灵正确生成并添加到舞台'
      });
    }

    console.log('   ✓ 精灵检查完成\n');

    // ==================== 6. 测试移动和交互 ====================
    console.log('6. 测试玩家移动...');

    // 按下W键向上移动
    await page.keyboard.down('w');
    await wait(1000);
    await page.keyboard.up('w');

    await wait(500);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '03-player-moved.png')
    });
    screenshotCount++;
    console.log('   ✓ 截图 3: 玩家移动后\n');

    // ==================== 7. 测试种植交互 ====================
    console.log('7. 测试种植交互...');

    // 移动到空地块并种植
    const plantResult = await page.evaluate(() => {
      if (!window.gameState || !window.gameState.plots) return { success: false };

      const player = window.app.stage.children.find(c => c.isPlayer);
      if (!player) return { success: false };

      const emptyPlot = window.gameState.plots.find(p => !p.crop);
      if (!emptyPlot) return { success: false };

      player.x = emptyPlot.x * window.TILE;
      player.y = emptyPlot.y * window.TILE;

      return { success: true };
    });

    if (plantResult.success) {
      await wait(500);
      await page.keyboard.press('Space');
      await wait(1500);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '04-planting-interaction.png')
      });
      screenshotCount++;
      console.log('   ✓ 截图 4: 种植交互\n');
    } else {
      console.log('   ⚠ 无法执行种植测试\n');
    }

    // ==================== 8. 时间加速 ====================
    console.log('8. 加速时间...');

    await page.keyboard.press('f');
    await wait(5000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '05-time-acceleration.png')
    });
    screenshotCount++;
    console.log('   ✓ 截图 5: 时间加速\n');

    // ==================== 9. 检查灵兽AI ====================
    console.log('9. 观察灵兽AI行为...');

    await wait(5000);

    const beastState = await page.evaluate(() => {
      const stateEl = document.getElementById('beastState');
      return stateEl ? stateEl.textContent : null;
    });

    console.log('   灵兽状态:', beastState);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '06-beast-ai-behavior.png')
    });
    screenshotCount++;
    console.log('   ✓ 截图 6: 灵兽AI行为\n');

    // ==================== 10. 测试炼金系统 ====================
    console.log('10. 测试炼金系统...');

    // 确保有足够资源
    await page.evaluate(() => {
      if (window.gameState) {
        window.gameState.inventory.wheat = 10;
        window.gameState.inventory.wood = 10;
      }
    });

    await wait(500);

    // 点击炼金FAB
    await page.click('#craftFAB');
    await wait(2000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '07-alchemy-reveal.png')
    });
    screenshotCount++;
    console.log('   ✓ 截图 7: 炼金卡牌揭示\n');

    // 检查卡牌揭示动画
    const cardRevealVisible = await page.evaluate(() => {
      const reveal = document.getElementById('cardReveal');
      return reveal && reveal.classList.contains('on');
    });

    if (!cardRevealVisible) {
      issues.push({
        issue: '卡牌揭示动画未触发',
        severity: 'high',
        screenshot: '07-alchemy-reveal.png',
        fix_needed: '确保炼金成功后触发卡牌揭示动画'
      });
    }

    // 关闭揭示
    await page.click('#cardReveal');
    await wait(1000);

    // ==================== 11. 最终状态 ====================
    console.log('11. 捕获最终状态...');

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '08-final-state.png')
    });
    screenshotCount++;
    console.log('   ✓ 截图 8: 最终状态\n');

    // ==================== 12. 动画和效果检查 ====================
    console.log('12. 检查动画和视觉效果...');

    const animationCheck = await page.evaluate(() => {
      const fab = document.getElementById('craftFAB');
      const fabStyles = fab ? window.getComputedStyle(fab) : null;

      const seasonDial = document.getElementById('dialRing');

      return {
        fabAnimation: fabStyles && fabStyles.animation !== 'none',
        fabVisible: fab && fab.offsetParent !== null,
        seasonDialExists: !!seasonDial
      };
    });

    console.log('   动画检查:', animationCheck);

    if (!animationCheck.fabAnimation) {
      issues.push({
        issue: '炼金FAB脉动动画缺失',
        severity: 'low',
        screenshot: '08-final-state.png',
        fix_needed: '添加或修复FAB的脉动动画效果'
      });
    }

    console.log('   ✓ 动画检查完成\n');

  } catch (error) {
    console.error('\n错误:', error.message);

    // 错误截图
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '99-error-state.png')
    });
    screenshotCount++;
  } finally {
    await browser.close();
  }

  // ==================== 综合评分 ====================
  let visualScore = 100;

  const criticalIssues = issues.filter(i => i.severity === 'critical');
  const highIssues = issues.filter(i => i.severity === 'high');
  const mediumIssues = issues.filter(i => i.severity === 'medium');
  const lowIssues = issues.filter(i => i.severity === 'low');

  visualScore -= criticalIssues.length * 15;
  visualScore -= highIssues.length * 10;
  visualScore -= mediumIssues.length * 5;
  visualScore -= lowIssues.length * 2;

  visualScore = Math.max(0, visualScore);

  // ==================== 输出报告 ====================
  console.log('\n========================================');
  console.log('视觉质量审计完成');
  console.log('========================================');
  console.log(`截图数量: ${screenshotCount}`);
  console.log(`截图目录: ${SCREENSHOT_DIR}`);
  console.log(`\n问题总数: ${issues.length}`);
  console.log(`  - 严重 (Critical): ${criticalIssues.length}`);
  console.log(`  - 高 (High): ${highIssues.length}`);
  console.log(`  - 中 (Medium): ${mediumIssues.length}`);
  console.log(`  - 低 (Low): ${lowIssues.length}`);
  console.log(`\n视觉质量评分: ${visualScore}/100`);

  if (issues.length > 0) {
    console.log('\n发现的问题:');
    issues.forEach((issue, idx) => {
      console.log(`\n${idx + 1}. [${issue.severity.toUpperCase()}] ${issue.issue}`);
      console.log(`   修复建议: ${issue.fix_needed}`);
      console.log(`   相关截图: ${issue.screenshot}`);
    });
  }

  console.log('\n========================================\n');

  return {
    test_area: '灵兽系统与交互反馈',
    screenshots_taken: screenshotCount,
    visual_issues: issues,
    visual_quality_score: visualScore
  };
}

// 执行审计
runVisualAudit()
  .then(results => {
    // 将结果写入全局对象供StructuredOutput读取
    global.testResults = results;
    console.log('测试完成，结果已保存');
    process.exit(0);
  })
  .catch(error => {
    console.error('测试失败:', error);
    process.exit(1);
  });
