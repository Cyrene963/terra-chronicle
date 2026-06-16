/* =========================================================
   Terra Chronicle — 播种土壤粒子效果
   为播种操作添加轻量土壤粒子爆发，增强反馈感
   ========================================================= */
'use strict';

function spawnSoilParticles(worldX, worldY) {
  if (!window.__dbg?.world) return;

  const world = window.__dbg.world;
  const overlayL = window.__dbg.overlayL;
  if (!overlayL) return;

  // 生成12-18个土壤粒子
  const count = 12 + Math.floor(Math.random() * 6);
  const colors = [0x8b6f47, 0xa0825a, 0x6b5639, 0x9a7d5f];

  for (let i = 0; i < count; i++) {
    const p = new PIXI.Graphics();
    const size = 3 + Math.random() * 4;
    const color = colors[Math.floor(Math.random() * colors.length)];

    p.circle(0, 0, size).fill({ color, alpha: 0.85 });
    p.x = worldX + (Math.random() * 24 - 12);
    p.y = worldY + (Math.random() * 16 - 8);

    // 物理参数
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 80;
    p._vx = Math.cos(angle) * speed;
    p._vy = Math.sin(angle) * speed - 60 - Math.random() * 40;
    p._life = 0;
    p._maxLife = 0.6 + Math.random() * 0.3;
    p._rotation = Math.random() * Math.PI * 2;
    p._rotSpeed = (Math.random() - 0.5) * 8;

    overlayL.addChild(p);

    // 动画循环
    const startTime = performance.now();
    (function animate() {
      const elapsed = (performance.now() - startTime) / 1000;
      if (elapsed >= p._maxLife) {
        overlayL.removeChild(p);
        p.destroy();
        return;
      }

      const dt = 1 / 60;
      p._life = elapsed;

      // 重力
      p._vy += 280 * dt;

      // 更新位置
      p.x += p._vx * dt;
      p.y += p._vy * dt;

      // 旋转
      p._rotation += p._rotSpeed * dt;
      p.rotation = p._rotation;

      // 淡出
      const fadeProgress = p._life / p._maxLife;
      p.alpha = Math.max(0, 0.85 * (1 - fadeProgress));

      requestAnimationFrame(animate);
    })();
  }
}

// 导出到全局
if (typeof window !== 'undefined') {
  window.spawnSoilParticles = spawnSoilParticles;
}
