const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = '/root/terra-chronicle-game';
const OUT = path.join(ROOT, 'dogfood-output', 'visual-quality-audit');
fs.mkdirSync(OUT, { recursive: true });

// Visual quality scoring rubric
const SCORING = {
  COMMERCIAL_GAME: { min: 90, max: 100, label: '商业游戏级别' },
  EXCELLENT_INDIE: { min: 80, max: 89, label: '优秀独立游戏' },
  GOOD_PROTOTYPE: { min: 70, max: 79, label: '良好原型' },
  PLAYABLE_NEEDS_WORK: { min: 60, max: 69, label: '可玩但需改进' },
  VISUAL_PROBLEMS: { min: 0, max: 59, label: '明显视觉问题' }
};

const VISUAL_CHECKS = [
  {
    id: 'season_dial_redesign',
    name: '季节盘重设计（四季弧段、进度环）',
    selector: '#seasonDial, .season-arc, .season-progress',
    weight: 15
  },
  {
    id: 'resource_dock_glass',
    name: '资源 dock 毛玻璃效果',
    selector: '#dockInfo, #dock',
    weight: 12
  },
  {
    id: 'stamina_leaf_visual',
    name: '体力叶片视觉',
    selector: '#staminaBar, .stamina-leaf, #stamina',
    weight: 10
  },
  {
    id: 'panel_visual_unity',
    name: '面板统一视觉语言',
    selectors: ['#alchemyUI', '#breedPanel', '#beastPanel', '#cardReveal'],
    weight: 15
  },
  {
    id: 'button_states',
    name: '按钮状态反馈（hover、active、disabled）',
    selectors: ['#enter', '#alchemyBrew', '#breedOpts button', '.petUse'],
    weight: 12
  },
  {
    id: 'text_clarity',
    name: '文字清晰度和排版',
    selectors: ['#ecoStatus', '#ecoDetail', '#cvName', '#cvDesc'],
    weight: 10
  },
  {
    id: 'gris_art_layers',
    name: 'Gris 美术层次改进',
    note: 'v9.12 改进效果验证',
    weight: 15
  },
  {
    id: 'seasonal_filters',
    name: '季节色彩分级效果',
    note: 'ColorMatrixFilter 四季效果',
    weight: 11
  }
];

function analyzeImageQuality(screenshotPath) {
  const png = fs.readFileSync(screenshotPath);
  const { PNG } = require('pngjs');
  const img = PNG.sync.read(png);

  let totalPixels = 0;
  let coloredPixels = 0;
  let grayPixels = 0;
  let pureBlackWhite = 0;
  let colorVariance = [];

  for (let y = 0; y < img.height; y += 3) {
    for (let x = 0; x < img.width; x += 3) {
      const i = (img.width * y + x) * 4;
      const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2], a = img.data[i + 3];

      if (a < 10) continue;
      totalPixels++;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const variance = max - min;

      colorVariance.push(variance);

      if (variance > 20) {
        coloredPixels++;
      } else if (variance > 8) {
        grayPixels++;
      } else if ((max < 15 && min < 15) || (max > 240 && min > 240)) {
        pureBlackWhite++;
      }
    }
  }

  const avgVariance = colorVariance.reduce((a, b) => a + b, 0) / colorVariance.length;
  const colorRatio = coloredPixels / totalPixels;
  const grayRatio = grayPixels / totalPixels;

  return {
    width: img.width,
    height: img.height,
    totalPixels,
    coloredPixels,
    grayPixels,
    pureBlackWhite,
    colorRatio: Math.round(colorRatio * 100),
    grayRatio: Math.round(grayRatio * 100),
    avgVariance: Math.round(avgVariance),
    qualityScore: Math.min(100, Math.round((colorRatio * 60) + (avgVariance / 3) + (grayRatio * 20)))
  };
}

async function captureElementScreenshot(page, selector, filename) {
  try {
    const element = await page.$(selector);
    if (!element) return null;

    const screenshotPath = path.join(OUT, filename);
    await element.screenshot({ path: screenshotPath });
    return screenshotPath;
  } catch (err) {
    return null;
  }
}

async function evaluateVisualElement(page, check) {
  const selectors = check.selectors || [check.selector];
  const results = [];

  for (const selector of selectors) {
    const elementData = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;

      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();

      return {
        visible: style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0',
        rect: { width: rect.width, height: rect.height, x: rect.x, y: rect.y },
        styles: {
          backgroundColor: style.backgroundColor,
          backdropFilter: style.backdropFilter,
          boxShadow: style.boxShadow,
          borderRadius: style.borderRadius,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          color: style.color,
          opacity: style.opacity,
          filter: style.filter,
          transition: style.transition
        },
        classes: el.className,
        text: el.innerText?.substring(0, 100) || ''
      };
    }, selector);

    if (elementData) {
      results.push({ selector, ...elementData });
    }
  }

  return results;
}

function scoreVisualElement(check, elementData) {
  if (!elementData || elementData.length === 0) {
    return {
      score: 0,
      issues: [`元素未找到: ${check.selector || check.selectors?.join(', ')}`],
      severity: 'critical'
    };
  }

  let score = 100;
  const issues = [];

  for (const el of elementData) {
    if (!el.visible) {
      issues.push(`${el.selector} 不可见`);
      score -= 40;
    }

    if (el.rect.width < 10 || el.rect.height < 10) {
      issues.push(`${el.selector} 尺寸过小 (${Math.round(el.rect.width)}×${Math.round(el.rect.height)})`);
      score -= 20;
    }

    // Check for visual effects based on check type
    if (check.id === 'resource_dock_glass') {
      if (!el.styles.backdropFilter || el.styles.backdropFilter === 'none') {
        issues.push(`${el.selector} 缺少毛玻璃效果 (backdrop-filter)`);
        score -= 30;
      }
    }

    if (check.id === 'text_clarity') {
      const fontSize = parseInt(el.styles.fontSize);
      if (fontSize < 12) {
        issues.push(`${el.selector} 字体过小 (${fontSize}px)`);
        score -= 15;
      }
    }

    if (check.id === 'button_states') {
      if (!el.styles.transition || el.styles.transition === 'none') {
        issues.push(`${el.selector} 缺少过渡动画`);
        score -= 10;
      }
    }
  }

  const severity = score < 40 ? 'critical' : score < 60 ? 'high' : score < 80 ? 'medium' : 'low';

  return {
    score: Math.max(0, Math.min(100, score)),
    issues,
    severity
  };
}

(async () => {
  console.log('Starting visual quality audit...\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2  // High DPI for better quality analysis
  });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleErrors.push(`${msg.type()}: ${msg.text()}`);
    }
  });

  await page.goto('https://terra.bz9.me/?smoke=visual-audit', {
    waitUntil: 'domcontentloaded',
    timeout: 45000
  });

  console.log('Waiting for game to load...');
  await page.waitForFunction(() => {
    const enter = document.querySelector('#enter');
    return !!enter && getComputedStyle(enter).visibility !== 'hidden';
  }, null, { timeout: 20000 });

  await page.waitForTimeout(1500);

  // Screenshot 1: Title screen
  console.log('📸 Capturing title screen...');
  const titlePath = path.join(OUT, '01_title_screen.png');
  await page.screenshot({ path: titlePath, fullPage: false });
  const titleAnalysis = analyzeImageQuality(titlePath);

  await page.click('#enter');
  await page.waitForFunction(() => window.__dbg && window.__dbg.ready, null, { timeout: 12000 });
  await page.waitForTimeout(2000);

  // Screenshot 2: Main world with HUD
  console.log('📸 Capturing main world...');
  const worldPath = path.join(OUT, '02_main_world_hud.png');
  await page.screenshot({ path: worldPath, fullPage: false });
  const worldAnalysis = analyzeImageQuality(worldPath);

  // Evaluate HUD elements
  console.log('\n🔍 Analyzing HUD elements...');
  const visualIssues = [];
  const checkResults = [];

  for (const check of VISUAL_CHECKS) {
    console.log(`  Checking: ${check.name}`);
    const elementData = await evaluateVisualElement(page, check);
    const scoring = scoreVisualElement(check, elementData);

    checkResults.push({
      ...check,
      elementData,
      ...scoring,
      weightedScore: (scoring.score * check.weight) / 100
    });

    if (scoring.issues.length > 0) {
      visualIssues.push({
        test_area: check.name,
        issue: scoring.issues.join('; '),
        severity: scoring.severity,
        screenshot: worldPath,
        fix_needed: generateFixSuggestion(check, scoring.issues)
      });
    }
  }

  // Test season dial specifically
  console.log('\n🔍 Testing season dial...');
  const seasonData = await page.evaluate(() => {
    const dial = document.querySelector('#seasonDial, [class*="season"]');
    return {
      exists: !!dial,
      innerHTML: dial?.innerHTML?.substring(0, 200) || '',
      children: dial?.children.length || 0
    };
  });

  // Screenshot 3: Resource dock close-up
  console.log('📸 Capturing resource dock...');
  const dockPath = await captureElementScreenshot(page, '#dockInfo', '03_resource_dock.png');

  // Open alchemy panel
  console.log('\n🔍 Testing alchemy panel...');
  const alchemyOpened = await page.evaluate(() => {
    const farm = window.__dbg.farm;
    farm.inventory.crops.starwheat = [{ originFertility: 92 }];
    farm.inventory.materials.wood = 2;
    if (window.Alchemy && window.Alchemy.open) {
      window.Alchemy.open();
      return true;
    }
    return false;
  });

  if (alchemyOpened) {
    await page.waitForSelector('#alchemyUI.on', { timeout: 5000 }).catch(() => {
      console.log('  Warning: Alchemy UI did not open');
    });
    await page.waitForTimeout(800);
  }

  const alchemyPath = path.join(OUT, '04_alchemy_panel.png');
  await page.screenshot({ path: alchemyPath, fullPage: false });
  const alchemyAnalysis = analyzeImageQuality(alchemyPath);

  // Test button states
  console.log('🔍 Testing button states...');
  const buttonStates = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button:not([style*="display: none"])'));
    return buttons.slice(0, 5).map(btn => {
      const style = getComputedStyle(btn);
      return {
        text: btn.innerText?.substring(0, 20) || btn.id,
        disabled: btn.disabled,
        hasTransition: style.transition !== 'none' && style.transition !== '',
        hasCursor: style.cursor === 'pointer' || style.cursor === 'default',
        opacity: style.opacity
      };
    });
  });

  const buttonIssues = buttonStates.filter(btn => !btn.hasTransition || !btn.hasCursor);
  if (buttonIssues.length > 0) {
    visualIssues.push({
      test_area: '按钮状态反馈',
      issue: `${buttonIssues.length} 个按钮缺少过渡动画或鼠标指针`,
      severity: 'medium',
      screenshot: alchemyPath,
      fix_needed: '为所有交互按钮添加 transition 和 cursor:pointer'
    });
  }

  // Close alchemy and open beast panel
  await page.evaluate(() => window.Alchemy?.close());
  await page.waitForTimeout(500);

  console.log('🔍 Testing beast panel...');
  await page.click('#beastPanel');
  await page.waitForTimeout(800);

  const beastPanelPath = path.join(OUT, '05_beast_panel.png');
  await page.screenshot({ path: beastPanelPath, fullPage: false });

  // Test text clarity
  console.log('🔍 Testing text clarity...');
  const textQuality = await page.evaluate(() => {
    const textElements = document.querySelectorAll('#ecoStatus, #ecoDetail, [class*="text"], p, span');
    const samples = Array.from(textElements).slice(0, 20).map(el => {
      const style = getComputedStyle(el);
      const text = el.innerText?.trim() || '';
      if (!text || text.length < 2) return null;

      return {
        text: text.substring(0, 30),
        fontSize: parseInt(style.fontSize),
        fontWeight: style.fontWeight,
        color: style.color,
        textShadow: style.textShadow,
        letterSpacing: style.letterSpacing
      };
    }).filter(Boolean);

    const smallText = samples.filter(s => s.fontSize < 12);
    const noContrast = samples.filter(s => !s.textShadow || s.textShadow === 'none');

    return { samples: samples.length, smallText: smallText.length, noContrast: noContrast.length };
  });

  if (textQuality.smallText > 0) {
    visualIssues.push({
      test_area: '文字清晰度',
      issue: `${textQuality.smallText} 处文字小于 12px`,
      severity: 'medium',
      screenshot: worldPath,
      fix_needed: '调整最小字号为 12px，增强可读性'
    });
  }

  // Test seasonal color filter
  console.log('\n🔍 Testing seasonal color filters...');
  const seasonalTest = await page.evaluate(async () => {
    const results = [];
    const seasons = ['spring', 'summer', 'autumn', 'winter'];

    for (const season of seasons) {
      if (window.__dbg?.farm) {
        window.__dbg.farm.season = season;
        window.__dbg.updateSeasonVisuals && window.__dbg.updateSeasonVisuals();
      }

      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = document.querySelector('#stage canvas, canvas');
      const filter = window.__dbg?.app?.stage?.filters?.[0];

      results.push({
        season,
        hasFilter: !!filter,
        filterType: filter?.constructor?.name || 'none'
      });
    }

    return results;
  });

  const missingFilters = seasonalTest.filter(t => !t.hasFilter || t.filterType === 'none');
  if (missingFilters.length > 0) {
    visualIssues.push({
      test_area: '季节色彩分级',
      issue: `${missingFilters.map(m => m.season).join(', ')} 缺少 ColorMatrixFilter`,
      severity: 'high',
      screenshot: worldPath,
      fix_needed: '确保所有季节应用 ColorMatrixFilter 色彩分级'
    });
  }

  await page.waitForTimeout(1000);

  // Final full screenshot
  console.log('📸 Capturing final state...');
  const finalPath = path.join(OUT, '06_final_state.png');
  await page.screenshot({ path: finalPath, fullPage: false });

  await browser.close();

  // Calculate overall score
  console.log('\n📊 Calculating visual quality score...');

  const totalWeightedScore = checkResults.reduce((sum, r) => sum + r.weightedScore, 0);
  const imageQualityScore = (titleAnalysis.qualityScore + worldAnalysis.qualityScore + alchemyAnalysis.qualityScore) / 3;

  const visualQualityScore = Math.round((totalWeightedScore * 0.7) + (imageQualityScore * 0.3));

  const scoreCategory = Object.values(SCORING).find(
    cat => visualQualityScore >= cat.min && visualQualityScore <= cat.max
  );

  const screenshots = fs.readdirSync(OUT).filter(f => f.endsWith('.png'));

  const report = {
    test_area: 'Terra Chronicle v9.12+ Gris 美术 + v9.14 视觉改进',
    screenshots_taken: screenshots.length,
    visual_quality_score: visualQualityScore,
    score_category: scoreCategory?.label || '未分类',
    visual_issues: visualIssues,
    detailed_checks: checkResults,
    image_analysis: {
      title: titleAnalysis,
      world: worldAnalysis,
      alchemy: alchemyAnalysis
    },
    console_errors: consoleErrors.slice(0, 10),
    screenshots: screenshots.map(f => path.join(OUT, f)),
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(path.join(OUT, 'visual_audit_report.json'), JSON.stringify(report, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log(`Visual Quality Score: ${visualQualityScore}/100 (${scoreCategory?.label})`);
  console.log(`Screenshots: ${screenshots.length}`);
  console.log(`Visual Issues: ${visualIssues.length}`);
  console.log('='.repeat(60));

  if (visualIssues.length > 0) {
    console.log('\n⚠️  Issues found:');
    visualIssues.forEach((issue, i) => {
      console.log(`${i + 1}. [${issue.severity.toUpperCase()}] ${issue.test_area}`);
      console.log(`   ${issue.issue}`);
      console.log(`   Fix: ${issue.fix_needed}\n`);
    });
  }

  console.log(`\n✅ Report saved to: ${path.join(OUT, 'visual_audit_report.json')}`);
  console.log(`📁 Screenshots: ${OUT}\n`);

  // Return structured output for parent process
  return report;

})().catch(err => {
  console.error('❌ Visual audit failed:', err.stack || err.message);
  process.exit(1);
});

function generateFixSuggestion(check, issues) {
  const fixes = {
    season_dial_redesign: '检查 SeasonDial 组件是否正确渲染四个弧段和进度环，确保 SVG/Canvas 绘制逻辑完整',
    resource_dock_glass: '为 #dockInfo 添加 backdrop-filter: blur(10px) 和半透明背景',
    stamina_leaf_visual: '检查体力叶片 SVG/图片资源，确保视觉层次清晰',
    panel_visual_unity: '统一所有面板的 border-radius、box-shadow、backdrop-filter 和配色方案',
    button_states: '为所有按钮添加 transition: all 0.2s ease; cursor: pointer; 和 :hover/:active/:disabled 状态样式',
    text_clarity: '调整最小字号为 12px，为白色文字添加 text-shadow: 0 1px 2px rgba(0,0,0,0.5)',
    gris_art_layers: '检查 z-index 层次，确保前景/中景/背景分离清晰，增强景深效果',
    seasonal_filters: '确保 ColorMatrixFilter 在 updateSeasonVisuals() 中正确应用到 app.stage'
  };

  return fixes[check.id] || '请检查该元素的视觉样式和实现';
}
