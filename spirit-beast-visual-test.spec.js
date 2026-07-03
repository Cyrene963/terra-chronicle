/**
 * 灵兽系统 & 交互反馈视觉质量测试
 * v9.13 游戏感改进专项验证
 *
 * 测试范围:
 * 1. 水灵兽/火灵兽精灵质量和动画
 * 2. 灵兽 AI 行为可视化（浇水、火焰效果）
 * 3. 传送门/孵化阵/熔炉呼吸光环效果
 * 4. 种植粒子爆发效果
 * 5. 收获数字飘字和粒子
 * 6. 伐木木屑粒子和震动
 * 7. 所有交互的即时反馈质量
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'spirit-beast-test');
const SERVER_URL = 'http://127.0.0.1:9999';

// 确保截图目录存在
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('灵兽系统与交互反馈视觉测试', () => {
  test.setTimeout(180000);

  test('完整视觉质量审计', async ({ page }) => {
    const issues = [];
    let screenshotCount = 0;

    // 启动游戏
    await page.goto(SERVER_URL, { waitUntil: 'networkidle' });
    await page.setViewportSize({ width: 1920, height: 1080 });

    // 等待标题页加载
    await page.waitForSelector('#title', { timeout: 15000 });

    // 等待标题页动画完成 (根据CSS riseIn动画: 1.6s .4s 到 1.6s 2.3s)
    await page.waitForTimeout(5000);

    console.log('✓ 标题页加载完成');

    // 直接通过evaluate触发点击事件
    await page.evaluate(() => {
      document.getElementById('enter').click();
    });
    console.log('✓ 点击进入按钮');

    // 等待游戏世界加载
    await page.waitForFunction(() => {
      return window.app && window.app.stage && window.gameState;
    }, { timeout: 30000 });

    await page.waitForTimeout(3000);

    console.log('✓ 游戏世界加载完成');

    // ==================== 1. 初始状态截图 ====================
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `01-initial-state.png`),
      fullPage: false
    });
    screenshotCount++;
    console.log('✓ 截图 1: 初始状态');

    // 检查灵兽面板是否显示
    const beastPanel = await page.locator('#beastPanel').isVisible();
    if (!beastPanel) {
      issues.push({
        issue: '灵兽面板未显示',
        severity: 'high',
        screenshot: '01-initial-state.png',
        fix_needed: '确保灵兽系统初始化并显示面板'
      });
    }

    // ==================== 2. 检查水灵兽精灵质量 ====================
    const waterBeastCheck = await page.evaluate(() => {
      const beasts = window.app?.stage?.children.filter(c =>
        c.beastType === 'water' || (c.name && c.name.includes('beast'))
      );
      return {
        found: beasts && beasts.length > 0,
        count: beasts?.length || 0,
        hasTexture: beasts?.[0]?.texture ? true : false,
        visible: beasts?.[0]?.visible || false,
        alpha: beasts?.[0]?.alpha || 0
      };
    });

    console.log('水灵兽检查:', waterBeastCheck);

    if (!waterBeastCheck.found) {
      issues.push({
        issue: '水灵兽精灵未找到',
        severity: 'critical',
        screenshot: '01-initial-state.png',
        fix_needed: '确保水灵兽精灵正确生成并添加到舞台'
      });
    } else if (!waterBeastCheck.visible || waterBeastCheck.alpha < 0.5) {
      issues.push({
        issue: '水灵兽精灵不可见或透明度过低',
        severity: 'high',
        screenshot: '01-initial-state.png',
        fix_needed: '检查水灵兽可见性和透明度设置'
      });
    }

    await page.waitForTimeout(2000);

    // ==================== 3. 测试种植交互 - 粒子效果 ====================
    console.log('测试种植交互粒子效果...');

    // 寻找可耕地
    const plantResult = await page.evaluate(() => {
      if (!window.gameState || !window.gameState.plots) return { success: false };

      const player = window.app.stage.children.find(c => c.isPlayer);
      if (!player) return { success: false };

      // 找到第一个空地块
      const emptyPlot = window.gameState.plots.find(p => !p.crop);
      if (!emptyPlot) return { success: false };

      // 移动玩家到地块
      player.x = emptyPlot.x * window.TILE;
      player.y = emptyPlot.y * window.TILE;

      return {
        success: true,
        plotX: emptyPlot.x,
        plotY: emptyPlot.y
      };
    });

    if (plantResult.success) {
      await page.waitForTimeout(500);

      // 按空格播种
      await page.keyboard.press('Space');
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `02-planting-particles.png`),
        fullPage: false
      });
      screenshotCount++;
      console.log('✓ 截图 2: 种植粒子效果');

      // 检查粒子系统
      const particleCheck = await page.evaluate(() => {
        const particles = window.app?.stage?.children.filter(c =>
          c.isParticle || (c.name && c.name.includes('particle'))
        );
        return {
          found: particles && particles.length > 0,
          count: particles?.length || 0
        };
      });

      if (!particleCheck.found) {
        issues.push({
          issue: '种植粒子效果未触发',
          severity: 'medium',
          screenshot: '02-planting-particles.png',
          fix_needed: '确保种植时触发土壤粒子爆发效果'
        });
      }

      await page.waitForTimeout(2000);
    }

    // ==================== 4. 测试灵兽浇水行为可视化 ====================
    console.log('测试灵兽浇水行为...');

    // 等待灵兽执行浇水动作
    const wateringObserved = await page.evaluate(() => {
      return new Promise((resolve) => {
        let timeout = setTimeout(() => resolve({ success: false, reason: 'timeout' }), 15000);

        // 监听灵兽状态变化
        const checkInterval = setInterval(() => {
          const beastStateEl = document.getElementById('beastState');
          if (beastStateEl && beastStateEl.textContent.includes('浇水')) {
            clearTimeout(timeout);
            clearInterval(checkInterval);
            resolve({ success: true, state: beastStateEl.textContent });
          }
        }, 500);
      });
    });

    if (wateringObserved.success) {
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `03-beast-watering.png`),
        fullPage: false
      });
      screenshotCount++;
      console.log('✓ 截图 3: 灵兽浇水行为');

      // 检查浇水特效
      const waterEffectCheck = await page.evaluate(() => {
        const waterEffects = window.app?.stage?.children.filter(c =>
          c.isWaterEffect || (c.name && c.name.includes('water'))
        );
        return {
          found: waterEffects && waterEffects.length > 0,
          count: waterEffects?.length || 0
        };
      });

      if (!waterEffectCheck.found) {
        issues.push({
          issue: '灵兽浇水视觉效果不明显',
          severity: 'medium',
          screenshot: '03-beast-watering.png',
          fix_needed: '增强水滴粒子和浇水动画效果'
        });
      }
    } else {
      issues.push({
        issue: '灵兽浇水行为未观察到',
        severity: 'medium',
        screenshot: '02-planting-particles.png',
        fix_needed: '检查灵兽AI逻辑，确保自动浇水行为触发'
      });
    }

    await page.waitForTimeout(2000);

    // ==================== 5. 测试伐木交互 - 木屑粒子和震动 ====================
    console.log('测试伐木交互...');

    const chopResult = await page.evaluate(() => {
      if (!window.gameState || !window.gameState.trees) return { success: false };

      const player = window.app.stage.children.find(c => c.isPlayer);
      if (!player) return { success: false };

      // 找到第一棵树
      const tree = window.gameState.trees[0];
      if (!tree) return { success: false };

      // 移动玩家到树附近
      player.x = tree.x * window.TILE;
      player.y = tree.y * window.TILE;

      return {
        success: true,
        treeX: tree.x,
        treeY: tree.y
      };
    });

    if (chopResult.success) {
      await page.waitForTimeout(1500);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `04-tree-chopping.png`),
        fullPage: false
      });
      screenshotCount++;
      console.log('✓ 截图 4: 伐木交互');

      // 检查木屑粒子
      const woodParticleCheck = await page.evaluate(() => {
        const woodParticles = window.app?.stage?.children.filter(c =>
          c.isWoodChip || (c.name && c.name.includes('chip'))
        );
        return {
          found: woodParticles && woodParticles.length > 0,
          count: woodParticles?.length || 0
        };
      });

      if (!woodParticleCheck.found) {
        issues.push({
          issue: '伐木木屑粒子效果缺失',
          severity: 'medium',
          screenshot: '04-tree-chopping.png',
          fix_needed: '添加伐木时的木屑粒子飞溅效果'
        });
      }

      await page.waitForTimeout(2000);
    }

    // ==================== 6. 时间加速以测试收获 ====================
    console.log('加速时间以测试收获...');

    await page.keyboard.press('f');
    await page.waitForTimeout(8000); // 等待作物成熟

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `05-crop-growth.png`),
      fullPage: false
    });
    screenshotCount++;
    console.log('✓ 截图 5: 作物生长');

    // ==================== 7. 测试收获 - 数字飘字和粒子 ====================
    console.log('测试收获交互...');

    const harvestResult = await page.evaluate(() => {
      if (!window.gameState || !window.gameState.plots) return { success: false };

      const player = window.app.stage.children.find(c => c.isPlayer);
      if (!player) return { success: false };

      // 找到成熟的作物
      const maturePlot = window.gameState.plots.find(p =>
        p.crop && p.crop.growth >= 100
      );
      if (!maturePlot) return { success: false };

      // 移动玩家到地块
      player.x = maturePlot.x * window.TILE;
      player.y = maturePlot.y * window.TILE;

      return {
        success: true,
        plotX: maturePlot.x,
        plotY: maturePlot.y
      };
    });

    if (harvestResult.success) {
      await page.waitForTimeout(500);

      // 按空格收获
      await page.keyboard.press('Space');
      await page.waitForTimeout(800);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `06-harvest-feedback.png`),
        fullPage: false
      });
      screenshotCount++;
      console.log('✓ 截图 6: 收获反馈');

      // 检查飘字效果
      const floatingTextCheck = await page.evaluate(() => {
        const floatingTexts = window.app?.stage?.children.filter(c =>
          c.isFloatingText || (c.text && c.y < c.startY)
        );
        return {
          found: floatingTexts && floatingTexts.length > 0,
          count: floatingTexts?.length || 0
        };
      });

      if (!floatingTextCheck.found) {
        issues.push({
          issue: '收获数字飘字效果缺失',
          severity: 'medium',
          screenshot: '06-harvest-feedback.png',
          fix_needed: '添加收获时的数字飘字动画'
        });
      }

      await page.waitForTimeout(2000);
    }

    // ==================== 8. 检查传送门呼吸光环 ====================
    console.log('检查传送门光环效果...');

    const portalCheck = await page.evaluate(() => {
      const portals = window.app?.stage?.children.filter(c =>
        c.isPortal || (c.name && c.name.includes('portal'))
      );

      if (!portals || portals.length === 0) return { found: false };

      const portal = portals[0];
      const hasGlow = portal.children?.some(child =>
        child.name && child.name.includes('glow')
      );

      return {
        found: true,
        count: portals.length,
        hasGlow: hasGlow,
        alpha: portal.alpha
      };
    });

    console.log('传送门检查:', portalCheck);

    if (!portalCheck.found) {
      issues.push({
        issue: '传送门精灵未找到',
        severity: 'medium',
        screenshot: '05-crop-growth.png',
        fix_needed: '确保传送门正确生成'
      });
    } else if (!portalCheck.hasGlow) {
      issues.push({
        issue: '传送门呼吸光环效果缺失',
        severity: 'low',
        screenshot: '05-crop-growth.png',
        fix_needed: '添加传送门周围的光环呼吸动画'
      });
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `07-portal-glow.png`),
      fullPage: false
    });
    screenshotCount++;
    console.log('✓ 截图 7: 传送门光环');

    // ==================== 9. 检查孵化阵效果 ====================
    console.log('检查孵化阵效果...');

    const hatcheryCheck = await page.evaluate(() => {
      const hatcheries = window.app?.stage?.children.filter(c =>
        c.isHatchery || (c.name && c.name.includes('hatchery'))
      );

      if (!hatcheries || hatcheries.length === 0) return { found: false };

      const hatchery = hatcheries[0];
      const hasGlow = hatchery.children?.some(child =>
        child.name && child.name.includes('glow')
      );

      return {
        found: true,
        hasGlow: hasGlow
      };
    });

    if (hatcheryCheck.found && !hatcheryCheck.hasGlow) {
      issues.push({
        issue: '孵化阵呼吸光环效果缺失',
        severity: 'low',
        screenshot: '07-portal-glow.png',
        fix_needed: '添加孵化阵周围的光环呼吸动画'
      });
    }

    // ==================== 10. 检查炼金FAB动画 ====================
    console.log('检查炼金FAB动画...');

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `08-alchemy-fab.png`),
      fullPage: false
    });
    screenshotCount++;
    console.log('✓ 截图 8: 炼金FAB');

    const fabCheck = await page.evaluate(() => {
      const fab = document.getElementById('craftFAB');
      if (!fab) return { found: false };

      const styles = window.getComputedStyle(fab);
      const hasAnimation = styles.animation && styles.animation !== 'none';

      return {
        found: true,
        hasAnimation: hasAnimation,
        opacity: styles.opacity,
        transform: styles.transform
      };
    });

    console.log('FAB检查:', fabCheck);

    if (!fabCheck.found) {
      issues.push({
        issue: '炼金FAB未显示',
        severity: 'high',
        screenshot: '08-alchemy-fab.png',
        fix_needed: '确保炼金FAB正确显示'
      });
    } else if (!fabCheck.hasAnimation) {
      issues.push({
        issue: '炼金FAB缺少脉动动画',
        severity: 'low',
        screenshot: '08-alchemy-fab.png',
        fix_needed: '添加或修复FAB的脉动动画效果'
      });
    }

    // ==================== 11. 测试炼金流程 ====================
    console.log('测试炼金流程...');

    // 确保有足够资源
    await page.evaluate(() => {
      if (window.gameState) {
        window.gameState.inventory.wheat = 10;
        window.gameState.inventory.wood = 10;
      }
    });

    // 点击FAB
    await page.locator('#craftFAB').click();
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `09-card-reveal.png`),
      fullPage: false
    });
    screenshotCount++;
    console.log('✓ 截图 9: 卡牌揭示');

    // 检查卡牌揭示动画
    const cardRevealCheck = await page.evaluate(() => {
      const reveal = document.getElementById('cardReveal');
      if (!reveal) return { found: false };

      const isVisible = reveal.classList.contains('on');
      const cardBox = reveal.querySelector('.cardBox');
      const styles = cardBox ? window.getComputedStyle(cardBox) : null;

      return {
        found: true,
        visible: isVisible,
        transform: styles?.transform || 'none'
      };
    });

    if (!cardRevealCheck.visible) {
      issues.push({
        issue: '卡牌揭示动画未触发',
        severity: 'high',
        screenshot: '09-card-reveal.png',
        fix_needed: '确保炼金成功后触发卡牌揭示动画'
      });
    }

    await page.waitForTimeout(2000);

    // 关闭卡牌揭示
    await page.click('#cardReveal');
    await page.waitForTimeout(1000);

    // ==================== 12. 最终状态截图 ====================
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `10-final-state.png`),
      fullPage: false
    });
    screenshotCount++;
    console.log('✓ 截图 10: 最终状态');

    // ==================== 综合评分 ====================
    let visualScore = 100;

    // 严重问题 -15分
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    visualScore -= criticalIssues.length * 15;

    // 高优先级问题 -10分
    const highIssues = issues.filter(i => i.severity === 'high');
    visualScore -= highIssues.length * 10;

    // 中优先级问题 -5分
    const mediumIssues = issues.filter(i => i.severity === 'medium');
    visualScore -= mediumIssues.length * 5;

    // 低优先级问题 -2分
    const lowIssues = issues.filter(i => i.severity === 'low');
    visualScore -= lowIssues.length * 2;

    visualScore = Math.max(0, visualScore);

    console.log('\n========================================');
    console.log('视觉质量测试完成');
    console.log('========================================');
    console.log(`截图数量: ${screenshotCount}`);
    console.log(`问题总数: ${issues.length}`);
    console.log(`  - 严重: ${criticalIssues.length}`);
    console.log(`  - 高: ${highIssues.length}`);
    console.log(`  - 中: ${mediumIssues.length}`);
    console.log(`  - 低: ${lowIssues.length}`);
    console.log(`视觉质量评分: ${visualScore}/100`);
    console.log('========================================\n');

    // 将结果存储到页面上下文，供StructuredOutput调用
    await page.evaluate((data) => {
      window.__testResults = data;
    }, {
      test_area: '灵兽系统与交互反馈',
      screenshots_taken: screenshotCount,
      visual_issues: issues,
      visual_quality_score: visualScore
    });
  });
});
