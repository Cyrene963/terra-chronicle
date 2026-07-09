/* =========================================================
   Terra Chronicle — 战斗打击感特效系统 (Hades-Inspired)
   多层次打击特效 + 时序编排 + 60fps 流畅动画 + 音效预留接口
   v9.12: Hades 风格升级 - 闪光/粒子/震动分层时序 + 弹性动画 + 仪式感奖励展示
   ========================================================= */
'use strict';
(function(){

/* ---- Hades风格: 卡牌飞行轨迹 (加速曲线 + 密集拖尾 + 音效预留) ---- */
function createCardProjectile(fromEl, targetEl, cardType, onHit) {
  if (!fromEl || !targetEl) return;

  const r1 = fromEl.getBoundingClientRect();
  const r2 = targetEl.getBoundingClientRect();

  const x0 = r1.left + r1.width / 2;
  const y0 = r1.top + r1.height / 2;
  const x1 = r2.left + r2.width / 2;
  const y1 = r2.top + r2.height * 0.45;

  // 音效预留接口
  if (window.TerraSound) TerraSound.play('cardThrow', 0.7);

  // 主弹道 - 增强发光效果
  const projectile = document.createElement('div');
  projectile.style.cssText = `
    position: fixed;
    z-index: 91;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    pointer-events: none;
    left: ${x0}px;
    top: ${y0}px;
    will-change: transform, opacity;
  `;

  // 根据卡牌类型设置颜色 - Hades 风格鲜艳度
  const colors = {
    atk: { core: '#ff3333', glow: 'rgba(255,51,51,0.8)', trail: '#ff6666' },
    def: { core: '#3388ff', glow: 'rgba(51,136,255,0.8)', trail: '#66aaff' },
    heal: { core: '#33ff77', glow: 'rgba(51,255,119,0.8)', trail: '#66ff99' }
  };
  const color = colors[cardType] || colors.atk;

  projectile.style.background = `radial-gradient(circle, ${color.core}, ${color.glow} 40%, transparent 70%)`;
  projectile.style.boxShadow = `0 0 30px ${color.glow}, 0 0 50px ${color.glow}80`;
  projectile.style.filter = `brightness(1.3)`;

  projectile.dataset.battleTransient = '1';
  document.body.appendChild(projectile);

  // 拖尾粒子容器 - 增加密度
  const trail = [];
  const maxTrail = 14;

  const t0 = performance.now();
  const duration = 320; // 稍微延长以体现加速感

  function animate() {
    const elapsed = performance.now() - t0;
    let progress = Math.min(1, elapsed / duration);

    // Hades 式加速曲线 (ease-out-cubic): 快速启动后减速命中
    progress = 1 - Math.pow(1 - progress, 3);

    // 贝塞尔曲线路径 - 更高弧度
    const cx = (x0 + x1) / 2;
    const cy = Math.min(y0, y1) - 120;
    const t = progress;
    const x = (1-t)*(1-t)*x0 + 2*(1-t)*t*cx + t*t*x1;
    const y = (1-t)*(1-t)*y0 + 2*(1-t)*t*cy + t*t*y1;

    projectile.style.left = (x - 19) + 'px';
    projectile.style.top = (y - 19) + 'px';
    projectile.style.transform = `scale(${1 + progress * 0.6})`;
    projectile.style.opacity = 1 - progress * 0.2;

    // 生成拖尾粒子 - 更密集
    if (progress < 0.95 && Math.random() < 0.7) {
      const particle = document.createElement('div');
      const size = 10 + Math.random() * 8;
      particle.style.cssText = `
        position: fixed;
        z-index: 90;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        pointer-events: none;
        left: ${x - size/2}px;
        top: ${y - size/2}px;
        background: radial-gradient(circle, ${color.trail}, transparent 65%);
        opacity: 0.9;
        box-shadow: 0 0 12px ${color.glow};
      `;
      particle.dataset.battleTransient = '1';
      document.body.appendChild(particle);
      trail.push({ el: particle, t: performance.now() });

      if (trail.length > maxTrail) {
        const old = trail.shift();
        old.el.remove();
      }

      // 粒子淡出动画 - 更快速
      requestAnimationFrame(function fadeParticle() {
        const age = (performance.now() - particle._birth) / 250;
        if (age >= 1) {
          particle.remove();
          return;
        }
        particle.style.opacity = 0.9 * (1 - age);
        particle.style.transform = `scale(${1 - age * 0.6})`;
        requestAnimationFrame(fadeParticle);
      });
      particle._birth = performance.now();
    }

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      // 命中爆炸效果 - 增强版
      createImpactExplosion(x1, y1, color, cardType);
      projectile.remove();
      trail.forEach(p => p.el.remove());
      if (onHit) onHit();
    }
  }

  animate();
}

/* ---- Hades风格: 命中爆炸 (闪光 + 放射粒子 + 冲击波) ---- */
function createImpactExplosion(x, y, color, cardType = 'atk') {
  // 音效预留接口
  if (window.TerraSound) TerraSound.play('impact', 0.8);

  // === 第一层: 中心闪光 (10ms 白光) ===
  const flash = document.createElement('div');
  flash.style.cssText = `
    position: fixed;
    z-index: 93;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    pointer-events: none;
    left: ${x - 50}px;
    top: ${y - 50}px;
    background: radial-gradient(circle, rgba(255,255,255,1), rgba(255,255,255,0.8) 30%, transparent 70%);
    box-shadow: 0 0 60px rgba(255,255,255,0.9);
    opacity: 1;
  `;
  flash.dataset.battleTransient = '1';
  document.body.appendChild(flash);
  setTimeout(() => {
    flash.style.transition = 'opacity 80ms';
    flash.style.opacity = '0';
    setTimeout(() => flash.remove(), 80);
  }, 10);

  // === 第二层: 冲击波环 (径向扩散) ===
  const shockwave = document.createElement('div');
  shockwave.style.cssText = `
    position: fixed;
    z-index: 92;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    pointer-events: none;
    left: ${x - 25}px;
    top: ${y - 25}px;
    border: 3px solid ${color.core};
    box-shadow: 0 0 20px ${color.glow};
    opacity: 0.9;
  `;
  shockwave.dataset.battleTransient = '1';
  document.body.appendChild(shockwave);

  const sw_t0 = performance.now();
  const sw_duration = 350;
  function animateShockwave() {
    const elapsed = performance.now() - sw_t0;
    const progress = elapsed / sw_duration;
    if (progress >= 1) {
      shockwave.remove();
      return;
    }
    const scale = 1 + progress * 3.5;
    shockwave.style.transform = `translate(-50%, -50%) scale(${scale})`;
    shockwave.style.opacity = 0.9 * (1 - progress);
    requestAnimationFrame(animateShockwave);
  }
  animateShockwave();

  // === 第三层: 放射粒子 (24个方向 + 随机速度 + 重力) ===
  const particleCount = cardType === 'atk' ? 24 : 16;

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.3;
    const speed = 140 + Math.random() * 100;
    const size = 6 + Math.random() * 8;

    const particle = document.createElement('div');
    particle.style.cssText = `
      position: fixed;
      z-index: 89;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      pointer-events: none;
      left: ${x - size/2}px;
      top: ${y - size/2}px;
      background: radial-gradient(circle, ${color.core}, ${color.trail || color.core} 40%, transparent 70%);
      box-shadow: 0 0 12px ${color.glow};
    `;
    document.body.appendChild(particle);

    const t0 = performance.now();
    const duration = 380 + Math.random() * 120;

    function animate() {
      const elapsed = performance.now() - t0;
      const progress = elapsed / duration;

      if (progress >= 1) {
        particle.remove();
        return;
      }

      // 径向运动 + 重力下坠
      const dist = speed * progress * (1 - progress * 0.3); // 减速
      const gravity = 80 * progress * progress; // 抛物线
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist + gravity;

      particle.style.left = (px - size/2) + 'px';
      particle.style.top = (py - size/2) + 'px';
      particle.style.opacity = 1 - progress;
      particle.style.transform = `scale(${1 - progress * 0.5})`;

      requestAnimationFrame(animate);
    }

    animate();
  }

  // === 第四层: 类型特定效果 ===
  if (cardType === 'atk') {
    // 攻击: 额外火星溅射
    for (let i = 0; i < 8; i++) {
      const spark = document.createElement('div');
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 40;
      spark.style.cssText = `
        position: fixed;
        z-index: 88;
        width: 3px;
        height: 12px;
        border-radius: 2px;
        pointer-events: none;
        left: ${x + Math.cos(angle) * dist}px;
        top: ${y + Math.sin(angle) * dist}px;
        background: linear-gradient(180deg, #fff, ${color.core});
        transform: rotate(${angle}rad);
        opacity: 1;
      `;
      spark.dataset.battleTransient = '1';
      document.body.appendChild(spark);
      setTimeout(() => {
        spark.style.transition = 'opacity 150ms, transform 150ms';
        spark.style.opacity = '0';
        spark.style.transform += ' translateY(20px)';
        setTimeout(() => spark.remove(), 150);
      }, 50);
    }
  }
}

/* ---- 敌人受击震动 ---- */
function enemyHitShake(enemyEl, isBoss = false) {
  if (!enemyEl) return;

  const magnitude = isBoss ? 12 : 8;
  const duration = 120;
  const t0 = performance.now();

  const originalTransform = enemyEl.style.transform || '';

  function animate() {
    const elapsed = performance.now() - t0;
    const progress = elapsed / duration;

    if (progress >= 1) {
      enemyEl.style.transform = originalTransform;
      return;
    }

    const shake = magnitude * (1 - progress);
    const offset = Math.sin(progress * Math.PI * 6) * shake;

    enemyEl.style.transform = `translateX(${offset}px)`;
    requestAnimationFrame(animate);
  }

  animate();
}

/* ---- 敌人红色闪光 ---- */
function enemyRedFlash(enemyImgEl) {
  if (!enemyImgEl) return;

  enemyImgEl.classList.add('flash');
  setTimeout(() => enemyImgEl.classList.remove('flash'), 100);
}

/* ---- Hades风格: 弹性伤害数字 (多阶段缓动 + 抛物线 + 色彩渐变) ---- */
function spawnDamageNumber(value, x, y, type = 'damage') {
  const colors = {
    damage: { base: '#ff9b7a', glow: '#ff4444', shadow: 'rgba(255,68,68,0.8)' },
    heal: { base: '#b6e08a', glow: '#44ff77', shadow: 'rgba(68,255,119,0.8)' },
    shield: { base: '#bcd8ee', glow: '#4488ff', shadow: 'rgba(68,136,255,0.8)' },
    buff: { base: '#f4d03f', glow: '#ffaa00', shadow: 'rgba(255,170,0,0.8)' },
    debuff: { base: '#d9a8ff', glow: '#aa44ff', shadow: 'rgba(170,68,255,0.8)' }
  };

  const color = colors[type] || colors.damage;

  const num = document.createElement('div');
  num.textContent = value;
  num.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    font-family: 'Cormorant Garamond', serif;
    font-size: 56px;
    font-weight: 800;
    color: ${color.base};
    pointer-events: none;
    z-index: 95;
    text-shadow:
      0 0 30px ${color.glow},
      0 4px 16px ${color.shadow},
      0 2px 4px rgba(0,0,0,0.9);
    will-change: transform, opacity;
    filter: brightness(1.2);
  `;
  num.dataset.battleTransient = '1';
  document.body.appendChild(num);

  const t0 = performance.now();
  const duration = 1400;

  function animate() {
    const elapsed = performance.now() - t0;
    const progress = elapsed / duration;

    if (progress >= 1) {
      num.remove();
      return;
    }

    // === Hades 式三阶段弹性曲线 ===
    let scale;
    if (progress < 0.15) {
      // 阶段1: 快速放大 (0 → 1.5)
      const t = progress / 0.15;
      scale = t * 1.5;
    } else if (progress < 0.35) {
      // 阶段2: 弹性回弹 (1.5 → 0.9 → 1.1)
      const t = (progress - 0.15) / 0.2;
      const elasticT = t < 0.5
        ? 0.9 + Math.sin(t * Math.PI * 2) * 0.15
        : 1.0 + Math.sin((t - 0.5) * Math.PI) * 0.1;
      scale = 1.5 - (1.5 - elasticT) * t;
    } else {
      // 阶段3: 稳定放大 (1.1 → 1.2)
      const t = (progress - 0.35) / 0.65;
      scale = 1.1 + t * 0.1;
    }

    // 抛物线飘移: 先快速上升后减速
    const offsetY = progress < 0.5
      ? -90 * (progress / 0.5)
      : -90 - 30 * ((progress - 0.5) / 0.5);

    // 轻微水平摆动
    const offsetX = Math.sin(progress * Math.PI * 1.5) * 12;

    // 渐变透明度: 保持饱满后快速消失
    const opacity = progress < 0.75 ? 1 : (1 - (progress - 0.75) / 0.25);

    // 色彩强度随时间衰减
    const brightness = 1.2 - progress * 0.3;

    num.style.transform = `translate(calc(-50% + ${offsetX}px), ${offsetY}px) scale(${scale})`;
    num.style.opacity = opacity;
    num.style.filter = `brightness(${brightness})`;

    requestAnimationFrame(animate);
  }

  animate();
}

/* ---- Hades风格: 屏幕震动 (方向性 + 衰减曲线 + 音效反馈) ---- */
function screenShake(magnitude, duration, arenaEl) {
  if (!arenaEl) return;

  // 音效预留接口
  if (window.TerraSound && magnitude > 20) TerraSound.play('heavyHit', 0.6);

  const t0 = performance.now();

  function animate() {
    const elapsed = performance.now() - t0;
    const progress = elapsed / duration;

    if (progress >= 1) {
      arenaEl.style.transform = '';
      return;
    }

    // Hades 式衰减: 快速震动逐渐平息
    const decay = Math.pow(1 - progress, 2.5);
    const shake = magnitude * decay;

    // 高频震动 (20Hz)
    const freq = 20;
    const phase = elapsed * freq / 1000 * Math.PI * 2;

    const x = Math.sin(phase) * shake;
    const y = Math.cos(phase * 1.3) * shake * 0.7; // Y轴幅度稍小

    arenaEl.style.transform = `translate(${x}px, ${y}px)`;
    requestAnimationFrame(animate);
  }

  animate();
}

/* ---- Hades风格: 色差畸变 (RGB分离 + 扭曲) ---- */
function chromaticAberration(arenaEl) {
  if (!arenaEl) return;

  arenaEl.classList.add('chroma');
  setTimeout(() => arenaEl.classList.remove('chroma'), 200);
}

/* ---- Hades风格: 斜斩剑气 (多层刀光 + 拉伸动画) ---- */
function spawnSlashEffects(targetEl, count = 3) {
  if (!targetEl) return;

  const rect = targetEl.getBoundingClientRect();

  for (let i = 0; i < count; i++) {
    const slash = document.createElement('div');
    slash.className = 'slash';

    const x = rect.left + rect.width * (0.25 + Math.random() * 0.5);
    const y = rect.top + rect.height * (0.2 + Math.random() * 0.5);
    const rotation = -60 + Math.random() * 120;
    const length = 200 + Math.random() * 80;

    slash.style.left = x + 'px';
    slash.style.top = y + 'px';
    slash.style.width = length + 'px';
    slash.style.transform = `rotate(${rotation}deg)`;
    slash.style.animationDelay = (i * 30) + 'ms';

    slash.dataset.battleTransient = '1';
    document.body.appendChild(slash);

    setTimeout(() => slash.remove(), 400);
  }
}

/* ---- Hades风格: 护甲破碎效果 ---- */
function shieldBreakEffect(x, y) {
  // 音效预留
  if (window.TerraSound) TerraSound.play('shieldBreak', 0.7);

  // 破碎碎片
  const shardCount = 12;
  for (let i = 0; i < shardCount; i++) {
    const shard = document.createElement('div');
    const angle = (Math.PI * 2 * i) / shardCount + (Math.random() - 0.5) * 0.4;
    const speed = 100 + Math.random() * 80;
    const size = 6 + Math.random() * 6;
    const rotationSpeed = (Math.random() - 0.5) * 10;

    shard.style.cssText = `
      position: fixed;
      z-index: 90;
      width: ${size}px;
      height: ${size}px;
      pointer-events: none;
      left: ${x - size/2}px;
      top: ${y - size/2}px;
      background: linear-gradient(135deg, #bcd8ee, #8fb6d8);
      box-shadow: 0 0 8px rgba(143,182,216,0.6);
      opacity: 1;
    `;
    shard.dataset.battleTransient = '1';
    document.body.appendChild(shard);

    const t0 = performance.now();
    const duration = 500;

    function animate() {
      const elapsed = performance.now() - t0;
      const progress = elapsed / duration;

      if (progress >= 1) {
        shard.remove();
        return;
      }

      const dist = speed * progress;
      const gravity = 120 * progress * progress;
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist * 0.5 + gravity;
      const rotation = rotationSpeed * elapsed / 10;

      shard.style.left = (px - size/2) + 'px';
      shard.style.top = (py - size/2) + 'px';
      shard.style.transform = `rotate(${rotation}deg)`;
      shard.style.opacity = 1 - progress;

      requestAnimationFrame(animate);
    }

    animate();
  }

  // 中心冲击光圈
  const ring = document.createElement('div');
  ring.style.cssText = `
    position: fixed;
    z-index: 89;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    pointer-events: none;
    left: ${x - 20}px;
    top: ${y - 20}px;
    border: 3px solid #bcd8ee;
    box-shadow: 0 0 20px rgba(188,216,238,0.8);
  `;
  ring.dataset.battleTransient = '1';
  document.body.appendChild(ring);

  const t0 = performance.now();
  function animateRing() {
    const elapsed = performance.now() - t0;
    const progress = elapsed / 400;
    if (progress >= 1) {
      ring.remove();
      return;
    }
    ring.style.transform = `translate(-50%, -50%) scale(${1 + progress * 2.5})`;
    ring.style.opacity = 1 - progress;
    requestAnimationFrame(animateRing);
  }
  animateRing();
}

/* ---- Hades风格: 升级/奖励展示仪式感 (金光 + 粒子上升 + 弹性展开) ---- */
function levelUpCeremony(targetEl, title = '等级提升') {
  if (!targetEl) return;

  // 音效预留
  if (window.TerraSound) TerraSound.play('levelUp', 0.9);

  const rect = targetEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  // === 第一层: 光柱冲天 ===
  const beam = document.createElement('div');
  beam.style.cssText = `
    position: fixed;
    z-index: 96;
    width: 120px;
    height: 100vh;
    pointer-events: none;
    left: ${cx - 60}px;
    top: 0;
    background: linear-gradient(180deg,
      transparent 0%,
      rgba(244,208,63,0.6) 30%,
      rgba(244,208,63,0.3) 70%,
      transparent 100%);
    box-shadow: 0 0 80px rgba(244,208,63,0.8);
    opacity: 0;
    transform: scaleY(0);
    transform-origin: ${cy}px center;
  `;
  beam.dataset.battleTransient = '1';
  document.body.appendChild(beam);

  requestAnimationFrame(() => {
    beam.style.transition = 'transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.6s';
    beam.style.transform = 'scaleY(1)';
    beam.style.opacity = '1';
  });

  setTimeout(() => {
    beam.style.transition = 'opacity 0.8s';
    beam.style.opacity = '0';
    setTimeout(() => beam.remove(), 800);
  }, 1200);

  // === 第二层: 上升金色粒子 ===
  for (let i = 0; i < 40; i++) {
    setTimeout(() => {
      const particle = document.createElement('div');
      const offsetX = (Math.random() - 0.5) * 150;
      const size = 4 + Math.random() * 6;

      particle.style.cssText = `
        position: fixed;
        z-index: 95;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        pointer-events: none;
        left: ${cx + offsetX - size/2}px;
        top: ${cy}px;
        background: radial-gradient(circle, #f4d03f, #c9a24b);
        box-shadow: 0 0 12px rgba(244,208,63,0.8);
        opacity: 1;
      `;
      particle.dataset.battleTransient = '1';
      document.body.appendChild(particle);

      const t0 = performance.now();
      const duration = 1500 + Math.random() * 500;
      const drift = (Math.random() - 0.5) * 60;

      function animate() {
        const elapsed = performance.now() - t0;
        const progress = elapsed / duration;

        if (progress >= 1) {
          particle.remove();
          return;
        }

        const rise = -300 * progress;
        const x = cx + offsetX + drift * progress;
        const opacity = progress < 0.3 ? progress / 0.3 : (1 - (progress - 0.3) / 0.7);

        particle.style.left = (x - size/2) + 'px';
        particle.style.top = (cy + rise) + 'px';
        particle.style.opacity = opacity;

        requestAnimationFrame(animate);
      }

      animate();
    }, i * 30);
  }

  // === 第三层: 标题文字展开 ===
  const titleEl = document.createElement('div');
  titleEl.textContent = title;
  titleEl.style.cssText = `
    position: fixed;
    z-index: 97;
    left: ${cx}px;
    top: ${cy - 80}px;
    font-family: 'Cormorant Garamond', 'Noto Serif SC', serif;
    font-size: 52px;
    font-weight: 700;
    letter-spacing: 0.2em;
    color: #f4d03f;
    pointer-events: none;
    text-shadow:
      0 0 40px rgba(244,208,63,1),
      0 4px 20px rgba(0,0,0,0.8),
      0 2px 4px rgba(0,0,0,0.9);
    transform: translate(-50%, -50%) scale(0);
    opacity: 0;
  `;
  titleEl.dataset.battleTransient = '1';
  document.body.appendChild(titleEl);

  requestAnimationFrame(() => {
    titleEl.style.transition = 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.8s';
    titleEl.style.transform = 'translate(-50%, -50%) scale(1)';
    titleEl.style.opacity = '1';
  });

  setTimeout(() => {
    titleEl.style.transition = 'opacity 0.6s';
    titleEl.style.opacity = '0';
    setTimeout(() => titleEl.remove(), 600);
  }, 2000);
}

/* ---- 导出 API ---- */
window.BattleEffects = {
  createCardProjectile,
  createImpactExplosion,
  enemyHitShake,
  enemyRedFlash,
  spawnDamageNumber,
  screenShake,
  chromaticAberration,
  spawnSlashEffects,
  shieldBreakEffect,
  levelUpCeremony
};

})();
