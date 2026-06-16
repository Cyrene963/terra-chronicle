/* =========================================================
   Terra Chronicle — 扩展炼金配方库 (30+ Recipes)
   三大流派: 守势荆棘 / 丰收循环 / 河川净涤
   ========================================================= */

// 替换 alchemy.js 中的 RECIPES 数组

const RECIPES = [
  /* ================= 守势荆棘流派 (Thorn Defense) - 10 cards ================= */
  {
    starwheat: 3, wood: 2,
    recipeId: 'card_sprout_guard',
    archetype: 'thorn',
    effectText: '守势流派 · 格挡会蓄积荆棘反伤',
    result: { name: '新芽守卫', atk: 18, def: 26, elem: 'earth', special: 'thorn_stack' }
  },
  {
    starwheat: 0, wood: 4,
    recipeId: 'card_thorn_wall',
    archetype: 'thorn',
    effectText: '守势流派 · 造3层荆棘护甲',
    result: { name: '荆棘壁', atk: 12, def: 22, elem: 'earth', special: 'thorn_armor_3' }
  },
  {
    starwheat: 5, wood: 0, dewberry: 1,
    recipeId: 'card_rooted_fortress',
    archetype: 'thorn',
    effectText: '守势流派 · 每回合+2护甲,最多20',
    result: { name: '扎根要塞', atk: 8, def: 32, elem: 'earth', special: 'armor_grow' }
  },
  {
    starwheat: 2, wood: 3,
    recipeId: 'card_needle_rain',
    archetype: 'thorn',
    effectText: '守势流派 · 反弹50%受到的伤害',
    result: { name: '针雨反击', atk: 14, def: 18, elem: 'earth', special: 'reflect_50' }
  },
  {
    starwheat: 4, wood: 1, dewberry: 2,
    recipeId: 'card_ironbark_shield',
    archetype: 'thorn',
    effectText: '守势流派 · 免疫下次攻击',
    result: { name: '铁树盾', atk: 10, def: 28, elem: 'earth', special: 'immune_next' }
  },
  {
    starwheat: 6, wood: 2,
    recipeId: 'card_thorn_burst',
    archetype: 'thorn',
    effectText: '守势流派 · 消耗所有护甲,每层造成5伤害',
    result: { name: '荆棘爆发', atk: 25, def: 0, elem: 'earth', special: 'armor_to_dmg' }
  },
  {
    starwheat: 3, wood: 5,
    recipeId: 'card_bramble_maze',
    archetype: 'thorn',
    effectText: '守势流派 · 敌人攻击力-30%持续2回合',
    result: { name: '荆棘迷宫', atk: 16, def: 20, elem: 'earth', special: 'weaken_atk' }
  },
  {
    starwheat: 7, wood: 1,
    recipeId: 'card_earth_bulwark',
    archetype: 'thorn',
    effectText: '守势流派 · +15护甲,下回合+15护甲',
    result: { name: '大地壁垒', atk: 5, def: 38, elem: 'earth', special: 'delayed_armor' }
  },
  {
    starwheat: 4, wood: 4,
    recipeId: 'card_savage_thorn',
    archetype: 'thorn',
    effectText: '守势流派 · 每层护甲+2攻击',
    result: { name: '蛮荆', atk: 22, def: 16, elem: 'earth', special: 'armor_scale_atk' }
  },
  {
    starwheat: 8, wood: 3, dewberry: 1,
    recipeId: 'card_worldtree_bastion',
    archetype: 'thorn',
    effectText: '守势流派 · 传说荆棘终极 · 每3护甲反伤10',
    result: { name: '世界树堡垒', atk: 28, def: 42, elem: 'earth', special: 'ultimate_thorn', rarity: 'legendary' }
  },

  /* ================= 丰收循环流派 (Harvest Loop) - 10 cards ================= */
  {
    starwheat: 5, wood: 1,
    recipeId: 'card_harvest_sickle',
    archetype: 'harvest',
    effectText: '丰收流派 · 攻击后抽牌,高品质返还能量',
    result: { name: '收割镰', atk: 22, def: 8, elem: 'fire', special: 'draw_on_hit' }
  },
  {
    starwheat: 6, wood: 0,
    recipeId: 'card_golden_reap',
    archetype: 'harvest',
    effectText: '丰收流派 · 造成伤害等于手牌数×5',
    result: { name: '金色收割', atk: 28, def: 6, elem: 'fire', special: 'hand_scale_dmg' }
  },
  {
    starwheat: 4, dewberry: 3,
    recipeId: 'card_fertile_strike',
    archetype: 'harvest',
    effectText: '丰收流派 · 攻击后本回合+1能量',
    result: { name: '沃土一击', atk: 18, def: 10, elem: 'fire', special: 'energy_refund' }
  },
  {
    starwheat: 7, wood: 2,
    recipeId: 'card_scythe_dance',
    archetype: 'harvest',
    effectText: '丰收流派 · 连续攻击2次,每次递增伤害',
    result: { name: '镰刀之舞', atk: 15, def: 8, elem: 'fire', special: 'double_hit' }
  },
  {
    starwheat: 3, dewberry: 4,
    recipeId: 'card_bountiful_blessing',
    archetype: 'harvest',
    effectText: '丰收流派 · 抽3张牌,下回合+2能量',
    result: { name: '丰饶祝福', atk: 8, def: 12, heal: 15, elem: 'earth', special: 'mega_draw' }
  },
  {
    starwheat: 8, wood: 1,
    recipeId: 'card_autumn_harvest',
    archetype: 'harvest',
    effectText: '丰收流派 · 伤害×弃牌数',
    result: { name: '秋收', atk: 20, def: 5, elem: 'fire', special: 'discard_scale' }
  },
  {
    starwheat: 5, dewberry: 2, wood: 1,
    recipeId: 'card_seed_burst',
    archetype: 'harvest',
    effectText: '丰收流派 · 每次抽牌回复2 HP',
    result: { name: '种子爆发', atk: 14, def: 10, heal: 8, elem: 'earth', special: 'draw_heal' }
  },
  {
    starwheat: 6, wood: 3,
    recipeId: 'card_grain_storm',
    archetype: 'harvest',
    effectText: '丰收流派 · 对所有敌人造成伤害',
    result: { name: '谷粒风暴', atk: 24, def: 6, elem: 'fire', special: 'aoe' }
  },
  {
    starwheat: 4, dewberry: 5,
    recipeId: 'card_life_cycle',
    archetype: 'harvest',
    effectText: '丰收流派 · 回复=造成伤害',
    result: { name: '生命轮回', atk: 16, def: 12, heal: 16, elem: 'earth', special: 'lifesteal' }
  },
  {
    starwheat: 10, dewberry: 3, wood: 2,
    recipeId: 'card_eternal_spring',
    archetype: 'harvest',
    effectText: '丰收流派 · 传说终极 · 每回合抽2牌+1能量',
    result: { name: '永春', atk: 32, def: 18, heal: 20, elem: 'earth', special: 'ultimate_harvest', rarity: 'legendary' }
  },

  /* ================= 河川净涤流派 (River Purge) - 10 cards ================= */
  {
    dewberry: 3, wood: 1,
    recipeId: 'card_river_blessing',
    archetype: 'river',
    effectText: '河川流派 · 治疗会附带净涤(移除debuff)',
    result: { name: '河川祝福', atk: 8, def: 12, heal: 22, elem: 'water', special: 'cleanse' }
  },
  {
    dewberry: 5, wood: 0,
    recipeId: 'card_tidal_wave',
    archetype: 'river',
    effectText: '河川流派 · 攻击后回复伤害的50%',
    result: { name: '潮汐', atk: 20, def: 10, heal: 10, elem: 'water', special: 'lifesteal_50' }
  },
  {
    dewberry: 4, starwheat: 2,
    recipeId: 'card_purifying_rain',
    archetype: 'river',
    effectText: '河川流派 · 回复全队,移除所有负面状态',
    result: { name: '净涤之雨', atk: 5, def: 8, heal: 28, elem: 'water', special: 'aoe_cleanse' }
  },
  {
    dewberry: 6, wood: 2,
    recipeId: 'card_frost_shield',
    archetype: 'river',
    effectText: '河川流派 · +护甲,冻结敌人1回合',
    result: { name: '冰霜盾', atk: 10, def: 22, elem: 'water', special: 'freeze' }
  },
  {
    dewberry: 3, starwheat: 3,
    recipeId: 'card_stream_flow',
    archetype: 'river',
    effectText: '河川流派 · 攻击后手牌消耗-1',
    result: { name: '溪流', atk: 16, def: 14, elem: 'water', special: 'reduce_cost' }
  },
  {
    dewberry: 7, wood: 1,
    recipeId: 'card_whirlpool',
    archetype: 'river',
    effectText: '河川流派 · 将敌人攻击力转化为治疗',
    result: { name: '漩涡', atk: 12, def: 16, heal: 18, elem: 'water', special: 'atk_to_heal' }
  },
  {
    dewberry: 4, starwheat: 4,
    recipeId: 'card_mist_veil',
    archetype: 'river',
    effectText: '河川流派 · 50%闪避下次攻击',
    result: { name: '雾纱', atk: 14, def: 18, elem: 'water', special: 'evade_50' }
  },
  {
    dewberry: 5, wood: 3,
    recipeId: 'card_glacier_wall',
    archetype: 'river',
    effectText: '河川流派 · 敌人速度-50%持续3回合',
    result: { name: '冰川壁', atk: 8, def: 26, elem: 'water', special: 'slow' }
  },
  {
    dewberry: 6, starwheat: 2, wood: 1,
    recipeId: 'card_healing_current',
    archetype: 'river',
    effectText: '河川流派 · 每回合开始回复8 HP',
    result: { name: '治疗暗流', atk: 10, def: 14, heal: 24, elem: 'water', special: 'regen' }
  },
  {
    dewberry: 8, starwheat: 4, wood: 2,
    recipeId: 'card_azure_dragon_tide',
    archetype: 'river',
    effectText: '河川流派 · 传说终极 · 全体回复+冻结所有敌人',
    result: { name: '青龙潮汐', atk: 26, def: 30, heal: 35, elem: 'water', special: 'ultimate_river', rarity: 'legendary' }
  },

  /* ================= 通用/混合卡牌 (Universal) - 2 cards ================= */
  {
    starwheat: 2, dewberry: 2, wood: 2,
    recipeId: 'card_balanced_strike',
    archetype: 'balanced',
    effectText: '平衡流派 · 攻防治疗兼顾',
    result: { name: '均衡一击', atk: 16, def: 16, heal: 16, elem: 'earth', special: 'balanced' }
  },
  {
    starwheat: 1, dewberry: 1, wood: 1,
    recipeId: 'card_apprentice_spell',
    archetype: 'starter',
    effectText: '新手卡牌 · 消耗0能量',
    result: { name: '学徒法术', atk: 10, def: 8, elem: 'earth', special: 'free' }
  },
];

/* ================= 配方提示系统 ================= */

// 配方线索 (玩家通过游戏进度解锁)
const RECIPE_CLUES = {
  // 守势荆棘线索
  thorn_starter: {
    id: 'thorn_starter',
    unlockCondition: 'start',
    text: '古老的炼金笔记: "木质纤维与谷物结合,可锻造防护性质的卡牌..."',
    hint: '尝试 星麦×3 + 木材×2',
  },
  thorn_advanced: {
    id: 'thorn_advanced',
    unlockCondition: 'craft_thorn_3',
    text: '荆棘大师的备忘: "纯粹的木质能量,能凝结成坚不可摧的壁垒"',
    hint: '尝试 纯木材配方',
  },
  thorn_ultimate: {
    id: 'thorn_ultimate',
    unlockCondition: 'craft_thorn_8',
    text: '世界树的低语: "当谷物、木材与灵莓三者共鸣,终极防御将显现..."',
    hint: '需要 大量星麦 + 木材 + 露莓',
  },

  // 丰收循环线索
  harvest_starter: {
    id: 'harvest_starter',
    unlockCondition: 'harvest_crop_10',
    text: '农夫的日记: "五份成熟的星麦,加一根结实的木料,能锻造出攻击性武器"',
    hint: '尝试 星麦×5 + 木材×1',
  },
  harvest_advanced: {
    id: 'harvest_advanced',
    unlockCondition: 'craft_harvest_3',
    text: '收割者的秘传: "灵莓的甜美能量,能大幅强化生命循环类卡牌"',
    hint: '尝试 星麦 + 大量露莓',
  },
  harvest_ultimate: {
    id: 'harvest_ultimate',
    unlockCondition: 'craft_harvest_8',
    text: '春之女神的福音: "十份纯净星麦,辅以灵莓与木材,将召唤永恒之春"',
    hint: '需要 星麦×10 + 露莓×3 + 木材×2',
  },

  // 河川净涤线索
  river_starter: {
    id: 'river_starter',
    unlockCondition: 'irrigate_10',
    text: '水灵兽的教诲: "灵莓蕴含水之精华,三份灵莓配一根木料,可锻治疗卡牌"',
    hint: '尝试 露莓×3 + 木材×1',
  },
  river_advanced: {
    id: 'river_advanced',
    unlockCondition: 'craft_river_3',
    text: '河神的启示: "纯粹的灵莓能量,能释放最强大的治疗之力"',
    hint: '尝试 纯露莓配方',
  },
  river_ultimate: {
    id: 'river_ultimate',
    unlockCondition: 'craft_river_8',
    text: '青龙的传说: "当八份灵莓、四份星麦与两根木材共鸣,龙之潮汐将降临"',
    hint: '需要 露莓×8 + 星麦×4 + 木材×2',
  },
};

/* ================= 流派协同机制 ================= */

// 检测卡组流派协同
function checkArchetypeSynergy(deck) {
  const archetypes = { thorn: 0, harvest: 0, river: 0 };

  deck.forEach(card => {
    if (card.archetype && archetypes[card.archetype] !== undefined) {
      archetypes[card.archetype]++;
    }
  });

  const synergies = [];

  // 荆棘协同: 3张守势卡触发"荆棘风暴"被动
  if (archetypes.thorn >= 3) {
    synergies.push({
      name: '荆棘风暴',
      desc: '每次格挡额外反伤5点',
      bonus: { thornDamage: 5 },
    });
  }

  // 荆棘终极协同: 5张守势卡触发"铁壁要塞"
  if (archetypes.thorn >= 5) {
    synergies.push({
      name: '铁壁要塞',
      desc: '战斗开始获得20护甲',
      bonus: { startArmor: 20 },
    });
  }

  // 丰收协同: 3张丰收卡触发"黄金时代"
  if (archetypes.harvest >= 3) {
    synergies.push({
      name: '黄金时代',
      desc: '每回合开始额外抽1张牌',
      bonus: { drawPerTurn: 1 },
    });
  }

  // 丰收终极协同: 5张丰收卡触发"永恒丰收"
  if (archetypes.harvest >= 5) {
    synergies.push({
      name: '永恒丰收',
      desc: '每次抽牌获得1能量(每回合最多3次)',
      bonus: { drawEnergy: 1, drawEnergyMax: 3 },
    });
  }

  // 河川协同: 3张河川卡触发"流水不腐"
  if (archetypes.river >= 3) {
    synergies.push({
      name: '流水不腐',
      desc: '每回合开始回复5 HP',
      bonus: { regenPerTurn: 5 },
    });
  }

  // 河川终极协同: 5张河川卡触发"龙王庇护"
  if (archetypes.river >= 5) {
    synergies.push({
      name: '龙王庇护',
      desc: '受到致命伤害时,以1 HP存活并回复30 HP(每战斗1次)',
      bonus: { revive: true, reviveHeal: 30 },
    });
  }

  // 混合协同: 每个流派至少2张触发"三位一体"
  if (archetypes.thorn >= 2 && archetypes.harvest >= 2 && archetypes.river >= 2) {
    synergies.push({
      name: '三位一体',
      desc: '所有卡牌效果+25%',
      bonus: { globalBonus: 1.25 },
    });
  }

  return synergies;
}

/* ================= 材料稀有度系统 ================= */

// 扩展作物品质等级
const MATERIAL_RARITY = {
  common: { tier: 0, name: '普通', color: 0x9e9e9e, bonus: 1.0 },
  fine: { tier: 1, name: '良品', color: 0x4ecdc4, bonus: 1.15 },
  rare: { tier: 2, name: '珍品', color: 0x5ab9ff, bonus: 1.3 },
  epic: { tier: 3, name: '史诗', color: 0xc084fc, bonus: 1.5 },
  legendary: { tier: 4, name: '传说', color: 0xffa94d, bonus: 2.0 },
};

// 根据土壤品质决定材料稀有度
function getMaterialRarity(soilQuality) {
  if (soilQuality >= 100) return MATERIAL_RARITY.legendary;
  if (soilQuality >= 85) return MATERIAL_RARITY.epic;
  if (soilQuality >= 70) return MATERIAL_RARITY.rare;
  if (soilQuality >= 55) return MATERIAL_RARITY.fine;
  return MATERIAL_RARITY.common;
}

// 材料稀有度影响卡牌强度
function applyCraftingBonus(baseCard, materials) {
  const avgBonus = materials.reduce((sum, m) => sum + (m.rarity?.bonus || 1.0), 0) / materials.length;

  return {
    ...baseCard,
    atk: Math.round(baseCard.atk * avgBonus),
    def: Math.round(baseCard.def * avgBonus),
    heal: baseCard.heal ? Math.round(baseCard.heal * avgBonus) : undefined,
    craftBonus: avgBonus,
  };
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RECIPES,
    RECIPE_CLUES,
    MATERIAL_RARITY,
    checkArchetypeSynergy,
    getMaterialRarity,
    applyCraftingBonus,
  };
}
