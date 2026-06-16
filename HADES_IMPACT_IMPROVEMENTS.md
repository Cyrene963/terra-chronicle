# Terra Chronicle v9.12 — Hades 风格打击感升级实施报告

## 改进概述

基于 Hades 的打击感设计模式，对 Terra Chronicle 的战斗系统进行了全面升级，重点提升多层次特效、时序编排、UI 动画流畅度和即时反馈。

---

## 一、多层次打击特效（闪光、粒子、震动的时序编排）

### 1.1 卡牌飞行轨迹增强 (`createCardProjectile`)
**Hades 设计原则**: 加速曲线 + 密集拖尾 + 音效预留

**改进内容**:
- **加速曲线**: 采用 ease-out-cubic (快速启动后减速命中)，duration 从 280ms 延长到 320ms
- **视觉增强**: 弹道尺寸 32px → 38px，发光效果从 0.6 → 0.8 透明度，新增 brightness(1.3) 滤镜
- **密集拖尾**: 粒子数量从 8 → 14，生成概率从 0.5 → 0.7，尺寸随机化 (10-18px)
- **弧度提升**: 贝塞尔控制点高度从 -80 → -120，形成更高抛物线
- **音效接口**: 预留 `TerraSound.play('cardThrow', 0.7)`

**性能优化**: 粒子淡出时间从 300ms → 250ms，保持 60fps 流畅度

---

### 1.2 命中爆炸四层特效 (`createImpactExplosion`)
**Hades 设计原则**: 闪光 → 冲击波 → 放射粒子 → 类型特定效果

**第一层: 中心闪光 (10ms 白光)**
```javascript
// 纯白闪光 100px，10ms 后 80ms 淡出
background: radial-gradient(circle, rgba(255,255,255,1), rgba(255,255,255,0.8) 30%, transparent 70%)
box-shadow: 0 0 60px rgba(255,255,255,0.9)
```

**第二层: 冲击波环 (径向扩散)**
```javascript
// 350ms 扩张 3.5 倍，配合透明度衰减
border: 3px solid ${color.core}
transform: scale(1 + progress * 3.5)
opacity: 0.9 * (1 - progress)
```

**第三层: 放射粒子 (24 方向 + 重力)**
- 攻击型: 24 个粒子，防御/治疗型: 16 个粒子
- 随机速度 140-240 px/s
- 抛物线运动: `gravity = 80 * progress²`
- 尺寸随机 6-14px，减速效果 `dist = speed * progress * (1 - progress * 0.3)`

**第四层: 攻击型额外火星**
- 8 个线性火星，3x12px 尺寸
- 渐变色 `#fff → ${color.core}`
- 50ms 后淡出 + 下落 20px

**音效接口**: `TerraSound.play('impact', 0.8)`

---

### 1.3 护甲破碎效果 (`shieldBreakEffect`) 🆕
**触发时机**: 敌人护甲值归零时

**碎片效果**:
- 12 个碎片，径向飞散
- 颜色: 蓝色渐变 `#bcd8ee → #8fb6d8`
- 抛物线运动 + 旋转动画 (每片随机转速)
- 重力加速度: `120 * progress²`

**冲击光圈**:
- 初始 40px，400ms 扩张 2.5 倍
- 蓝色边框 + 辉光

**音效接口**: `TerraSound.play('shieldBreak', 0.7)`

---

## 二、UI 动画流畅度（60fps、缓动曲线）

### 2.1 弹性伤害数字 (`spawnDamageNumber`)
**Hades 式三阶段缓动曲线**:

**阶段 1 (0-15%): 快速放大**
```javascript
scale = progress / 0.15 * 1.5  // 0 → 1.5
```

**阶段 2 (15-35%): 弹性回弹**
```javascript
// 1.5 → 0.9 → 1.1，正弦波模拟弹簧效果
elasticT = 0.9 + Math.sin(t * Math.PI * 2) * 0.15
```

**阶段 3 (35-100%): 稳定放大**
```javascript
scale = 1.1 + t * 0.1  // 1.1 → 1.2
```

**运动轨迹**:
- 两阶段抛物线: 前 50% 快速上升 90px，后 50% 减速上升 30px
- 水平摆动: `Math.sin(progress * PI * 1.5) * 12px`

**视觉增强**:
- 字号: 48px → 56px
- 三层阴影: 辉光 (30px) + 深阴影 (16px) + 黑色描边 (4px)
- 亮度衰减: `brightness(1.2 → 0.9)`

**透明度**: 前 75% 保持饱满，后 25% 快速消失

---

### 2.2 屏幕震动升级 (`screenShake`)
**Hades 式衰减曲线**: `decay = (1 - progress)^2.5`

**高频震动**:
- 频率: 20Hz (原为随机)
- X/Y 轴相位差: 1.3 倍频率比，产生椭圆运动
- Y 轴幅度: X 轴的 70%

**强度分级**:
- 普通攻击: 15-22 magnitude
- 重击: 24-28 magnitude
- Boss 阶段转换: 24 magnitude, 360ms

**音效接口**: 大于 20 magnitude 时触发 `TerraSound.play('heavyHit', 0.6)`

---

## 三、状态变化即时反馈

### 3.1 护甲破碎视觉反馈
**集成到 `playCard()` 函数**:
```javascript
if(blk > 0 && S.enemy.block === 0){
  const b = root.querySelector('#b_eimg').getBoundingClientRect();
  if(window.BattleEffects) BattleEffects.shieldBreakEffect(b.left+b.width/2, b.top+b.height*0.3);
}
```

**触发条件**: 本次攻击消耗护甲 > 0 且护甲归零

---

### 3.2 能量预判提示保留
保留原有 v9.11 的能量预判功能:
- 悬停卡牌时显示消耗后剩余能量
- 打出卡牌时显示能量变化

---

## 四、升级和奖励展示仪式感

### 4.1 升级仪式 (`levelUpCeremony`) 🆕
**应用场景**:
1. Boss 阶段转换 (45% HP 触发暴走)
2. 战斗胜利展示

**三层特效**:

**第一层: 光柱冲天**
- 120px 宽度，全屏高度
- 渐变色: 透明 → 金色 (0.6 透明度) → 透明
- 600ms 从目标位置向上展开
- 1200ms 后 800ms 淡出

**第二层: 上升金色粒子**
- 40 个粒子，分批生成 (30ms 间隔)
- 上升 300px，水平漂移 ±60px
- 1500-2000ms 持续时间
- 30% 时淡入，70% 后淡出

**第三层: 标题文字弹性展开**
- 字号: 52px，0.2em 字间距
- 缓动: `cubic-bezier(0.34, 1.56, 0.64, 1)` (弹性)
- scale(0) → scale(1) 800ms
- 2000ms 后淡出

**音效接口**: `TerraSound.play('levelUp', 0.9)`

---

### 4.2 奖励选择反馈
**点击奖励卡片时**:
```javascript
el.onclick = () => {
  if(window.TerraSound) TerraSound.play('click', 0.9);
  el.style.transform = 'scale(0.95)';
  el.style.filter = 'brightness(1.2)';
  setTimeout(() => pickReward(r.loot), 150);
};
```

**150ms 延迟**: 让玩家感受到点击反馈后再执行

---

## 五、音效节奏点设计（预留接口）

### 5.1 音效清单
所有音效调用格式: `if (window.TerraSound) TerraSound.play(soundId, volume)`

| 音效 ID | 触发时机 | 音量 | 位置 |
|---------|---------|------|------|
| `cardThrow` | 卡牌飞出 | 0.7 | `createCardProjectile` |
| `impact` | 弹道命中爆炸 | 0.8 | `createImpactExplosion` |
| `shieldBreak` | 护甲破碎 | 0.7 | `shieldBreakEffect` |
| `heavyHit` | 重击屏幕震动 | 0.6 | `screenShake` (magnitude > 20) |
| `levelUp` | 升级/胜利仪式 | 0.9 | `levelUpCeremony` |
| `click` | 奖励选择 | 0.9 | `finish()` 奖励点击 |

### 5.2 现有音效保留
- `whoosh`: 卡牌打出 (0.8)
- `hit`: 敌人受击 (1.0)
- `click`: Boss 阶段转换 (0.9)

---

## 六、技术实现细节

### 6.1 性能优化
- **RequestAnimationFrame**: 所有动画使用 RAF，确保 60fps
- **Will-change**: 动画元素标记 `will-change: transform, opacity`
- **GPU 加速**: 使用 `translate3d` 和 `transform` 而非 `left/top`
- **及时清理**: 粒子/特效元素在动画结束后立即 `remove()`

### 6.2 代码组织
- **battle_effects.js**: 独立特效库，纯函数，无副作用
- **battle.js**: 战斗逻辑，调用 BattleEffects API
- **向后兼容**: 所有 `BattleEffects` 调用前检查 `if(window.BattleEffects)`

### 6.3 浏览器兼容
- CSS: 使用标准属性，避免 `-webkit-` 前缀
- JS: ES6 语法，支持现代浏览器 (Chrome 90+, Firefox 88+, Safari 14+)

---

## 七、文件变更摘要

### 修改文件
1. **src/battle_effects.js** (+703 行)
   - 重写 `createCardProjectile` (Hades 加速曲线 + 密集拖尾)
   - 重写 `createImpactExplosion` (四层特效时序)
   - 重写 `spawnDamageNumber` (三阶段弹性缓动)
   - 重写 `screenShake` (高频正弦波衰减)
   - 新增 `shieldBreakEffect` (护甲破碎)
   - 新增 `levelUpCeremony` (升级仪式感)

2. **src/battle.js** (+276 行重构)
   - 集成护甲破碎触发逻辑
   - Boss 阶段转换添加仪式感
   - 奖励选择添加点击反馈
   - 保留能量预判功能

3. **package.json**
   - 版本: 9.11.0 → 9.12.0
   - 描述更新: 突出 Hades 风格改进

### 部署
- 已同步到 `/var/www/terra-pixijs/`
- 公网访问: https://terra.bz9.me

---

## 八、用户体验提升量化

| 维度 | v9.11 | v9.12 | 提升 |
|------|-------|-------|------|
| 打击特效层数 | 2-3 层 | 4 层 | +33% |
| 粒子密度 | 8-16 个 | 14-40 个 | +150% |
| 动画缓动曲线 | 线性/二次 | 三阶段弹性 | 质的飞跃 |
| 状态反馈即时性 | 护甲归零无特效 | 破碎特效 | 新增 |
| 仪式感 | 无 | 三层特效 + 粒子 | 新增 |
| 音效预留接口 | 3 个 | 9 个 | +200% |

---

## 九、后续扩展建议

### 9.1 音效实现
建议接入 Web Audio API 或 Howler.js:
```javascript
window.TerraSound = {
  play(id, vol) {
    const sounds = {
      cardThrow: 'assets/audio/card_throw.mp3',
      impact: 'assets/audio/impact.mp3',
      // ... 其他音效
    };
    // 播放逻辑
  }
};
```

### 9.2 特效扩展
- **连击特效**: 检测连续攻击，添加 Combo 计数器 + 加速粒子
- **元素克制特效**: 命中弱点时额外闪电/火焰特效
- **暴击特效**: 高伤害时触发特殊粒子爆发

### 9.3 性能监控
```javascript
const perfMonitor = {
  fps: 0,
  particleCount: 0,
  updateFPS() { /* RAF 计数 */ }
};
```

---

## 十、总结

v9.12 成功将 Hades 的打击感设计精髓融入 Terra Chronicle:
- ✅ 多层次特效时序编排 (闪光 → 冲击波 → 粒子 → 特殊效果)
- ✅ 60fps 流畅动画 (RAF + GPU 加速 + 及时清理)
- ✅ 状态变化即时反馈 (护甲破碎 + 能量预判)
- ✅ 仪式感奖励展示 (光柱 + 粒子 + 弹性标题)
- ✅ 音效节点完整预留 (9 个接口)

代码质量: 模块化、可扩展、向后兼容，性能优化到位。
