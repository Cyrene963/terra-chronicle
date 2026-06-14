/* =========================================================
   Terra Chronicle — 多路径灵兽进化系统 (Multi-Path Beast Evolution)
   ---------------------------------------------------------
   设计:
   1. 每只灵兽有 3 条进化分支: 战斗系/工作系/混合系
   2. 进化点获取: 战斗 → 战斗系, 农务 → 工作系, 平衡活动 → 混合系
   3. 进化树 UI 显示 3 条路径与不同终极形态
   4. 每条路径解锁独特能力: 战斗技/农务加成/通用性
   5. 稀有道具重置进化 (每兽一次)
   ========================================================= */
'use strict';

/* ================= 进化分支定义 ================= */
const EVOLUTION_PATHS = {
  COMBAT: 'combat',      // 战斗系 — 战斗技能强化
  WORK: 'work',          // 工作系 — 农务效率提升
  HYBRID: 'hybrid',      // 混合系 — 平衡发展，通用性强
};

/* ================= 进化点类型 ================= */
const EVO_POINT_TYPES = {
  COMBAT: 'combat_exp',   // 战斗经验
  WORK: 'work_exp',       // 工作经验
  HYBRID: 'hybrid_exp',   // 平衡经验
};

/* ================= 进化阶段配置 ================= */
const EVOLUTION_STAGES = {
  BASE: { stage: 0, name: '初始形态', minPoints: 0 },
  STAGE_1: { stage: 1, name: '初级进化', minPoints: 100 },
  STAGE_2: { stage: 2, name: '中级进化', minPoints: 300 },
  FINAL: { stage: 3, name: '终极形态', minPoints: 600 },
};

/* ================= 进化树模板数据库 ================= */
// 每个物种的 3 条进化路径配置
const SPECIES_EVOLUTION_TREES = {
  woodland_sprite: {
    species: 'woodland_sprite',
    baseName: '林地精灵',
    paths: {
      combat: {
        name: '战斗路径',
        stages: [
          { stage: 0, form: '林地精灵', desc: '初始形态', skills: [] },
          { stage: 1, form: '荆棘卫士', desc: '获得荆棘反击能力', skills: ['荆棘反击'], statBonus: { atk: 8, def: 5 } },
          { stage: 2, form: '森林战将', desc: '掌握群体控制技能', skills: ['荆棘反击', '藤蔓束缚'], statBonus: { atk: 18, def: 12 } },
          { stage: 3, form: '自然复仇者', desc: '终极战斗形态', skills: ['荆棘反击', '藤蔓束缚', '自然之怒'], statBonus: { atk: 35, def: 25 } },
        ],
      },
      work: {
        name: '工作路径',
        stages: [
          { stage: 0, form: '林地精灵', desc: '初始形态', skills: [] },
          { stage: 1, form: '生长使者', desc: '农作物生长速度 +20%', skills: ['快速催生'], workBonus: { farming: 1.2 } },
          { stage: 2, form: '丰收祭司', desc: '作物产量 +30%，质量 +1 级', skills: ['快速催生', '丰收祝福'], workBonus: { farming: 1.5, yieldBonus: 1.3 } },
          { stage: 3, form: '大地之母化身', desc: '周围 3x3 地块自动灌溉施肥', skills: ['快速催生', '丰收祝福', '大地脉动'], workBonus: { farming: 2.0, areaEffect: 3 } },
        ],
      },
      hybrid: {
        name: '混合路径',
        stages: [
          { stage: 0, form: '林地精灵', desc: '初始形态', skills: [] },
          { stage: 1, form: '森林守护者', desc: '平衡发展，战斗与工作皆可', skills: ['守护光环'], statBonus: { atk: 5, def: 5 }, workBonus: { farming: 1.1 } },
          { stage: 2, form: '自然贤者', desc: '多功能全能型', skills: ['守护光环', '自然感知'], statBonus: { atk: 12, def: 12 }, workBonus: { farming: 1.3, all: 1.15 } },
          { stage: 3, form: '世界树精灵', desc: '完美融合，掌握所有技能', skills: ['守护光环', '自然感知', '世界树之力'], statBonus: { atk: 22, def: 22 }, workBonus: { farming: 1.6, all: 1.3 } },
        ],
      },
    },
  },

  shadow_fox: {
    species: 'shadow_fox',
    baseName: '影狐',
    paths: {
      combat: {
        name: '战斗路径',
        stages: [
          { stage: 0, form: '影狐', desc: '初始形态', skills: [] },
          { stage: 1, form: '暗影刺客', desc: '暴击率 +25%', skills: ['致命突袭'], statBonus: { atk: 12, critRate: 0.25 } },
          { stage: 2, form: '虚空猎手', desc: '多段攻击，连击系统', skills: ['致命突袭', '连环影袭'], statBonus: { atk: 28, critRate: 0.4 } },
          { stage: 3, form: '暗影主宰', desc: '瞬移攻击，无视防御', skills: ['致命突袭', '连环影袭', '虚空斩'], statBonus: { atk: 50, critRate: 0.6, ignoreDefRate: 0.3 } },
        ],
      },
      work: {
        name: '工作路径',
        stages: [
          { stage: 0, form: '影狐', desc: '初始形态', skills: [] },
          { stage: 1, form: '夜行侦察兵', desc: '侦查效率 +40%', skills: ['夜视强化'], workBonus: { scout: 1.4, night_guard: 1.3 } },
          { stage: 2, form: '暗夜情报官', desc: '发现稀有资源概率翻倍', skills: ['夜视强化', '宝物嗅觉'], workBonus: { scout: 1.8, discoveryRate: 2.0 } },
          { stage: 3, form: '影界行者', desc: '瞬移穿越障碍，无限探索', skills: ['夜视强化', '宝物嗅觉', '影界穿行'], workBonus: { scout: 2.5, courier: 2.0, unlockHiddenAreas: true } },
        ],
      },
      hybrid: {
        name: '混合路径',
        stages: [
          { stage: 0, form: '影狐', desc: '初始形态', skills: [] },
          { stage: 1, form: '暗影游侠', desc: '战斗与侦查双修', skills: ['影遁'], statBonus: { atk: 8 }, workBonus: { scout: 1.2 } },
          { stage: 2, form: '暗夜判官', desc: '夜间战斗力加成 50%', skills: ['影遁', '月影之力'], statBonus: { atk: 18, nightBonus: 1.5 }, workBonus: { scout: 1.5 } },
          { stage: 3, form: '影月神兽', desc: '黑夜无敌，白昼全能', skills: ['影遁', '月影之力', '昼夜主宰'], statBonus: { atk: 35, nightBonus: 2.0 }, workBonus: { scout: 2.0, all: 1.2 } },
        ],
      },
    },
  },

  river_turtle: {
    species: 'river_turtle',
    baseName: '河流龟',
    paths: {
      combat: {
        name: '战斗路径',
        stages: [
          { stage: 0, form: '河流龟', desc: '初始形态', skills: [] },
          { stage: 1, form: '铁甲巨龟', desc: '超高防御，受击反伤', skills: ['铁壁'], statBonus: { def: 15, reflectDamage: 0.2 } },
          { stage: 2, form: '龟灵战将', desc: '水之庇护，免疫控制', skills: ['铁壁', '水盾'], statBonus: { def: 35, hp: 50, controlImmune: true } },
          { stage: 3, form: '玄武神龟', desc: '不可摧毁的防御，群体护盾', skills: ['铁壁', '水盾', '玄武庇护'], statBonus: { def: 70, hp: 120, teamShield: true } },
        ],
      },
      work: {
        name: '工作路径',
        stages: [
          { stage: 0, form: '河流龟', desc: '初始形态', skills: [] },
          { stage: 1, form: '灌溉大师', desc: '灌溉效率 +50%', skills: ['精准灌溉'], workBonus: { irrigate: 1.5 } },
          { stage: 2, form: '水利工程师', desc: '自动灌溉系统，节省 30% 水资源', skills: ['精准灌溉', '水循环'], workBonus: { irrigate: 2.0, waterSave: 0.3 } },
          { stage: 3, form: '水脉之主', desc: '全农场自动灌溉，永不干旱', skills: ['精准灌溉', '水循环', '水脉贯通'], workBonus: { irrigate: 3.0, autoIrrigate: true } },
        ],
      },
      hybrid: {
        name: '混合路径',
        stages: [
          { stage: 0, form: '河流龟', desc: '初始形态', skills: [] },
          { stage: 1, form: '守护龟', desc: '耐久与辅助兼备', skills: ['守护之壳'], statBonus: { def: 10, hp: 20 }, workBonus: { irrigate: 1.2 } },
          { stage: 2, form: '水月龟仙', desc: '战场坦克与后勤保障', skills: ['守护之壳', '水月调和'], statBonus: { def: 25, hp: 60 }, workBonus: { irrigate: 1.6, fish: 1.4 } },
          { stage: 3, form: '长生龟神', desc: '无尽生命力，团队核心', skills: ['守护之壳', '水月调和', '长生诀'], statBonus: { def: 50, hp: 150, regen: 5 }, workBonus: { irrigate: 2.0, all: 1.3 } },
        ],
      },
    },
  },

  // 为其他物种添加默认模板（简化版）
  _default: {
    paths: {
      combat: {
        name: '战斗路径',
        stages: [
          { stage: 0, form: '基础形态', skills: [], statBonus: {} },
          { stage: 1, form: '战士', skills: ['强击'], statBonus: { atk: 10, def: 5 } },
          { stage: 2, form: '精英战士', skills: ['强击', '铁壁'], statBonus: { atk: 22, def: 15 } },
          { stage: 3, form: '战争领主', skills: ['强击', '铁壁', '战吼'], statBonus: { atk: 40, def: 30 } },
        ],
      },
      work: {
        name: '工作路径',
        stages: [
          { stage: 0, form: '基础形态', skills: [], workBonus: {} },
          { stage: 1, form: '学徒', skills: ['勤勉'], workBonus: { all: 1.2 } },
          { stage: 2, form: '专家', skills: ['勤勉', '精通'], workBonus: { all: 1.5 } },
          { stage: 3, form: '宗师', skills: ['勤勉', '精通', '大师之道'], workBonus: { all: 2.0 } },
        ],
      },
      hybrid: {
        name: '混合路径',
        stages: [
          { stage: 0, form: '基础形态', skills: [], statBonus: {}, workBonus: {} },
          { stage: 1, form: '全能者', skills: ['平衡'], statBonus: { atk: 6, def: 6 }, workBonus: { all: 1.15 } },
          { stage: 2, form: '贤者', skills: ['平衡', '智慧'], statBonus: { atk: 15, def: 15 }, workBonus: { all: 1.35 } },
          { stage: 3, form: '传奇', skills: ['平衡', '智慧', '完美'], statBonus: { atk: 28, def: 28 }, workBonus: { all: 1.6 } },
        ],
      },
    },
  },
};

/* ================= 核心进化系统类 ================= */
const EvolutionSystem = {
  /**
   * 初始化灵兽进化数据
   * @param {object} beast - 灵兽对象
   */
  initBeastEvolution(beast) {
    if (!beast.evolution) {
      beast.evolution = {
        path: null,                    // 当前进化路径 (null | 'combat' | 'work' | 'hybrid')
        stage: 0,                      // 当前进化阶段 (0-3)
        points: {
          combat_exp: 0,               // 战斗经验
          work_exp: 0,                 // 工作经验
          hybrid_exp: 0,               // 平衡经验
        },
        form: beast.name,              // 当前形态名称
        skills: [],                    // 已解锁技能列表
        canReset: true,                // 是否可重置（每兽一次）
        resetUsed: false,              // 是否已使用过重置
        history: [],                   // 进化历史记录
      };
    }
    return beast.evolution;
  },

  /**
   * 添加进化点
   * @param {object} beast - 灵兽对象
   * @param {string} type - 经验类型 ('combat_exp' | 'work_exp' | 'hybrid_exp')
   * @param {number} amount - 经验值
   */
  addEvolutionPoints(beast, type, amount) {
    const evo = this.initBeastEvolution(beast);

    if (!evo.points[type]) {
      evo.points[type] = 0;
    }

    evo.points[type] += amount;

    // 检查是否可以进化
    this.checkAutoEvolution(beast);

    return evo.points[type];
  },

  /**
   * 战斗后获得经验
   * @param {object} beast - 灵兽对象
   * @param {object} battleResult - 战斗结果 { victory: bool, damage: number, survived: bool }
   */
  gainCombatExp(beast, battleResult) {
    let exp = 0;

    if (battleResult.victory) exp += 30;
    if (battleResult.survived) exp += 10;
    exp += Math.floor(battleResult.damage / 10);

    // 混合路径也获得少量经验（如果有战斗参与）
    this.addEvolutionPoints(beast, 'combat_exp', exp);
    this.addEvolutionPoints(beast, 'hybrid_exp', Math.floor(exp * 0.3));

    return exp;
  },

  /**
   * 工作后获得经验
   * @param {object} beast - 灵兽对象
   * @param {object} workResult - 工作结果 { workType: string, duration: number, quality: number }
   */
  gainWorkExp(beast, workResult) {
    let exp = Math.floor(workResult.duration * 2); // 基础经验

    if (workResult.quality >= 0.8) exp *= 1.5;     // 高质量工作加成
    if (workResult.quality >= 0.95) exp *= 1.3;    // 完美工作额外加成

    exp = Math.floor(exp);

    // 混合路径也获得少量经验
    this.addEvolutionPoints(beast, 'work_exp', exp);
    this.addEvolutionPoints(beast, 'hybrid_exp', Math.floor(exp * 0.3));

    return exp;
  },

  /**
   * 选择进化路径（首次选择，不可更改除非重置）
   * @param {object} beast - 灵兽对象
   * @param {string} path - 路径 ('combat' | 'work' | 'hybrid')
   * @returns {object} - { success: bool, message: string }
   */
  choosePath(beast, path) {
    const evo = this.initBeastEvolution(beast);

    if (evo.path && !evo.resetUsed) {
      return { success: false, message: '已选择进化路径，需要【进化重置石】才能更改' };
    }

    if (!['combat', 'work', 'hybrid'].includes(path)) {
      return { success: false, message: '无效的进化路径' };
    }

    evo.path = path;
    evo.stage = 0;
    evo.history.push({ action: 'choose_path', path, timestamp: Date.now() });

    return { success: true, message: `选择了${this.getPathName(path)}路径` };
  },

  /**
   * 执行进化（消耗经验点，提升阶段）
   * @param {object} beast - 灵兽对象
   * @returns {object} - { success: bool, message: string, newStage?: number }
   */
  evolve(beast) {
    const evo = this.initBeastEvolution(beast);

    if (!evo.path) {
      return { success: false, message: '请先选择进化路径' };
    }

    const currentStage = evo.stage;
    const nextStage = currentStage + 1;

    if (nextStage > 3) {
      return { success: false, message: '已达到最高进化阶段' };
    }

    const requiredPoints = [0, 100, 300, 600][nextStage];
    const expType = `${evo.path}_exp`;
    const currentPoints = evo.points[expType] || 0;

    if (currentPoints < requiredPoints) {
      return {
        success: false,
        message: `进化点不足: ${currentPoints}/${requiredPoints}`,
        current: currentPoints,
        required: requiredPoints,
      };
    }

    // 执行进化
    evo.stage = nextStage;

    // 获取新形态数据
    const tree = this.getEvolutionTree(beast.species || beast.id);
    const pathData = tree.paths[evo.path];
    const stageData = pathData.stages[nextStage];

    evo.form = stageData.form;
    evo.skills = [...stageData.skills];

    // 应用属性加成
    this.applyStatBonus(beast, stageData);

    // 记录历史
    evo.history.push({
      action: 'evolve',
      stage: nextStage,
      form: stageData.form,
      timestamp: Date.now(),
    });

    return {
      success: true,
      message: `进化成功！${evo.form}`,
      newStage: nextStage,
      newForm: evo.form,
      skills: evo.skills,
    };
  },

  /**
   * 自动检查并提示可进化
   * @param {object} beast - 灵兽对象
   */
  checkAutoEvolution(beast) {
    const evo = this.initBeastEvolution(beast);

    if (!evo.path) return null;

    const nextStage = evo.stage + 1;
    if (nextStage > 3) return null;

    const requiredPoints = [0, 100, 300, 600][nextStage];
    const expType = `${evo.path}_exp`;
    const currentPoints = evo.points[expType] || 0;

    if (currentPoints >= requiredPoints) {
      return {
        canEvolve: true,
        nextStage,
        currentPoints,
        requiredPoints,
        beast: beast.name,
      };
    }

    return null;
  },

  /**
   * 应用进化阶段的属性加成
   * @param {object} beast - 灵兽对象
   * @param {object} stageData - 阶段数据
   */
  applyStatBonus(beast, stageData) {
    const bonus = stageData.statBonus || {};

    if (bonus.atk) beast.atk = (beast.base_atk || beast.baseAtk || 10) + bonus.atk;
    if (bonus.def) beast.def = (beast.base_def || beast.baseDef || 10) + bonus.def;
    if (bonus.hp) beast.hp = (beast.base_hp || beast.baseHP || 50) + bonus.hp;

    // 特殊属性
    beast.evolutionBonus = {
      critRate: bonus.critRate || 0,
      reflectDamage: bonus.reflectDamage || 0,
      ignoreDefRate: bonus.ignoreDefRate || 0,
      controlImmune: bonus.controlImmune || false,
      teamShield: bonus.teamShield || false,
      regen: bonus.regen || 0,
      nightBonus: bonus.nightBonus || 1.0,
    };

    // 工作加成
    const workBonus = stageData.workBonus || {};
    beast.workEfficiencyBonus = workBonus;
  },

  /**
   * 重置进化（消耗稀有道具）
   * @param {object} beast - 灵兽对象
   * @param {boolean} hasResetItem - 是否持有重置道具
   * @returns {object} - { success: bool, message: string }
   */
  resetEvolution(beast, hasResetItem = false) {
    const evo = this.initBeastEvolution(beast);

    if (!evo.canReset) {
      return { success: false, message: '该灵兽已使用过重置，无法再次重置' };
    }

    if (!hasResetItem) {
      return { success: false, message: '需要【进化重置石】才能重置进化' };
    }

    // 记录旧状态
    const oldPath = evo.path;
    const oldStage = evo.stage;
    const oldForm = evo.form;

    // 重置数据
    evo.path = null;
    evo.stage = 0;
    evo.form = beast.name;
    evo.skills = [];
    evo.resetUsed = true;
    evo.canReset = false;

    // 保留经验点（不清零）
    // evo.points 保持不变，玩家可以用于新路径

    // 移除属性加成（恢复基础值）
    beast.atk = beast.base_atk || beast.baseAtk || 10;
    beast.def = beast.base_def || beast.baseDef || 10;
    beast.hp = beast.base_hp || beast.baseHP || 50;
    beast.evolutionBonus = {};
    beast.workEfficiencyBonus = {};

    // 记录历史
    evo.history.push({
      action: 'reset',
      oldPath,
      oldStage,
      oldForm,
      timestamp: Date.now(),
    });

    return {
      success: true,
      message: `重置成功！${beast.name} 回到初始状态，经验点保留。`,
    };
  },

  /**
   * 获取灵兽进化树数据
   * @param {string} speciesId - 物种 ID
   * @returns {object} - 进化树配置
   */
  getEvolutionTree(speciesId) {
    return SPECIES_EVOLUTION_TREES[speciesId] || SPECIES_EVOLUTION_TREES._default;
  },

  /**
   * 获取路径中文名
   * @param {string} path - 路径标识
   * @returns {string}
   */
  getPathName(path) {
    const names = {
      combat: '战斗',
      work: '工作',
      hybrid: '混合',
    };
    return names[path] || path;
  },

  /**
   * 获取灵兽进化状态摘要
   * @param {object} beast - 灵兽对象
   * @returns {object} - 状态摘要
   */
  getEvolutionSummary(beast) {
    const evo = this.initBeastEvolution(beast);
    const tree = this.getEvolutionTree(beast.species || beast.id);

    const summary = {
      beast: beast.name,
      species: beast.species || beast.id,
      currentForm: evo.form,
      currentStage: evo.stage,
      chosenPath: evo.path,
      skills: evo.skills,
      points: evo.points,
      canReset: evo.canReset,
      resetUsed: evo.resetUsed,
      paths: {},
    };

    // 计算每条路径的进度
    for (const [pathKey, pathData] of Object.entries(tree.paths)) {
      const expType = `${pathKey}_exp`;
      const currentPoints = evo.points[expType] || 0;

      let nextStageIndex = 1;
      for (let i = 1; i <= 3; i++) {
        if (currentPoints >= [0, 100, 300, 600][i]) {
          nextStageIndex = i + 1;
        }
      }
      nextStageIndex = Math.min(nextStageIndex, 3);

      summary.paths[pathKey] = {
        name: pathData.name,
        currentPoints,
        nextStageRequirement: nextStageIndex <= 3 ? [0, 100, 300, 600][nextStageIndex] : null,
        canEvolveToStage: nextStageIndex <= 3 ? nextStageIndex : null,
        stages: pathData.stages,
      };
    }

    return summary;
  },

  /**
   * 计算工作效率加成
   * @param {object} beast - 灵兽对象
   * @param {string} workType - 工作类型
   * @returns {number} - 效率倍数
   */
  getWorkEfficiencyMultiplier(beast, workType) {
    if (!beast.workEfficiencyBonus) return 1.0;

    const bonus = beast.workEfficiencyBonus;

    // 特定工作类型加成
    if (bonus[workType]) {
      return bonus[workType];
    }

    // 全局工作加成
    if (bonus.all) {
      return bonus.all;
    }

    return 1.0;
  },

  /**
   * 获取战斗能力加成
   * @param {object} beast - 灵兽对象
   * @returns {object} - 战斗加成数据
   */
  getCombatBonus(beast) {
    return beast.evolutionBonus || {
      critRate: 0,
      reflectDamage: 0,
      ignoreDefRate: 0,
      controlImmune: false,
      teamShield: false,
      regen: 0,
      nightBonus: 1.0,
    };
  },
};

/* ================= UI 渲染模块 ================= */
const EvolutionTreeUI = {
  /**
   * 创建进化树 UI 容器
   * @param {object} beast - 灵兽对象
   * @param {HTMLElement} parentElement - 父容器
   */
  render(beast, parentElement) {
    const summary = EvolutionSystem.getEvolutionSummary(beast);

    const container = document.createElement('div');
    container.className = 'evolution-tree-ui';
    container.innerHTML = `
      <div class="evo-header">
        <h2>${summary.beast} 进化树</h2>
        <div class="evo-current-form">
          <span>当前形态:</span>
          <strong>${summary.currentForm}</strong>
          <span class="evo-stage">阶段 ${summary.currentStage}/3</span>
        </div>
        ${summary.skills.length > 0 ? `
          <div class="evo-skills">
            <span>已解锁技能:</span>
            ${summary.skills.map(s => `<span class="skill-badge">${s}</span>`).join('')}
          </div>
        ` : ''}
      </div>

      <div class="evo-paths">
        ${this.renderPath(beast, summary, 'combat')}
        ${this.renderPath(beast, summary, 'work')}
        ${this.renderPath(beast, summary, 'hybrid')}
      </div>

      ${summary.canReset ? `
        <div class="evo-reset">
          <button class="btn-reset" data-beast-id="${beast.id}">
            使用【进化重置石】重置进化 (仅限一次)
          </button>
        </div>
      ` : ''}
    `;

    parentElement.appendChild(container);
    this.attachEventHandlers(container, beast);
  },

  /**
   * 渲染单条路径
   */
  renderPath(beast, summary, pathKey) {
    const pathData = summary.paths[pathKey];
    const isChosen = summary.chosenPath === pathKey;
    const canChoose = !summary.chosenPath;

    let html = `
      <div class="evo-path ${isChosen ? 'chosen' : ''} ${canChoose ? 'can-choose' : ''}">
        <div class="path-header">
          <h3>${pathData.name}</h3>
          <div class="path-points">
            进化点: ${pathData.currentPoints}
            ${pathData.nextStageRequirement ? ` / ${pathData.nextStageRequirement}` : ''}
          </div>
        </div>

        ${canChoose ? `
          <button class="btn-choose-path" data-path="${pathKey}" data-beast-id="${beast.id}">
            选择此路径
          </button>
        ` : ''}

        <div class="path-stages">
    `;

    pathData.stages.forEach((stage, idx) => {
      const isUnlocked = isChosen && summary.currentStage >= idx;
      const canUnlock = isChosen && pathData.canEvolveToStage === idx;

      html += `
        <div class="stage ${isUnlocked ? 'unlocked' : ''} ${canUnlock ? 'can-unlock' : ''}">
          <div class="stage-number">阶段 ${idx}</div>
          <div class="stage-form">${stage.form}</div>
          <div class="stage-desc">${stage.desc}</div>

          ${stage.skills && stage.skills.length > 0 ? `
            <div class="stage-skills">
              ${stage.skills.map(s => `<span class="skill">${s}</span>`).join('')}
            </div>
          ` : ''}

          ${stage.statBonus ? `
            <div class="stage-bonus stat-bonus">
              ${stage.statBonus.atk ? `攻击+${stage.statBonus.atk} ` : ''}
              ${stage.statBonus.def ? `防御+${stage.statBonus.def} ` : ''}
              ${stage.statBonus.hp ? `生命+${stage.statBonus.hp} ` : ''}
            </div>
          ` : ''}

          ${stage.workBonus ? `
            <div class="stage-bonus work-bonus">
              ${stage.workBonus.farming ? `耕作效率×${stage.workBonus.farming} ` : ''}
              ${stage.workBonus.all ? `全工作×${stage.workBonus.all} ` : ''}
            </div>
          ` : ''}

          ${canUnlock ? `
            <button class="btn-evolve" data-beast-id="${beast.id}">
              进化！
            </button>
          ` : ''}
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    return html;
  },

  /**
   * 绑定事件处理器
   */
  attachEventHandlers(container, beast) {
    // 选择路径
    container.querySelectorAll('.btn-choose-path').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const path = e.target.dataset.path;
        const result = EvolutionSystem.choosePath(beast, path);
        alert(result.message);
        if (result.success) {
          this.refreshUI(container, beast);
        }
      });
    });

    // 执行进化
    container.querySelectorAll('.btn-evolve').forEach(btn => {
      btn.addEventListener('click', () => {
        const result = EvolutionSystem.evolve(beast);
        if (result.success) {
          alert(`🎉 ${result.message}\n解锁技能: ${result.skills.join(', ')}`);
          this.refreshUI(container, beast);
        } else {
          alert(result.message);
        }
      });
    });

    // 重置进化
    const resetBtn = container.querySelector('.btn-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('确定要使用【进化重置石】重置此灵兽的进化吗？\n此操作仅能使用一次，但经验点会保留。')) {
          // 这里需要检查玩家是否有重置道具
          const hasItem = this.checkResetItem();
          const result = EvolutionSystem.resetEvolution(beast, hasItem);
          alert(result.message);
          if (result.success) {
            this.refreshUI(container, beast);
          }
        }
      });
    }
  },

  /**
   * 刷新 UI
   */
  refreshUI(container, beast) {
    const parent = container.parentElement;
    container.remove();
    this.render(beast, parent);
  },

  /**
   * 检查玩家是否拥有重置道具（占位函数，需要与主游戏物品系统集成）
   */
  checkResetItem() {
    // TODO: 与主游戏的物品系统集成
    // 示例: return Terra.farm.inventory.materials['evolution_reset_stone'] > 0;
    return true; // 临时返回 true，方便测试
  },

  /**
   * 注入 CSS 样式
   */
  injectStyles() {
    if (document.getElementById('evolution-tree-styles')) return;

    const style = document.createElement('style');
    style.id = 'evolution-tree-styles';
    style.textContent = `
      .evolution-tree-ui {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        color: #f6f1e7;
        padding: 30px;
        border-radius: 12px;
        font-family: 'Noto Serif SC', serif;
        max-width: 1200px;
        margin: 20px auto;
      }

      .evo-header {
        text-align: center;
        margin-bottom: 30px;
        border-bottom: 2px solid rgba(246, 241, 231, 0.2);
        padding-bottom: 20px;
      }

      .evo-header h2 {
        font-size: 28px;
        margin-bottom: 15px;
        color: #ffd700;
      }

      .evo-current-form {
        font-size: 18px;
        margin: 10px 0;
      }

      .evo-current-form strong {
        color: #4ecdc4;
        font-size: 22px;
        margin: 0 10px;
      }

      .evo-stage {
        display: inline-block;
        background: rgba(255, 215, 0, 0.2);
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 14px;
        margin-left: 10px;
      }

      .evo-skills {
        margin-top: 15px;
      }

      .skill-badge {
        display: inline-block;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 6px 14px;
        border-radius: 16px;
        margin: 5px;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }

      .evo-paths {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 25px;
        margin: 30px 0;
      }

      .evo-path {
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        padding: 20px;
        transition: all 0.3s ease;
      }

      .evo-path.can-choose:hover {
        border-color: rgba(78, 205, 196, 0.6);
        box-shadow: 0 4px 20px rgba(78, 205, 196, 0.3);
      }

      .evo-path.chosen {
        border-color: #ffd700;
        background: rgba(255, 215, 0, 0.1);
        box-shadow: 0 4px 20px rgba(255, 215, 0, 0.2);
      }

      .path-header {
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        padding-bottom: 12px;
        margin-bottom: 15px;
      }

      .path-header h3 {
        font-size: 20px;
        margin-bottom: 8px;
        color: #4ecdc4;
      }

      .path-points {
        font-size: 14px;
        color: #ffd700;
      }

      .btn-choose-path {
        width: 100%;
        padding: 10px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        border-radius: 6px;
        color: white;
        font-size: 16px;
        cursor: pointer;
        margin-bottom: 15px;
        transition: transform 0.2s;
      }

      .btn-choose-path:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }

      .path-stages {
        display: flex;
        flex-direction: column;
        gap: 15px;
      }

      .stage {
        background: rgba(0, 0, 0, 0.3);
        padding: 15px;
        border-radius: 8px;
        border-left: 4px solid rgba(255, 255, 255, 0.2);
        transition: all 0.3s ease;
      }

      .stage.unlocked {
        border-left-color: #4ecdc4;
        background: rgba(78, 205, 196, 0.1);
      }

      .stage.can-unlock {
        border-left-color: #ffd700;
        animation: pulse 2s ease-in-out infinite;
      }

      @keyframes pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.4); }
        50% { box-shadow: 0 0 0 10px rgba(255, 215, 0, 0); }
      }

      .stage-number {
        font-size: 12px;
        color: #888;
        margin-bottom: 5px;
      }

      .stage-form {
        font-size: 18px;
        font-weight: bold;
        color: #ffd700;
        margin-bottom: 8px;
      }

      .stage-desc {
        font-size: 14px;
        color: #ccc;
        margin-bottom: 10px;
      }

      .stage-skills {
        margin: 10px 0;
      }

      .stage-skills .skill {
        display: inline-block;
        background: rgba(255, 255, 255, 0.1);
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 12px;
        margin: 3px;
      }

      .stage-bonus {
        font-size: 13px;
        margin: 8px 0;
        padding: 6px 10px;
        border-radius: 6px;
      }

      .stat-bonus {
        background: rgba(255, 99, 71, 0.2);
        color: #ff6347;
      }

      .work-bonus {
        background: rgba(144, 238, 144, 0.2);
        color: #90ee90;
      }

      .btn-evolve {
        width: 100%;
        padding: 8px;
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        border: none;
        border-radius: 6px;
        color: white;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        margin-top: 10px;
        transition: transform 0.2s;
      }

      .btn-evolve:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(240, 147, 251, 0.4);
      }

      .evo-reset {
        text-align: center;
        margin-top: 30px;
        padding-top: 20px;
        border-top: 2px solid rgba(246, 241, 231, 0.2);
      }

      .btn-reset {
        padding: 12px 30px;
        background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
        border: none;
        border-radius: 8px;
        color: #333;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: transform 0.2s;
      }

      .btn-reset:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(250, 112, 154, 0.4);
      }
    `;

    document.head.appendChild(style);
  },
};

// 自动注入样式
if (typeof document !== 'undefined') {
  EvolutionTreeUI.injectStyles();
}

/* ================= 导出模块 ================= */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    EvolutionSystem,
    EvolutionTreeUI,
    EVOLUTION_PATHS,
    EVO_POINT_TYPES,
    EVOLUTION_STAGES,
    SPECIES_EVOLUTION_TREES,
  };
}

// 全局挂载（浏览器环境）
if (typeof window !== 'undefined') {
  window.EvolutionSystem = EvolutionSystem;
  window.EvolutionTreeUI = EvolutionTreeUI;
  window.EVOLUTION_PATHS = EVOLUTION_PATHS;
  window.EVO_POINT_TYPES = EVO_POINT_TYPES;
}

/* ================= 使用示例 ================= */
/*
// 1. 初始化灵兽进化数据
const myBeast = {
  id: 'beast_001',
  species: 'woodland_sprite',
  name: '林地精灵',
  base_hp: 45,
  base_atk: 12,
  base_def: 8,
};

EvolutionSystem.initBeastEvolution(myBeast);

// 2. 战斗后获得经验
const battleResult = { victory: true, damage: 150, survived: true };
EvolutionSystem.gainCombatExp(myBeast, battleResult);

// 3. 工作后获得经验
const workResult = { workType: 'farming', duration: 120, quality: 0.95 };
EvolutionSystem.gainWorkExp(myBeast, workResult);

// 4. 选择进化路径
EvolutionSystem.choosePath(myBeast, 'work'); // 选择工作路径

// 5. 执行进化
const result = EvolutionSystem.evolve(myBeast);
console.log(result); // { success: true, message: '进化成功！生长使者', ... }

// 6. 查看进化状态
const summary = EvolutionSystem.getEvolutionSummary(myBeast);
console.log(summary);

// 7. 渲染进化树 UI
const container = document.getElementById('evolution-ui-container');
EvolutionTreeUI.render(myBeast, container);

// 8. 重置进化（需要道具）
EvolutionSystem.resetEvolution(myBeast, true);
*/

