/* =========================================================
   Terra Chronicle — 灵兽捕获系统 (Beast Capture System)
   基于 PROJECT_VISION.md "200+ 种大地灵兽"设计
   ---------------------------------------------------------
   核心机制:
   1. 野外遭遇 — 特定生物群落(forest/river/mountain)生成野兽
   2. 削弱战斗 — 使用卡牌削弱(不能击杀),降低 HP
   3. 捕获判定 — HP<30% 可投掷魂晶,成功率基于 HP+稀有度
   4. 牧场存储 — 最多 20 槽位,可放生
   5. 性格特质 — 影响工作效率(勤勉/懒惰/专注/好奇等)
   ========================================================= */
'use strict';

/* ================= 1. 灵兽物种数据库 (200+ Species) ================= */
const BIOMES = {
  FOREST: 'forest',
  RIVER: 'river',
  MOUNTAIN: 'mountain',
  PLAINS: 'plains',
  SWAMP: 'swamp',
};

const RARITY = {
  COMMON: { tier: 'common', name: '普通', dropRate: 0.65, captureMod: 1.0 },
  UNCOMMON: { tier: 'uncommon', name: '罕见', dropRate: 0.25, captureMod: 0.8 },
  RARE: { tier: 'rare', name: '稀有', dropRate: 0.08, captureMod: 0.5 },
  EPIC: { tier: 'epic', name: '史诗', dropRate: 0.015, captureMod: 0.3 },
  LEGENDARY: { tier: 'legendary', name: '传说', dropRate: 0.005, captureMod: 0.15 },
};

const PERSONALITY_TRAITS = {
  diligent: { name: '勤勉', workEfficiency: 1.3, fatigueRate: 1.2 },
  lazy: { name: '懒惰', workEfficiency: 0.7, fatigueRate: 0.6 },
  focused: { name: '专注', workEfficiency: 1.15, errorRate: 0.5 },
  curious: { name: '好奇', workEfficiency: 0.9, discoveryBonus: 1.5 },
  stubborn: { name: '固执', workEfficiency: 1.0, loyaltyDecay: 0.3 },
  gentle: { name: '温顺', workEfficiency: 1.0, friendshipGain: 1.4 },
  aggressive: { name: '好斗', workEfficiency: 0.85, combatPower: 1.35 },
  timid: { name: '胆怯', workEfficiency: 0.95, combatPower: 0.7 },
};

// 灵兽物种模板 (前 20 种示例,完整版需扩展到 200+)
const BEAST_SPECIES = {
  // === 森林系 (Forest) ===
  woodland_sprite: {
    id: 'woodland_sprite', name: '林地精灵', element: 'earth',
    biome: BIOMES.FOREST, rarity: RARITY.COMMON,
    baseHP: 45, baseAtk: 12, baseDef: 8,
    abilities: ['催生', '树语'],
    workTypes: ['farming', 'gather_wood'],
    sprite: 'assets/sprites/beasts/woodland_sprite.png',
  },
  shadow_fox: {
    id: 'shadow_fox', name: '影狐', element: 'dark',
    biome: BIOMES.FOREST, rarity: RARITY.UNCOMMON,
    baseHP: 38, baseAtk: 18, baseDef: 6,
    abilities: ['暗影遁', '夜视'],
    workTypes: ['scout', 'night_guard'],
    sprite: 'assets/sprites/beasts/shadow_fox.png',
  },
  ancient_oak_spirit: {
    id: 'ancient_oak_spirit', name: '古橡树灵', element: 'earth',
    biome: BIOMES.FOREST, rarity: RARITY.RARE,
    baseHP: 95, baseAtk: 8, baseDef: 22,
    abilities: ['根系网络', '季节祝福'],
    workTypes: ['farming', 'climate_control'],
    sprite: 'assets/sprites/beasts/ancient_oak_spirit.png',
  },

  // === 河流系 (River) ===
  river_turtle: {
    id: 'river_turtle', name: '河流龟', element: 'water',
    biome: BIOMES.RIVER, rarity: RARITY.COMMON,
    baseHP: 68, baseAtk: 6, baseDef: 18,
    abilities: ['缓流', '水净化'],
    workTypes: ['irrigate', 'fish'],
    sprite: 'assets/sprites/beasts/river_turtle.png',
  },
  mist_serpent: {
    id: 'mist_serpent', name: '雾蛇', element: 'water',
    biome: BIOMES.RIVER, rarity: RARITY.UNCOMMON,
    baseHP: 52, baseAtk: 15, baseDef: 10,
    abilities: ['雾化', '毒液'],
    workTypes: ['irrigate', 'pest_control'],
    sprite: 'assets/sprites/beasts/mist_serpent.png',
  },
  azure_dragon: {
    id: 'azure_dragon', name: '青龙', element: 'water',
    biome: BIOMES.RIVER, rarity: RARITY.LEGENDARY,
    baseHP: 180, baseAtk: 35, baseDef: 28,
    abilities: ['呼风唤雨', '洪流', '龙威'],
    workTypes: ['irrigate', 'climate_control', 'combat'],
    sprite: 'assets/sprites/beasts/azure_dragon.png',
  },

  // === 山脉系 (Mountain) ===
  cliff_eagle: {
    id: 'cliff_eagle', name: '峭壁鹰', element: 'wind',
    biome: BIOMES.MOUNTAIN, rarity: RARITY.COMMON,
    baseHP: 40, baseAtk: 16, baseDef: 5,
    abilities: ['俯冲', '鹰眼'],
    workTypes: ['scout', 'courier'],
    sprite: 'assets/sprites/beasts/cliff_eagle.png',
  },
  stone_golem: {
    id: 'stone_golem', name: '石魔像', element: 'earth',
    biome: BIOMES.MOUNTAIN, rarity: RARITY.UNCOMMON,
    baseHP: 110, baseAtk: 14, baseDef: 25,
    abilities: ['岩肤', '地震'],
    workTypes: ['mining', 'construction'],
    sprite: 'assets/sprites/beasts/stone_golem.png',
  },
  thunder_wyvern: {
    id: 'thunder_wyvern', name: '雷霆双足飞龙', element: 'lightning',
    biome: BIOMES.MOUNTAIN, rarity: RARITY.EPIC,
    baseHP: 125, baseAtk: 42, baseDef: 18,
    abilities: ['雷击', '风暴召唤', '飞行'],
    workTypes: ['combat', 'power_generation'],
    sprite: 'assets/sprites/beasts/thunder_wyvern.png',
  },

  // === 平原系 (Plains) ===
  prairie_wolf: {
    id: 'prairie_wolf', name: '草原狼', element: 'earth',
    biome: BIOMES.PLAINS, rarity: RARITY.COMMON,
    baseHP: 48, baseAtk: 14, baseDef: 7,
    abilities: ['群猎', '嚎叫'],
    workTypes: ['herd', 'guard'],
    sprite: 'assets/sprites/beasts/prairie_wolf.png',
  },
  golden_antelope: {
    id: 'golden_antelope', name: '金羚', element: 'light',
    biome: BIOMES.PLAINS, rarity: RARITY.RARE,
    baseHP: 55, baseAtk: 10, baseDef: 12,
    abilities: ['祝福之蹄', '神速'],
    workTypes: ['farming', 'courier'],
    sprite: 'assets/sprites/beasts/golden_antelope.png',
  },

  // === 沼泽系 (Swamp) ===
  bog_toad: {
    id: 'bog_toad', name: '沼蟾', element: 'poison',
    biome: BIOMES.SWAMP, rarity: RARITY.COMMON,
    baseHP: 58, baseAtk: 8, baseDef: 11,
    abilities: ['毒液喷射', '沼泽融合'],
    workTypes: ['pest_control', 'alchemy'],
    sprite: 'assets/sprites/beasts/bog_toad.png',
  },
  swamp_wraith: {
    id: 'swamp_wraith', name: '沼泽幽魂', element: 'dark',
    biome: BIOMES.SWAMP, rarity: RARITY.EPIC,
    baseHP: 72, baseAtk: 28, baseDef: 8,
    abilities: ['灵魂汲取', '诅咒', '虚化'],
    workTypes: ['combat', 'ritual'],
    sprite: 'assets/sprites/beasts/swamp_wraith.png',
  },

  // 预留: 后续扩展到 200+ 种
};

/* ================= 2. 野外遭遇生成器 ================= */
const CaptureSystem = {

  /**
   * 根据地块生物群落生成野生灵兽遭遇
   * @param {object} plot - 地块数据 {x, y, biome}
   * @param {number} encounterRate - 遭遇率 (0-1)
   * @returns {object|null} 遭遇数据或 null
   */
  trySpawnEncounter(plot, encounterRate = 0.15) {
    if (Math.random() > encounterRate) return null;

    // 根据生物群落过滤可能出现的物种
    const availableSpecies = Object.values(BEAST_SPECIES).filter(
      s => s.biome === plot.biome
    );

    if (availableSpecies.length === 0) return null;

    // 稀有度加权随机
    const species = this._weightedRandomSpecies(availableSpecies);
    if (!species) return null;

    // 生成野生个体
    const wildBeast = this._createWildBeast(species, plot);

    return {
      type: 'wild_beast_encounter',
      beast: wildBeast,
      location: { x: plot.x, y: plot.y, biome: plot.biome },
      timestamp: Date.now(),
    };
  },

  /**
   * 稀有度加权随机选择
   */
  _weightedRandomSpecies(species) {
    const totalWeight = species.reduce((sum, s) => sum + s.rarity.dropRate, 0);
    let rand = Math.random() * totalWeight;

    for (const s of species) {
      rand -= s.rarity.dropRate;
      if (rand <= 0) return s;
    }

    return species[species.length - 1];
  },

  /**
   * 创建野生灵兽实例
   */
  _createWildBeast(species, plot) {
    // 随机性格特质
    const traitKeys = Object.keys(PERSONALITY_TRAITS);
    const personalityKey = traitKeys[Math.floor(Math.random() * traitKeys.length)];
    const personality = PERSONALITY_TRAITS[personalityKey];

    // 等级和属性随机波动 (±15%)
    const levelVariance = 0.85 + Math.random() * 0.3;

    return {
      id: 'wild_' + Date.now() + '_' + (Math.random() * 1e6 | 0),
      speciesId: species.id,
      name: species.name,
      element: species.element,
      rarity: species.rarity.tier,

      // 战斗属性
      maxHP: Math.round(species.baseHP * levelVariance),
      currentHP: Math.round(species.baseHP * levelVariance),
      atk: Math.round(species.baseAtk * levelVariance),
      def: Math.round(species.baseDef * levelVariance),

      // 性格与工作
      personality: { key: personalityKey, ...personality },
      workTypes: species.abilities,
      abilities: species.abilities,

      // 捕获状态
      isWild: true,
      captureResistance: species.rarity.captureMod,

      // 视觉
      sprite: species.sprite,

      // 元数据
      discoveredAt: { x: plot.x, y: plot.y, biome: plot.biome },
      level: 1,
    };
  },

  /* ================= 3. 捕获战斗系统 ================= */

  /**
   * 开始捕获战斗 (削弱战斗,不能击杀)
   * @param {object} encounter - 遭遇数据
   * @param {object} playerDeck - 玩家卡组
   * @returns {object} 战斗初始化数据
   */
  startCaptureBattle(encounter, playerDeck) {
    const beast = encounter.beast;

    return {
      mode: 'capture',
      objective: 'weaken',
      beast: { ...beast },
      player: {
        hp: 80,
        maxHP: 80,
        deck: playerDeck,
        soulCrystals: this._getSoulCrystalCount(),
      },
      rules: {
        cannotKill: true,        // 击杀视为捕获失败
        captureThreshold: 0.3,   // HP < 30% 可捕获
        turnLimit: 20,           // 20 回合后逃跑
      },
      state: 'battle',
    };
  },

  /**
   * 计算捕获成功率
   * @param {object} beast - 野兽数据
   * @param {string} crystalTier - 魂晶等级 (basic/advanced/perfect)
   * @returns {number} 成功率 (0-1)
   */
  calculateCaptureRate(beast, crystalTier = 'basic') {
    const hpRatio = beast.currentHP / beast.maxHP;

    // 基础公式: 成功率 = (1 - HP%) * 稀有度修正 * 魂晶加成
    const crystalBonus = {
      basic: 1.0,
      advanced: 1.5,
      perfect: 2.5,
    }[crystalTier] || 1.0;

    let baseRate = (1 - hpRatio) * beast.captureResistance * crystalBonus;

    // HP 阈值检查
    if (hpRatio > 0.3) {
      baseRate *= 0.3; // 严重惩罚
    }

    // 确保在 5%-98% 之间
    return Math.max(0.05, Math.min(0.98, baseRate));
  },

  /**
   * 尝试捕获
   * @param {object} beast - 野兽数据
   * @param {string} crystalTier - 魂晶等级
   * @returns {object} 捕获结果 {success: boolean, rate: number, message: string}
   */
  attemptCapture(beast, crystalTier = 'basic') {
    const hpRatio = beast.currentHP / beast.maxHP;

    // 阈值检查
    if (hpRatio > 0.3) {
      return {
        success: false,
        rate: 0,
        message: `${beast.name} 的生命力过于旺盛！(HP > 30%)`,
        shakeCount: 0,
      };
    }

    const captureRate = this.calculateCaptureRate(beast, crystalTier);
    const roll = Math.random();
    const success = roll < captureRate;

    // 摇晃次数模拟 (1-4次)
    const shakeCount = success ? 4 : Math.min(3, Math.floor(captureRate * 5));

    return {
      success,
      rate: +(captureRate * 100).toFixed(1),
      roll: +(roll * 100).toFixed(1),
      message: success
        ? `捕获成功！${beast.name} 加入了你的牧场！`
        : `${beast.name} 挣脱了魂晶！(${shakeCount}/4 次摇晃)`,
      shakeCount,
      beast: success ? this._convertToTamed(beast) : null,
    };
  },

  /**
   * 将野生灵兽转换为驯服状态
   */
  _convertToTamed(wildBeast) {
    const tamed = { ...wildBeast };
    delete tamed.isWild;
    delete tamed.captureResistance;

    tamed.friendship = 30;       // 初始友好度
    tamed.loyalty = 50;          // 忠诚度
    tamed.stamina = 100;         // 体力
    tamed.experience = 0;        // 经验值
    tamed.assignment = null;     // 当前工作分配
    tamed.capturedAt = Date.now();

    return tamed;
  },

  /**
   * 获取魂晶数量 (从 state.js 背包读取)
   */
  _getSoulCrystalCount() {
    if (window.Terra && window.Terra.farm) {
      const inv = window.Terra.farm.inventory.materials || {};
      return {
        basic: inv.soul_crystal_basic || 0,
        advanced: inv.soul_crystal_advanced || 0,
        perfect: inv.soul_crystal_perfect || 0,
      };
    }
    return { basic: 3, advanced: 0, perfect: 0 }; // 默认值
  },

  /* ================= 4. 牧场 (Ranch) 系统 ================= */

  RANCH_MAX_SLOTS: 20,

  /**
   * 获取牧场状态
   * @param {object} farm - 私有农场数据
   * @returns {object} 牧场状态
   */
  getRanchStatus(farm) {
    const beasts = farm.beasts || [];
    return {
      beasts,
      capacity: this.RANCH_MAX_SLOTS,
      occupied: beasts.length,
      available: this.RANCH_MAX_SLOTS - beasts.length,
      workingBeasts: beasts.filter(b => b.assignment).length,
      restingBeasts: beasts.filter(b => !b.assignment).length,
    };
  },

  /**
   * 添加灵兽到牧场
   * @param {object} farm - 私有农场数据
   * @param {object} beast - 灵兽数据
   * @returns {object} {ok: boolean, reason?: string}
   */
  addBeastToRanch(farm, beast) {
    if (!farm.beasts) farm.beasts = [];

    if (farm.beasts.length >= this.RANCH_MAX_SLOTS) {
      return {
        ok: false,
        reason: `牧场已满！(${this.RANCH_MAX_SLOTS}/${this.RANCH_MAX_SLOTS})`
      };
    }

    farm.beasts.push(beast);
    return { ok: true, beast };
  },

  /**
   * 放生灵兽
   * @param {object} farm - 私有农场数据
   * @param {string} beastId - 灵兽 ID
   * @returns {object} {ok: boolean, beast?: object}
   */
  releaseBeast(farm, beastId) {
    if (!farm.beasts) return { ok: false, reason: 'no_ranch' };

    const index = farm.beasts.findIndex(b => b.id === beastId);
    if (index === -1) return { ok: false, reason: 'beast_not_found' };

    const beast = farm.beasts[index];

    // 检查是否正在工作
    if (beast.assignment) {
      return {
        ok: false,
        reason: `${beast.name} 正在工作中，无法放生！`
      };
    }

    farm.beasts.splice(index, 1);
    return { ok: true, beast };
  },

  /**
   * 分配工作
   * @param {object} farm - 私有农场数据
   * @param {string} beastId - 灵兽 ID
   * @param {string} workType - 工作类型
   * @returns {object} {ok: boolean}
   */
  assignWork(farm, beastId, workType) {
    const beast = farm.beasts?.find(b => b.id === beastId);
    if (!beast) return { ok: false, reason: 'beast_not_found' };

    // 检查体力
    if (beast.stamina < 20) {
      return { ok: false, reason: '体力不足！需要休息。' };
    }

    // 检查是否支持该工作类型
    const species = BEAST_SPECIES[beast.speciesId];
    if (!species.workTypes.includes(workType)) {
      return {
        ok: false,
        reason: `${beast.name} 不擅长 ${workType} 工作！`
      };
    }

    beast.assignment = workType;
    beast.assignedAt = Date.now();

    return { ok: true, beast };
  },

  /**
   * 解除工作分配
   */
  unassignWork(farm, beastId) {
    const beast = farm.beasts?.find(b => b.id === beastId);
    if (!beast) return { ok: false, reason: 'beast_not_found' };

    beast.assignment = null;
    beast.assignedAt = null;

    return { ok: true, beast };
  },

  /**
   * 更新灵兽状态 (每帧/每日调用)
   * @param {object} beast - 灵兽数据
   * @param {number} deltaTime - 时间增量 (秒)
   */
  updateBeast(beast, deltaTime) {
    if (!beast.assignment) {
      // 休息时恢复体力
      beast.stamina = Math.min(100, beast.stamina + deltaTime * 2);
    } else {
      // 工作消耗体力
      const fatigueRate = beast.personality.fatigueRate || 1.0;
      beast.stamina = Math.max(0, beast.stamina - deltaTime * 0.5 * fatigueRate);

      // 体力耗尽自动停工
      if (beast.stamina <= 0) {
        beast.assignment = null;
        beast.assignedAt = null;
      }
    }
  },

  /* ================= 5. 工具函数 ================= */

  /**
   * 获取物种数据
   */
  getSpecies(speciesId) {
    return BEAST_SPECIES[speciesId] || null;
  },

  /**
   * 获取所有物种列表
   */
  getAllSpecies() {
    return Object.values(BEAST_SPECIES);
  },

  /**
   * 按生物群落过滤物种
   */
  getSpeciesByBiome(biome) {
    return Object.values(BEAST_SPECIES).filter(s => s.biome === biome);
  },

  /**
   * 按稀有度过滤物种
   */
  getSpeciesByRarity(rarityTier) {
    return Object.values(BEAST_SPECIES).filter(
      s => s.rarity.tier === rarityTier
    );
  },

  /**
   * 获取性格特质列表
   */
  getAllPersonalities() {
    return PERSONALITY_TRAITS;
  },

  /**
   * 生成随机性格
   */
  randomPersonality() {
    const keys = Object.keys(PERSONALITY_TRAITS);
    const key = keys[Math.floor(Math.random() * keys.length)];
    return { key, ...PERSONALITY_TRAITS[key] };
  },
};

/* ================= 6. 导出到全局 ================= */
if (typeof window !== 'undefined') {
  window.CaptureSystem = CaptureSystem;
  window.BEAST_SPECIES = BEAST_SPECIES;
  window.PERSONALITY_TRAITS = PERSONALITY_TRAITS;
  window.BIOMES = BIOMES;
  window.RARITY = RARITY;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CaptureSystem,
    BEAST_SPECIES,
    PERSONALITY_TRAITS,
    BIOMES,
    RARITY,
  };
}
