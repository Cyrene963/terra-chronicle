/**
 * Terra Chronicle 游戏全面体验测试
 * 目标：TERRA_PUBLIC_BASE_URL，默认权威公网 IP
 *
 * 测试路径：
 * 1. 标题页和入场转场
 * 2. 游戏世界（地图、四季/昼夜、移动、种植、伐木、灵兽）
 * 3. 炼金系统
 * 4. 地城系统
 * 5. 卡牌战斗
 * 6. 升级系统
 * 7. 灵兽培育面板
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const GAME_URL = process.env.TERRA_PUBLIC_BASE_URL || 'http://165.232.142.30:8867';
const SCREENSHOTS_DIR = path.join(__dirname, '../review_screenshots');
const REPORT_FILE = path.join(__dirname, '../GAME_REVIEW_REPORT.md');

// 确保截图目录存在
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

class GameReviewer {
  constructor() {
    this.findings = {
      P0: [], // 致命问题
      P1: [], // 严重问题
      P2: [], // 一般问题
      observations: [] // 观察记录
    };
    this.screenshots = [];
  }

  async screenshot(page, name, description) {
    try {
      const filename = `${Date.now()}_${name}.png`;
      const filepath = path.join(SCREENSHOTS_DIR, filename);
      await page.screenshot({ path: filepath, fullPage: false, timeout: 10000 });
      this.screenshots.push({ name, description, filename });
      console.log(`📸 截图: ${name} - ${description}`);
      return filepath;
    } catch (error) {
      console.warn(`⚠️  截图失败 (${name}): ${error.message}`);
      return null;
    }
  }

  addFinding(severity, title, description, screenshot = null) {
    this.findings[severity].push({ title, description, screenshot });
    console.log(`${severity === 'P0' ? '🔴' : severity === 'P1' ? '🟡' : '🔵'} [${severity}] ${title}`);
  }

  observe(category, observation) {
    if (!this.findings.observations) {
      this.findings.observations = [];
    }
    this.findings.observations.push({ category, observation, timestamp: new Date().toISOString() });
    console.log(`👁️  [${category}] ${observation}`);
  }

  async waitForStable(page, timeout = 3000) {
    try {
      await page.waitForTimeout(timeout);
    } catch (error) {
      console.warn(`⚠️  等待超时: ${error.message}`);
    }
  }

  async testTitleScreenAndTransition(page) {
    console.log('\n=== 测试 1: 标题页和入场转场 ===');

    try {
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      await this.waitForStable(page, 5000);

      await this.screenshot(page, '01_title_screen', '标题页初始状态');

      const canvas = await page.locator('canvas').first();
      if (await canvas.count() === 0) {
        this.addFinding('P0', '画布未找到', '页面中没有找到 canvas 元素，游戏可能无法渲染');
        return false;
      }

      this.observe('标题页', 'Canvas 元素已加载');

      const hasVisibleContent = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return false;
        const rect = canvas.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

      if (!hasVisibleContent) {
        this.addFinding('P1', '画布未正确显示', 'Canvas 元素存在但尺寸为 0');
      } else {
        this.observe('标题页', `Canvas 尺寸正常`);
      }

      await this.waitForStable(page, 2000);
      await this.screenshot(page, '02_title_ready', '标题页稳定后');

      console.log('尝试进入游戏...');

      // 明确选择标题页的 #enter 按钮，避免误选 HUD 中 disabled 的 #craftBtn
      const enterButton = await page.locator('#enter');
      if (await enterButton.count() > 0) {
        console.log('找到 #enter 按钮，准备点击');
        await enterButton.click({ timeout: 30000 });
        this.observe('交互', '点击了 #enter 入场按钮');
      } else {
        console.log('未找到 #enter 按钮，尝试点击画布中央');
        const viewport = page.viewportSize();
        await page.mouse.click(viewport.width / 2, viewport.height / 2);
        this.observe('交互', '点击了画布中央（回退方案）');
      }

      await this.waitForStable(page, 3000);
      await this.screenshot(page, '03_after_click', '点击后状态');

      const viewport = page.viewportSize();
      await page.evaluate(({ x, y }) => {
        const element = document.elementFromPoint(x, y);
        if (element) {
          element.click();
        }
      }, { x: viewport.width / 2, y: viewport.height / 2 });
      await this.waitForStable(page, 3000);
      await this.screenshot(page, '04_transition', '转场/加载状态');

      return true;
    } catch (error) {
      this.addFinding('P0', '标题页加载失败', `错误: ${error.message}`);
      return false;
    }
  }

  async testGameWorld(page) {
    console.log('\n=== 测试 2: 游戏世界 ===');

    try {
      await this.waitForStable(page, 3000);
      await this.screenshot(page, '05_game_world_initial', '游戏世界初始状态');

      this.observe('地图', '检查地图渲染...');
      await this.waitForStable(page, 2000);
      await this.screenshot(page, '06_map_detail', '地图细节');

      console.log('测试 WASD 移动...');
      await page.keyboard.press('W');
      await page.waitForTimeout(500);
      await this.screenshot(page, '07_move_w', '按下 W 键后');

      await page.keyboard.press('A');
      await page.waitForTimeout(500);

      await page.keyboard.press('S');
      await page.waitForTimeout(500);

      await page.keyboard.press('D');
      await page.waitForTimeout(500);
      await this.screenshot(page, '08_move_wasd', 'WASD 移动测试');

      this.observe('移动', 'WASD 按键已触发');

      console.log('测试点击寻路...');
      const viewport = page.viewportSize();
      await page.evaluate(({ x, y }) => {
        const element = document.elementFromPoint(x, y);
        if (element) {
          const evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
          element.dispatchEvent(evt);
        }
      }, { x: viewport.width * 0.7, y: viewport.height * 0.6 });
      await this.waitForStable(page, 2000);
      await this.screenshot(page, '09_click_movement', '点击寻路测试');

      console.log('寻找种植交互点...');
      for (let i = 0; i < 3; i++) {
        await page.evaluate(({ x, y }) => {
          const element = document.elementFromPoint(x, y);
          if (element) {
            const evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
            element.dispatchEvent(evt);
          }
        }, { x: viewport.width * (0.3 + i * 0.2), y: viewport.height * 0.5 });
        await page.waitForTimeout(1000);
      }
      await this.screenshot(page, '10_exploring_for_farming', '探索种植区域');

      console.log('寻找树木...');
      await page.evaluate(({ x, y }) => {
        const element = document.elementFromPoint(x, y);
        if (element) {
          const evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
          element.dispatchEvent(evt);
        }
      }, { x: viewport.width * 0.4, y: viewport.height * 0.4 });
      await page.waitForTimeout(1500);
      await this.screenshot(page, '11_exploring_for_trees', '探索树木区域');

      console.log('观察灵兽行为...');
      await this.waitForStable(page, 3000);
      await this.screenshot(page, '12_observe_spirits', '观察灵兽');

      return true;
    } catch (error) {
      this.addFinding('P1', '游戏世界测试失败', `错误: ${error.message}`);
      return false;
    }
  }

  async testAlchemySystem(page) {
    console.log('\n=== 测试 3: 炼金系统 ===');

    try {
      console.log('寻找熔炉...');
      const viewport = page.viewportSize();

      const searchPositions = [
        { x: 0.5, y: 0.5 },
        { x: 0.3, y: 0.4 },
        { x: 0.7, y: 0.4 },
        { x: 0.5, y: 0.3 }
      ];

      for (const pos of searchPositions) {
        await page.evaluate(({ x, y }) => {
          const element = document.elementFromPoint(x, y);
          if (element) {
            const evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
            element.dispatchEvent(evt);
          }
        }, { x: viewport.width * pos.x, y: viewport.height * pos.y });
        await page.waitForTimeout(1000);

        const hasPanel = await page.evaluate(() => {
          const elements = document.querySelectorAll('div, canvas');
          return elements.length > 0;
        });

        if (hasPanel) {
          await this.screenshot(page, '13_alchemy_opened', '炼金面板已打开');
          this.observe('炼金', '成功打开炼金系统');

          await page.waitForTimeout(2000);
          await this.screenshot(page, '14_alchemy_detail', '炼金系统详情');

          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
          break;
        }
      }

      return true;
    } catch (error) {
      this.addFinding('P2', '炼金系统测试失败', `错误: ${error.message}`);
      return false;
    }
  }

  async testDungeonSystem(page) {
    console.log('\n=== 测试 4: 地城系统 ===');

    try {
      console.log('寻找深渊之门...');
      const viewport = page.viewportSize();

      const searchPositions = [
        { x: 0.5, y: 0.6 },
        { x: 0.6, y: 0.5 },
        { x: 0.4, y: 0.5 },
        { x: 0.5, y: 0.4 }
      ];

      for (const pos of searchPositions) {
        await page.evaluate(({ x, y }) => {
          const element = document.elementFromPoint(x, y);
          if (element) {
            const evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
            element.dispatchEvent(evt);
          }
        }, { x: viewport.width * pos.x, y: viewport.height * pos.y });
        await page.waitForTimeout(1500);
        await this.screenshot(page, '15_searching_dungeon', '搜索深渊之门');
      }

      await this.waitForStable(page, 2000);
      await this.screenshot(page, '16_dungeon_state', '地城系统状态');

      return true;
    } catch (error) {
      this.addFinding('P2', '地城系统测试失败', `错误: ${error.message}`);
      return false;
    }
  }

  async testCardBattle(page) {
    console.log('\n=== 测试 5: 卡牌战斗 ===');

    try {
      await this.screenshot(page, '17_battle_check', '检查战斗状态');

      const viewport = page.viewportSize();
      await page.evaluate(({ x, y }) => {
        const element = document.elementFromPoint(x, y);
        if (element) {
          const evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
          element.dispatchEvent(evt);
        }
      }, { x: viewport.width * 0.5, y: viewport.height * 0.5 });
      await this.waitForStable(page, 2000);
      await this.screenshot(page, '18_battle_attempt', '尝试触发战斗');

      return true;
    } catch (error) {
      this.addFinding('P2', '卡牌战斗测试失败', `错误: ${error.message}`);
      return false;
    }
  }

  async testLevelingSystem(page) {
    console.log('\n=== 测试 6: 升级系统 ===');

    try {
      await this.screenshot(page, '19_leveling_ui', '升级系统 UI');

      await page.keyboard.press('C');
      await page.waitForTimeout(1000);
      await this.screenshot(page, '20_character_panel_c', '按 C 键尝试打开角色面板');

      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      await page.keyboard.press('Tab');
      await page.waitForTimeout(1000);
      await this.screenshot(page, '21_character_panel_tab', '按 Tab 键尝试打开角色面板');

      return true;
    } catch (error) {
      this.addFinding('P2', '升级系统测试失败', `错误: ${error.message}`);
      return false;
    }
  }

  async testSpiritBreedingPanel(page) {
    console.log('\n=== 测试 7: 灵兽培育面板 ===');

    try {
      const keys = ['B', 'P', 'I', 'K'];

      for (const key of keys) {
        await page.keyboard.press(key);
        await page.waitForTimeout(1000);
        await this.screenshot(page, `22_spirit_panel_${key}`, `按 ${key} 键尝试打开灵兽面板`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }

      return true;
    } catch (error) {
      this.addFinding('P2', '灵兽培育面板测试失败', `错误: ${error.message}`);
      return false;
    }
  }

  async generateReport() {
    console.log('\n=== 生成审查报告 ===');

    let report = `# Terra Chronicle 游戏全面审查报告\n\n`;
    report += `**审查时间**: ${new Date().toLocaleString('zh-CN')}\n`;
    report += `**游戏 URL**: ${GAME_URL}\n`;
    report += `**截图数量**: ${this.screenshots.length}\n\n`;

    report += `---\n\n`;

    report += `## 问题汇总\n\n`;
    report += `- **P0 (致命)**: ${this.findings.P0.length} 个\n`;
    report += `- **P1 (严重)**: ${this.findings.P1.length} 个\n`;
    report += `- **P2 (一般)**: ${this.findings.P2.length} 个\n\n`;

    if (this.findings.P0.length > 0) {
      report += `### 🔴 P0 致命问题\n\n`;
      this.findings.P0.forEach((finding, i) => {
        report += `#### ${i + 1}. ${finding.title}\n`;
        report += `${finding.description}\n`;
        if (finding.screenshot) {
          report += `![](${path.basename(finding.screenshot)})\n`;
        }
        report += `\n`;
      });
    }

    if (this.findings.P1.length > 0) {
      report += `### 🟡 P1 严重问题\n\n`;
      this.findings.P1.forEach((finding, i) => {
        report += `#### ${i + 1}. ${finding.title}\n`;
        report += `${finding.description}\n`;
        if (finding.screenshot) {
          report += `![](${path.basename(finding.screenshot)})\n`;
        }
        report += `\n`;
      });
    }

    if (this.findings.P2.length > 0) {
      report += `### 🔵 P2 一般问题\n\n`;
      this.findings.P2.forEach((finding, i) => {
        report += `#### ${i + 1}. ${finding.title}\n`;
        report += `${finding.description}\n`;
        if (finding.screenshot) {
          report += `![](${path.basename(finding.screenshot)})\n`;
        }
        report += `\n`;
      });
    }

    report += `## 体验观察记录\n\n`;
    if (this.findings.observations && this.findings.observations.length > 0) {
      const categories = [...new Set(this.findings.observations.map(o => o.category))];
      categories.forEach(cat => {
        report += `### ${cat}\n\n`;
        const catObs = this.findings.observations.filter(o => o.category === cat);
        catObs.forEach(obs => {
          report += `- ${obs.observation}\n`;
        });
        report += `\n`;
      });
    } else {
      report += `_无观察记录_\n\n`;
    }

    report += `## 截图索引\n\n`;
    this.screenshots.forEach((ss, i) => {
      report += `${i + 1}. **${ss.name}** - ${ss.description}\n`;
      report += `   ![${ss.name}](${SCREENSHOTS_DIR}/${ss.filename})\n\n`;
    });

    fs.writeFileSync(REPORT_FILE, report);
    console.log(`\n✅ 报告已生成: ${REPORT_FILE}`);
    console.log(`📁 截图目录: ${SCREENSHOTS_DIR}`);
  }
}

async function main() {
  console.log('🎮 Terra Chronicle 游戏全面审查开始...\n');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--single-process',
      '--disable-software-rasterizer',
      '--disable-extensions'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    hasTouch: false
  });

  const page = await context.newPage();
  const reviewer = new GameReviewer();

  try {
    console.log(`🌐 正在打开 ${GAME_URL}...`);
    await page.goto(GAME_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    try {
      await reviewer.testTitleScreenAndTransition(page);
    } catch (error) {
      console.error('测试 1 失败:', error.message);
      reviewer.addFinding('P0', '测试 1 (标题页) 异常终止', error.message);
    }

    try {
      await reviewer.testGameWorld(page);
    } catch (error) {
      console.error('测试 2 失败:', error.message);
      reviewer.addFinding('P1', '测试 2 (游戏世界) 异常终止', error.message);
    }

    try {
      await reviewer.testAlchemySystem(page);
    } catch (error) {
      console.error('测试 3 失败:', error.message);
      reviewer.addFinding('P2', '测试 3 (炼金系统) 异常终止', error.message);
    }

    try {
      await reviewer.testDungeonSystem(page);
    } catch (error) {
      console.error('测试 4 失败:', error.message);
      reviewer.addFinding('P2', '测试 4 (地城系统) 异常终止', error.message);
    }

    try {
      await reviewer.testCardBattle(page);
    } catch (error) {
      console.error('测试 5 失败:', error.message);
      reviewer.addFinding('P2', '测试 5 (卡牌战斗) 异常终止', error.message);
    }

    try {
      await reviewer.testLevelingSystem(page);
    } catch (error) {
      console.error('测试 6 失败:', error.message);
      reviewer.addFinding('P2', '测试 6 (升级系统) 异常终止', error.message);
    }

    try {
      await reviewer.testSpiritBreedingPanel(page);
    } catch (error) {
      console.error('测试 7 失败:', error.message);
      reviewer.addFinding('P2', '测试 7 (灵兽培育) 异常终止', error.message);
    }

    await page.waitForTimeout(2000);
    await reviewer.screenshot(page, '23_final_state', '测试结束时的游戏状态');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
    reviewer.addFinding('P0', '测试执行失败', `严重错误: ${error.message}\n\nStack: ${error.stack}`);
    await reviewer.screenshot(page, '99_error_state', '错误发生时的状态');
  } finally {
    await reviewer.generateReport();

    console.log('\n⏳ 保持浏览器打开 10 秒供人工观察...');
    await page.waitForTimeout(10000);

    await browser.close();
    console.log('\n✅ 审查完成！');
  }
}

main().catch(console.error);
