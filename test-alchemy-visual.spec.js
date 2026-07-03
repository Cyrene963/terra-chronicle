/* ================================================================
   Terra Chronicle — Alchemy Workshop Visual Quality Test
   炼金工坊视觉质量测试（Playwright headless:false）
   ================================================================ */

const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'alchemy-visual-test');
const REPORT_FILE = path.join(__dirname, 'alchemy-visual-test-result.json');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const issues = [];
let screenshotCounter = 0;

function recordIssue(issue, severity, screenshot, fixNeeded) {
  issues.push({ issue, severity, screenshot, fix_needed: fixNeeded });
  console.log(`[${severity.toUpperCase()}] ${issue}`);
}

async function takeScreenshot(page, name) {
  screenshotCounter++;
  const filename = `${screenshotCounter.toString().padStart(2, '0')}-${name}.png`;
  const filepath = path.join(OUTPUT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  console.log(`📸 Screenshot: ${filename}`);
  return filename;
}

test('Alchemy Workshop Visual Quality Audit', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2, // High-DPI for texture quality check
  });

  const page = await context.newPage();

  console.log('\n🧪 Starting Alchemy Workshop Visual Quality Test...\n');

  // Navigate to game
  await page.goto('http://localhost:8866', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Take landing page screenshot
  await takeScreenshot(page, 'landing-page');

  // Enter game
  const startBtn = await page.locator('#title .cta').first();
  if (await startBtn.isVisible()) {
    await startBtn.click();
    console.log('✅ Clicked "踏上大陆"');
    await page.waitForTimeout(3000); // Wait for transition
  }

  await takeScreenshot(page, 'game-world-loaded');

  // Check if alchemy FAB button exists
  const alchemyFab = await page.locator('#craftFAB').first();
  const alchemyFabVisible = await alchemyFab.isVisible().catch(() => false);

  if (!alchemyFabVisible) {
    recordIssue(
      '炼金工坊FAB按钮未找到或未显示',
      'critical',
      await takeScreenshot(page, 'missing-alchemy-fab'),
      '确保 #craftFAB 元素存在且可见，检查 main.js 是否正确初始化按钮'
    );

    // Save report and exit
    const report = {
      test_area: '炼金工坊视觉质量',
      screenshots_taken: screenshotCounter,
      visual_issues: issues,
      visual_quality_score: 0,
    };
    fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
    await context.close();
    return;
  }

  console.log('✅ Found alchemy FAB button');

  // Click alchemy FAB button
  await alchemyFab.click();
  console.log('✅ Clicked alchemy workshop button');
  await page.waitForTimeout(1500);

  // Check if alchemy UI opened
  const alchemyUI = await page.locator('#alchemyUI').first();
  const alchemyVisible = await alchemyUI.isVisible().catch(() => false);

  if (!alchemyVisible) {
    recordIssue(
      '炼金工坊UI未打开',
      'critical',
      await takeScreenshot(page, 'alchemy-ui-not-opened'),
      '检查 #alchemyUI 的显示逻辑和 CSS transition'
    );
  } else {
    console.log('✅ Alchemy UI opened');

    // Main screenshot: Alchemy Workshop Overview
    const overviewShot = await takeScreenshot(page, 'alchemy-overview');

    // ============================================================
    // 1. 羊皮纸背景质量检查
    // ============================================================
    console.log('\n📋 Checking parchment background...');

    const bgStyle = await alchemyUI.evaluate(el => {
      const panel = el.querySelector('.panel');
      if (!panel) return null;
      const computed = window.getComputedStyle(panel);
      return {
        background: computed.background,
        backgroundImage: computed.backgroundImage,
        backgroundColor: computed.backgroundColor,
      };
    });

    if (!bgStyle || bgStyle.backgroundImage === 'none') {
      recordIssue(
        '羊皮纸背景缺失或未应用',
        'high',
        overviewShot,
        '添加羊皮纸纹理背景图或渐变，参考 PROJECT_VISION.md 色彩规范'
      );
    } else {
      console.log('✅ Parchment background applied');
    }

    // ============================================================
    // 2. 青铜釜材质表现检查
    // ============================================================
    console.log('\n🔥 Checking bronze cauldron rendering...');

    const cauldronArt = await page.locator('#alchemyUI .cauldronArt').first();
    const cauldronVisible = await cauldronArt.isVisible().catch(() => false);

    if (!cauldronVisible) {
      recordIssue(
        '青铜釜图像未显示',
        'critical',
        await takeScreenshot(page, 'cauldron-missing'),
        '确保 cauldronArt 图片路径正确，且 assets/sprites/ 中存在青铜釜素材'
      );
    } else {
      // Check image src
      const cauldronSrc = await cauldronArt.getAttribute('src');
      console.log(`  Cauldron image: ${cauldronSrc}`);

      // Check if image actually loaded
      const imgNaturalWidth = await cauldronArt.evaluate(img => img.naturalWidth);
      if (imgNaturalWidth === 0) {
        recordIssue(
          '青铜釜图像加载失败（404或路径错误）',
          'critical',
          await takeScreenshot(page, 'cauldron-load-failed'),
          `检查图像路径: ${cauldronSrc}`
        );
      } else {
        console.log(`✅ Cauldron rendered (${imgNaturalWidth}px width)`);

        // Check for drop-shadow filter
        const filterStyle = await cauldronArt.evaluate(el => window.getComputedStyle(el).filter);
        if (!filterStyle.includes('drop-shadow')) {
          recordIssue(
            '青铜釜缺少阴影效果，立体感不足',
            'medium',
            overviewShot,
            '添加 filter: drop-shadow() 到 .cauldronArt CSS 规则'
          );
        }
      }
    }

    // ============================================================
    // 3. 金色边框和四角装饰检查
    // ============================================================
    console.log('\n✨ Checking gold borders and corner decorations...');

    const panelBorder = await alchemyUI.evaluate(el => {
      const panel = el.querySelector('.panel');
      if (!panel) return null;
      const computed = window.getComputedStyle(panel);
      return {
        border: computed.border,
        borderColor: computed.borderColor,
        borderRadius: computed.borderRadius,
      };
    });

    if (!panelBorder || !panelBorder.border.includes('rgb')) {
      recordIssue(
        '主面板缺少金色边框',
        'medium',
        overviewShot,
        '添加 border: 2px solid #d4af37 到 .panel CSS'
      );
    } else {
      console.log('✅ Panel border present');
    }

    // Check for corner decorations (via ::before/::after or separate elements)
    const hasCornerDecorations = await alchemyUI.evaluate(el => {
      const panel = el.querySelector('.panel');
      if (!panel) return false;
      const before = window.getComputedStyle(panel, '::before');
      const after = window.getComputedStyle(panel, '::after');
      return before.content !== 'none' || after.content !== 'none';
    });

    if (!hasCornerDecorations) {
      recordIssue(
        '缺少四角L形装饰，整体"手账风"感不足',
        'medium',
        overviewShot,
        '使用伪元素或 SVG 添加金色四角装饰，参考 PROJECT_VISION.md'
      );
    } else {
      console.log('✅ Corner decorations detected');
    }

    // ============================================================
    // 4. 材料图标清晰度检查
    // ============================================================
    console.log('\n🌾 Checking material icon clarity...');

    const materialIcons = await page.locator('#alchemyUI .ingr .icon').all();
    console.log(`  Found ${materialIcons.length} material icons`);

    if (materialIcons.length === 0) {
      recordIssue(
        '未找到材料图标',
        'high',
        await takeScreenshot(page, 'no-material-icons'),
        '检查材料列表渲染逻辑和 .ingr .icon 选择器'
      );
    } else {
      for (let i = 0; i < materialIcons.length; i++) {
        const icon = materialIcons[i];
        const iconSrc = await icon.getAttribute('src');
        const iconWidth = await icon.evaluate(img => img.naturalWidth);

        if (iconWidth === 0) {
          recordIssue(
            `材料图标 ${i + 1} 加载失败: ${iconSrc}`,
            'high',
            await takeScreenshot(page, `material-icon-${i + 1}-failed`),
            `检查素材路径: ${iconSrc}`
          );
        } else if (iconWidth < 64) {
          recordIssue(
            `材料图标 ${i + 1} 分辨率过低 (${iconWidth}px)`,
            'medium',
            overviewShot,
            '使用至少 128x128 的高清图标'
          );
        } else {
          console.log(`  ✅ Icon ${i + 1}: ${iconWidth}px (${iconSrc})`);
        }
      }
    }

    // ============================================================
    // 5. 配方发现动画检查（模拟合成）
    // ============================================================
    console.log('\n🎆 Testing recipe discovery animation...');

    // Try to add materials and craft
    const firstMaterial = await page.locator('#alchemyUI .ingr').first();
    const firstMaterialVisible = await firstMaterial.isVisible().catch(() => false);

    if (firstMaterialVisible) {
      // Click material to add to cauldron
      await firstMaterial.click();
      await page.waitForTimeout(500);

      await takeScreenshot(page, 'material-added');

      // Try to craft
      const craftBtn = await page.locator('#alchemyUI .btn-primary').first();
      const craftBtnEnabled = await craftBtn.isEnabled().catch(() => false);

      if (craftBtnEnabled) {
        console.log('  Attempting to craft...');
        await craftBtn.click();
        await page.waitForTimeout(1500);

        const discoveryShot = await takeScreenshot(page, 'after-craft-attempt');

        // Check if discovery overlay appeared
        const discoveryOverlay = await page.locator('#alchemyUI .discovery').first();
        const discoveryVisible = await discoveryOverlay.isVisible().catch(() => false);

        if (discoveryVisible) {
          console.log('✅ Discovery animation triggered');
          await page.waitForTimeout(2000); // Let animation play
          await takeScreenshot(page, 'discovery-animation');
        } else {
          // Check if there was a status message instead
          const statusMsg = await page.locator('#alchemyUI .alchemyStatus').textContent().catch(() => '');
          console.log(`  Status: ${statusMsg}`);

          if (!statusMsg.includes('成功') && !statusMsg.includes('未知')) {
            recordIssue(
              '合成后无视觉反馈（无发现动画或状态消息）',
              'medium',
              discoveryShot,
              '确保配方匹配时显示金色发现动画，失败时显示明确提示'
            );
          }
        }
      } else {
        console.log('  Craft button disabled (expected if insufficient materials)');
      }
    }

    // ============================================================
    // 6. 整体视觉评分
    // ============================================================
    console.log('\n📊 Calculating visual quality score...');

    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const highCount = issues.filter(i => i.severity === 'high').length;
    const mediumCount = issues.filter(i => i.severity === 'medium').length;
    const lowCount = issues.filter(i => i.severity === 'low').length;

    // Scoring: start at 100, deduct points
    let score = 100;
    score -= criticalCount * 25;
    score -= highCount * 15;
    score -= mediumCount * 8;
    score -= lowCount * 3;
    score = Math.max(0, score);

    console.log(`\n🎯 Visual Quality Score: ${score}/100`);
    console.log(`   Critical: ${criticalCount}, High: ${highCount}, Medium: ${mediumCount}, Low: ${lowCount}`);

    // Close UI and take final screenshot
    const closeBtn = await page.locator('#alchemyUI .close').first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(800);
      await takeScreenshot(page, 'alchemy-closed');
    }
  }

  // ============================================================
  // Generate Report
  // ============================================================
  const report = {
    test_area: '炼金工坊视觉质量',
    screenshots_taken: screenshotCounter,
    visual_issues: issues,
    visual_quality_score: 100 - (issues.filter(i => i.severity === 'critical').length * 25 +
                                  issues.filter(i => i.severity === 'high').length * 15 +
                                  issues.filter(i => i.severity === 'medium').length * 8 +
                                  issues.filter(i => i.severity === 'low').length * 3),
  };
  report.visual_quality_score = Math.max(0, report.visual_quality_score);

  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report saved to: ${REPORT_FILE}`);
  console.log(`📁 Screenshots saved to: ${OUTPUT_DIR}/`);

  await context.close();

  console.log('\n✅ Alchemy Visual Quality Test Complete\n');
});
