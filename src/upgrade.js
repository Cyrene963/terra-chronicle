/* =========================================================
   Terra Chronicle — 农场升级系统
   消耗木材+深渊战利品升级工坊/扩建农田。
   ========================================================= */
'use strict';
(function(){
const $=(t,c,p)=>{const e=document.createElement(t);if(c)e.className=c;if(p)p.appendChild(e);return e;};

let root=null, injected=false;

function injectStyle(){
  if(injected) return; injected=true;
  const css=`
  #upgradePanel{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:88;
    width:min(520px,92vw);background:rgba(246,241,231,.97);backdrop-filter:blur(18px);
    border:1px solid rgba(43,39,34,.2);border-radius:20px;padding:36px 38px;
    box-shadow:0 32px 90px rgba(10,10,10,.45);opacity:0;pointer-events:none;
    transition:opacity .45s,transform .45s cubic-bezier(.2,.8,.2,1);
    font-family:'Noto Serif SC',serif;color:#2b2722;}
  #upgradePanel.on{opacity:1;pointer-events:auto;transform:translate(-50%,-50%) scale(1);}
  #upgradePanel .hdr{font-family:'Cormorant Garamond',serif;font-size:12px;letter-spacing:.6em;
    color:#c9a24b;text-transform:uppercase;margin-bottom:10px;}
  #upgradePanel h3{font-weight:500;font-size:27px;letter-spacing:.14em;margin-bottom:6px;}
  #upgradePanel .res{font-size:13px;letter-spacing:.12em;opacity:.75;margin-bottom:26px;}
  #upgradePanel .upgrades{display:flex;flex-direction:column;gap:14px;}
  #upgradePanel .upg{border:1px solid rgba(43,39,34,.15);border-radius:14px;padding:16px 20px;
    cursor:pointer;transition:all .3s;background:rgba(255,255,255,.3);}
  #upgradePanel .upg:hover{border-color:#c9a24b;background:rgba(201,162,75,.12);}
  #upgradePanel .upg.locked{opacity:.45;cursor:default;pointer-events:none;}
  #upgradePanel .upg .title{font-size:16px;letter-spacing:.12em;margin-bottom:6px;font-weight:500;}
  #upgradePanel .upg .cost{font-size:12px;opacity:.7;margin-bottom:8px;}
  #upgradePanel .upg .desc{font-size:13px;opacity:.85;line-height:1.6;}
  #upgradePanel .close{position:absolute;top:24px;right:28px;cursor:pointer;opacity:.5;
    font-size:26px;transition:opacity .3s;}
  #upgradePanel .close:hover{opacity:1;}
  `;
  const s=$('style');s.textContent=css;document.head.appendChild(s);
}

function buildDOM(){
  if(root) return;
  injectStyle();
  root=$('div','',document.body); root.id='upgradePanel';
  root.innerHTML=`
    <div class="hdr">Farm Upgrades · 基建升级</div>
    <h3>农场发展</h3>
    <div class="res"></div>
    <div class="upgrades"></div>
    <div class="close">×</div>
  `;
  root.querySelector('.close').onclick=()=>close();
}

const UPGRADES=[
  {id:'workshop_2',name:'工坊 II 级',cost:{wood:8,soul:2},unlock:'unlock_cards_tier2',
   desc:'解锁更强的锻造配方,攻防基础值提升 40%'},
  {id:'workshop_3',name:'工坊 III 级',cost:{wood:16,soul:4},unlock:'unlock_cards_tier3',req:'workshop_2',
   desc:'解锁顶级配方,攻防基础值提升 80%,必出词条'},
  {id:'farmland_2',name:'农田扩建 II',cost:{wood:10,soul:1},unlock:'expand_farmland',
   desc:'新增 20 块可耕种土地,增加产出'},
  {id:'beast_capacity',name:'灵兽栖地',cost:{wood:12,soul:3},unlock:'more_beasts',
   desc:'最多同时拥有 4 只灵兽协助农场'},
];

function render(){
  const f=window.Terra?.farm;
  if(!f){ close(); return; }
  const wood=f.inventory.materials.wood||0, soul=f.inventory.materials.beast_soul||0;
  root.querySelector('.res').textContent=`库存 · 木材 ${wood} · 灵兽灵魂 ${soul}`;
  const upgs=root.querySelector('.upgrades'); upgs.innerHTML='';
  UPGRADES.forEach(u=>{
    const owned=f.upgrades?.includes(u.id);
    const reqMet=!u.req || f.upgrades?.includes(u.req);
    const canBuy=!owned && reqMet && wood>=u.cost.wood && soul>=u.cost.soul;
    const div=$('div','upg',upgs);
    div.classList.toggle('locked',!canBuy && !owned);
    div.innerHTML=`
      <div class="title">${u.name} ${owned?'✓ 已拥有':''}</div>
      <div class="cost">消耗 · 木材×${u.cost.wood} 灵兽灵魂×${u.cost.soul}</div>
      <div class="desc">${u.desc}</div>
    `;
    if(canBuy) div.onclick=()=>buy(u);
  });
}

function buy(u){
  const f=window.Terra?.farm; if(!f) return;
  f.inventory.materials.wood-=u.cost.wood;
  f.inventory.materials.beast_soul-=u.cost.soul;
  if(!f.upgrades) f.upgrades=[];
  f.upgrades.push(u.id);
  window.Terra.save();
  if(window.updateDock) updateDock();
  alert(`升级完成: ${u.name}`);
  render();
}

function open(){
  buildDOM(); render();
  root.classList.add('on');
}

function close(){
  if(!root) return;
  root.classList.remove('on');
}

window.FarmUpgrade={open,close};
})();
