/* =========================================================
   Terra Chronicle — 游戏手感增强模块 v1.0
   Movement Feel Enhancement: 加速/减速曲线 + 平滑插值 + 摩擦力模拟
   ---------------------------------------------------------
   改进点:
   - 启动加速(0→最大速度 0.15s)
   - 停止惯性衰减(0.12s)
   - 方向切换平滑过渡
   - 速度依赖的 squash 变形
   - 行走尘埃粒子拖尾
   ========================================================= */
'use strict';

/**
 * 移动手感增强器
 * 管理玩家移动的加速/减速/摩擦力/squash变形/粒子效果
 */
class MovementFeelEnhancer {
  constructor() {
    // 速度状态
    this.velocityX = 0;
    this.velocityY = 0;

    // 加速/减速参数
    this.acceleration = 1600;      // 加速度 (px/s²)
    this.deceleration = 2200;      // 减速度 (px/s²)
    this.friction = 1800;          // 摩擦力 (px/s²)
    this.maxSpeed = 235;           // 最大速度 (px/s)

    // 方向切换检测
    this.lastInputX = 0;
    this.lastInputY = 0;

    // Squash & Stretch 参数
    this.squashAmount = 0;
    this.squashDecay = 8.0;

    // 粒子效果
    this.dustParticles = [];
    this.dustSpawnTimer = 0;
    this.dustSpawnInterval = 0.08; // 每 0.08s 生成一个尘埃粒子
  }

  /**
   * 更新移动逻辑（带加速/减速/摩擦力）
   * @param {number} inputX - 输入方向 X (-1/0/1)
   * @param {number} inputY - 输入方向 Y (-1/0/1)
   * @param {number} dt - 帧时间差
   * @returns {{dx: number, dy: number, speed: number, moving: boolean}}
   */
  updateMovement(inputX, inputY, dt) {
    const hasInput = inputX !== 0 || inputY !== 0;

    // 归一化输入方向
    if (hasInput) {
      const inputMag = Math.hypot(inputX, inputY);
      if (inputMag > 0) {
        inputX /= inputMag;
        inputY /= inputMag;
      }
    }

    // 检测方向切换（相反方向输入）
    const directionSwitch = (
      (inputX !== 0 && Math.sign(inputX) !== Math.sign(this.lastInputX) && this.lastInputX !== 0) ||
      (inputY !== 0 && Math.sign(inputY) !== Math.sign(this.lastInputY) && this.lastInputY !== 0)
    );

    if (directionSwitch) {
      // 方向切换时快速减速（模拟转向阻力）
      const switchDecay = 0.35;
      this.velocityX *= switchDecay;
      this.velocityY *= switchDecay;
      this.squashAmount = Math.min(1.0, this.squashAmount + 0.4);
    }

    this.lastInputX = inputX;
    this.lastInputY = inputY;

    // 应用加速度或摩擦力
    if (hasInput) {
      // 有输入：加速
      this.velocityX += inputX * this.acceleration * dt;
      this.velocityY += inputY * this.acceleration * dt;
    } else {
      // 无输入：摩擦力减速
      const currentSpeed = Math.hypot(this.velocityX, this.velocityY);
      if (currentSpeed > 0.1) {
        const frictionForce = this.friction * dt;
        const reduction = Math.min(frictionForce / currentSpeed, 1.0);
        this.velocityX *= (1 - reduction);
        this.velocityY *= (1 - reduction);
      } else {
        this.velocityX = 0;
        this.velocityY = 0;
      }
    }

    // 限制最大速度
    const currentSpeed = Math.hypot(this.velocityX, this.velocityY);
    if (currentSpeed > this.maxSpeed) {
      const scale = this.maxSpeed / currentSpeed;
      this.velocityX *= scale;
      this.velocityY *= scale;
    }

    // 更新 squash 衰减
    if (this.squashAmount > 0) {
      this.squashAmount = Math.max(0, this.squashAmount - this.squashDecay * dt);
    }

    // 根据速度变化触发 squash（启动瞬间）
    if (hasInput && currentSpeed < this.maxSpeed * 0.3) {
      this.squashAmount = Math.min(1.0, this.squashAmount + 0.15 * dt * 60);
    }

    return {
      dx: this.velocityX * dt,
      dy: this.velocityY * dt,
      speed: currentSpeed,
      moving: currentSpeed > 1.0
    };
  }

  /**
   * 计算 Squash & Stretch 变形参数
   * @param {number} speed - 当前速度
   * @param {number} maxSpeed - 最大速度
   * @returns {{scaleX: number, scaleY: number, offsetY: number}}
   */
  getSquashStretch(speed, maxSpeed) {
    const speedRatio = Math.min(1.0, speed / maxSpeed);
    const squashIntensity = speedRatio * 0.08 + this.squashAmount * 0.05;

    // 速度越快，水平拉伸越明显，垂直压缩越明显
    const scaleX = 1.0 + squashIntensity * 0.6;
    const scaleY = 1.0 - squashIntensity * 0.8;
    const offsetY = -speedRatio * 1.5; // 高速时略微抬起

    return { scaleX, scaleY, offsetY };
  }

  /**
   * 生成尘埃粒子
   * @param {number} x - 世界坐标 X
   * @param {number} y - 世界坐标 Y
   * @param {number} speed - 当前速度
   * @param {number} dt - 帧时间差
   * @returns {Array} 新生成的粒子数组
   */
  spawnDustParticles(x, y, speed, dt) {
    if (speed < 20) return []; // 速度太慢不生成粒子

    this.dustSpawnTimer += dt;
    const newParticles = [];

    while (this.dustSpawnTimer >= this.dustSpawnInterval) {
      this.dustSpawnTimer -= this.dustSpawnInterval;

      // 速度越快，粒子越密集
      const speedFactor = Math.min(1.0, speed / this.maxSpeed);
      if (Math.random() < 0.3 + speedFactor * 0.7) {
        newParticles.push({
          x: x + (Math.random() * 12 - 6),
          y: y + (Math.random() * 8 - 4),
          vx: (Math.random() * 20 - 10),
          vy: (Math.random() * 10 - 5),
          life: 0,
          maxLife: 0.35 + Math.random() * 0.25,
          size: 2 + Math.random() * 2.5,
          alpha: 0.2 + speedFactor * 0.25
        });
      }
    }

    return newParticles;
  }

  /**
   * 更新尘埃粒子生命周期
   * @param {Array} particles - 粒子数组
   * @param {number} dt - 帧时间差
   * @returns {Array} 仍然存活的粒子
   */
  updateDustParticles(particles, dt) {
    const alive = [];

    for (const p of particles) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // 粒子逐渐减速
      p.vx *= 0.92;
      p.vy *= 0.92;

      // 淡出
      const lifeRatio = p.life / p.maxLife;
      p.currentAlpha = p.alpha * (1 - lifeRatio);

      if (p.life < p.maxLife) {
        alive.push(p);
      }
    }

    return alive;
  }

  /**
   * 重置速度（用于传送、场景切换等）
   */
  reset() {
    this.velocityX = 0;
    this.velocityY = 0;
    this.lastInputX = 0;
    this.lastInputY = 0;
    this.squashAmount = 0;
    this.dustSpawnTimer = 0;
  }
}

// 导出供 main.js 使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MovementFeelEnhancer };
} else {
  window.MovementFeelEnhancer = MovementFeelEnhancer;
}
