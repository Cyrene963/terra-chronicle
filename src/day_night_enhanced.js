/* =========================================================
   Terra Chronicle — Enhanced Day/Night Cycle System v1.0

   强化每日循环的沉浸感:
   - 四阶段光照变化（日出/正午/黄昏/夜晚）
   - 时段专属粒子效果（晨雾/黄昏光柱/萤火虫/星光）
   - 月相系统（影响作物生长和灵兽活跃度）
   - 音效氛围分层（白天活跃/夜晚安静）
   ========================================================= */
'use strict';

/* ================= 1. Time of Day Configuration ================= */
const TIME_OF_DAY = {
  dawn: {
    name: '黎明',
    nameEn: 'Dawn',
    startPhase: 0.0,
    endPhase: 0.15,
    ambientColor: 0xffdbb5,
    ambientIntensity: 0.6,
    tint: 0xffc499,
    particles: 'mist'
  },
  morning: {
    name: '上午',
    nameEn: 'Morning',
    startPhase: 0.15,
    endPhase: 0.4,
    ambientColor: 0xfffef5,
    ambientIntensity: 1.0,
    tint: 0xffffff,
    particles: null
  },
  noon: {
    name: '正午',
    nameEn: 'Noon',
    startPhase: 0.4,
    endPhase: 0.6,
    ambientColor: 0xfffff0,
    ambientIntensity: 1.2,
    tint: 0xffffff,
    particles: null
  },
  afternoon: {
    name: '下午',
    nameEn: 'Afternoon',
    startPhase: 0.6,
    endPhase: 0.75,
    ambientColor: 0xfffef5,
    ambientIntensity: 1.0,
    tint: 0xffffff,
    particles: null
  },
  dusk: {
    name: '黄昏',
    nameEn: 'Dusk',
    startPhase: 0.75,
    endPhase: 0.85,
    ambientColor: 0xffb870,
    ambientIntensity: 0.7,
    tint: 0xffaa66,
    particles: 'godrays'
  },
  evening: {
    name: '傍晚',
    nameEn: 'Evening',
    startPhase: 0.85,
    endPhase: 0.92,
    ambientColor: 0x7788bb,
    ambientIntensity: 0.4,
    tint: 0x9999cc,
    particles: 'fireflies'
  },
  night: {
    name: '夜晚',
    nameEn: 'Night',
    startPhase: 0.92,
    endPhase: 1.0,
    ambientColor: 0x334466,
    ambientIntensity: 0.3,
    tint: 0x5566aa,
    particles: 'stars'
  },
};

/* ================= 2. Moon Phase System ================= */
const MOON_PHASES = [
  { name: '新月', nameEn: 'New Moon', growthBonus: 0.9, beastActivity: 0.5, icon: '🌑' },
  { name: '娥眉月', nameEn: 'Waxing Crescent', growthBonus: 1.0, beastActivity: 0.7, icon: '🌒' },
  { name: '上弦月', nameEn: 'First Quarter', growthBonus: 1.1, beastActivity: 0.9, icon: '🌓' },
  { name: '盈凸月', nameEn: 'Waxing Gibbous', growthBonus: 1.15, beastActivity: 1.1, icon: '🌔' },
  { name: '满月', nameEn: 'Full Moon', growthBonus: 1.3, beastActivity: 1.5, icon: '🌕' },
  { name: '亏凸月', nameEn: 'Waning Gibbous', growthBonus: 1.15, beastActivity: 1.2, icon: '🌖' },
  { name: '下弦月', nameEn: 'Last Quarter', growthBonus: 1.0, beastActivity: 1.0, icon: '🌗' },
  { name: '残月', nameEn: 'Waning Crescent', growthBonus: 0.95, beastActivity: 0.8, icon: '🌘' },
];

/* ================= 3. Day/Night State Management ================= */
const DayNightCycle = {
  currentPhase: 0.0,
  currentTimeOfDay: null,
  currentMoonPhase: 0,
  ambientLightFilter: null,
  particleContainer: null,
  activeParticles: [],
};

/* ================= 4. Time of Day Detection ================= */
function getTimeOfDay(dayPhase) {
  for (const [key, config] of Object.entries(TIME_OF_DAY)) {
    if (dayPhase >= config.startPhase && dayPhase < config.endPhase) {
      return { key, ...config };
    }
  }
  // Wrap around to dawn
  return { key: 'dawn', ...TIME_OF_DAY.dawn };
}

/* ================= 5. Ambient Lighting System ================= */
function updateAmbientLight(dayPhase, container) {
  const timeOfDay = getTimeOfDay(dayPhase);

  if (!DayNightCycle.ambientLightFilter) {
    // Create ambient light overlay
    const overlay = new PIXI.Graphics();
    overlay.rect(0, 0, 3600, 3600);
    overlay.fill({ color: 0x000000, alpha: 0 });
    overlay.blendMode = 'multiply';
    container.addChild(overlay);
    DayNightCycle.ambientLightFilter = overlay;
  }

  const filter = DayNightCycle.ambientLightFilter;
  filter.tint = timeOfDay.ambientColor;
  filter.alpha = Math.max(0, 1.0 - timeOfDay.ambientIntensity);

  // Apply tint to sprites (handled by main.js)
  if (window.setWorldTint) {
    window.setWorldTint(timeOfDay.tint);
  }

  return timeOfDay;
}

/* ================= 6. Time-Specific Particle Systems ================= */
function updateTimeParticles(timeOfDay, container, dt) {
  // Remove particles that don't match current time
  if (DayNightCycle.currentTimeOfDay?.particles !== timeOfDay.particles) {
    clearTimeParticles();
  }

  DayNightCycle.currentTimeOfDay = timeOfDay;

  if (!timeOfDay.particles) return;

  // Create particle container if needed
  if (!DayNightCycle.particleContainer) {
    DayNightCycle.particleContainer = new PIXI.Container();
    container.addChild(DayNightCycle.particleContainer);
  }

  switch (timeOfDay.particles) {
    case 'mist':
      updateMistParticles(dt);
      break;
    case 'godrays':
      updateGodRayParticles(dt);
      break;
    case 'fireflies':
      updateFireflyParticles(dt);
      break;
    case 'stars':
      updateStarParticles(dt);
      break;
  }
}

function clearTimeParticles() {
  if (DayNightCycle.particleContainer) {
    DayNightCycle.activeParticles.forEach(p => p.destroy());
    DayNightCycle.activeParticles = [];
    DayNightCycle.particleContainer.removeChildren();
  }
}

/* ================= 7. Mist Particles (Dawn) ================= */
function updateMistParticles(dt) {
  const container = DayNightCycle.particleContainer;
  const targetCount = 20;

  // Spawn new mist particles
  while (DayNightCycle.activeParticles.length < targetCount) {
    const mist = new PIXI.Graphics();
    mist.circle(0, 0, 30 + Math.random() * 50);
    mist.fill({ color: 0xffffff, alpha: 0.15 });
    mist.filters = [new PIXI.BlurFilter(15)];

    mist.x = Math.random() * 3600;
    mist.y = Math.random() * 3600;
    mist._vx = -10 - Math.random() * 20;
    mist._vy = Math.random() * 10 - 5;
    mist._life = 1.0;

    container.addChild(mist);
    DayNightCycle.activeParticles.push(mist);
  }

  // Update mist particles
  DayNightCycle.activeParticles.forEach((mist, idx) => {
    mist.x += mist._vx * dt;
    mist.y += mist._vy * dt;
    mist._life -= dt * 0.1;

    if (mist._life <= 0 || mist.x < -100) {
      mist.destroy();
      DayNightCycle.activeParticles.splice(idx, 1);
    }
  });
}

/* ================= 8. God Ray Particles (Dusk) ================= */
function updateGodRayParticles(dt) {
  const container = DayNightCycle.particleContainer;
  const targetCount = 8;

  while (DayNightCycle.activeParticles.length < targetCount) {
    const ray = new PIXI.Graphics();
    const width = 40 + Math.random() * 60;
    const height = 400 + Math.random() * 600;

    ray.rect(-width / 2, 0, width, height);
    ray.fill({ color: 0xffbb66, alpha: 0.12 });
    ray.filters = [new PIXI.BlurFilter(8)];

    ray.x = Math.random() * 3600;
    ray.y = -200;
    ray.rotation = (Math.random() - 0.5) * 0.3;
    ray._life = 1.0;
    ray._pulse = Math.random() * Math.PI * 2;

    container.addChild(ray);
    DayNightCycle.activeParticles.push(ray);
  }

  DayNightCycle.activeParticles.forEach((ray, idx) => {
    ray._pulse += dt * 0.5;
    ray.alpha = 0.12 + Math.sin(ray._pulse) * 0.05;
    ray._life -= dt * 0.05;

    if (ray._life <= 0) {
      ray.destroy();
      DayNightCycle.activeParticles.splice(idx, 1);
    }
  });
}

/* ================= 9. Firefly Particles (Evening) ================= */
function updateFireflyParticles(dt) {
  const container = DayNightCycle.particleContainer;
  const targetCount = 30;

  while (DayNightCycle.activeParticles.length < targetCount) {
    const firefly = new PIXI.Graphics();
    firefly.circle(0, 0, 2);
    firefly.fill({ color: 0xffff88 });
    firefly.filters = [new PIXI.BlurFilter(3)];

    firefly.x = Math.random() * 3600;
    firefly.y = Math.random() * 3600;
    firefly._vx = (Math.random() - 0.5) * 40;
    firefly._vy = (Math.random() - 0.5) * 40;
    firefly._pulse = Math.random() * Math.PI * 2;
    firefly._life = 2.0 + Math.random() * 3.0;

    container.addChild(firefly);
    DayNightCycle.activeParticles.push(firefly);
  }

  DayNightCycle.activeParticles.forEach((firefly, idx) => {
    firefly.x += firefly._vx * dt;
    firefly.y += firefly._vy * dt;
    firefly._pulse += dt * 3;
    firefly.alpha = 0.5 + Math.sin(firefly._pulse) * 0.5;
    firefly._life -= dt;

    // Random direction change
    if (Math.random() < dt * 2) {
      firefly._vx = (Math.random() - 0.5) * 40;
      firefly._vy = (Math.random() - 0.5) * 40;
    }

    if (firefly._life <= 0) {
      firefly.destroy();
      DayNightCycle.activeParticles.splice(idx, 1);
    }
  });
}

/* ================= 10. Star Particles (Night) ================= */
function updateStarParticles(dt) {
  const container = DayNightCycle.particleContainer;
  const targetCount = 50;

  while (DayNightCycle.activeParticles.length < targetCount) {
    const star = new PIXI.Graphics();
    star.circle(0, 0, 1 + Math.random() * 2);
    star.fill({ color: 0xffffff });

    star.x = Math.random() * 3600;
    star.y = Math.random() * 1800; // Upper half only
    star._pulse = Math.random() * Math.PI * 2;
    star._pulseSpeed = 0.5 + Math.random() * 1.5;
    star._baseAlpha = 0.5 + Math.random() * 0.5;

    container.addChild(star);
    DayNightCycle.activeParticles.push(star);
  }

  DayNightCycle.activeParticles.forEach((star) => {
    star._pulse += dt * star._pulseSpeed;
    star.alpha = star._baseAlpha + Math.sin(star._pulse) * 0.3;
  });
}

/* ================= 11. Moon Phase System ================= */
function updateMoonPhase(day) {
  const moonCycle = 8; // 8 days per full moon cycle
  const phaseIndex = Math.floor(day / moonCycle) % MOON_PHASES.length;

  if (DayNightCycle.currentMoonPhase !== phaseIndex) {
    DayNightCycle.currentMoonPhase = phaseIndex;
    console.log(`[Moon] ${MOON_PHASES[phaseIndex].name} ${MOON_PHASES[phaseIndex].icon}`);
  }

  return MOON_PHASES[phaseIndex];
}

function getMoonBonus(type) {
  const phase = MOON_PHASES[DayNightCycle.currentMoonPhase];

  switch (type) {
    case 'growth':
      return phase.growthBonus;
    case 'beast':
      return phase.beastActivity;
    default:
      return 1.0;
  }
}

/* ================= 12. Main Update Loop ================= */
function updateDayNightCycle(dayPhase, day, worldContainer, dt) {
  // Update ambient lighting
  const timeOfDay = updateAmbientLight(dayPhase, worldContainer);

  // Update time-specific particles
  updateTimeParticles(timeOfDay, worldContainer, dt);

  // Update moon phase
  const moonPhase = updateMoonPhase(day);

  // Update HUD time indicator
  updateTimeOfDayHUD(timeOfDay, moonPhase);

  return { timeOfDay, moonPhase };
}

/* ================= 13. HUD Integration ================= */
function updateTimeOfDayHUD(timeOfDay, moonPhase) {
  const weatherTag = document.getElementById('weatherTag');
  if (!weatherTag) return;

  // Show moon phase during night
  if (timeOfDay.key === 'night' || timeOfDay.key === 'evening') {
    if (!weatherTag.dataset.showingMoon) {
      weatherTag.textContent = `${moonPhase.icon} ${moonPhase.name}`;
      weatherTag.dataset.showingMoon = 'true';
    }
  } else {
    if (weatherTag.dataset.showingMoon) {
      delete weatherTag.dataset.showingMoon;
      // Will be reset by weather system
    }
  }
}

/* ================= 14. Audio Atmosphere (Placeholder) ================= */
function updateAudioAtmosphere(timeOfDay) {
  // Placeholder for audio system integration
  // Different ambient sounds for day/night
  // - Dawn: birds chirping
  // - Day: wind, distant farm sounds
  // - Dusk: crickets starting
  // - Night: owl hoots, rustling leaves

  console.log(`[Audio] Atmosphere: ${timeOfDay.name}`);
}

/* ================= 15. Global Exports ================= */
window.DayNightCycle = DayNightCycle;
window.updateDayNightCycle = updateDayNightCycle;
window.getMoonBonus = getMoonBonus;
window.getTimeOfDay = getTimeOfDay;

console.log('[DayNightCycle] Enhanced day/night system loaded');
