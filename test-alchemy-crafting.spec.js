/**
 * Terra Chronicle — 炼金工坊 & 升级系统游戏感测试
 *
 * 测试流程:
 * 1. 炼金 UI 打开动画
 * 2. 材料投入交互（拖拽、反馈）
 * 3. 配方探索反馈（发现动画、提示）
 * 4. 卡牌合成过程（视觉、节奏）
 * 5. 升级面板（蓝图展示、购买反馈）
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('炼金工坊 & 升级系统游戏感审计', () => {

  test('完整测试流程', async ({ page }) => {
    test.setTimeout(180000); // 增加超时时间到 180 秒

    const screenshotDir = path.join(__dirname, 'alchemy-crafting-screenshots');

    // 减少截图质量以加快速度
    const screenshotOpts = {
      fullPage: true,
      animations: 'disabled'
    };
    await page.goto(`file://${path.join(__dirname, 'index.html')}`);
    await page.setViewportSize({ width: 1920, height: 1080 });

    // 等待游戏加载
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotDir, '01-title-screen.png'), ...screenshotOpts });

    // 点击进入按钮
    const enterBtn = await page.$('#enter');
    if (enterBtn) {
      await enterBtn.click();
    }
    await page.waitForTimeout(1500);

    // 等待游戏界面出现
    await page.waitForSelector('#dock', { timeout: 3000 });
    await page.screenshot({ path: path.join(screenshotDir, '02-game-loaded.png'), ...screenshotOpts });

    // 确保有足够材料 - 修改游戏状态
    await page.evaluate(() => {
      const farm = window.Terra?.farm;
      if (farm) {
        // 设置材料库存
        farm.inventory.crops.starwheat = [
          { originFertility: 75 },
          { originFertility: 80 },
          { originFertility: 70 },
          { originFertility: 85 },
          { originFertility: 90 }
        ];
        farm.inventory.crops.dewberry = [
          { quality: 0.8 },
          { quality: 0.85 },
          { quality: 0.9 }
        ];
        farm.inventory.materials.wood = 20;
        farm.inventory.materials.beast_soul = 5;
        window.Terra.save();
        if (window.updateDock) window.updateDock();
      }
    });

    await page.waitForTimeout(300);

    // ========== 1. 炼金 UI 打开动画测试 ==========
    console.log('\n=== 测试 1: 炼金 UI 打开动画 ===');

    // 打开炼金界面前截图
    await page.screenshot({ path: path.join(screenshotDir, '03-before-alchemy-open.png'), ...screenshotOpts });

    // 打开炼金界面
    await page.evaluate(() => {
      if (window.Alchemy) window.Alchemy.open();
    });

    // 立即截图 (打开动画开始)
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(screenshotDir, '04-alchemy-opening-100ms.png'), ...screenshotOpts });

    // 动画中间状态
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(screenshotDir, '05-alchemy-opening-300ms.png'), ...screenshotOpts });

    // 动画完成
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotDir, '06-alchemy-opened.png'), ...screenshotOpts });

    // ========== 2. 材料投入交互测试 ==========
    console.log('\n=== 测试 2: 材料投入交互 ===');

    // 投入第一个星麦
    await page.click('#addWheat');
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(screenshotDir, '07-add-wheat-1.png'), ...screenshotOpts });

    // 投入第二个星麦
    await page.click('#addWheat');
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(screenshotDir, '08-add-wheat-2.png'), ...screenshotOpts });

    // 投入第三个星麦
    await page.click('#addWheat');
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(screenshotDir, '09-add-wheat-3.png'), ...screenshotOpts });

    // 投入木材
    await page.click('#addWood');
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(screenshotDir, '10-add-wood-1.png'), ...screenshotOpts });

    await page.click('#addWood');
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(screenshotDir, '11-add-wood-2.png'), ...screenshotOpts });

    // 釜中显示材料状态
    await page.screenshot({ path: path.join(screenshotDir, '12-cauldron-ready.png'), ...screenshotOpts });

    // ========== 3. 清空按钮测试 ==========
    console.log('\n=== 测试 3: 清空按钮反馈 ===');

    await page.click('#alchemyReset');
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(screenshotDir, '13-after-reset.png'), ...screenshotOpts });

    // ========== 4. 配方探索 - 失败案例 ==========
    console.log('\n=== 测试 4: 配方不匹配反馈 ===');

    // 投入错误配方
    await page.click('#addWheat');
    await page.click('#addDewberry');
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(screenshotDir, '14-wrong-recipe-ready.png'), ...screenshotOpts });

    // 尝试炼制
    await page.evaluate(() => {
      document.getElementById('alchemyBrew')?.click();
    });
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(screenshotDir, '15-wrong-recipe-feedback.png'), ...screenshotOpts });
    await page.waitForTimeout(300);

    // ========== 5. 配方探索 - 成功案例 ==========
    console.log('\n=== 测试 5: 配方发现动画 ===');

    // 投入正确配方: 星麦×3 + 木材×2 = 新芽守卫
    await page.click('#addWheat');
    await page.click('#addWheat');
    await page.click('#addWheat');
    await page.click('#addWood');
    await page.click('#addWood');
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(screenshotDir, '16-correct-recipe-ready.png'), ...screenshotOpts });

    // 点击炼制
    await page.click('#alchemyBrew');

    // 发现动画开始
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(screenshotDir, '17-discovery-start-100ms.png'), ...screenshotOpts });

    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotDir, '18-discovery-mid-400ms.png'), ...screenshotOpts });

    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, '19-discovery-end-900ms.png'), ...screenshotOpts });

    // 等待发现动画结束，卡牌展示
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotDir, '20-card-reveal.png'), ...screenshotOpts });

    // 关闭卡牌展示
    await page.evaluate(() => {
      const reveal = document.getElementById('cardReveal');
      if (reveal) reveal.classList.remove('on');
    });
    await page.waitForTimeout(300);

    // ========== 6. 再次测试不同配方 ==========
    console.log('\n=== 测试 6: 不同配方（河川祝福）===');

    // 露莓×3 + 木材×1 = 河川祝福
    await page.click('#addDewberry');
    await page.click('#addDewberry');
    await page.click('#addDewberry');
    await page.click('#addWood');
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(screenshotDir, '21-recipe-river-blessing-ready.png'), ...screenshotOpts });

    await page.click('#alchemyBrew');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(screenshotDir, '22-recipe-river-discovery.png'), ...screenshotOpts });

    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(screenshotDir, '23-recipe-river-card-reveal.png'), ...screenshotOpts });

    // 关闭卡牌展示
    await page.evaluate(() => {
      const reveal = document.getElementById('cardReveal');
      if (reveal) reveal.classList.remove('on');
    });
    await page.waitForTimeout(300);

    // 关闭炼金界面
    await page.click('#alchemyClose');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, '24-alchemy-closed.png'), ...screenshotOpts });

    // ========== 7. 升级系统测试 ==========
    console.log('\n=== 测试 7: 升级系统 UI ===');

    // 打开升级面板
    await page.evaluate(() => {
      if (window.FarmUpgrade) window.FarmUpgrade.open();
    });

    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(screenshotDir, '25-upgrade-panel-opening.png'), ...screenshotOpts });

    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(screenshotDir, '26-upgrade-panel-opened.png'), ...screenshotOpts });

    // ========== 8. 升级交互测试 ==========
    console.log('\n=== 测试 8: 升级购买交互 ===');

    // 尝试点击第一个升级项（工坊 II 级）
    const firstUpgrade = await page.$('.upg:not(.locked):not(.owned)');
    if (firstUpgrade) {
      await firstUpgrade.click();
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(screenshotDir, '27-upgrade-purchase-feedback.png'), ...screenshotOpts });

      await page.waitForTimeout(1400);
      await page.screenshot({ path: path.join(screenshotDir, '28-upgrade-completed.png'), ...screenshotOpts });
    }

    // 再次尝试购买（显示已完成状态）
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, '29-upgrade-owned-state.png'), ...screenshotOpts });

    // 关闭升级面板
    await page.click('#upgradePanel .close');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, '30-upgrade-closed.png'), ...screenshotOpts });

    // ========== 9. 最终游戏状态 ==========
    console.log('\n=== 测试 9: 最终游戏状态 ===');
    await page.screenshot({ path: path.join(screenshotDir, '31-final-game-state.png'), ...screenshotOpts });

    console.log('\n所有截图已保存到:', screenshotDir);
  });
});
