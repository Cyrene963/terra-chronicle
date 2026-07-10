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
const cauldron={starwheat:[], dewberry:[], wood:0};  // 当前投入的材料,星麦保留产地质量

// 配方表 (玩家不知道,需要试验)
const RECIPES=[
  {dewberry:3,wood:1, recipeId:'card_river_blessing', archetype:'river', effectText:'河川流派 · 治疗会附带净涤', result:{name:'河川祝福',atk:8,def:12,heal:22,elem:'water'}},
  {starwheat:3,wood:2, recipeId:'card_sprout_guard', archetype:'thorn', effectText:'守势流派 · 格挡会蓄积荆棘反伤', result:{name:'新芽守卫',atk:18,def:26,elem:'earth'}},
  {starwheat:0,wood:4, recipeId:'alchemy_thorn_wall', archetype:'thorn', effectText:'守势流派 · 格挡会蓄积荆棘反伤', result:{name:'荆棘壁',atk:12,def:22,elem:'earth'}},
  {starwheat:5,wood:1, recipeId:'alchemy_harvest_sickle', archetype:'harvest', effectText:'丰收流派 · 攻击后抽牌,高品质返还能量', result:{name:'收割镰',atk:22,def:8,elem:'fire'}},
];

function injectStyle(){
  if(injected) return; injected=true;
  const css=`
  #alchemyUI{position:fixed;inset:0;z-index:90;display:none;opacity:0;
    transition:opacity .45s cubic-bezier(.2,.85,.2,1);
    font-family:'Cormorant Garamond',serif;color:#f4ecd8;}
  #alchemyUI.panel-on{display:flex;opacity:1;}
  #alchemyUI .panel{width:min(980px,94vw);display:grid;grid-template-columns:minmax(300px,1fr) minmax(310px,.92fr);gap:30px;align-items:center;padding:46px 48px 42px;}
  #alchemyUI .leftPane,#alchemyUI .rightPane{position:relative;z-index:1;}
  #alchemyUI .leftPane{display:flex;flex-direction:column;align-items:center;}
  #alchemyUI .rightPane{align-self:stretch;display:flex;flex-direction:column;justify-content:center;}
  #alchemyUI .formulaHint{font-family:'Noto Serif SC',serif;font-size:12px;line-height:1.9;letter-spacing:.09em;color:#6d5135;background:rgba(255,249,226,.58);border:1px solid rgba(139,91,43,.2);border-radius:18px;padding:13px 16px;margin:10px 0 22px;box-shadow:inset 0 1px 0 rgba(255,255,255,.44);transition:transform .25s,box-shadow .25s;}
  #alchemyUI .formulaHint:hover{transform:translateY(-1px);box-shadow:inset 0 1px 0 rgba(255,255,255,.44),0 4px 12px rgba(0,0,0,.08);}
  #alchemyUI .formulaHint b{color:#9b6624;}
  #alchemyUI .formulaHint::before{content:'';position:absolute;left:12px;top:50%;transform:translateY(-50%);width:3px;height:60%;background:linear-gradient(180deg,rgba(212,175,55,.6),rgba(159,101,35,.3));border-radius:999px;}
  #alchemyUI .cauldron{width:min(360px,72vw);height:min(360px,72vw);margin:0 auto 18px;
    background:none;border-radius:50%;border:0;box-shadow:none;
    display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;
    position:relative;animation:cauldronBreath 3.6s ease-in-out infinite;}
  #alchemyUI .cauldronArt{position:absolute;inset:-18px;width:calc(100% + 36px);height:calc(100% + 36px);object-fit:contain;filter:drop-shadow(0 24px 34px rgba(0,0,0,.42)) drop-shadow(0 0 32px rgba(212,175,55,.26));z-index:1;animation:cauldronGlow 4.8s ease-in-out infinite;}
  @keyframes cauldronGlow{0%,100%{filter:drop-shadow(0 24px 34px rgba(0,0,0,.42)) drop-shadow(0 0 28px rgba(212,175,55,.22))}50%{filter:drop-shadow(0 24px 34px rgba(0,0,0,.42)) drop-shadow(0 0 42px rgba(244,208,63,.38))}}
  #alchemyUI .cauldron::before{content:'';position:absolute;inset:18%;border-radius:50%;background:radial-gradient(circle,rgba(244,208,63,.22),transparent 62%);filter:blur(12px);z-index:0;animation:alchemyPulse 3.6s ease-in-out infinite;}
  @keyframes alchemyPulse{0%,100%{opacity:.8;transform:scale(1)}50%{opacity:1;transform:scale(1.08)}}
  #alchemyUI .cauldron::after{content:'';position:absolute;inset:30%;border-radius:50%;background:radial-gradient(circle,rgba(255,232,173,.25),transparent 68%);filter:blur(4px);animation:brewGlow 4.2s ease-in-out infinite;z-index:2;}
  #alchemyUI .cauldron .rim{position:absolute;inset:34px;border-radius:50%;border:10px solid rgba(32,23,18,.68);box-shadow:0 6px 0 rgba(255,246,210,.08),inset 0 -10px 24px rgba(0,0,0,.45);}
  #alchemyUI .cauldron .stem{position:absolute;left:50%;bottom:-22px;width:106px;height:38px;transform:translateX(-50%);border-radius:0 0 24px 24px;background:linear-gradient(180deg,#6b4d33,#2a1d15);box-shadow:0 18px 22px rgba(0,0,0,.26),inset 0 1px 0 rgba(255,255,255,.06);}
  #alchemyUI .cauldron .stem::before,#alchemyUI .cauldron .stem::after{content:'';position:absolute;top:-6px;width:22px;height:8px;border-radius:999px;background:rgba(255,228,170,.22);box-shadow:0 0 0 1px rgba(79,52,28,.24);}
  #alchemyUI .cauldron .stem::before{left:10px}. #alchemyUI .cauldron .stem::after{right:10px}
  #alchemyUI .cauldron .spark{position:absolute;width:8px;height:8px;border-radius:50%;background:rgba(255,232,173,.95);box-shadow:0 0 14px rgba(255,232,173,.58);animation:sparkDrift 2.8s ease-in-out infinite;}
  #alchemyUI .cauldron .spark.s1{top:18%;left:24%;animation-delay:.2s}.#alchemyUI .cauldron .spark.s2{top:28%;right:22%;animation-delay:.8s}.#alchemyUI .cauldron .spark.s3{bottom:30%;left:18%;animation-delay:1.4s}
  #alchemyUI .bubbles{position:absolute;inset:86px 84px auto;height:80px;pointer-events:none;z-index:2;}
  #alchemyUI .bubbles i{position:absolute;bottom:0;width:10px;height:10px;border-radius:50%;background:rgba(157,255,218,.58);box-shadow:0 0 14px rgba(157,255,218,.44);animation:bubbleRise 2.6s ease-in-out infinite;}
  #alchemyUI .bubbles i:nth-child(1){left:18%;animation-delay:.1s}#alchemyUI .bubbles i:nth-child(2){left:48%;width:7px;height:7px;animation-delay:.8s}#alchemyUI .bubbles i:nth-child(3){left:68%;animation-delay:1.4s}#alchemyUI .bubbles i:nth-child(4){left:36%;width:6px;height:6px;animation-delay:1.9s}
  @keyframes cauldronBreath{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
  @keyframes brewGlow{0%,100%{opacity:.82;transform:scale(1)}50%{opacity:1;transform:scale(1.06)}}
  @keyframes bubbleRise{0%{transform:translateY(18px) scale(.5);opacity:0}30%{opacity:.9}100%{transform:translateY(-42px) scale(1.05);opacity:0}}
  #alchemyUI .contents{font-size:18px;color:#f4d03f;letter-spacing:.1em;z-index:3;text-align:center;text-shadow:0 2px 10px rgba(0,0,0,.72);font-family:'Noto Serif SC',serif;max-width:250px;line-height:1.7;}
  #alchemyUI .ingredients{display:grid;grid-template-columns:1fr;gap:16px;margin-bottom:22px;}
  #alchemyUI .ingr{text-align:left;cursor:pointer;transition:transform .28s cubic-bezier(.2,.85,.2,1),box-shadow .28s cubic-bezier(.2,.85,.2,1),border-color .28s cubic-bezier(.2,.85,.2,1);
    border:1px solid rgba(139,91,43,.34);border-radius:20px;padding:15px 18px;display:grid;grid-template-columns:62px 1fr auto;gap:14px;align-items:center;
    background:linear-gradient(160deg,rgba(255,250,232,.82),rgba(201,162,75,.18));box-shadow:0 8px 22px rgba(0,0,0,.12);min-width:0;position:relative;}
  #alchemyUI .ingr::before{content:'';position:absolute;inset:6px;border:1px solid rgba(212,175,55,.08);border-radius:15px;pointer-events:none;opacity:0;transition:opacity .28s;}
  #alchemyUI .ingr:hover{transform:translateY(-4px) scale(1.018);border-color:#d4af37;box-shadow:0 18px 34px rgba(0,0,0,.18),0 0 28px rgba(212,175,55,.24);}
  #alchemyUI .ingr:hover::before{opacity:1;}
  #alchemyUI .ingr:active{transform:translateY(-2px) scale(1.008);}
  #alchemyUI .ingr .icon{width:58px;height:58px;margin:0;border-radius:16px;object-fit:contain;filter:drop-shadow(0 8px 12px rgba(0,0,0,.22));background:rgba(255,255,255,.22);}
  #alchemyUI .ingr .name{font-size:18px;letter-spacing:.13em;font-family:'Noto Serif SC',serif;color:#4b331f;font-weight:800;}
  #alchemyUI .ingr .role{font-size:11px;letter-spacing:.1em;color:#7a5c3b;margin-top:4px;font-family:'Noto Serif SC',serif;}
  #alchemyUI .ingr .count{font-size:12px;opacity:.8;padding:5px 8px;border-radius:999px;background:rgba(92,63,31,.11);font-family:'Noto Serif SC',serif;white-space:nowrap;}
  #alchemyUI .actions{display:flex;gap:16px;justify-content:flex-start;align-items:center;}
  #alchemyUI .btn{border:1px solid #b98a2a;background:linear-gradient(135deg,rgba(255,247,219,.78),rgba(201,162,75,.22));
    border-radius:999px;padding:14px 32px;cursor:pointer;font-size:16px;letter-spacing:.2em;text-indent:.2em;
    transition:all .3s cubic-bezier(.2,.85,.2,1);font-family:'Noto Serif SC',serif;color:#2a2520;font-weight:800;
    box-shadow:0 7px 18px rgba(0,0,0,.12);position:relative;overflow:hidden;}
  #alchemyUI .btn::before{content:'';position:absolute;inset:-50%;background:radial-gradient(circle,rgba(255,255,255,.25),transparent 70%);opacity:0;transition:opacity .3s;}
  #alchemyUI .btn:hover:not(:disabled)::before{opacity:1;}
  #alchemyUI .btn.btn-primary{background:linear-gradient(135deg,rgba(244,208,63,.78),rgba(159,101,35,.42));color:#3b2414;box-shadow:0 13px 30px rgba(160,98,31,.24),0 0 28px rgba(244,208,63,.2);}
  #alchemyUI .btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 12px 24px rgba(0,0,0,.17),0 0 20px rgba(212,175,55,.28);}
  #alchemyUI .btn:active:not(:disabled){transform:translateY(-1px) scale(.98);}
  #alchemyUI .btn.btn-primary:hover:not(:disabled){box-shadow:0 16px 36px rgba(160,98,31,.32),0 0 38px rgba(244,208,63,.32);}
  #alchemyUI .btn:disabled{opacity:.3;cursor:not-allowed;transform:none!important;}
  #alchemyUI .close{position:absolute;top:18px;right:18px;font-size:28px;cursor:pointer;
    width:42px;height:42px;display:flex;align-items:center;justify-content:center;border-radius:50%;
    border:1px solid rgba(212,175,55,.7);background:rgba(246,238,216,.64);color:#2a2520;opacity:.62;
    transition:all .3s cubic-bezier(.2,.85,.2,1);box-shadow:0 4px 12px rgba(0,0,0,.16);z-index:10;}
  #alchemyUI .close:hover{opacity:1;transform:scale(1.12) rotate(90deg);box-shadow:0 0 16px rgba(212,175,55,.45);}
  #alchemyUI .alchemyStatus{min-height:24px;margin-top:18px;text-align:left;font-family:'Noto Serif SC',serif;font-size:13px;letter-spacing:.12em;color:#7a4f2d;opacity:.9;line-height:1.8;padding-left:3px;}
  #alchemyUI .alchemyStatus.warn{color:#a64838;animation:statusPulse .5s ease-out;}
  @keyframes statusPulse{0%{transform:scale(.96);opacity:.3}100%{transform:scale(1);opacity:.85}}
  #alchemyUI .alchemyStatus::before{content:'';display:inline-block;width:4px;height:4px;border-radius:50%;background:currentColor;margin-right:8px;vertical-align:middle;opacity:.7;}
  #alchemyUI .discovery{position:absolute;inset:0;background:radial-gradient(circle at 50% 42%,rgba(255,246,210,.96),rgba(212,175,55,.93));
    display:none;align-items:center;justify-content:center;flex-direction:column;
    border-radius:18px;animation:goldFlash 1.2s ease-in-out;z-index:3;overflow:hidden;}
  #alchemyUI .discovery::before{content:'';position:absolute;inset:-50%;background:conic-gradient(from 0deg,transparent,rgba(255,255,255,.6),transparent);animation:discoveryRotate 3s linear infinite;}
  @keyframes discoveryRotate{to{transform:rotate(360deg)}}
  @keyframes goldFlash{0%,100%{filter:brightness(1)}50%{filter:brightness(1.28)}}
  #alchemyUI .discovery.on{display:flex;}
  #alchemyUI .discovery .msg{font-size:54px;color:#fff;letter-spacing:.28em;position:relative;z-index:1;
    text-shadow:0 4px 20px rgba(0,0,0,.38),0 0 26px rgba(255,255,255,.45);animation:discoveryBounce .7s cubic-bezier(.34,1.56,.64,1);}
  @keyframes discoveryBounce{0%{transform:scale(.8);opacity:0}50%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
  `;
  const s=$$('style');s.textContent=css;document.head.appendChild(s);
}

function buildDOM(){
  if(root) return;
  injectStyle();
  root=$$('div');root.id='alchemyUI';root.className='panel-overlay';
  root.innerHTML=`
    <div class="panel panel-parchment">
      <div class="leftPane">
        <div class="cauldron">
          <img class="cauldronArt" src="assets/sprites/alchemy_cauldron_real.png?v=3" alt="">
          <i class="spark s1"></i><i class="spark s2"></i><i class="spark s3"></i>
          <div class="bubbles"><i></i><i></i><i></i><i></i></div>
          <div class="contents" id="cauldronDisplay">空釜</div>
        </div>
        <div class="formulaHint"><b>工坊笔记</b> · 星麦决定产地品质，露莓偏向治愈与净化，木材稳定卡牌形体。不同配比会解锁不同流派。</div>
      </div>
      <div class="rightPane">
        <div class="panel-header">
          <div class="panel-title">炼金大釜</div>
          <div class="panel-subtitle">Alchemy Cauldron · 探索配方合成卡牌</div>
        </div>
        <div class="ingredients">
          <div class="ingr" id="addWheat">
            <img class="icon" src="assets/ui/wheat_icon.png" alt="">
            <div><div class="name">星麦</div><div class="role">产地品质 · 守势/丰收基底</div></div>
            <div class="count" id="wheatCount">库存: 0</div>
          </div>
          <div class="ingr" id="addDewberry">
            <img class="icon" src="assets/sprites/crop_dewberry.png?v=2" alt="">
            <div><div class="name">露莓</div><div class="role">水系净化 · 治疗与河川祝福</div></div>
            <div class="count" id="dewberryCount">库存: 0</div>
          </div>
          <div class="ingr" id="addWood">
            <img class="icon" src="assets/ui/wood_icon.png" alt="">
            <div><div class="name">木材</div><div class="role">卡框骨架 · 稳定炼成结构</div></div>
            <div class="count" id="woodCount">库存: 0</div>
          </div>
        </div>
        <div class="actions">
          <button class="btn btn-secondary" id="alchemyReset">清空</button>
          <button class="btn btn-primary" id="alchemyBrew">炼制</button>
        </div>
        <div class="panel-status" id="alchemyStatus">投入材料，聆听大地的回响</div>
      </div>
      <div class="panel-close" id="alchemyClose">×</div>
      <div class="discovery" id="alchemyDiscovery">
        <div class="msg">✨ 配方发现! ✨</div>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  $('#addWheat',root).onclick=()=>addIngredient('starwheat');
  $('#addDewberry',root).onclick=()=>addIngredient('dewberry');
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
  }else if(type==='dewberry'){
    const have=farm.inventory.crops.dewberry||[];
    if(have.length<1) return;
    cauldron.dewberry.push(have.shift());
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
    if(!farm.inventory.crops.dewberry) farm.inventory.crops.dewberry=[];
    farm.inventory.crops.starwheat.unshift(...cauldron.starwheat);
    farm.inventory.crops.dewberry.unshift(...cauldron.dewberry);
    farm.inventory.materials.wood=(farm.inventory.materials.wood||0)+cauldron.wood;
  }
  cauldron.starwheat=[]; cauldron.dewberry=[]; cauldron.wood=0;
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
function cardRevealArt(card){
  const name=card?.name||'';
  if(name.includes('祝福')||card?.element==='water') return 'assets/sprites/card_art_heal.png';
  if(name.includes('守卫')||name.includes('壁')||card?.archetype==='thorn') return 'assets/sprites/card_art_guard.png';
  if(name.includes('镰')||card?.archetype==='harvest') return 'assets/sprites/card_art_slash.png';
  if(card?.element==='fire') return 'assets/sprites/card_art_charge.png';
  return 'assets/sprites/card_art_guard.png';
}
function revealCard(card){
  const r=document.getElementById('cardReveal');
  if(!r) return false;
  document.getElementById('cvName').textContent=card.name;
  const art=document.getElementById('cvArt');
  if(art) art.src=cardRevealArt(card);
  document.getElementById('cvAtk').textContent=card.atk||0;
  document.getElementById('cvDef').textContent=card.def||0;
  document.getElementById('cvQ').textContent=Math.round((card.quality||0)*100);
  document.getElementById('cvAffix').textContent=[card.effectText, ...(card.affixes||[])].filter(Boolean).join(' · ');
  r.classList.add('on');
  return true;
}
function recipeKey(r){
  return ['starwheat','dewberry','wood'].map(k => `${k}:${r[k]||0}`).join('|');
}
function cauldronKey(){
  return ['starwheat','dewberry','wood'].map(k => `${k}:${cauldron[k]?.length||cauldron[k]||0}`).join('|');
}
function brew(){
  // 查找匹配配方
  const recipe=RECIPES.find(r=>(r.starwheat||0)===cauldron.starwheat.length && (r.dewberry||0)===cauldron.dewberry.length && (r.wood||0)===cauldron.wood);
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
    cauldron.starwheat=[]; cauldron.dewberry=[]; cauldron.wood=0;
    updateDisplay();
    if(window.updateDock) window.updateDock();
    if(!revealCard(card)) showStatus(`成功炼制 ${card.name} · 攻${card.atk} 防${card.def}`, false);
  },1400);
}

function updateDisplay(){
  const farm=window.Terra?.farm;
  if(farm){
    $('#wheatCount',root).textContent=`库存: ${(farm.inventory.crops.starwheat||[]).length}`;
    $('#dewberryCount',root).textContent=`库存: ${(farm.inventory.crops.dewberry||[]).length}`;
    $('#woodCount',root).textContent=`库存: ${farm.inventory.materials.wood||0}`;
  }
  const wheatN=cauldron.starwheat.length;
  const dewN=cauldron.dewberry.length;
  if(wheatN===0 && dewN===0 && cauldron.wood===0){
    $('#cauldronDisplay',root).textContent='空釜';
  }else{
    const avg=cauldronQuality();
    $('#cauldronDisplay',root).textContent=`🌾 ×${wheatN}  💧 ×${dewN}  🪵 ×${cauldron.wood}${(wheatN||dewN)?` · 产地 ${(avg*100).toFixed(0)}`:''}`;
  }
}

let openToken=0;
function open(){
  const token=++openToken;
  window.SurfaceLifecycle?.beforeOpen?.('alchemy');
  buildDOM();
  root.style.pointerEvents='auto';
  cauldron.starwheat=[]; cauldron.dewberry=[]; cauldron.wood=0;
  updateDisplay();

  // 使用 AnimationManager 分层入场动画
  if(window.AnimationManager){
    root.style.opacity='0';
    root.style.transform='scale(0.95)';
    root.classList.add('panel-on');

    requestAnimationFrame(()=>{
      if(token!==openToken) return;
      root.style.transition='opacity 0.45s cubic-bezier(.2,.85,.2,1), transform 0.45s cubic-bezier(.2,.85,.2,1)';
      root.style.opacity='1';
      root.style.transform='scale(1)';

      // 分层入场：先大釜，后材料列表
      const cauldronEl = root.querySelector('.cauldron');
      const ingredientsEl = root.querySelector('.ingredients');

      if(cauldronEl){
        cauldronEl.style.opacity='0';
        cauldronEl.style.transform='translateY(20px)';
        setTimeout(()=>{
          cauldronEl.style.transition='opacity 0.6s cubic-bezier(.2,.8,.2,1), transform 0.6s cubic-bezier(.2,.8,.2,1)';
          cauldronEl.style.opacity='1';
          cauldronEl.style.transform='translateY(0)';
        }, 150);
      }

      if(ingredientsEl){
        const items = ingredientsEl.querySelectorAll('.ingr');
        items.forEach((item, i)=>{
          item.style.opacity='0';
          item.style.transform='translateX(-20px)';
          setTimeout(()=>{
            item.style.transition='opacity 0.5s cubic-bezier(.2,.8,.2,1), transform 0.5s cubic-bezier(.2,.8,.2,1)';
            item.style.opacity='1';
            item.style.transform='translateX(0)';
          }, 250 + i * 80);
        });
      }
    });
  } else {
    // Fallback
    root.classList.add('panel-on');
  }

  if(window.tutorialState && !window.tutorialState._alchemyOpened) {
    window.tutorialState._alchemyOpened = true;
  }
}

function close(options={}){
  if(!root) return;
  openToken++;
  const closeToken=openToken;
  if(options.immediate){
    root.classList.remove('panel-on'); root.style.pointerEvents='none'; root.style.opacity='0';
    window.SurfaceLifecycle?.afterClose?.('alchemy');
    return;
  }

  window.SurfaceLifecycle?.afterClose?.('alchemy');

  // 使用转场效果
  if(window.AnimationManager){
    root.style.transition='opacity 0.35s cubic-bezier(.4,0,.2,1), transform 0.35s cubic-bezier(.4,0,.2,1)';
    root.style.opacity='0';
    root.style.transform='scale(0.96)';
    setTimeout(()=>{
      if(closeToken!==openToken) return;
      root.classList.remove('panel-on');
      root.style.pointerEvents='none';
    }, 350);
  } else {
    // Fallback
    root.classList.remove('panel-on');
    root.style.pointerEvents='none';
  }
}

window.Alchemy={open,close};
window.SurfaceLifecycle?.register?.('alchemy', { close });
})();
