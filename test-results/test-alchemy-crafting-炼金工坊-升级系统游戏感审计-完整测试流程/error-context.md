# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test-alchemy-crafting.spec.js >> 炼金工坊 & 升级系统游戏感审计 >> 完整测试流程
- Location: test-alchemy-crafting.spec.js:17:3

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: page.waitForTimeout: Test timeout of 180000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic:
    - generic:
      - img
      - generic:
        - generic: 春
        - generic: VER
    - generic:
      - generic: "01"
      - generic: 年代 I · 第一年
    - generic:
      - text: 1 FPS
      - text: AUTO
    - generic: — 花瓣随风 —
    - generic [ref=e4]:
      - generic [ref=e6]: Parcel · 地籍档案
      - heading "河畔田" [level=3] [ref=e7]
      - generic [ref=e8]: Ager Fluminis
      - generic [ref=e10]:
        - generic [ref=e11]: 肥 力
        - generic [ref=e12]: —
      - generic [ref=e15]:
        - generic [ref=e16]: 湿 度
        - generic [ref=e17]: —
      - generic [ref=e20]:
        - generic [ref=e21]: 虫害压力
        - generic [ref=e22]: —
      - generic [ref=e25]:
        - generic [ref=e26]: 灵脉充能
        - generic [ref=e27]: —
      - generic [ref=e29]:
        - text: 此地块产出的材料将继承土地质量。
        - text: 肥力越高，锻造出的卡牌基础数值越高。
    - generic [ref=e32] [cursor=pointer]: 工坊 · 待锻
    - generic: 点击大地行走 · 走近树木自动伐木 · 点击耕地耕种 · 1-4 季节 · F 加速
    - generic:
      - generic: 空格
      - text: 伐木 · 体力×1
    - generic [ref=e35] [cursor=pointer]:
      - generic [ref=e36]: 水灵兽 · 未名
      - generic [ref=e37]: 水灵兽 Lv.1 · 闲逛中 …
    - generic:
      - generic:
        - text: Companion Codex · 精选灵兽
        - generic: ×
    - generic [ref=e38]:
      - generic [ref=e39]: Ecology · 生态
      - generic [ref=e40]:
        - generic [ref=e41]: 休耕丰饶
        - generic [ref=e42]: "84"
      - generic [ref=e45]: 暂无作物 · 虫害低 · 水系灵兽巡田 Lv.1.0
    - generic [ref=e46]:
      - generic [ref=e47]: 星麦0
      - generic [ref=e49]: 木材8
      - generic [ref=e51]: 卡牌0
      - button "锻造 · 新芽守卫" [disabled]
  - generic [ref=e52]:
    - generic [ref=e53]:
      - text: 工坊炼成
      - generic [ref=e57]:
        - generic [ref=e58]: 河川祝福
        - generic [ref=e59]: 攻 8 · 防 12 · 产地 50
        - generic [ref=e60]: 河川流派 · 治疗会附带净涤 · 稳定工艺
    - generic [ref=e62]: 点击任意处收入卡组
  - generic [ref=e64]:
    - generic [ref=e65]:
      - generic [ref=e70]: 空釜
      - generic [ref=e71]: 工坊笔记 · 星麦决定产地品质，露莓偏向治愈与净化，木材稳定卡牌形体。不同配比会解锁不同流派。
    - generic [ref=e72]:
      - generic [ref=e73]: 炼金大釜
      - generic [ref=e74]: Alchemy Cauldron · 探索配方合成卡牌
      - generic [ref=e75]:
        - generic [ref=e76] [cursor=pointer]:
          - generic [ref=e77]:
            - generic [ref=e78]: 星麦
            - generic [ref=e79]: 产地品质 · 守势/丰收基底
          - generic [ref=e80]: "库存: 2"
        - generic [ref=e81] [cursor=pointer]:
          - generic [ref=e82]:
            - generic [ref=e83]: 露莓
            - generic [ref=e84]: 水系净化 · 治疗与河川祝福
          - generic [ref=e85]: "库存: 0"
        - generic [ref=e86] [cursor=pointer]:
          - generic [ref=e87]:
            - generic [ref=e88]: 木材
            - generic [ref=e89]: 卡框骨架 · 稳定炼成结构
          - generic [ref=e90]: "库存: 17"
      - generic [ref=e91]:
        - button "清空" [ref=e92] [cursor=pointer]
        - button "炼制" [active] [ref=e93] [cursor=pointer]
      - generic [ref=e94]: 配方共鸣 · 卡牌正在成形
    - generic [ref=e95] [cursor=pointer]: ×
```

# Test source

```ts
  99  |     await page.waitForTimeout(150);
  100 |     await page.screenshot({ path: path.join(screenshotDir, '07-add-wheat-1.png'), ...screenshotOpts });
  101 | 
  102 |     // 投入第二个星麦
  103 |     await page.click('#addWheat');
  104 |     await page.waitForTimeout(150);
  105 |     await page.screenshot({ path: path.join(screenshotDir, '08-add-wheat-2.png'), ...screenshotOpts });
  106 | 
  107 |     // 投入第三个星麦
  108 |     await page.click('#addWheat');
  109 |     await page.waitForTimeout(150);
  110 |     await page.screenshot({ path: path.join(screenshotDir, '09-add-wheat-3.png'), ...screenshotOpts });
  111 | 
  112 |     // 投入木材
  113 |     await page.click('#addWood');
  114 |     await page.waitForTimeout(150);
  115 |     await page.screenshot({ path: path.join(screenshotDir, '10-add-wood-1.png'), ...screenshotOpts });
  116 | 
  117 |     await page.click('#addWood');
  118 |     await page.waitForTimeout(150);
  119 |     await page.screenshot({ path: path.join(screenshotDir, '11-add-wood-2.png'), ...screenshotOpts });
  120 | 
  121 |     // 釜中显示材料状态
  122 |     await page.screenshot({ path: path.join(screenshotDir, '12-cauldron-ready.png'), ...screenshotOpts });
  123 | 
  124 |     // ========== 3. 清空按钮测试 ==========
  125 |     console.log('\n=== 测试 3: 清空按钮反馈 ===');
  126 | 
  127 |     await page.click('#alchemyReset');
  128 |     await page.waitForTimeout(200);
  129 |     await page.screenshot({ path: path.join(screenshotDir, '13-after-reset.png'), ...screenshotOpts });
  130 | 
  131 |     // ========== 4. 配方探索 - 失败案例 ==========
  132 |     console.log('\n=== 测试 4: 配方不匹配反馈 ===');
  133 | 
  134 |     // 投入错误配方
  135 |     await page.click('#addWheat');
  136 |     await page.click('#addDewberry');
  137 |     await page.waitForTimeout(150);
  138 |     await page.screenshot({ path: path.join(screenshotDir, '14-wrong-recipe-ready.png'), ...screenshotOpts });
  139 | 
  140 |     // 尝试炼制
  141 |     await page.evaluate(() => {
  142 |       document.getElementById('alchemyBrew')?.click();
  143 |     });
  144 |     await page.waitForTimeout(150);
  145 |     await page.screenshot({ path: path.join(screenshotDir, '15-wrong-recipe-feedback.png'), ...screenshotOpts });
  146 |     await page.waitForTimeout(300);
  147 | 
  148 |     // ========== 5. 配方探索 - 成功案例 ==========
  149 |     console.log('\n=== 测试 5: 配方发现动画 ===');
  150 | 
  151 |     // 投入正确配方: 星麦×3 + 木材×2 = 新芽守卫
  152 |     await page.click('#addWheat');
  153 |     await page.click('#addWheat');
  154 |     await page.click('#addWheat');
  155 |     await page.click('#addWood');
  156 |     await page.click('#addWood');
  157 |     await page.waitForTimeout(200);
  158 |     await page.screenshot({ path: path.join(screenshotDir, '16-correct-recipe-ready.png'), ...screenshotOpts });
  159 | 
  160 |     // 点击炼制
  161 |     await page.click('#alchemyBrew');
  162 | 
  163 |     // 发现动画开始
  164 |     await page.waitForTimeout(100);
  165 |     await page.screenshot({ path: path.join(screenshotDir, '17-discovery-start-100ms.png'), ...screenshotOpts });
  166 | 
  167 |     await page.waitForTimeout(300);
  168 |     await page.screenshot({ path: path.join(screenshotDir, '18-discovery-mid-400ms.png'), ...screenshotOpts });
  169 | 
  170 |     await page.waitForTimeout(500);
  171 |     await page.screenshot({ path: path.join(screenshotDir, '19-discovery-end-900ms.png'), ...screenshotOpts });
  172 | 
  173 |     // 等待发现动画结束，卡牌展示
  174 |     await page.waitForTimeout(600);
  175 |     await page.screenshot({ path: path.join(screenshotDir, '20-card-reveal.png'), ...screenshotOpts });
  176 | 
  177 |     // 关闭卡牌展示
  178 |     await page.evaluate(() => {
  179 |       const reveal = document.getElementById('cardReveal');
  180 |       if (reveal) reveal.classList.remove('on');
  181 |     });
  182 |     await page.waitForTimeout(300);
  183 | 
  184 |     // ========== 6. 再次测试不同配方 ==========
  185 |     console.log('\n=== 测试 6: 不同配方（河川祝福）===');
  186 | 
  187 |     // 露莓×3 + 木材×1 = 河川祝福
  188 |     await page.click('#addDewberry');
  189 |     await page.click('#addDewberry');
  190 |     await page.click('#addDewberry');
  191 |     await page.click('#addWood');
  192 |     await page.waitForTimeout(200);
  193 |     await page.screenshot({ path: path.join(screenshotDir, '21-recipe-river-blessing-ready.png'), ...screenshotOpts });
  194 | 
  195 |     await page.click('#alchemyBrew');
  196 |     await page.waitForTimeout(400);
  197 |     await page.screenshot({ path: path.join(screenshotDir, '22-recipe-river-discovery.png'), ...screenshotOpts });
  198 | 
> 199 |     await page.waitForTimeout(1200);
      |                ^ Error: page.waitForTimeout: Test timeout of 180000ms exceeded.
  200 |     await page.screenshot({ path: path.join(screenshotDir, '23-recipe-river-card-reveal.png'), ...screenshotOpts });
  201 | 
  202 |     // 关闭卡牌展示
  203 |     await page.evaluate(() => {
  204 |       const reveal = document.getElementById('cardReveal');
  205 |       if (reveal) reveal.classList.remove('on');
  206 |     });
  207 |     await page.waitForTimeout(300);
  208 | 
  209 |     // 关闭炼金界面
  210 |     await page.click('#alchemyClose');
  211 |     await page.waitForTimeout(500);
  212 |     await page.screenshot({ path: path.join(screenshotDir, '24-alchemy-closed.png'), ...screenshotOpts });
  213 | 
  214 |     // ========== 7. 升级系统测试 ==========
  215 |     console.log('\n=== 测试 7: 升级系统 UI ===');
  216 | 
  217 |     // 打开升级面板
  218 |     await page.evaluate(() => {
  219 |       if (window.FarmUpgrade) window.FarmUpgrade.open();
  220 |     });
  221 | 
  222 |     await page.waitForTimeout(200);
  223 |     await page.screenshot({ path: path.join(screenshotDir, '25-upgrade-panel-opening.png'), ...screenshotOpts });
  224 | 
  225 |     await page.waitForTimeout(400);
  226 |     await page.screenshot({ path: path.join(screenshotDir, '26-upgrade-panel-opened.png'), ...screenshotOpts });
  227 | 
  228 |     // ========== 8. 升级交互测试 ==========
  229 |     console.log('\n=== 测试 8: 升级购买交互 ===');
  230 | 
  231 |     // 尝试点击第一个升级项（工坊 II 级）
  232 |     const firstUpgrade = await page.$('.upg:not(.locked):not(.owned)');
  233 |     if (firstUpgrade) {
  234 |       await firstUpgrade.click();
  235 |       await page.waitForTimeout(200);
  236 |       await page.screenshot({ path: path.join(screenshotDir, '27-upgrade-purchase-feedback.png'), ...screenshotOpts });
  237 | 
  238 |       await page.waitForTimeout(1400);
  239 |       await page.screenshot({ path: path.join(screenshotDir, '28-upgrade-completed.png'), ...screenshotOpts });
  240 |     }
  241 | 
  242 |     // 再次尝试购买（显示已完成状态）
  243 |     await page.waitForTimeout(500);
  244 |     await page.screenshot({ path: path.join(screenshotDir, '29-upgrade-owned-state.png'), ...screenshotOpts });
  245 | 
  246 |     // 关闭升级面板
  247 |     await page.click('#upgradePanel .close');
  248 |     await page.waitForTimeout(500);
  249 |     await page.screenshot({ path: path.join(screenshotDir, '30-upgrade-closed.png'), ...screenshotOpts });
  250 | 
  251 |     // ========== 9. 最终游戏状态 ==========
  252 |     console.log('\n=== 测试 9: 最终游戏状态 ===');
  253 |     await page.screenshot({ path: path.join(screenshotDir, '31-final-game-state.png'), ...screenshotOpts });
  254 | 
  255 |     console.log('\n所有截图已保存到:', screenshotDir);
  256 |   });
  257 | });
  258 | 
```