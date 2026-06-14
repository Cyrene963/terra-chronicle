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
const cauldron={wheat:0, wood:0};  // 当前投入的材料数量

// 配方表 (玩家不知道,需要试验)
const RECIPES=[
  {wheat:3,wood:1, result:{name:'新芽守卫',atk:8,def:18,elem:'wood'}},
  {wheat:1,wood:3, result:{name:'巨盾',atk:6,def:28,elem:'earth'}},
  {wheat:2,wood:2, result:{name:'平衡刃',atk:16,def:14,elem:'metal'}},
  {wheat:4,wood:0, result:{name:'生命之粮',atk:0,def:0,heal:24,elem:'light'}},
  {wheat:0,wood:4, result:{name:'荆棘壁',atk:12,def:22,elem:'earth'}},
  {wheat:5,wood:1, result:{name:'收割镰',atk:22,def:8,elem:'fire'}},
];

function injectStyle(){
  if(injected) return; injected=true;
  const css=`
  #alchemyUI{position:fixed;inset:0;z-index:90;display:none;opacity:0;
    transition:opacity .45s;
    background:linear-gradient(135deg, #2a2520 0%, #1a1612 100%);
    font-family:'Cormorant Garamond',serif;color:#f4ecd8;
    display:flex;align-items:center;justify-content:center;}
  #alchemyUI.on{display:flex;opacity:1;}
  #alchemyUI .panel{width:min(680px,90vw);
    background:linear-gradient(135deg, #f4ecd8 0%, #e8dcbf 100%);
    border:3px double #8b7355;border-radius:12px;padding:48px 50px;
    box-shadow:0 40px 120px rgba(0,0,0,.7);position:relative;color:#2a2520;}
  #alchemyUI .panel::before{content:'';position:absolute;inset:10px;border:1px solid rgba(212,175,55,.5);
    border-radius:8px;pointer-events:none;}
  #alchemyUI .title{font-size:42px;letter-spacing:.24em;text-align:center;margin-bottom:16px;
    color:#d4af37;text-shadow:0 2px 10px rgba(0,0,0,.3);}
  #alchemyUI .subtitle{font-size:14px;letter-spacing:.6em;text-align:center;opacity:.7;
    margin-bottom:36px;font-style:italic;color:#8b7355;}
  #alchemyUI .cauldron{width:280px;height:280px;margin:0 auto 32px;
    background:radial-gradient(ellipse at 50% 40%,#4a3c2f,#2a2520);
    border-radius:50%;border:6px solid #8b7355;
    box-shadow:inset 0 20px 60px rgba(0,0,0,.6),0 12px 40px rgba(0,0,0,.5);
    display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;
    position:relative;}
  #alchemyUI .cauldron::before{content:'';position:absolute;inset:12px;border-radius:50%;
    border:2px solid rgba(212,175,55,.3);}
  #alchemyUI .contents{font-size:20px;color:#d4af37;letter-spacing:.12em;}
  #alchemyUI .ingredients{display:flex;gap:32px;justify-content:center;margin-bottom:32px;}
  #alchemyUI .ingr{text-align:center;cursor:pointer;transition:transform .3s;
    border:2px solid #d4af37;border-radius:12px;padding:20px 28px;
    background:rgba(244,236,216,.4);box-shadow:0 4px 12px rgba(0,0,0,.15);}
  #alchemyUI .ingr:hover{transform:scale(1.08);box-shadow:0 0 24px rgba(212,175,55,.4);}
  #alchemyUI .ingr .icon{font-size:48px;margin-bottom:12px;}
  #alchemyUI .ingr .name{font-size:18px;letter-spacing:.14em;font-family:'Noto Serif SC',serif;}
  #alchemyUI .ingr .count{font-size:14px;opacity:.7;margin-top:6px;}
  #alchemyUI .actions{display:flex;gap:20px;justify-content:center;}
  #alchemyUI .btn{border:2px solid #d4af37;background:linear-gradient(135deg,rgba(244,236,216,.4),rgba(232,220,191,.5));
    border-radius:8px;padding:14px 32px;cursor:pointer;font-size:18px;letter-spacing:.2em;
    transition:all .3s;font-family:'Cormorant Garamond',serif;color:#2a2520;
    box-shadow:0 4px 12px rgba(0,0,0,.15);}
  #alchemyUI .btn:hover{background:linear-gradient(135deg,rgba(212,175,55,.3),rgba(201,162,75,.2));
    transform:translateY(-2px);box-shadow:0 0 20px rgba(212,175,55,.4);}
  #alchemyUI .btn:disabled{opacity:.3;cursor:default;transform:none!important;}
  #alchemyUI .close{position:absolute;top:32px;right:36px;font-size:32px;cursor:pointer;
    width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:50%;
    border:2px solid #d4af37;background:rgba(244,236,216,.6);color:#2a2520;opacity:.6;
    transition:all .3s;box-shadow:0 4px 12px rgba(0,0,0,.2);}
  #alchemyUI .close:hover{opacity:1;transform:scale(1.15);box-shadow:0 0 16px rgba(212,175,55,.5);}
  #alchemyUI .discovery{position:absolute;inset:0;background:rgba(212,175,55,.95);
    display:none;align-items:center;justify-content:center;flex-direction:column;
    border-radius:12px;animation:goldFlash 1s;}
  @keyframes goldFlash{0%,100%{background:rgba(212,175,55,.95)}50%{background:rgba(244,208,63,1)}}
  #alchemyUI .discovery.on{display:flex;}
  #alchemyUI .discovery .msg{font-size:56px;color:#fff;letter-spacing:.3em;
    text-shadow:0 4px 20px rgba(0,0,0,.5);animation:bounce .6s;}
  @keyframes bounce{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
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
          <div class="icon">🌾</div>
          <div class="name">星麦</div>
          <div class="count" id="wheatCount">库存: 0</div>
        </div>
        <div class="ingr" id="addWood">
          <div class="icon">🪵</div>
          <div class="name">木材</div>
          <div class="count" id="woodCount">库存: 0</div>
        </div>
      </div>
      <div class="actions">
        <button class="btn" id="alchemyReset">清空</button>
        <button class="btn" id="alchemyBrew">炼制</button>
      </div>
      <div class="close" id="alchemyClose">×</div>
      <div class="discovery" id="alchemyDiscovery">
        <div class="msg">✨ 配方发现! ✨</div>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  $('#addWheat',root).onclick=()=>addIngredient('wheat');
  $('#addWood',root).onclick=()=>addIngredient('wood');
  $('#alchemyReset',root).onclick=reset;
  $('#alchemyBrew',root).onclick=brew;
  $('#alchemyClose',root).onclick=close;
}

function addIngredient(type){
  const farm=window.Terra?.farm;
  if(!farm) return;
  if(type==='wheat'){
    const have=(farm.inventory.crops.wheat||[]).length;
    if(have<1) return;
    farm.inventory.crops.wheat.shift();
    cauldron.wheat++;
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
    if(!farm.inventory.crops.wheat) farm.inventory.crops.wheat=[];
    for(let i=0;i<cauldron.wheat;i++) farm.inventory.crops.wheat.push({originFertility:50});
    farm.inventory.materials.wood=(farm.inventory.materials.wood||0)+cauldron.wood;
  }
  cauldron.wheat=0; cauldron.wood=0;
  updateDisplay();
}

function brew(){
  // 查找匹配配方
  const recipe=RECIPES.find(r=>r.wheat===cauldron.wheat && r.wood===cauldron.wood);
  if(!recipe){
    alert('配方未知! 继续试验其他比例。');
    if(window.TerraSound) TerraSound.play('click');
    return;
  }

  // 合成成功!
  if(window.TerraSound) TerraSound.play('chime');
  const card={
    id:'card_'+Date.now().toString(36),
    recipeId:'alchemy_'+recipe.result.name,
    name:recipe.result.name,
    element:recipe.result.elem,
    atk:recipe.result.atk,
    def:recipe.result.def,
    heal:recipe.result.heal||0,
    quality:0.85,
    affixes:[],
    bound:true
  };
  const farm=window.Terra?.farm;
  if(farm) farm.inventory.cards.push(card);

  // 显示发现特效
  $('#alchemyDiscovery',root).classList.add('on');
  setTimeout(()=>{
    $('#alchemyDiscovery',root).classList.remove('on');
    alert(`✨ 成功炼制: ${card.name}\n攻${card.atk} 防${card.def}${card.heal?' 治疗'+card.heal:''}`);
    cauldron.wheat=0; cauldron.wood=0;
    updateDisplay();
    if(window.updateDock) window.updateDock();
  },1800);
}

function updateDisplay(){
  const farm=window.Terra?.farm;
  if(farm){
    $('#wheatCount',root).textContent=`库存: ${(farm.inventory.crops.wheat||[]).length}`;
    $('#woodCount',root).textContent=`库存: ${farm.inventory.materials.wood||0}`;
  }
  if(cauldron.wheat===0 && cauldron.wood===0){
    $('#cauldronDisplay',root).textContent='空釜';
  }else{
    $('#cauldronDisplay',root).textContent=`🌾 ×${cauldron.wheat}  🪵 ×${cauldron.wood}`;
  }
}

function open(){
  buildDOM();
  cauldron.wheat=0; cauldron.wood=0;
  updateDisplay();
  root.classList.add('on');
}

function close(){
  if(!root) return;
  root.classList.remove('on');
}

window.Alchemy={open,close};
})();
