/* =========================================================
   Terra Chronicle — 生态系统可视化集成
   将 ecology_system.js 的害虫/捕食者逻辑与地图渲染整合
   ========================================================= */

// 在 main.js 中添加的代码片段

/* ================= 生态系统集成 ================= */

// 全局生态管理器
let ecologyManager = null;

// 生态实体容器
const ecologyEntities = {
  pests: [],      // 害虫列表
  predators: [],  // 捕食者列表
};

// 生态粒子容器
let ecologyLayer = null;

/**
 * 初始化生态系统
 */
function initEcologySystem() {
  if (typeof EcologySystem === 'undefined') {
    console.warn('[Ecology] ecology_system.js 未加载');
    return;
  }

  ecologyManager = new EcologySystem();

  // 创建生态图层 (在 world 和 sortedLayer 之间)
  ecologyLayer = new PIXI.Container();
  ecologyLayer.sortableChildren = true;
  world.addChildAt(ecologyLayer, world.children.indexOf(sortedLayer));

  console.log('[Ecology] 生态系统已初始化');

  // 初始化害虫生成
  spawnInitialPests();
}

/**
 * 初始化害虫种群
 */
function spawnInitialPests() {
  if (!ecologyManager) return;

  // 在农田周围生成初始害虫
  const farmPlots = Object.keys(tileMeta).map(k => {
    const [x, y] = k.split(',').map(Number);
    return { x, y };
  });

  const pestCount = Math.min(farmPlots.length * 0.3, 20); // 30% 地块有害虫,上限20

  for (let i = 0; i < pestCount; i++) {
    const plot = farmPlots[Math.floor(Math.random() * farmPlots.length)];
    spawnPest(plot.x, plot.y);
  }
}

/**
 * 生成害虫
 */
function spawnPest(tx, ty) {
  // 随机害虫类型
  const pestTypes = ['locust', 'aphid', 'weevil', 'moth'];
  const pestType = pestTypes[Math.floor(Math.random() * pestTypes.length)];

  const pest = {
    id: 'pest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    type: pestType,
    x: tx * TS + TS / 2,
    y: ty * TS + TS / 2,
    tx, ty,
    hp: 20,
    maxHP: 20,
    speed: 15, // 像素/秒
    wanderTarget: null,
    feedingCrop: null,
    damage: 0.1, // 10% 作物伤害/天
  };

  // 创建精灵
  const sprite = new PIXI.Sprite();
  sprite.anchor.set(0.5, 0.8);
  sprite.x = pest.x;
  sprite.y = pest.y;
  sprite.zIndex = pest.y;

  // 加载贴图 (fallback 到简单圆形)
  loadTex(`assets/sprites/pest_${pestType}.png`).then(tex => {
    sprite.texture = tex;
    sprite.width = 24;
    sprite.height = 24;
  }).catch(() => {
    // 占位符
    const g = new PIXI.Graphics();
    g.circle(0, 0, 8);
    g.fill(pestType === 'locust' ? 0x8b7355 : pestType === 'aphid' ? 0x90a955 : 0x654321);
    sprite.addChild(g);
  });

  // 添加血条
  const healthBar = new PIXI.Graphics();
  updatePestHealthBar(healthBar, 1.0);
  healthBar.y = -20;
  sprite.addChild(healthBar);

  pest.sprite = sprite;
  pest.healthBar = healthBar;

  ecologyLayer.addChild(sprite);
  ecologyEntities.pests.push(pest);

  return pest;
}

/**
 * 更新害虫血条
 */
function updatePestHealthBar(graphics, ratio) {
  graphics.clear();
  const w = 24, h = 3;
  graphics.rect(-w / 2, 0, w, h);
  graphics.fill(0x2a1d15);
  graphics.rect(-w / 2, 0, w * ratio, h);
  graphics.fill(ratio > 0.5 ? 0x7dff6f : ratio > 0.2 ? 0xffa94d : 0xff6b6b);
}

/**
 * 生成捕食者
 */
function spawnPredator(tx, ty, type = 'field_cat') {
  const predator = {
    id: 'predator_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    type,
    x: tx * TS + TS / 2,
    y: ty * TS + TS / 2,
    tx, ty,
    hp: 50,
    maxHP: 50,
    speed: 25,
    huntingRange: 5 * TS, // 5格搜索范围
    target: null,
    state: 'idle', // idle, hunting, returning
  };

  // 创建精灵
  const sprite = new PIXI.Sprite();
  sprite.anchor.set(0.5, 0.8);
  sprite.x = predator.x;
  sprite.y = predator.y;
  sprite.zIndex = predator.y;

  loadTex(`assets/sprites/beast_${type}.png`).then(tex => {
    sprite.texture = tex;
    sprite.width = 48;
    sprite.height = 48;
  }).catch(() => {
    const g = new PIXI.Graphics();
    g.circle(0, 0, 12);
    g.fill(0x6d4c41);
    sprite.addChild(g);
  });

  predator.sprite = sprite;

  ecologyLayer.addChild(sprite);
  ecologyEntities.predators.push(predator);

  return predator;
}

/**
 * 更新生态系统 (每帧调用)
 */
function updateEcologySystem(delta) {
  if (!ecologyManager) return;

  const dt = delta / 1000; // 转换为秒

  // 更新害虫行为
  for (let i = ecologyEntities.pests.length - 1; i >= 0; i--) {
    const pest = ecologyEntities.pests[i];

    // 移除死亡害虫
    if (pest.hp <= 0) {
      ecologyLayer.removeChild(pest.sprite);
      ecologyEntities.pests.splice(i, 1);
      continue;
    }

    updatePestBehavior(pest, dt);
  }

  // 更新捕食者行为
  for (const predator of ecologyEntities.predators) {
    updatePredatorBehavior(predator, dt);
  }

  // 定期生成新害虫 (虫害压力机制)
  if (Math.random() < 0.01) { // 1% 概率/帧
    trySpawnNewPest();
  }

  // 更新生态分数显示
  updateEcologyScore();
}

/**
 * 更新害虫行为
 */
function updatePestBehavior(pest, dt) {
  // 寻找目标作物
  if (!pest.feedingCrop) {
    const nearCrop = findNearestCrop(pest.tx, pest.ty, 3);
    if (nearCrop) {
      pest.feedingCrop = nearCrop;
      pest.wanderTarget = { x: nearCrop.x, y: nearCrop.y };
    } else {
      // 随机游荡
      if (!pest.wanderTarget || Math.random() < 0.01) {
        pest.wanderTarget = {
          x: pest.x + (Math.random() - 0.5) * TS * 2,
          y: pest.y + (Math.random() - 0.5) * TS * 2,
        };
      }
    }
  }

  // 移动到目标
  if (pest.wanderTarget) {
    const dx = pest.wanderTarget.x - pest.x;
    const dy = pest.wanderTarget.y - pest.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 2) {
      const moveX = (dx / dist) * pest.speed * dt;
      const moveY = (dy / dist) * pest.speed * dt;
      pest.x += moveX;
      pest.y += moveY;
      pest.tx = Math.floor(pest.x / TS);
      pest.ty = Math.floor(pest.y / TS);

      // 更新精灵位置
      pest.sprite.x = pest.x;
      pest.sprite.y = pest.y;
      pest.sprite.zIndex = pest.y;

      // 翻转方向
      pest.sprite.scale.x = dx > 0 ? 1 : -1;
    } else {
      pest.wanderTarget = null;

      // 如果到达作物,开始啃食
      if (pest.feedingCrop) {
        damageCrop(pest.feedingCrop, pest.damage * dt);
      }
    }
  }
}

/**
 * 更新捕食者行为
 */
function updatePredatorBehavior(predator, dt) {
  if (predator.state === 'idle') {
    // 搜索附近害虫
    const nearestPest = findNearestPest(predator.x, predator.y, predator.huntingRange);
    if (nearestPest) {
      predator.target = nearestPest;
      predator.state = 'hunting';
    } else {
      // 随机巡逻
      if (Math.random() < 0.005) {
        predator.state = 'patrolling';
        predator.patrolTarget = {
          x: predator.x + (Math.random() - 0.5) * TS * 6,
          y: predator.y + (Math.random() - 0.5) * TS * 6,
        };
      }
    }
  } else if (predator.state === 'hunting') {
    if (!predator.target || predator.target.hp <= 0) {
      predator.target = null;
      predator.state = 'idle';
      return;
    }

    // 追击害虫
    const dx = predator.target.x - predator.x;
    const dy = predator.target.y - predator.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 10) {
      const moveX = (dx / dist) * predator.speed * dt;
      const moveY = (dy / dist) * predator.speed * dt;
      predator.x += moveX;
      predator.y += moveY;

      predator.sprite.x = predator.x;
      predator.sprite.y = predator.y;
      predator.sprite.zIndex = predator.y;
      predator.sprite.scale.x = dx > 0 ? 1 : -1;
    } else {
      // 捕获害虫
      predator.target.hp -= 50; // 一击必杀
      updatePestHealthBar(predator.target.healthBar, predator.target.hp / predator.target.maxHP);

      // 捕获特效
      spawnWorldRipple(predator.target.x, predator.target.y, 0x7dff6f, '✓');

      predator.target = null;
      predator.state = 'idle';
    }
  } else if (predator.state === 'patrolling') {
    if (!predator.patrolTarget) {
      predator.state = 'idle';
      return;
    }

    const dx = predator.patrolTarget.x - predator.x;
    const dy = predator.patrolTarget.y - predator.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 5) {
      const moveX = (dx / dist) * predator.speed * 0.5 * dt;
      const moveY = (dy / dist) * predator.speed * 0.5 * dt;
      predator.x += moveX;
      predator.y += moveY;

      predator.sprite.x = predator.x;
      predator.sprite.y = predator.y;
      predator.sprite.zIndex = predator.y;
    } else {
      predator.patrolTarget = null;
      predator.state = 'idle';
    }
  }
}

/**
 * 寻找最近作物
 */
function findNearestCrop(tx, ty, range) {
  let nearest = null;
  let minDist = Infinity;

  for (const key in tileMeta) {
    const meta = tileMeta[key];
    if (!meta.crop) continue;

    const [cx, cy] = key.split(',').map(Number);
    const dist = Math.hypot(cx - tx, cy - ty);

    if (dist < minDist && dist <= range) {
      minDist = dist;
      nearest = { x: cx * TS + TS / 2, y: cy * TS + TS / 2, key, meta };
    }
  }

  return nearest;
}

/**
 * 寻找最近害虫
 */
function findNearestPest(x, y, range) {
  let nearest = null;
  let minDist = Infinity;

  for (const pest of ecologyEntities.pests) {
    const dist = Math.hypot(pest.x - x, pest.y - y);
    if (dist < minDist && dist <= range) {
      minDist = dist;
      nearest = pest;
    }
  }

  return nearest;
}

/**
 * 作物受损
 */
function damageCrop(crop, damage) {
  if (!crop || !crop.meta) return;

  const meta = crop.meta;
  if (!meta.pestDamage) meta.pestDamage = 0;

  meta.pestDamage += damage;

  // 视觉反馈 (作物变黄/枯萎)
  if (meta.pestDamage > 0.3 && !meta.damagedVisual) {
    meta.damagedVisual = true;
    // 添加枯萎滤镜 (需要在渲染循环中应用)
  }

  // 严重受损则死亡
  if (meta.pestDamage >= 1.0) {
    meta.crop = null;
    meta.growth = 0;
  }
}

/**
 * 尝试生成新害虫 (虫害压力机制)
 */
function trySpawnNewPest() {
  // 基于生态分数决定生成率
  const ecologyScore = calculateEcologyScore();

  if (ecologyScore < 40) { // 生态失衡,虫害爆发
    const plots = Object.keys(tileMeta);
    if (plots.length === 0) return;

    const key = plots[Math.floor(Math.random() * plots.length)];
    const [tx, ty] = key.split(',').map(Number);

    // 限制害虫数量
    if (ecologyEntities.pests.length < 50) {
      spawnPest(tx, ty);
    }
  }
}

/**
 * 计算生态分数
 */
function calculateEcologyScore() {
  if (!ecologyManager) return 50;

  const pestCount = ecologyEntities.pests.length;
  const predatorCount = ecologyEntities.predators.length;

  // 简单公式: 100 - (害虫数 * 2) + (捕食者数 * 5)
  let score = 100 - pestCount * 2 + predatorCount * 5;
  score = Math.max(0, Math.min(100, score));

  return score;
}

/**
 * 更新生态分数显示
 */
function updateEcologyScore() {
  const scoreEl = document.getElementById('ecologyScore');
  if (!scoreEl) return;

  const score = calculateEcologyScore();
  scoreEl.textContent = score.toFixed(0);

  // 更新颜色
  const bar = document.getElementById('ecologyBar');
  if (bar) {
    bar.style.width = score + '%';
    bar.style.background = score > 70 ? '#7dff6f' : score > 40 ? '#ffa94d' : '#ff6b6b';
  }
}

/**
 * 添加捕食者灵兽 (从灵兽系统调用)
 */
function addPredatorBeast(tx, ty, type) {
  spawnPredator(tx, ty, type);
  toastHint(`${type} 开始巡逻农场`);
}

// 导出给 main.js 使用
if (typeof window !== 'undefined') {
  window.EcologyIntegration = {
    init: initEcologySystem,
    update: updateEcologySystem,
    spawnPest,
    spawnPredator,
    addPredatorBeast,
    getScore: calculateEcologyScore,
  };
}
