/* =========================================================
   Terra Chronicle — 核心状态架构 v1
   双层世界 · 防脚本资源隔离 · 卡牌锻造经济
   ---------------------------------------------------------
   设计原则(对应策划案):
   1. PrivateFarm  = 玩家私有位面。基础资源(木/石/作物/灵兽)
      只存在于这里,脚本无法进入他人位面,公地悲剧被物理隔绝。
   2. PublicOverworld = 联机共享大陆。不刷新任何可挂机采集的
      基础资源;只刷新 StrategicNode(战略节点),其获取条件是
      卡牌战斗/解谜/多人协作 —— 无脑跑图脚本拿不到任何东西。
   3. 经营与战斗绑定: craftCard() 让卡牌强度直接继承土地质量。
   ---------------------------------------------------------
   存档: 全量状态可 JSON 序列化,单机存 localStorage,
   联机时同一份 schema 交由服务器权威化(见 docs/ 架构文档)。
   ========================================================= */
'use strict';

/* ================= 1. 私有农场(单机安全位面) ================= */
/**
 * 每个玩家一份,完全私有。联机时只同步"摘要"(声望/外观/政策),
 * 内部资源数值永不进入公共世界,从根上杜绝脚本掠夺。
 */
function createPrivateFarm(ownerId){
  return {
    ownerId,
    /** 地块: 经营的最小单元,所有系统读写同一向量(设计文档 §2.2) */
    plots: {},            // key:"x,y" → { fertility, moisture, pestLoad, manaCharge,
                          //               crop: null | { species, plantedDay, growth, quality } }
    /** 仓储: 基础资源只在私有位面流通 */
    inventory: {
      crops: {},          // species → [{ quality, originFertility }] 质量随产地土地继承
      materials: {},      // wood/stone/beastPart → count
      cards: [],          // 锻造产物(见 craftCard)
    },
    /** 私有灵兽: 同时是劳动力(assignment)与战斗单位(bondLevel 影响灵契卡) */
    beasts: [],           // { id, species, element, stamina, evolution:{diet:{}, laborHistory:{}},
                          //   assignment: null|'irrigate'|'mill'|'till'|'forge'|'combat' }
    /** 科技树: agriculture | military | magic 三线(条条大路皆可胜) */
    tech: { agriculture: 0, military: 0, magic: 0, unlockedRecipes: ['card_sprout_guard'] },
    stamina: 6, day: 1, lastSavedAt: null,
  };
}

/* ================= 2. 公共大世界(联机博弈层) ================= */
/**
 * 全服一份(服务器权威)。注意:这里没有 inventory、没有可采集
 * 的树/石/作物 —— 公共世界的"资源"全部是 StrategicNode。
 */
function createPublicOverworld(seasonEpoch){
  return {
    seasonEpoch,                       // 年代赛季编号(年代循环重置地图,保留个人档案)
    /** 流域: 外交与气候外溢的结算单元(设计文档 §5) */
    watersheds: {},                    // id → { memberIds, policies:[], climateModifiers:{} }
    /** 战略节点: 联机世界唯一的"资源点",全部防脚本 */
    strategicNodes: [],                // 见 spawnStrategicNode
    /** 季节事件: 春拍卖/夏天梯/秋丰收/冬虚空潮汐 */
    seasonEvent: null,
    /** 历史档案: 玩家集体决策写入,影响下一年代的世界基设 */
    chronicle: [],                     // { epoch, entry, votedBy }
  };
}

/**
 * 战略节点工厂 —— 防脚本的三道闸门:
 *  gate.type='combat'  必须用卡组打赢守卫(脚本无法应对构筑对策)
 *  gate.type='riddle'  环境解谜,答案每次随机生成
 *  gate.type='ritual'  多人合力:需要 partySize 名玩家携带指定元素灵兽同时在场
 * 奖励是"战略级"而非"基础级":配方/稀有材料/限时增益,数量有限全服竞争。
 */
function spawnStrategicNode(kind, pos, seasonDay){
  const gates = {
    ancient_mana_well: { type:'combat', deckPowerFloor: 320 },
    world_boss_spawn:  { type:'ritual', partySize: 4, elements:['water','earth','wind','fire'] },
    wandering_trader:  { type:'riddle', puzzleSeed: Math.random()*1e9|0, expiresOnDay: seasonDay+2 },
  };
  return { id:'node_'+(Math.random()*1e9|0), kind, pos,
           gate: gates[kind], claimedBy: null,
           reward: { kind:'recipe|rareMaterial|seasonBuff', tier:'strategic' } };
}

/* ================= 3. 卡牌锻造(经营→战斗的焊点) ================= */
/** 配方表: 卡牌不是掉落的,是配方+材料+工艺锻出来的 */
const RECIPES = {
  card_sprout_guard: {
    name: '新芽守卫', element: 'earth', baseAtk: 18, baseDef: 26,
    needs: { crops: { starwheat: 3 }, materials: { wood: 2 } },
  },
  card_river_blessing: {
    name: '河川祝福', element: 'water', baseAtk: 8, baseDef: 12, heal: 22,
    needs: { crops: { dewberry: 4 }, materials: { beastPart_water: 1 } },
  },
};

/**
 * 核心函数: 锻造一张卡。
 * 强度公式(设计文档 §2.4「卡牌上限=土地质量的函数」):
 *   qualityFactor = 消耗作物的平均产地肥力 / 100      → 0.40 ~ 0.98
 *   statScale     = 0.82 + qualityFactor * 0.36       → 同配方最多差 ~35%
 *   craftsmanship = 锻造小游戏手感分(0~1),决定随机词条数量
 * @param {object} farm      私有农场(材料从这里扣,体现资源隔离)
 * @param {string} recipeId  配方(需已在 farm.tech.unlockedRecipes)
 * @param {number} craftsmanship 0~1
 * @returns {{ok:boolean, card?:object, reason?:string}}
 */
function craftCard(farm, recipeId, craftsmanship = 0.5){
  const recipe = RECIPES[recipeId];
  if(!recipe) return { ok:false, reason:'unknown_recipe' };
  if(!farm.tech.unlockedRecipes.includes(recipeId)) return { ok:false, reason:'recipe_locked' };

  // —— 校验并扣除材料(只动私有仓储) ——
  const usedCrops = [];
  for(const [species, n] of Object.entries(recipe.needs.crops||{})){
    const have = farm.inventory.crops[species]||[];
    if(have.length < n) return { ok:false, reason:'missing_crop:'+species };
    usedCrops.push(...have.splice(0, n));          // 取走 n 份(含各自产地肥力)
  }
  for(const [mat, n] of Object.entries(recipe.needs.materials||{})){
    if((farm.inventory.materials[mat]||0) < n) return { ok:false, reason:'missing_material:'+mat };
    farm.inventory.materials[mat] -= n;
  }

  // —— 土地质量继承 ——
  const avgFert = usedCrops.reduce((s,c)=>s+(c.originFertility??50),0)/Math.max(1,usedCrops.length);
  const qualityFactor = Math.min(.98, Math.max(.4, avgFert/100));
  const statScale = 0.82 + qualityFactor*0.36;

  // —— 工艺决定词条 ——
  const AFFIX_POOL = ['坚韧+8','迅捷+1','收获时+1材料','虚空潮汐期间攻击+15%','同季共鸣翻倍'];
  const affixCount = craftsmanship > .85 ? 2 : craftsmanship > .5 ? 1 : 0;
  const affixes = Array.from({length: affixCount},
    () => AFFIX_POOL[(Math.random()*AFFIX_POOL.length)|0]);

  const card = {
    id: 'card_'+Date.now().toString(36)+(Math.random()*1e4|0),
    recipeId, name: recipe.name, element: recipe.element,
    atk: Math.round(recipe.baseAtk*statScale),
    def: Math.round(recipe.baseDef*statScale),
    heal: recipe.heal ? Math.round(recipe.heal*statScale) : 0,
    quality: +qualityFactor.toFixed(2),            // 卡面上的"产地等级"
    seasonMark: null,                              // 锻造时所处季节,同季+10%(由战斗结算读取)
    affixes, bound: true,                          // 绑定锻造者,杜绝工作室倒卖
  };
  farm.inventory.cards.push(card);
  return { ok:true, card };
}

/* ================= 4. 存档(单机↔联机同一 schema) ================= */
const Terra = {
  farm: null, overworld: null,
  newGame(ownerId='local'){ this.farm=createPrivateFarm(ownerId);
    this.overworld=createPublicOverworld(1); return this; },
  save(){ this.farm.lastSavedAt=Date.now();
    localStorage.setItem('terra_farm', JSON.stringify(this.farm)); },
  load(){ const s=localStorage.getItem('terra_farm');
    if(s) this.farm=JSON.parse(s); return !!s; },
  craftCard, spawnStrategicNode, RECIPES,
};
window.Terra = Terra;
