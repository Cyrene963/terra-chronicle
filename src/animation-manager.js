/* =========================================================
   Terra Chronicle — 统一动画管理系统

   提供集中式动画控制，标准化缓动曲线，支持时间缩放和性能自适应

   核心功能:
   - 标准化缓动曲线 (EASE_STANDARD/EASE_ELASTIC/EASE_IN_OUT)
   - Tween 抽象层 (统一 RAF/setTimeout/PixiJS ticker)
   - 动画取消/中断机制
   - 时间缩放支持
   - 性能自适应 LOD 框架
   ========================================================= */
'use strict';

(function() {
  /* ================= 1. 标准化缓动曲线 ================= */
  const EASING = {
    // 标准曲线 - 适用于大多数过渡
    STANDARD: t => {
      // cubic-bezier(0.4, 0, 0.2, 1) - Material Design standard
      const x = t;
      const c0 = 0, c1 = 0.4, c2 = 0.2, c3 = 1;
      return bezier(x, c0, c1, c2, c3);
    },

    // 入场动画 - 快速进入，缓慢收尾
    EASE_IN_OUT: t => {
      // cubic-bezier(0.65, 0, 0.35, 1) - 用于标题入场、面板弹出
      const x = t;
      const c0 = 0, c1 = 0.65, c2 = 0.35, c3 = 1;
      return bezier(x, c0, c1, c2, c3);
    },

    // 弹性曲线 - 用于弹簧物理模拟
    EASE_ELASTIC: t => {
      // 弹簧效果，带轻微超调
      if (t === 0 || t === 1) return t;
      const c4 = (2 * Math.PI) / 3;
      return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },

    // 悬停动画 - 用于按钮交互
    HOVER: t => {
      // cubic-bezier(0.2, 0.8, 0.2, 1) - 快速响应
      const x = t;
      const c0 = 0, c1 = 0.2, c2 = 0.8, c3 = 1;
      return bezier(x, c0, c1, c2, 1);
    },

    LINEAR: t => t,
    EASE_IN: t => t * t,
    EASE_OUT: t => t * (2 - t),
    EASE_IN_OUT_QUAD: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  };

  // Cubic Bezier 实现
  function bezier(t, p0, p1, p2, p3) {
    const u = 1 - t;
    return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
  }

  /* ================= 2. 性能质量等级 ================= */
  let qualityLevel = 'high'; // 'high' | 'medium' | 'low'
  let timeScale = 1.0; // 全局时间缩放

  const QUALITY_SETTINGS = {
    high: {
      particleLimit: 200,
      shadowEnabled: true,
      blurEnabled: true,
      animationMultiplier: 1.0,
    },
    medium: {
      particleLimit: 100,
      shadowEnabled: true,
      blurEnabled: false,
      animationMultiplier: 0.85,
    },
    low: {
      particleLimit: 30,
      shadowEnabled: false,
      blurEnabled: false,
      animationMultiplier: 0.7,
    }
  };

  /* ================= 3. Tween 抽象层 ================= */
  const activeTweens = new Map();
  let tweenIdCounter = 0;

  class Tween {
    constructor(target, to, duration, options = {}) {
      this.id = tweenIdCounter++;
      this.target = target;
      this.to = to;
      this.duration = duration * (options.respectTimeScale !== false ? timeScale : 1);
      this.easing = options.easing || EASING.STANDARD;
      this.delay = options.delay || 0;
      this.onUpdate = options.onUpdate;
      this.onComplete = options.onComplete;
      this.startTime = null;
      this.from = {};
      this.cancelled = false;

      // 记录初始值
      for (const key in to) {
        if (typeof target[key] === 'number') {
          this.from[key] = target[key];
        }
      }

      activeTweens.set(this.id, this);
    }

    start() {
      this.startTime = performance.now() + this.delay;
      if (this.delay === 0) {
        this._update();
      }
      return this;
    }

    _update() {
      if (this.cancelled) return;

      const now = performance.now();
      if (now < this.startTime) {
        requestAnimationFrame(() => this._update());
        return;
      }

      const elapsed = now - this.startTime;
      const t = Math.min(elapsed / this.duration, 1);
      const eased = this.easing(t);

      // 更新目标属性
      for (const key in this.to) {
        const from = this.from[key];
        const to = this.to[key];
        this.target[key] = from + (to - from) * eased;
      }

      if (this.onUpdate) this.onUpdate(this.target, eased);

      if (t >= 1) {
        // 动画完成
        if (this.onComplete) this.onComplete(this.target);
        activeTweens.delete(this.id);
      } else {
        requestAnimationFrame(() => this._update());
      }
    }

    cancel() {
      this.cancelled = true;
      activeTweens.delete(this.id);
    }
  }

  /* ================= 4. 转场管理器 ================= */
  class SceneTransition {
    constructor() {
      this.overlay = null;
      this.isTransitioning = false;
    }

    _createOverlay() {
      if (this.overlay) return;
      this.overlay = document.createElement('div');
      this.overlay.id = 'sceneTransitionOverlay';
      this.overlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 999;
        pointer-events: none;
        opacity: 0;
      `;
      document.body.appendChild(this.overlay);
    }

    async fade(callback, duration = 500) {
      if (this.isTransitioning) return;
      this.isTransitioning = true;

      this._createOverlay();
      this.overlay.style.background = '#0a0a0e';
      this.overlay.style.transition = `opacity ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;

      // Fade out
      this.overlay.style.opacity = '1';
      await new Promise(resolve => setTimeout(resolve, duration));

      // 执行回调 (场景切换)
      if (callback) await callback();

      // Fade in
      this.overlay.style.opacity = '0';
      await new Promise(resolve => setTimeout(resolve, duration));

      this.isTransitioning = false;
    }

    async zoom(callback, options = {}) {
      if (this.isTransitioning) return;
      this.isTransitioning = true;

      const duration = options.duration || 800;
      const zoomIn = options.zoomIn !== false;

      this._createOverlay();
      this.overlay.style.background = 'radial-gradient(circle, transparent 0%, #0a0a0e 100%)';
      this.overlay.style.transition = `opacity ${duration}ms cubic-bezier(0.65, 0, 0.35, 1), transform ${duration}ms cubic-bezier(0.65, 0, 0.35, 1)`;
      this.overlay.style.transformOrigin = 'center center';

      if (zoomIn) {
        // Zoom in (收缩)
        this.overlay.style.transform = 'scale(3)';
        this.overlay.style.opacity = '0';

        requestAnimationFrame(() => {
          this.overlay.style.transform = 'scale(1)';
          this.overlay.style.opacity = '1';
        });
      } else {
        // Zoom out (扩散)
        this.overlay.style.transform = 'scale(1)';
        this.overlay.style.opacity = '1';
      }

      await new Promise(resolve => setTimeout(resolve, duration));

      if (callback) await callback();

      if (zoomIn) {
        this.overlay.style.transform = 'scale(0.5)';
        this.overlay.style.opacity = '0';
      } else {
        this.overlay.style.transform = 'scale(3)';
        this.overlay.style.opacity = '0';
      }

      await new Promise(resolve => setTimeout(resolve, duration));
      this.isTransitioning = false;
    }

    async iris(callback, options = {}) {
      if (this.isTransitioning) return;
      this.isTransitioning = true;

      const duration = options.duration || 900;
      const centerX = options.centerX || '50%';
      const centerY = options.centerY || '50%';

      this._createOverlay();
      this.overlay.style.background = '#0a0a0e';
      this.overlay.style.clipPath = `circle(100% at ${centerX} ${centerY})`;
      this.overlay.style.transition = `clip-path ${duration}ms cubic-bezier(0.65, 0, 0.35, 1)`;
      this.overlay.style.opacity = '1';

      // Close iris
      requestAnimationFrame(() => {
        this.overlay.style.clipPath = `circle(0% at ${centerX} ${centerY})`;
      });

      await new Promise(resolve => setTimeout(resolve, duration));

      if (callback) await callback();

      // Open iris
      this.overlay.style.clipPath = `circle(100% at ${centerX} ${centerY})`;
      await new Promise(resolve => setTimeout(resolve, duration));

      this.isTransitioning = false;
    }

    async slide(callback, options = {}) {
      if (this.isTransitioning) return;
      this.isTransitioning = true;

      const duration = options.duration || 600;
      const direction = options.direction || 'left'; // left, right, up, down

      this._createOverlay();
      this.overlay.style.background = '#0a0a0e';
      this.overlay.style.transition = `transform ${duration}ms cubic-bezier(0.65, 0, 0.35, 1)`;
      this.overlay.style.opacity = '1';

      const transforms = {
        left: ['translateX(-100%)', 'translateX(0)', 'translateX(100%)'],
        right: ['translateX(100%)', 'translateX(0)', 'translateX(-100%)'],
        up: ['translateY(-100%)', 'translateY(0)', 'translateY(100%)'],
        down: ['translateY(100%)', 'translateY(0)', 'translateY(-100%)'],
      };

      const [start, middle, end] = transforms[direction];
      this.overlay.style.transform = start;

      requestAnimationFrame(() => {
        this.overlay.style.transform = middle;
      });

      await new Promise(resolve => setTimeout(resolve, duration));

      if (callback) await callback();

      this.overlay.style.transform = end;
      await new Promise(resolve => setTimeout(resolve, duration));

      this.isTransitioning = false;
    }
  }

  /* ================= 5. 相机震动 ================= */
  function cameraShake(container, intensity = 8, duration = 300) {
    if (!container) return;

    const originalX = container.x || 0;
    const originalY = container.y || 0;
    const startTime = performance.now();

    function shake() {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);

      if (t >= 1) {
        container.x = originalX;
        container.y = originalY;
        return;
      }

      const decay = 1 - t;
      const offsetX = (Math.random() - 0.5) * intensity * decay;
      const offsetY = (Math.random() - 0.5) * intensity * decay;

      container.x = originalX + offsetX;
      container.y = originalY + offsetY;

      requestAnimationFrame(shake);
    }

    shake();
  }

  /* ================= 6. 点击波纹增强 ================= */
  function createClickRipple(x, y, options = {}) {
    const ripple = document.createElement('div');
    ripple.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255, 236, 174, 0.8) 0%, rgba(244, 208, 63, 0.4) 50%, transparent 100%);
      pointer-events: none;
      z-index: 9999;
      transform: translate(-50%, -50%);
      box-shadow: 0 0 20px rgba(244, 208, 63, 0.6);
    `;

    document.body.appendChild(ripple);

    const maxSize = options.maxSize || 120;
    const duration = options.duration || 600;

    ripple.style.transition = `width ${duration}ms cubic-bezier(0.4, 0, 0.2, 1), height ${duration}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;

    requestAnimationFrame(() => {
      ripple.style.width = `${maxSize}px`;
      ripple.style.height = `${maxSize}px`;
      ripple.style.opacity = '0';
    });

    setTimeout(() => ripple.remove(), duration);
  }

  /* ================= 7. 性能监控与自适应 ================= */
  let frameTimestamps = [];
  let currentFPS = 60;

  function updateFPS() {
    const now = performance.now();
    frameTimestamps.push(now);

    // 保留最近 60 帧
    while (frameTimestamps.length > 60) {
      frameTimestamps.shift();
    }

    if (frameTimestamps.length >= 10) {
      const elapsed = now - frameTimestamps[0];
      currentFPS = (frameTimestamps.length - 1) / (elapsed / 1000);
    }

    requestAnimationFrame(updateFPS);
  }

  updateFPS();

  function autoAdjustQuality() {
    if (currentFPS < 25 && qualityLevel !== 'low') {
      setQuality('low');
      console.log('[AnimationManager] FPS low, switching to LOW quality');
    } else if (currentFPS < 40 && qualityLevel === 'high') {
      setQuality('medium');
      console.log('[AnimationManager] FPS moderate, switching to MEDIUM quality');
    } else if (currentFPS >= 55 && qualityLevel !== 'high') {
      setQuality('high');
      console.log('[AnimationManager] FPS good, switching to HIGH quality');
    }
  }

  // 每 3 秒检查一次
  setInterval(autoAdjustQuality, 3000);

  function setQuality(level) {
    if (!['high', 'medium', 'low'].includes(level)) return;
    qualityLevel = level;

    // 触发质量变化事件
    window.dispatchEvent(new CustomEvent('animation:qualitychange', {
      detail: { quality: level, settings: QUALITY_SETTINGS[level] }
    }));
  }

  function getQualitySetting(key) {
    return QUALITY_SETTINGS[qualityLevel][key];
  }

  /* ================= 8. 导出 API ================= */
  const AnimationManager = {
    // 缓动曲线
    EASING,

    // Tween 系统
    to: (target, to, duration, options) => new Tween(target, to, duration, options).start(),

    // 取消所有 Tween
    cancelAll: () => {
      activeTweens.forEach(tween => tween.cancel());
      activeTweens.clear();
    },

    // 转场
    transition: new SceneTransition(),

    // 相机震动
    shake: cameraShake,

    // 点击波纹
    ripple: createClickRipple,

    // 时间控制
    setTimeScale: (scale) => { timeScale = Math.max(0, scale); },
    getTimeScale: () => timeScale,

    // 性能控制
    setQuality,
    getQuality: () => qualityLevel,
    getQualitySetting,
    getFPS: () => currentFPS,

    // 工具函数
    lerp: (a, b, t) => a + (b - a) * t,
    clamp: (val, min, max) => Math.max(min, Math.min(max, val)),
  };

  // 全局导出
  window.AnimationManager = AnimationManager;

  console.log('[AnimationManager] Initialized with quality:', qualityLevel);
})();
