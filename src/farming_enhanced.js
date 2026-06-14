/* =========================================================
   Terra Chronicle — Enhanced Farming System
   --------------------------------------------------------
   Features:
   1. Multiple crop types (wheat/corn/tomato/magic_herb)
   2. Soil fertility system (degrades on harvest, restored by fallow/fertilizer)
   3. Weather system (rain/drought/normal affecting growth)
   4. Pest infestations (random events, needs intervention)
   5. Crop quality grades (poor/common/good/excellent/legendary)
   ========================================================= */

'use strict';

/* ================= CROP DATABASE ================= */
const CROP_TYPES = {
  starwheat: {
    name: '星麦', nameEn: 'Starwheat',
    growDays: 0.6,              // Growth time in game days
    seasons: [0, 3],            // Preferred seasons (0=spring, 1=summer, 2=autumn, 3=winter)
    waterNeed: 40,              // Base moisture consumption
    fertConsume: 8,             // Fertility consumption on harvest
    baseYield: 1,
    sellPrice: 15,
    sprite: 'crop',             // Asset key
    color: 0x96be64,
  },
  goldcorn: {
    name: '金粟', nameEn: 'Golden Corn',
    growDays: 0.8,
    seasons: [1, 2],            // Summer/Autumn
    waterNeed: 60,
    fertConsume: 12,
    baseYield: 2,
    sellPrice: 25,
    sprite: 'crop',
    color: 0xffd946,
  },
  rubyberry: {
    name: '赤果', nameEn: 'Ruby Tomato',
    growDays: 0.5,
    seasons: [1],               // Summer only
    waterNeed: 70,
    fertConsume: 10,
    baseYield: 3,
    sellPrice: 20,
    sprite: 'crop',
    color: 0xff5a46,
  },
  magicroot: {
    name: '灵根', nameEn: 'Magic Herb',
    growDays: 1.2,
    seasons: [0, 1, 2, 3],      // All seasons (magical)
    waterNeed: 30,
    fertConsume: 20,
    baseYield: 1,
    sellPrice: 80,
    sprite: 'crop',
    color: 0xb68aff,
  },
};

/* ================= WEATHER SYSTEM ================= */
const WeatherSystem = {
  current: 'normal',           // 'rain' | 'drought' | 'normal'
  intensity: 0,                // 0-1
  duration: 0,                 // Days remaining
  nextChange: 3,               // Days until next weather event

  update(dt, currentDay, currentSeason) {
    this.duration -= dt / (30 * 7); // Convert seconds to game days

    if (this.duration <= 0) {
      this.nextChange -= dt / (30 * 7);
      if (this.nextChange <= 0) {
        this.trigger(currentSeason);
      } else {
        this.current = 'normal';
        this.intensity = 0;
      }
    }

    // Gradual intensity fade
    if (this.current !== 'normal') {
      const fadeIn = Math.min(1, 1 - this.duration / this.getDuration());
      this.intensity = Math.sin(fadeIn * Math.PI) * 0.8 + 0.2;
    }
  },

  trigger(season) {
    const roll = Math.random();
    // Season affects weather probability
    const rainChance = season === 0 ? 0.5 : season === 1 ? 0.3 : season === 2 ? 0.4 : 0.2;

    if (roll < rainChance) {
      this.current = 'rain';
      this.duration = 1 + Math.random() * 2; // 1-3 days
      this.intensity = 0.6 + Math.random() * 0.4;
    } else if (roll < rainChance + 0.25) {
      this.current = 'drought';
      this.duration = 2 + Math.random() * 3; // 2-5 days
      this.intensity = 0.5 + Math.random() * 0.5;
    } else {
      this.current = 'normal';
      this.intensity = 0;
    }

    this.nextChange = 3 + Math.random() * 4; // 3-7 days between events
  },

  getDuration() {
    return this.current === 'rain' ? 2 : this.current === 'drought' ? 3.5 : 0;
  },

  getGrowthMultiplier() {
    if (this.current === 'rain') return 1.2 + this.intensity * 0.3;
    if (this.current === 'drought') return 0.7 - this.intensity * 0.2;
    return 1.0;
  },

  getMoistureChange(dt, season) {
    // Rain increases moisture, drought decreases it
    if (this.current === 'rain') {
      return dt * 15 * this.intensity;
    }
    if (this.current === 'drought') {
      return -dt * 8 * this.intensity;
    }
    return 0;
  },

  getDisplayName() {
    const names = {
      rain: '降雨',
      drought: '干旱',
      normal: '晴朗',
    };
    return names[this.current] || '未知';
  },
};

/* ================= PEST SYSTEM ================= */
const PestSystem = {
  infestations: new Map(),     // tileKey -> { severity, duration, type }

  update(dt, plots, beasts) {
    const DAY_SECONDS = 30;
    const dtDays = dt / DAY_SECONDS;

    // Random infestation chance (0.5% per plot per day)
    for (const key in plots) {
      if (Math.random() < 0.005 * dtDays && !this.infestations.has(key)) {
        const type = Math.random() < 0.5 ? 'locust' : 'blight';
        this.infestations.set(key, {
          severity: 0.3 + Math.random() * 0.4,
          duration: 2 + Math.random() * 3, // 2-5 days
          type,
        });
      }
    }

    // Update existing infestations
    for (const [key, pest] of this.infestations.entries()) {
      pest.duration -= dtDays;

      // Severity increases over time if not treated
      pest.severity = Math.min(1, pest.severity + dtDays * 0.15);

      if (pest.duration <= 0) {
        this.infestations.delete(key);
      }
    }
  },

  treat(tileKey, method) {
    // method: 'pesticide' | 'beast'
    const pest = this.infestations.get(tileKey);
    if (!pest) return false;

    if (method === 'pesticide') {
      this.infestations.delete(tileKey);
      return { success: true, quality_penalty: 0.1 }; // Chemical residue
    } else if (method === 'beast') {
      this.infestations.delete(tileKey);
      return { success: true, quality_penalty: 0 }; // Natural solution
    }
    return { success: false };
  },

  getGrowthPenalty(tileKey) {
    const pest = this.infestations.get(tileKey);
    if (!pest) return 1.0;
    return 1 - pest.severity * 0.6; // Up to 60% slower growth
  },

  isInfested(tileKey) {
    return this.infestations.has(tileKey);
  },

  getSeverity(tileKey) {
    const pest = this.infestations.get(tileKey);
    return pest ? pest.severity : 0;
  },
};

/* ================= SOIL FERTILITY SYSTEM ================= */
const SoilSystem = {
  fallowPeriods: new Map(),    // tileKey -> days fallow
  lastHarvest: new Map(),      // tileKey -> day number

  update(dt, plots, currentDay) {
    const DAY_SECONDS = 30;
    const dtDays = dt / DAY_SECONDS;

    for (const key in plots) {
      const meta = plots[key];
      if (!meta.crop) {
        // Fallow restoration: +2 fertility per day when empty
        const current = this.fallowPeriods.get(key) || 0;
        this.fallowPeriods.set(key, current + dtDays);

        if (dtDays > 0) {
          meta.fert = Math.min(100, meta.fert + dtDays * 2);
        }
      } else {
        this.fallowPeriods.set(key, 0);
      }

      // Natural moisture change (evaporation)
      meta.moist = Math.max(0, meta.moist - dtDays * 3);
    }
  },

  onHarvest(tileKey, meta, cropType) {
    const crop = CROP_TYPES[cropType];
    meta.fert = Math.max(0, meta.fert - crop.fertConsume);
    this.lastHarvest.set(tileKey, Date.now());
  },

  applyFertilizer(tileKey, meta, amount = 30) {
    meta.fert = Math.min(100, meta.fert + amount);
    this.fallowPeriods.set(tileKey, 0);
  },

  irrigate(tileKey, meta, amount = 40) {
    meta.moist = Math.min(100, meta.moist + amount);
  },
};

/* ================= QUALITY CALCULATION ================= */
function calculateQuality(meta, cropType, pestTreated, weatherBonus) {
  const crop = CROP_TYPES[cropType];

  // Base factors
  let score = 0;

  // Fertility (40% weight)
  score += (meta.fert / 100) * 40;

  // Moisture (20% weight)
  const moistOptimal = crop.waterNeed;
  const moistDiff = Math.abs(meta.moist - moistOptimal);
  const moistScore = Math.max(0, 1 - moistDiff / 50);
  score += moistScore * 20;

  // Low pest (15% weight)
  const pestScore = 1 - (meta.pest / 100);
  score += pestScore * 15;

  // Mana/magic (15% weight)
  score += (meta.mana / 100) * 15;

  // Weather bonus (10% weight)
  score += weatherBonus * 10;

  // Penalties
  if (pestTreated === 'pesticide') {
    score -= 10; // Chemical penalty
  }

  // Determine grade
  score = Math.max(0, Math.min(100, score));

  let grade, multiplier, color;
  if (score >= 90) {
    grade = 'legendary'; multiplier = 2.5; color = 0xff6b35;
  } else if (score >= 75) {
    grade = 'excellent'; multiplier = 2.0; color = 0xd4af37;
  } else if (score >= 55) {
    grade = 'good'; multiplier = 1.5; color = 0x4ecdc4;
  } else if (score >= 35) {
    grade = 'common'; multiplier = 1.0; color = 0xaaaaaa;
  } else {
    grade = 'poor'; multiplier = 0.7; color = 0x8b7355;
  }

  return {
    grade,
    score: Math.round(score),
    multiplier,
    color,
    stats: {
      attack: Math.round(5 + score / 10),
      defense: Math.round(3 + score / 15),
      energy: Math.round(2 + score / 20),
    },
  };
}

/* ================= ENHANCED FARM STATE ================= */
const EnhancedFarmState = {
  plots: {},                   // tileKey -> enhanced meta
  planted: {},                 // tileKey -> crop instance
  currentDay: 0,
  currentSeason: 0,
  seeds: {
    starwheat: 5,
    goldcorn: 2,
    rubyberry: 1,
    magicroot: 0,
  },
  pesticides: 3,
  fertilizers: 2,

  init(tileMeta) {
    // Enhance existing tile metadata
    for (const key in tileMeta) {
      this.plots[key] = {
        ...tileMeta[key],
        crop: null,
        history: [],
      };
    }
  },

  update(dt, elapsed, timeScale) {
    const DAY_SECONDS = 30;
    const SEASON_DAYS = 7;
    const day = Math.floor(elapsed / DAY_SECONDS);
    const season = Math.floor((elapsed / DAY_SECONDS / SEASON_DAYS)) % 4;

    if (day !== this.currentDay) {
      this.currentDay = day;
    }
    if (season !== this.currentSeason) {
      this.currentSeason = season;
    }

    // Update systems
    WeatherSystem.update(dt, this.currentDay, season);
    PestSystem.update(dt, this.planted, []);
    SoilSystem.update(dt, this.plots, this.currentDay);

    // Update weather effects on moisture
    const moistChange = WeatherSystem.getMoistureChange(dt, season);
    for (const key in this.plots) {
      this.plots[key].moist = Math.max(0, Math.min(100,
        this.plots[key].moist + moistChange));
    }

    // Update crops
    for (const key in this.planted) {
      const crop = this.planted[key];
      const meta = this.plots[key];

      if (!crop.mature) {
        // Calculate growth rate
        let growthRate = 1.0;

        // Weather modifier
        growthRate *= WeatherSystem.getGrowthMultiplier();

        // Pest modifier
        growthRate *= PestSystem.getGrowthPenalty(key);

        // Water stress
        const cropData = CROP_TYPES[crop.type];
        const waterStress = Math.abs(meta.moist - cropData.waterNeed) / 50;
        growthRate *= Math.max(0.5, 1 - waterStress * 0.5);

        // Season preference
        if (cropData.seasons.includes(season)) {
          growthRate *= 1.2; // 20% bonus in preferred season
        } else {
          growthRate *= 0.8; // 20% penalty out of season
        }

        // Beast boost (from watering)
        if (crop.boost) {
          growthRate *= 1.8;
        }

        // Apply growth
        const targetGrowth = cropData.growDays * DAY_SECONDS;
        crop.grown = (crop.grown || 0) + dt * timeScale * growthRate;

        if (crop.grown >= targetGrowth) {
          crop.mature = true;
          crop.weatherBonus = WeatherSystem.current === 'rain' ? 0.8 : 0.5;
        }

        // Update visual
        const progress = Math.min(1, crop.grown / targetGrowth);
        if (crop.node) {
          crop.node.scale.set(0.32 + progress * 0.72);

          // Color shift during growth
          const baseColor = cropData.color;
          if (crop.mature) {
            crop.node._body.tint = 0xffe9b0; // Golden mature tint
          } else {
            crop.node._body.tint = baseColor;
          }

          // Pest visual indicator
          if (PestSystem.isInfested(key)) {
            const severity = PestSystem.getSeverity(key);
            crop.node.alpha = 0.6 + (1 - severity) * 0.4;
          } else {
            crop.node.alpha = 1.0;
          }
        }
      }
    }
  },

  canPlant(tileKey, cropType) {
    if (this.planted[tileKey]) return { ok: false, reason: '已有作物' };
    if (!this.plots[tileKey]) return { ok: false, reason: '非耕地' };
    if ((this.seeds[cropType] || 0) < 1) return { ok: false, reason: '种子不足' };

    return { ok: true };
  },

  plant(tileKey, cropType, createNode) {
    const check = this.canPlant(tileKey, cropType);
    if (!check.ok) return check;

    this.seeds[cropType]--;

    const node = createNode(cropType);
    const [tx, ty] = tileKey.split(',').map(Number);
    const TS = 64;
    node.x = tx * TS + TS / 2;
    node.y = ty * TS + TS / 2 + 16;

    this.planted[tileKey] = {
      type: cropType,
      node,
      grown: 0,
      mature: false,
      watered: false,
      boost: false,
      weatherBonus: 0,
      pestTreated: null,
    };

    return { ok: true, node };
  },

  harvest(tileKey, inventory) {
    const crop = this.planted[tileKey];
    if (!crop || !crop.mature) return { ok: false };

    const meta = this.plots[tileKey];
    const quality = calculateQuality(
      meta,
      crop.type,
      crop.pestTreated,
      crop.weatherBonus
    );

    // Add to inventory
    const cropData = CROP_TYPES[crop.type];
    const harvest = {
      type: crop.type,
      quality: quality.grade,
      score: quality.score,
      multiplier: quality.multiplier,
      stats: quality.stats,
      originFertility: meta.fert,
      timestamp: Date.now(),
    };

    if (!inventory.crops[crop.type]) {
      inventory.crops[crop.type] = [];
    }

    for (let i = 0; i < cropData.baseYield; i++) {
      inventory.crops[crop.type].push({ ...harvest });
    }

    // Update soil
    SoilSystem.onHarvest(tileKey, meta, crop.type);

    // Cleanup
    if (crop.node && crop.node.parent) {
      crop.node.parent.removeChild(crop.node);
    }
    delete this.planted[tileKey];

    return {
      ok: true,
      harvest,
      yield: cropData.baseYield,
    };
  },

  treatPest(tileKey, method) {
    if (!PestSystem.isInfested(tileKey)) return { ok: false, reason: '无虫害' };

    if (method === 'pesticide') {
      if (this.pesticides < 1) return { ok: false, reason: '农药不足' };
      this.pesticides--;
    }

    const result = PestSystem.treat(tileKey, method);

    if (result.success && this.planted[tileKey]) {
      this.planted[tileKey].pestTreated = method;
    }

    return { ok: true, ...result };
  },

  fertilize(tileKey) {
    if (this.fertilizers < 1) return { ok: false, reason: '肥料不足' };

    const meta = this.plots[tileKey];
    if (!meta) return { ok: false, reason: '非耕地' };

    this.fertilizers--;
    SoilSystem.applyFertilizer(tileKey, meta, 30);

    return { ok: true };
  },

  getStatus(tileKey) {
    const meta = this.plots[tileKey];
    const crop = this.planted[tileKey];
    const infested = PestSystem.isInfested(tileKey);

    return {
      meta,
      crop,
      infested,
      pestSeverity: PestSystem.getSeverity(tileKey),
      weather: WeatherSystem.current,
      weatherIntensity: WeatherSystem.intensity,
    };
  },
};

/* ================= INTEGRATION HELPERS ================= */
function integrateWithMainGame(Terra, objL, overlayL, crops) {
  // Initialize enhanced system with existing tileMeta
  EnhancedFarmState.init(Terra.tileMeta || {});

  // Override plant function
  Terra.plantCrop = function(tileKey, cropType) {
    const result = EnhancedFarmState.plant(tileKey, cropType, (type) => {
      const cropData = CROP_TYPES[type];
      const node = makeNode('crop'); // Use existing makeNode
      node._shadow.visible = false;
      node.scale.set(0.32);
      overlayL.addChild(node);
      crops.push(node);
      return node;
    });

    if (result.ok) {
      Terra.save();
    }

    return result;
  };

  // Override harvest function
  Terra.harvestCrop = function(tileKey) {
    const result = EnhancedFarmState.harvest(tileKey, Terra.farm.inventory);

    if (result.ok) {
      const ci = crops.indexOf(result.harvest.node);
      if (ci >= 0) crops.splice(ci, 1);
      Terra.save();
    }

    return result;
  };

  // Add to main loop
  return {
    update(dt, elapsed, timeScale) {
      EnhancedFarmState.update(dt, elapsed, timeScale);
    },

    getWeather() {
      return {
        type: WeatherSystem.current,
        name: WeatherSystem.getDisplayName(),
        intensity: WeatherSystem.intensity,
      };
    },

    treatPest(tileKey, method) {
      return EnhancedFarmState.treatPest(tileKey, method);
    },

    fertilize(tileKey) {
      return EnhancedFarmState.fertilize(tileKey);
    },

    getStatus(tileKey) {
      return EnhancedFarmState.getStatus(tileKey);
    },
  };
}

/* ================= EXPORT ================= */
if (typeof window !== 'undefined') {
  window.EnhancedFarming = {
    CROP_TYPES,
    WeatherSystem,
    PestSystem,
    SoilSystem,
    EnhancedFarmState,
    calculateQuality,
    integrateWithMainGame,
  };
}
