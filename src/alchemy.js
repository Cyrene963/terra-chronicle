/* =========================================================
   Terra Chronicle — 炼金工坊 (Alchemy Cauldron)
   玩家手动拖放材料进大釜,按配比合成卡牌。
   配方未知,需要探索。合成成功时金色发现特效!
   ========================================================= */
'use strict';
(function(){
const $=(s,p)=>{const e=p?p.querySelector(s):document.querySelector(s);return e;};
const $$=(t,c)=>{const e=document.createElement(t);if(c)e.className=c;return e;};

let root=null, injected=false;
const cauldron={starwheat:[], wood:0};  // 当前投入的材料,星麦保留产地质量

// 配方表 (玩家不知道,需要试验)
const RECIPES=[
  {starwheat:3,wood:2, recipeId:'card_sprout_guard', archetype:'thorn', effectText:'守势流派 · 格挡会蓄积荆棘反伤', result:{name:'新芽守卫',atk:18,def:26,elem:'earth'}},
  {starwheat:1,wood:3, recipeId:'alchemy_bulwark', archetype:'thorn', effectText:'守势流派 · 格挡会蓄积荆棘反伤', result:{name:'巨盾',atk:6,def:28,elem:'earth'}},
  {starwheat:2,wood:2, recipeId:'alchemy_balanced_blade', archetype:'harvest', effectText:'丰收流派 · 攻击后抽牌,高品质返还能量', result:{name:'平衡刃',atk:16,def:14,elem:'metal'}},
  {starwheat:4,wood:0, recipeId:'alchemy_life_bread', archetype:'sprout', effectText:'新芽流派 · 治疗会转化为护甲', result:{name:'生命之粮',atk:0,def:0,heal:24,elem:'light'}},
  {starwheat:0,wood:4, recipeId:'alchemy_thorn_wall', archetype:'thorn', effectText:'守势流派 · 格挡会蓄积荆棘反伤', result:{name:'荆棘壁',atk:12,def:22,elem:'earth'}},
  {starwheat:5,wood:1, recipeId:'alchemy_harvest_sickle', archetype:'harvest', effectText:'丰收流派 · 攻击后抽牌,高品质返还能量', result:{name:'收割镰',atk:22,def:8,elem:'fire'}},
];

function injectStyle(){
  if(injected) return; injected=true;
  const css=`
  #alchemyUI{position:fixed;inset:0;z-index:90;display:none;opacity:0;
    transition:opacity .45s;
    background:radial-gradient(circle at 50% 28%,rgba(201,162,75,.18),transparent 38%),linear-gradient(135deg, rgba(18,14,11,.94) 0%, rgba(42,37,32,.92) 100%);
    font-family:'Cormorant Garamond',serif;color:#f4ecd8;
    display:flex;align-items:center;justify-content:center;backdrop-filter:blur(10px);}
  #alchemyUI.on{display:flex;opacity:1;}
  #alchemyUI .panel{width:min(760px,92vw);
    background:linear-gradient(135deg, rgba(244,236,216,.98) 0%, rgba(232,220,191,.96) 100%);
    border:3px double #8b7355;border-radius:18px;padding:52px 56px 46px;
    box-shadow:0 44px 130px rgba(0,0,0,.76),0 0 90px rgba(212,175,55,.16);position:relative;color:#2a2520;overflow:hidden;}
  #alchemyUI .panel::before{content:'';position:absolute;inset:12px;border:1px solid rgba(212,175,55,.55);
    border-radius:13px;pointer-events:none;box-shadow:inset 0 0 42px rgba(139,115,85,.12);}
  #alchemyUI .panel::after{content:'';position:absolute;left:8%;right:8%;top:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,246,210,.9),transparent);}
  #alchemyUI .title{font-size:44px;letter-spacing:.28em;text-align:center;margin-bottom:12px;
    color:#b98a2a;text-shadow:0 2px 0 rgba(255,255,255,.4),0 8px 22px rgba(0,0,0,.18);}
  #alchemyUI .subtitle{font-size:13px;letter-spacing:.55em;text-align:center;opacity:.72;
    margin-bottom:34px;font-style:italic;color:#7d674d;}
  #alchemyUI .cauldron{width:300px;height:300px;margin:0 auto 30px;
    background:radial-gradient(circle at 50% 34%,rgba(255,230,150,.42),transparent 24%),radial-gradient(ellipse at 50% 42%,#5c4b3a,#211b17 68%);
    border-radius:50%;border:7px solid #8b7355;
    box-shadow:inset 0 24px 70px rgba(0,0,0,.65),0 18px 48px rgba(0,0,0,.48),0 0 38px rgba(212,175,55,.22);
    display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;
    position:relative;animation:cauldronBreath 3.6s ease-in-out infinite;}
  #alchemyUI .cauldron::before{content:'';position:absolute;inset:14px;border-radius:50%;
    border:2px solid rgba(212,175,55,.36);box-shadow:inset 0 0 30px rgba(255,220,130,.12);}
  #alchemyUI .cauldron::after{content:'';position:absolute;inset:34px;border-radius:50%;background:radial-gradient(circle,rgba(126,255,205,.18),rgba(201,162,75,.08) 42%,transparent 68%);filter:blur(1px);}
  @keyframes cauldronBreath{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
  #alchemyUI .contents{font-size:20px;color:#f4d03f;letter-spacing:.12em;z-index:1;text-align:center;text-shadow:0 2px 10px rgba(0,0,0,.6);}
  #alchemyUI .ingredients{display:flex;gap:28px;justify-content:center;margin-bottom:28px;}
  #alchemyUI .ingr{text-align:center;cursor:pointer;transition:transform .28s,box-shadow .28s,border-color .28s;
    border:1px solid rgba(185,138,42,.64);border-radius:18px;padding:18px 30px 16px;
    background:linear-gradient(160deg,rgba(255,250,232,.72),rgba(215,188,131,.26));box-shadow:0 8px 22px rgba(0,0,0,.14);min-width:130px;}
  #alchemyUI .ingr:hover{transform:translateY(-6px) scale(1.04);border-color:#d4af37;box-shadow:0 18px 34px rgba(0,0,0,.18),0 0 28px rgba(212,175,55,.3);}
  #alchemyUI .ingr .icon{width:58px;height:58px;margin:0 auto 10px;border-radius:16px;object-fit:contain;filter:drop-shadow(0 8px 12px rgba(0,0,0,.24));}
  #alchemyUI .ingr .name{font-size:18px;letter-spacing:.16em;font-family:'Noto Serif SC',serif;}
  #alchemyUI .ingr .count{font-size:13px;opacity:.68;margin-top:6px;}
  #alchemyUI .actions{display:flex;gap:18px;justify-content:center;align-items:center;}
  #alchemyUI .btn{border:1px solid #b98a2a;background:linear-gradient(135deg,rgba(244,236,216,.52),rgba(201,162,75,.18));
    border-radius:999px;padding:13px 32px;cursor:pointer;font-size:17px;letter-spacing:.24em;text-indent:.24em;
    transition:all .3s;font-family:'Cormorant Garamond',serif;color:#2a2520;
    box-shadow:0 7px 18px rgba(0,0,0,.12);}
  #alchemyUI .btn:hover{background:linear-gradient(135deg,rgba(244,208,63,.32),rgba(201,162,75,.2));
    transform:translateY(-2px);box-shadow:0 12px 24px rgba(0,0,0,.17),0 0 20px rgba(212,175,55,.28);}
  #alchemyUI .btn:disabled{opacity:.3;cursor:default;transform:none!important;}
  #alchemyUI .close{position:absolute;top:28px;right:34px;font-size:30px;cursor:pointer;
    width:42px;height:42px;display:flex;align-items:center;justify-content:center;border-radius:50%;
    border:1px solid rgba(185,138,42,.7);background:rgba(244,236,216,.64);color:#2a2520;opacity:.62;
    transition:all .3s;box-shadow:0 4px 12px rgba(0,0,0,.16);z-index:2;}
  #alchemyUI .close:hover{opacity:1;transform:scale(1.12) rotate(90deg);box-shadow:0 0 16px rgba(212,175,55,.45);}
  #alchemyUI .alchemyStatus{height:24px;margin-top:16px;text-align:center;font-family:'Noto Serif SC',serif;font-size:13px;letter-spacing:.12em;color:#8b5a35;opacity:.85;}
  #alchemyUI .alchemyStatus.warn{color:#a64838;animation:statusPulse .5s ease-out;}
  @keyframes statusPulse{0%{transform:scale(.96);opacity:.3}100%{transform:scale(1);opacity:.85}}
  #alchemyUI .discovery{position:absolute;inset:0;background:radial-gradient(circle at 50% 42%,rgba(255,246,210,.96),rgba(212,175,55,.93));
    display:none;align-items:center;justify-content:center;flex-direction:column;
    border-radius:18px;animation:goldFlash 1s;z-index:3;}
  @keyframes goldFlash{0%,100%{filter:brightness(1)}50%{filter:brightness(1.22)}}
  #alchemyUI .discovery.on{display:flex;}
  #alchemyUI .discovery .msg{font-size:54px;color:#fff;letter-spacing:.28em;
    text-shadow:0 4px 20px rgba(0,0,0,.38),0 0 26px rgba(255,255,255,.45);animation:bounce .6s;}
  @keyframes bounce{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}
  `;
  const s=$$('style');s.textContent=css;document.head.appendChild(s);
}

function buildDOM(){
  if(root) return;
  injectStyle();
  root=$$('div');root.id='alchemyUI';
  root.innerHTML=`
    <div class="panel">
      <div class="title">炼金大釜</div>
      <div class="subtitle">Alchemy Cauldron · 探索配方合成卡牌</div>
      <div class="cauldron">
        <div class="contents" id="cauldronDisplay">空釜</div>
      </div>
      <div class="ingredients">
        <div class="ingr" id="addWheat">
          <img class="icon" src="assets/ui/wheat_icon.png" alt="">
          <div class="name">星麦</div>
          <div class="count" id="wheatCount">库存: 0</div>
        </div>
        <div class="ingr" id="addWood">
          <img class="icon" src="assets/ui/wood_icon.png" alt="">
          <div class="name">木材</div>
          <div class="count" id="woodCount">库存: 0</div>
        </div>
      </div>
      <div class="actions">
        <button class="btn" id="alchemyReset">清空</button>
        <button class="btn" id="alchemyBrew">炼制</button>
      </div>
      <div class="alchemyStatus" id="alchemyStatus">投入材料，聆听大地的回响</div>
      <div class="close" id="alchemyClose">×</div>
      <div class="discovery" id="alchemyDiscovery">
        <div class="msg">✨ 配方发现! ✨</div>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  $('#addWheat',root).onclick=()=>addIngredient('starwheat');
  $('#addWood',root).onclick=()=>addIngredient('wood');
  $('#alchemyReset',root).onclick=reset;
  $('#alchemyBrew',root).onclick=brew;
  $('#alchemyClose',root).onclick=close;
}

function addIngredient(type){
  const farm=window.Terra?.farm;
  if(!farm) return;
  if(type==='starwheat'){
    const have=farm.inventory.crops.starwheat||[];
    if(have.length<1) return;
    cauldron.starwheat.push(have.shift());
  }else if(type==='wood'){
    const have=farm.inventory.materials.wood||0;
    if(have<1) return;
    farm.inventory.materials.wood--;
    cauldron.wood++;
  }
  updateDisplay();
}

function reset(){
  // 退还材料
  const farm=window.Terra?.farm;
  if(farm){
    if(!farm.inventory.crops.starwheat) farm.inventory.crops.starwheat=[];
    farm.inventory.crops.starwheat.unshift(...cauldron.starwheat);
    farm.inventory.materials.wood=(farm.inventory.materials.wood||0)+cauldron.wood;
  }
  cauldron.starwheat=[]; cauldron.wood=0;
  updateDisplay();
}

function cauldronQuality(){
  if(!cauldron.starwheat.length) return 0.5;
  const avg=cauldron.starwheat.reduce((s,c)=>s+(c.originFertility??50),0)/cauldron.starwheat.length;
  return Math.min(.98, Math.max(.4, avg/100));
}

function makeAlchemyCard(recipe){
  const farm=window.Terra?.farm;
  const upgrades=farm?.upgrades||[];
  const q=cauldronQuality();
  const forgeBonus=window.__dbg?.forgeHot ? 0.08 : 0;
  const workshopBonus=upgrades.includes('workshop_3') ? 0.18 : upgrades.includes('workshop_2') ? 0.10 : 0;
  const scale=0.82 + Math.min(.99, q+forgeBonus)*0.36 + workshopBonus;
  const craft=upgrades.includes('workshop_3') ? 0.96 : window.__dbg?.forgeHot ? 0.9 : Math.min(0.88, 0.42 + q*0.5 + workshopBonus*.45);
  const affixes=[];
  if(craft>.5) affixes.push(q>.75?'丰饶产地':'稳定工艺');
  if(craft>.85) affixes.push(window.__dbg?.forgeHot?'熔炉灼痕':'同季共鸣');
  if(upgrades.includes('workshop_2')) affixes.push('工坊精炼');
  if(upgrades.includes('workshop_3')) affixes.push('大师铭刻');
  return {
    id:'card_'+Date.now().toString(36)+(Math.random()*1e4|0),
    recipeId:recipe.recipeId,
    archetype:recipe.archetype||'plain',
    effectText:recipe.effectText||'',
    name:recipe.result.name,
    element:recipe.result.elem,
    atk:Math.round((recipe.result.atk||0)*scale),
    def:Math.round((recipe.result.def||0)*scale),
    heal:recipe.result.heal?Math.round(recipe.result.heal*scale):0,
    quality:+q.toFixed(2),
    origin:'starwheat',
    craftsmanship:+craft.toFixed(2),
    affixes,
    bound:true
  };
}

function showStatus(text, warn=false){
  const el=$('#alchemyStatus',root); if(!el) return;
  el.textContent=text; el.classList.toggle('warn', !!warn);
  if(warn){ el.style.animation='none'; void el.offsetWidth; el.style.animation='statusPulse .5s ease-out'; }
}
function revealCard(card){
  const r=document.getElementById('cardReveal');
  if(!r) return false;
  document.getElementById('cvName').textContent=card.name;
  document.getElementById('cvAtk').textContent=card.atk||0;
  document.getElementById('cvDef').textContent=card.def||0;
  document.getElementById('cvQ').textContent=Math.round((card.quality||0)*100);
  document.getElementById('cvAffix').textContent=[card.effectText, ...(card.affixes||[])].filter(Boolean).join(' · ');
  r.classList.add('on');
  return true;
}
function brew(){
  // 查找匹配配方
  const recipe=RECIPES.find(r=>r.starwheat===cauldron.starwheat.length && r.wood===cauldron.wood);
  if(!recipe){
    showStatus('配方未共鸣 · 材料已退回，换一种比例试试', true);
    reset();
    if(window.TerraSound) TerraSound.play('click');
    return;
  }

  // 合成成功:卡牌强度继承星麦产地肥力
  if(window.TerraSound) TerraSound.play('chime');
  const card=makeAlchemyCard(recipe);
  const farm=window.Terra?.farm;
  if(farm){
    farm.inventory.cards.push(card);
    window.Terra.save();
  }

  // 显示发现特效
  $('#alchemyDiscovery',root).classList.add('on');
  showStatus('配方共鸣 · 卡牌正在成形');
  setTimeout(()=>{
    $('#alchemyDiscovery',root).classList.remove('on');
    cauldron.starwheat=[]; cauldron.wood=0;
    updateDisplay();
    if(window.updateDock) window.updateDock();
    if(!revealCard(card)) showStatus(`成功炼制 ${card.name} · 攻${card.atk} 防${card.def}`, false);
  },1400);
}

function updateDisplay(){
  const farm=window.Terra?.farm;
  if(farm){
    $('#wheatCount',root).textContent=`库存: ${(farm.inventory.crops.starwheat||[]).length}`;
    $('#woodCount',root).textContent=`库存: ${farm.inventory.materials.wood||0}`;
  }
  const wheatN=cauldron.starwheat.length;
  if(wheatN===0 && cauldron.wood===0){
    $('#cauldronDisplay',root).textContent='空釜';
  }else{
    const avg=cauldronQuality();
    $('#cauldronDisplay',root).textContent=`🌾 ×${wheatN}  🪵 ×${cauldron.wood}${wheatN?` · 产地 ${(avg*100).toFixed(0)}`:''}`;
  }
}

function open(){
  buildDOM();
  cauldron.starwheat=[]; cauldron.wood=0;
  updateDisplay();
  root.classList.add('on');
}

function close(){
  if(!root) return;
  root.classList.remove('on');
}

window.Alchemy={open,close};
})();
