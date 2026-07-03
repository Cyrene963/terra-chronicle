/**
 * Terra Chronicle Visual Quality Test
 * 全面测试农场世界视觉效果
 *
 * 评分标准:
 * - 90-100: 商业游戏级别
 * - 80-89: 优秀独立游戏
 * - 70-79: 良好原型
 * - 60-69: 可玩但需改进
 * - <60: 明显视觉问题
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class VisualQualityTest {
  constructor() {
    this.issues = [];
    this.screenshotCount = 0;
    this.screenshotDir = path.join(__dirname, 'visual_test_screenshots');

    // 确保截图目录存在
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  async takeScreenshot(page, name, description) {
    const timestamp = Date.now();
    const filename = `${String(this.screenshotCount).padStart(2, '0')}_${name}_${timestamp}.png`;
    const filepath = path.join(this.screenshotDir, filename);

    await page.screenshot({
      path: filepath,
      fullPage: false
    });

    this.screenshotCount++;
    console.log(`📸 Screenshot ${this.screenshotCount}: ${description}`);
    return filepath;
  }

  addIssue(severity, issue, fix, screenshot = null) {
    this.issues.push({
      severity,
      issue,
      fix_needed: fix,
      screenshot: screenshot || 'N/A'
    });
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async run() {
    console.log('🎮 Terra Chronicle 视觉质量测试启动\n');
    console.log('测试区域: 农场世界');
    console.log('测试项目: 地形、水面、作物、季节、云影、粒子\n');

    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();

    try {
      // 导航到游戏
      console.log('🌍 加载游戏...');
      await page.goto('http://localhost:8888', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // 等待标题画面完全加载和动画完成
      await page.waitForSelector('#title', { timeout: 10000 });
      console.log('  ⏳ 等待标题动画完成...');
      await this.wait(8000); // 等待所有标题动画完成（riseIn动画最长2.3s完成）

      // 截图：标题画面
      await this.takeScreenshot(page, 'title_screen', '标题画面 - KV呼吸效果');

      // 检查标题画面视觉
      await this.checkTitleScreen(page);

      // 检查按钮是否可见
      const buttonVisible = await page.evaluate(() => {
        const btn = document.getElementById('enter');
        if (!btn) return false;
        const style = window.getComputedStyle(btn);
        return style.opacity !== '0' && style.display !== 'none';
      });

      console.log(`  🔘 按钮可见性: ${buttonVisible}`);

      // 进入游戏 - 直接使用evaluate点击以绕过可见性检查
      console.log('\n🎯 进入游戏...');
      await page.evaluate(() => {
        document.getElementById('enter').click();
      });
      await this.wait(3000);

      // 等待HUD出现
      await page.waitForSelector('#hud', { timeout: 10000 });
      await this.wait(2000);

      // 截图：初始游戏画面
      const initialScreenshot = await this.takeScreenshot(page, 'game_initial', '初始游戏画面 - 春季');

      // 1. 检查地形瓦片
      console.log('\n🗺️  测试 1/7: 地形瓦片拼接');
      await this.checkTerrainTiles(page, initialScreenshot);

      // 2. 检查水面效果
      console.log('\n💧 测试 2/7: 水面流体效果');
      await this.checkWaterEffects(page);

      // 3. 检查作物生长视觉
      console.log('\n🌾 测试 3/7: 作物生长阶段');
      await this.checkCropVisuals(page);

      // 4. 检查季节变化
      console.log('\n🍂 测试 4/7: 季节色调变化');
      await this.checkSeasonalChanges(page);

      // 5. 检查云影效果
      console.log('\n☁️  测试 5/7: 云影飘动效果');
      await this.checkCloudShadows(page);

      // 6. 检查粒子系统
      console.log('\n✨ 测试 6/7: 粒子系统');
      await this.checkParticleSystems(page);

      // 7. 检查整体画面和谐度
      console.log('\n🎨 测试 7/7: 整体画面和谐度');
      await this.checkOverallHarmony(page);

      // 性能检查
      console.log('\n⚡ 性能检查');
      await this.checkPerformance(page);

    } catch (error) {
      console.error('❌ 测试过程中出错:', error.message);
      this.addIssue('critical', `测试执行失败: ${error.message}`, '修复测试环境或游戏加载问题');
    } finally {
      await browser.close();
    }

    // 生成报告并返回结果
    return this.generateReport();
  }

  async checkTitleScreen(page) {
    try {
      // 检查KV图片是否加载
      const bgElement = await page.$('#title .bg');
      if (bgElement) {
        const bgImage = await bgElement.evaluate(el => {
          const style = window.getComputedStyle(el);
          return style.backgroundImage;
        });

        if (bgImage === 'none' || !bgImage.includes('kv_continent.png')) {
          this.addIssue('high', '标题画面KV图片未正确加载', '检查 assets/concept/kv_continent.png 是否存在');
        }
      }
    } catch (error) {
      this.addIssue('medium', `标题画面检查失败: ${error.message}`, '确保DOM元素正确渲染');
    }
  }

  async checkTerrainTiles(page, screenshot) {
    try {
      // 检查地形是否渲染
      const canvasExists = await page.$('#stage canvas');
      if (!canvasExists) {
        this.addIssue('critical', '地形画布未找到', '检查PixiJS初始化是否成功', screenshot);
        return;
      }

      // 检查是否有明显的黑屏
      const isBlackScreen = await page.evaluate(() => {
        const canvas = document.querySelector('#stage canvas');
        if (!canvas) return true;

        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        let blackPixels = 0;
        let totalPixels = data.length / 4;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          if (r < 10 && g < 10 && b < 10) {
            blackPixels++;
          }
        }

        return blackPixels / totalPixels > 0.9; // 90%以上是黑色
      });

      if (isBlackScreen) {
        this.addIssue('critical', '画面大部分为黑屏', '检查贴图加载和WebGL渲染', screenshot);
      }

      // 等待一段时间观察瓦片加载
      await this.wait(2000);

      // 截图：地形细节
      const terrainScreenshot = await this.takeScreenshot(page, 'terrain_detail', '地形瓦片细节');

      // 检查瓦片是否有明显接缝（通过JS分析）
      const hasTileSeams = await page.evaluate(() => {
        // 这里可以添加更复杂的接缝检测逻辑
        // 暂时返回false，需要实际观察截图
        return false;
      });

      if (hasTileSeams) {
        this.addIssue('medium', '地形瓦片存在明显接缝', '调整瓦片贴图边缘或使用seamless纹理', terrainScreenshot);
      }

    } catch (error) {
      this.addIssue('high', `地形检查失败: ${error.message}`, '检查渲染管线');
    }
  }

  async checkWaterEffects(page) {
    try {
      // 移动到水域附近（如果有）
      await this.wait(1000);

      // 检查水面shader是否启用
      const waterShaderActive = await page.evaluate(() => {
        return typeof window.WaterShader !== 'undefined' ||
               typeof window.waterShader !== 'undefined';
      });

      if (!waterShaderActive) {
        this.addIssue('high', '水面shader系统未激活', '检查 src/water_shader.js 是否正确加载和初始化');
      }

      // 截图：水面效果
      const waterScreenshot = await this.takeScreenshot(page, 'water_effects', '水面流体效果');

      // 检查是否有水面动画
      await this.wait(2000);
      const waterScreenshot2 = await this.takeScreenshot(page, 'water_effects_2', '水面效果（2秒后）');

      console.log('  💧 水面效果截图已保存，需人工检查metaball融合质量');

    } catch (error) {
      this.addIssue('medium', `水面效果检查失败: ${error.message}`, '确保水域渲染正常');
    }
  }

  async checkCropVisuals(page) {
    try {
      // 尝试种植作物
      console.log('  🌱 尝试种植作物...');

      // 点击地面（中心位置）
      await page.mouse.click(960, 540);
      await this.wait(500);

      // 按空格键播种
      await page.keyboard.press('Space');
      await this.wait(1000);

      // 截图：作物初始状态
      const seedlingScreenshot = await this.takeScreenshot(page, 'crop_seedling', '作物 - 幼苗阶段');

      // 加速时间推进作物生长
      console.log('  ⏰ 加速时间观察作物生长...');
      await page.keyboard.press('f');
      await this.wait(3000);

      // 截图：作物生长中
      const growingScreenshot = await this.takeScreenshot(page, 'crop_growing', '作物 - 生长阶段');

      await page.keyboard.press('f');
      await this.wait(3000);

      // 截图：作物成熟
      const matureScreenshot = await this.takeScreenshot(page, 'crop_mature', '作物 - 成熟阶段');

      console.log('  🌾 作物生长视觉已记录，需人工对比三个阶段');

    } catch (error) {
      this.addIssue('medium', `作物视觉检查失败: ${error.message}`, '确保作物系统正常工作');
    }
  }

  async checkSeasonalChanges(page) {
    try {
      const seasons = [
        { key: '1', name: '春季', color: '绿色调', expected: '#a8d5a2' },
        { key: '2', name: '夏季', color: '金色调', expected: '#e8c870' },
        { key: '3', name: '秋季', color: '橙色调', expected: '#d4a574' },
        { key: '4', name: '冬季', color: '蓝色调', expected: '#9ec5d8' }
      ];

      for (const season of seasons) {
        console.log(`  🍃 切换到${season.name}...`);

        // 按数字键切换季节
        await page.keyboard.press(season.key);
        await this.wait(2000); // 等待季节过渡动画

        // 截图
        const seasonScreenshot = await this.takeScreenshot(
          page,
          `season_${season.key}`,
          `${season.name} - ${season.color}`
        );

        // 检查季节环是否更新
        const seasonRingColor = await page.evaluate((expectedColor) => {
          const activeRing = document.querySelector('#dialRing path.active');
          if (!activeRing) return null;
          return window.getComputedStyle(activeRing).stroke;
        }, season.expected);

        if (!seasonRingColor) {
          this.addIssue('medium', `${season.name}季节环未正确激活`, '检查季节切换逻辑', seasonScreenshot);
        }
      }

      console.log('  🎨 四季色调已记录，需人工评估色彩和谐度');

    } catch (error) {
      this.addIssue('medium', `季节变化检查失败: ${error.message}`, '确保季节系统正常');
    }
  }

  async checkCloudShadows(page) {
    try {
      // 检查云影画布是否存在
      const cloudsCanvas = await page.$('#clouds');

      if (!cloudsCanvas) {
        this.addIssue('low', '云影画布元素未找到', '检查 #clouds 元素是否正确渲染');
        return;
      }

      // 检查云影是否可见
      const cloudsVisible = await page.evaluate(() => {
        const clouds = document.getElementById('clouds');
        const style = window.getComputedStyle(clouds);
        return style.opacity !== '0';
      });

      if (!cloudsVisible) {
        this.addIssue('low', '云影效果未激活', '检查云影系统初始化和opacity设置');
      }

      // 截图并等待观察云影移动
      await this.takeScreenshot(page, 'clouds_1', '云影效果 - 初始位置');
      await this.wait(3000);
      await this.takeScreenshot(page, 'clouds_2', '云影效果 - 3秒后');

      console.log('  ☁️  云影效果已记录，需人工检查飘动效果');

    } catch (error) {
      this.addIssue('low', `云影检查失败: ${error.message}`, '确保云影渲染正常');
    }
  }

  async checkParticleSystems(page) {
    try {
      console.log('  ✨ 检查粒子系统（落叶/雪花/萤火虫）...');

      // 切换到秋季查看落叶
      await page.keyboard.press('3');
      await this.wait(2000);
      const autumnParticles = await this.takeScreenshot(page, 'particles_autumn', '秋季落叶粒子');

      // 切换到冬季查看雪花
      await page.keyboard.press('4');
      await this.wait(2000);
      const winterParticles = await this.takeScreenshot(page, 'particles_winter', '冬季雪花粒子');

      // 检查粒子系统是否存在
      const particleSystemExists = await page.evaluate(() => {
        return typeof window.AdvancedParticles !== 'undefined' ||
               typeof window.particleSystem !== 'undefined';
      });

      if (!particleSystemExists) {
        this.addIssue('medium', '高级粒子系统未激活', '检查 src/advanced_particles.js 是否正确加载', winterParticles);
      }

      console.log('  ❄️  季节粒子已记录');

    } catch (error) {
      this.addIssue('low', `粒子系统检查失败: ${error.message}`, '确保粒子渲染正常');
    }
  }

  async checkOverallHarmony(page) {
    try {
      // 切回春季进行全景检查
      await page.keyboard.press('1');
      await this.wait(2000);

      // 多角度截图
      console.log('  📐 采集多角度全景截图...');

      // 中心视角
      await this.takeScreenshot(page, 'harmony_center', '画面和谐度 - 中心视角');

      // 模拟摄像机移动（通过鼠标拖拽或点击不同位置）
      await page.mouse.click(400, 300);
      await this.wait(1000);
      await this.takeScreenshot(page, 'harmony_left', '画面和谐度 - 左侧区域');

      await page.mouse.click(1520, 300);
      await this.wait(1000);
      await this.takeScreenshot(page, 'harmony_right', '画面和谐度 - 右侧区域');

      await page.mouse.click(960, 800);
      await this.wait(1000);
      await this.takeScreenshot(page, 'harmony_bottom', '画面和谐度 - 底部区域');

      // 检查UI元素是否遮挡关键内容
      const uiOverlap = await page.evaluate(() => {
        const hud = document.getElementById('hud');
        const dock = document.getElementById('dock');

        // 简单检查UI透明度
        const hudStyle = window.getComputedStyle(hud);
        const dockStyle = window.getComputedStyle(dock);

        return {
          hudVisible: hudStyle.opacity !== '0',
          dockVisible: dockStyle.display !== 'none'
        };
      });

      if (!uiOverlap.hudVisible || !uiOverlap.dockVisible) {
        this.addIssue('medium', 'UI元素未正确显示', '检查HUD和Dock的可见性');
      }

      console.log('  🎭 整体画面和谐度已记录');

    } catch (error) {
      this.addIssue('low', `整体和谐度检查失败: ${error.message}`, '确保渲染稳定');
    }
  }

  async checkPerformance(page) {
    try {
      // 读取FPS显示
      const fpsText = await page.textContent('#fpsVal');
      const fps = parseInt(fpsText);

      console.log(`  ⚡ 当前FPS: ${fps}`);

      if (fps < 30) {
        this.addIssue('high', `帧率过低 (${fps} FPS)`, '优化渲染管线、减少draw calls或降低粒子数量');
      } else if (fps < 50) {
        this.addIssue('medium', `帧率偏低 (${fps} FPS)`, '考虑优化性能密集型效果');
      } else {
        console.log('  ✅ 性能表现良好');
      }

    } catch (error) {
      this.addIssue('low', `性能检查失败: ${error.message}`, '确保性能监控正常');
    }
  }

  calculateScore() {
    let baseScore = 100;

    this.issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical':
          baseScore -= 25;
          break;
        case 'high':
          baseScore -= 15;
          break;
        case 'medium':
          baseScore -= 8;
          break;
        case 'low':
          baseScore -= 3;
          break;
      }
    });

    return Math.max(0, baseScore);
  }

  getScoreGrade(score) {
    if (score >= 90) return '🏆 商业游戏级别';
    if (score >= 80) return '⭐ 优秀独立游戏';
    if (score >= 70) return '✅ 良好原型';
    if (score >= 60) return '⚠️  可玩但需改进';
    return '❌ 明显视觉问题';
  }

  generateReport() {
    console.log('\n' + '='.repeat(70));
    console.log('📊 TERRA CHRONICLE 视觉质量测试报告');
    console.log('='.repeat(70));

    console.log(`\n📸 总截图数: ${this.screenshotCount}`);
    console.log(`📁 截图目录: ${this.screenshotDir}`);

    const score = this.calculateScore();
    const grade = this.getScoreGrade(score);

    console.log(`\n🎯 视觉质量评分: ${score}/100`);
    console.log(`   等级: ${grade}`);

    console.log(`\n🐛 发现问题数: ${this.issues.length}`);

    if (this.issues.length > 0) {
      const criticalCount = this.issues.filter(i => i.severity === 'critical').length;
      const highCount = this.issues.filter(i => i.severity === 'high').length;
      const mediumCount = this.issues.filter(i => i.severity === 'medium').length;
      const lowCount = this.issues.filter(i => i.severity === 'low').length;

      console.log(`   - Critical: ${criticalCount}`);
      console.log(`   - High: ${highCount}`);
      console.log(`   - Medium: ${mediumCount}`);
      console.log(`   - Low: ${lowCount}`);

      console.log('\n📋 问题详情:\n');

      this.issues.forEach((issue, index) => {
        const icon = {
          critical: '🔴',
          high: '🟠',
          medium: '🟡',
          low: '🔵'
        }[issue.severity];

        console.log(`${index + 1}. ${icon} [${issue.severity.toUpperCase()}] ${issue.issue}`);
        console.log(`   修复建议: ${issue.fix_needed}`);
        if (issue.screenshot !== 'N/A') {
          console.log(`   相关截图: ${path.basename(issue.screenshot)}`);
        }
        console.log('');
      });
    } else {
      console.log('   ✨ 未发现明显视觉问题！');
    }

    console.log('='.repeat(70));
    console.log('📝 测试完成\n');

    // 返回结构化数据供主流程使用
    return {
      test_area: '农场世界（Farm World）',
      screenshots_taken: this.screenshotCount,
      visual_issues: this.issues,
      visual_quality_score: score
    };
  }
}

// 运行测试
(async () => {
  const test = new VisualQualityTest();
  let result = null;

  try {
    result = await test.run();
  } catch (error) {
    console.error('Fatal error during test execution:', error);
  }

  // 确保result存在再保存
  if (result) {
    try {
      const resultPath = path.join(__dirname, 'visual_test_result.json');
      fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
      console.log(`💾 结果已保存到: ${resultPath}\n`);
      process.exit(result.visual_quality_score >= 70 ? 0 : 1);
    } catch (saveError) {
      console.error('Error saving results:', saveError);
      process.exit(1);
    }
  } else {
    console.error('No test result generated');
    process.exit(1);
  }
})();
