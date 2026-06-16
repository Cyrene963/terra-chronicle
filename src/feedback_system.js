/* =========================================================
   Terra Chronicle — 交互反馈系统 v1.0
   Multi-layer Feedback: 粒子特效 + 数字飘字 + 音效预留 + 过程动画
   ---------------------------------------------------------
   改进点:
   - 伐木/收获粒子爆发（木屑、麦穗、蓝莓粒子）
   - 资源数字飘字（从交互点飘向HUD图标）
   - 音效触发点预留（playSound接口）
   - 播种/成熟过程动画（弹性scale、发光脉冲）
   ========================================================= */
'use strict';

/**
 * 交互反馈管理器
 * 统一管理游戏中的粒子特效、数字飘字、音效触发
 */
class FeedbackSystem {
  constructor(app, overlayLayer, fxScreenLayer) {
    this.app = app;
    this.overlayLayer = overlayLayer;  // 世界空间层（粒子跟随世界坐标）
    this.fxScreenLayer = fxScreenLayer; // 屏幕空间层（数字飘字）

    // 粒子池
    this.particles = [];

    // 数字飘字池
    this.floatingNumbers = [];

    // 音效系统（预留接口）
    this.soundEnabled = false; // 待音效资源ready后启用
  }

  /**
   * 播放音效（预留接口）
   * @param {string} type - 音效类型: 'chop'/'harvest'/'plant'/'water'/'craft'
   */
  playSound(type) {
    if (!this.soundEnabled) return;
    // TODO: 接入 sound.js 或 Web Audio API
    // 示例: new Audio(`assets/sounds/${type}.mp3`).play().catch(()=>{});
    console.log(`[Sound] ${type}`);
  }

  /**
   * 伐木粒子爆发 - 木屑飞溅 + 绿叶
   * @param {number} wx - 世界坐标 X
   * @param {number} wy - 世界坐标 Y
   * @param {string} treeType - 树种类: 'oak'/'cherry'
   */
  burstChopParticles(wx, wy, treeType = 'oak') {
    const colors = treeType === 'cherry'
      ? [0x8b6f47, 0xa0856a, 0x5d8a3a, 0xf4c4d2, 0xe89cb0] // 樱花树: 木+粉瓣
      : [0x8b6f47, 0xa0856a, 0x5d8a3a, 0x6fa855];         // 橡树: 木+绿叶

    const count = 18 + Math.floor(Math.random() * 10);

    for (let i = 0; i < count; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const isLeaf = i < count * 0.35; // 35% 是叶片

      const angle = Math.random() * Math.PI * 2;
      const force = 120 + Math.random() * 180;
      const vx = Math.cos(angle) * force;
      const vy = Math.sin(angle) * force - 80 - Math.random() * 100; // 向上飞溅

      this.particles.push({
        type: 'chop',
        sprite: this._createParticleSprite(color, isLeaf ? 'leaf' : 'chip'),
        x: wx,
        y: wy - 20,
        vx,
        vy,
        spin: (Math.random() - 0.5) * 12,
        gravity: 280,
        life: 0,
        maxLife: 0.8 + Math.random() * 0.6,
        fadeStart: 0.5
      });
    }

    this.playSound('chop');
  }

  /**
   * 收获粒子爆发 - 金色麦穗/蓝莓粒子上扬
   * @param {number} wx - 世界坐标 X
   * @param {number} wy - 世界坐标 Y
   * @param {string} cropType - 作物类型: 'starwheat'/'dewberry'
   * @param {string} grade - 品质等级: '粗麦'/'良品'/'珍品'/'灵脉'
   */
  burstHarvestParticles(wx, wy, cropType = 'starwheat', grade = '良品') {
    const colors = cropType === 'dewberry'
      ? [0x6a9bd8, 0x8ab4e5, 0x5684c4, 0xa0c8f0] // 蓝莓: 蓝色系
      : [0xf4d03f, 0xffd56a, 0xffb347, 0xffe9b0]; // 星麦: 金色系

    // 品质越高，粒子越多
    const qualityMultiplier = {'粗麦': 1.0, '良品': 1.3, '珍品': 1.6, '灵脉': 2.0}[grade] || 1.0;
    const count = Math.floor((12 + Math.random() * 8) * qualityMultiplier);

    for (let i = 0; i < count; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];

      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.6; // 向上扇形
      const force = 80 + Math.random() * 100;
      const vx = Math.cos(angle) * force;
      const vy = Math.sin(angle) * force;

      this.particles.push({
        type: 'harvest',
        sprite: this._createParticleSprite(color, cropType === 'dewberry' ? 'berry' : 'wheat'),
        x: wx,
        y: wy,
        vx,
        vy,
        spin: (Math.random() - 0.5) * 8,
        gravity: 180,
        life: 0,
        maxLife: 0.9 + Math.random() * 0.5,
        fadeStart: 0.6
      });
    }

    this.playSound('harvest');
  }

  /**
   * 播种弹出动画 - 作物从地面弹出
   * @param {PIXI.Container} cropNode - 作物节点
   * @param {Function} onComplete - 动画完成回调
   */
  animatePlant(cropNode, onComplete) {
    const duration = 0.32;
    const startTime = performance.now();
    const startY = cropNode.y;

    cropNode.scale.set(0);
    cropNode.alpha = 0;

    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const progress = Math.min(1, elapsed / duration);

      // 弹性缓动 (elastic ease-out)
      const t = progress;
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (Math.PI * 2) / 3);

      cropNode.scale.set(eased);
      cropNode.alpha = Math.min(1, progress * 2);
      cropNode.y = startY + (1 - eased) * 12; // 从下方弹出

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        cropNode.scale.set(1);
        cropNode.alpha = 1;
        cropNode.y = startY;
        if (onComplete) onComplete();
      }
    };

    animate();
    this.playSound('plant');
  }

  /**
   * 成熟发光脉冲 + 粒子环绕
   * @param {PIXI.Container} cropNode - 作物节点
   * @param {number} duration - 脉冲持续时间（秒）
   */
  animateMature(cropNode, duration = 1.2) {
    const startTime = performance.now();
    const wx = cropNode.x;
    const wy = cropNode.y;

    // 环绕粒子
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const radius = 24;

      this.particles.push({
        type: 'mature',
        sprite: this._createParticleSprite(0xffd56a, 'glow'),
        x: wx + Math.cos(angle) * radius,
        y: wy + Math.sin(angle) * radius - 30,
        vx: Math.cos(angle) * 15,
        vy: Math.sin(angle) * 15,
        spin: 0,
        gravity: 0,
        life: 0,
        maxLife: 0.6,
        fadeStart: 0.2
      });
    }

    // 发光脉冲（通过 tint 闪烁）
    const originalTint = cropNode._body ? cropNode._body.tint : 0xffffff;
    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const progress = Math.min(1, elapsed / duration);

      if (cropNode._body) {
        const pulse = Math.sin(progress * Math.PI * 4) * (1 - progress);
        const glowAmount = pulse * 0.3;
        const r = Math.min(255, ((originalTint >> 16) & 0xff) * (1 + glowAmount));
        const g = Math.min(255, ((originalTint >> 8) & 0xff) * (1 + glowAmount));
        const b = Math.min(255, (originalTint & 0xff) * (1 + glowAmount));
        cropNode._body.tint = (r << 16) | (g << 8) | b;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        if (cropNode._body) cropNode._body.tint = originalTint;
      }
    };

    animate();
    this.playSound('mature');
  }

  /**
   * 资源数字飘字 - 从交互点飘向HUD图标
   * @param {number} wx - 世界坐标 X
   * @param {number} wy - 世界坐标 Y
   * @param {string} resourceType - 资源类型: 'wood'/'starwheat'/'dewberry'
   * @param {number} amount - 数量
   * @param {Object} hudTargetPos - HUD目标位置 {x, y} (屏幕坐标)
   */
  floatNumber(wx, wy, resourceType, amount, hudTargetPos) {
    const world = this.overlayLayer.parent; // 获取 world 容器以计算屏幕坐标

    // 将世界坐标转换为屏幕坐标
    const screenPos = this._worldToScreen(wx, wy, world);

    const text = new PIXI.Text({
      text: `+${amount}`,
      style: {
        fontFamily: '"Cormorant Garamond", serif',
        fontSize: 28,
        fontWeight: 'bold',
        fill: this._getResourceColor(resourceType),
        stroke: { color: 0x2a2520, width: 3 },
        dropShadow: {
          color: 0x000000,
          blur: 4,
          angle: Math.PI / 4,
          distance: 2,
          alpha: 0.6
        }
      }
    });

    text.anchor.set(0.5);
    text.x = screenPos.x;
    text.y = screenPos.y;
    text.alpha = 0;

    this.fxScreenLayer.addChild(text);

    this.floatingNumbers.push({
      text,
      startX: screenPos.x,
      startY: screenPos.y,
      targetX: hudTargetPos.x,
      targetY: hudTargetPos.y,
      life: 0,
      maxLife: 1.2,
      fadeInEnd: 0.15,
      fadeOutStart: 0.9
    });
  }

  /**
   * 每帧更新 - 更新所有粒子和飘字
   * @param {number} dt - 帧时间差
   */
  update(dt) {
    // 更新粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;

      // 物理更新
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // 旋转
      if (p.sprite.rotation !== undefined) {
        p.sprite.rotation += p.spin * dt;
      }

      // 位置同步
      p.sprite.x = p.x;
      p.sprite.y = p.y;

      // 淡出
      const lifeRatio = p.life / p.maxLife;
      if (lifeRatio > p.fadeStart) {
        const fadeProgress = (lifeRatio - p.fadeStart) / (1 - p.fadeStart);
        p.sprite.alpha = 1 - fadeProgress;
      }

      // 移除过期粒子
      if (p.life >= p.maxLife) {
        this.overlayLayer.removeChild(p.sprite);
        p.sprite.destroy();
        this.particles.splice(i, 1);
      }
    }

    // 更新数字飘字
    for (let i = this.floatingNumbers.length - 1; i >= 0; i--) {
      const f = this.floatingNumbers[i];
      f.life += dt;

      const progress = f.life / f.maxLife;

      // 贝塞尔曲线路径（先上扬，后飘向目标）
      const t = Math.min(1, progress);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic

      const midY = Math.min(f.startY, f.targetY) - 40; // 中间点上扬
      const bezierY = (1 - eased) * (1 - eased) * f.startY +
                      2 * (1 - eased) * eased * midY +
                      eased * eased * f.targetY;

      f.text.x = f.startX + (f.targetX - f.startX) * eased;
      f.text.y = bezierY;

      // 淡入淡出
      if (progress < f.fadeInEnd) {
        f.text.alpha = progress / f.fadeInEnd;
      } else if (progress > f.fadeOutStart) {
        f.text.alpha = 1 - (progress - f.fadeOutStart) / (1 - f.fadeOutStart);
      } else {
        f.text.alpha = 1;
      }

      // 到达目标后缩放消失
      if (progress > 0.85) {
        const scaleProgress = (progress - 0.85) / 0.15;
        f.text.scale.set(1 + scaleProgress * 0.5);
      }

      // 移除过期飘字
      if (f.life >= f.maxLife) {
        this.fxScreenLayer.removeChild(f.text);
        f.text.destroy();
        this.floatingNumbers.splice(i, 1);
      }
    }
  }

  /**
   * 创建粒子精灵
   * @private
   */
  _createParticleSprite(color, shape) {
    const g = new PIXI.Graphics();

    switch (shape) {
      case 'chip': // 木屑（小矩形）
        g.rect(-3, -4, 6, 8).fill(color);
        break;
      case 'leaf': // 叶片（椭圆）
        g.ellipse(0, 0, 5, 3).fill(color);
        break;
      case 'wheat': // 麦粒（小圆）
        g.circle(0, 0, 3).fill(color);
        break;
      case 'berry': // 蓝莓（稍大圆）
        g.circle(0, 0, 3.5).fill(color);
        break;
      case 'glow': // 发光点
        g.circle(0, 0, 4).fill({color, alpha: 0.8});
        break;
      default:
        g.circle(0, 0, 3).fill(color);
    }

    const sprite = new PIXI.Container();
    sprite.addChild(g);
    this.overlayLayer.addChild(sprite);

    return sprite;
  }

  /**
   * 世界坐标转屏幕坐标
   * @private
   */
  _worldToScreen(wx, wy, world) {
    const scale = world.scale.x;
    const sx = world.x + wx * scale;
    const sy = world.y + wy * scale;
    return { x: sx, y: sy };
  }

  /**
   * 获取资源对应的颜色
   * @private
   */
  _getResourceColor(resourceType) {
    const colors = {
      wood: 0xa0856a,
      starwheat: 0xffd56a,
      dewberry: 0x8ab4e5,
      default: 0xf4d03f
    };
    return colors[resourceType] || colors.default;
  }

  /**
   * 清理所有特效（用于场景切换）
   */
  clear() {
    // 清理粒子
    for (const p of this.particles) {
      this.overlayLayer.removeChild(p.sprite);
      p.sprite.destroy();
    }
    this.particles = [];

    // 清理飘字
    for (const f of this.floatingNumbers) {
      this.fxScreenLayer.removeChild(f.text);
      f.text.destroy();
    }
    this.floatingNumbers = [];
  }
}

// 导出供 main.js 使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FeedbackSystem };
} else {
  window.FeedbackSystem = FeedbackSystem;
}
