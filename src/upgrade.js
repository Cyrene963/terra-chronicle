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
  #upgradePanel{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%) scale(.85);z-index:88;
    width:min(580px,92vw);
    background:linear-gradient(135deg, #f4ecd8 0%, #e8dcbf 100%);
    border:3px double #8b7355;
    border-radius:8px;padding:44px 46px;
    box-shadow:0 40px 100px rgba(0,0,0,.6),inset 0 0 60px rgba(139,115,85,.1);
    opacity:0;pointer-events:none;
    transition:opacity .4s,transform .4s cubic-bezier(.34,1.56,.64,1);
    font-family:'Cormorant Garamond',serif;color:#2a2520;
    position:relative;}
  #upgradePanel::before{content:'';position:absolute;inset:8px;border:1px solid rgba(212,175,55,.5);
    border-radius:4px;pointer-events:none;}
  #upgradePanel::after{content:'';position:absolute;top:12px;left:12px;width:40px;height:40px;
    border-left:2px solid #d4af37;border-top:2px solid #d4af37;pointer-events:none;}
  #upgradePanel .ornament-br{position:absolute;bottom:12px;right:12px;width:40px;height:40px;
    border-right:2px solid #d4af37;border-bottom:2px solid #d4af37;pointer-events:none;}
  #upgradePanel.on{opacity:1;pointer-events:auto;transform:translate(-50%,-50%) scale(1);}
  #upgradePanel .hdr{font-size:12px;letter-spacing:.8em;
    color:#8b7355;text-transform:uppercase;margin-bottom:14px;font-style:italic;}
  #upgradePanel h3{font-weight:400;font-size:38px;letter-spacing:.2em;margin-bottom:10px;
    color:#d4af37;text-shadow:0 2px 8px rgba(0,0,0,.2);}
  #upgradePanel .res{font-size:14px;letter-spacing:.12em;opacity:.75;margin-bottom:30px;
    font-family:'Noto Serif SC',serif;}
  #upgradePanel .upgrades{display:flex;flex-direction:column;gap:18px;}
  #upgradePanel .upg{
    border:2px solid #d4af37;border-radius:6px;padding:20px 24px;
    cursor:pointer;
    transition:all .35s cubic-bezier(.34,1.56,.64,1);
    background:linear-gradient(135deg, rgba(244,236,216,.4), rgba(232,220,191,.5));
    box-shadow:0 4px 12px rgba(0,0,0,.15),inset 0 1px 0 rgba(255,255,255,.3);
    position:relative;}
  #upgradePanel .upg::before{content:'';position:absolute;inset:-6px;border:1px solid #d4af37;
    border-radius:8px;opacity:0;transition:opacity .3s;}
  #upgradePanel .upg:hover{
    background:linear-gradient(135deg, rgba(212,175,55,.2), rgba(201,162,75,.15));
    transform:translateY(-3px);
    box-shadow:0 0 24px rgba(212,175,55,.4),0 8px 24px rgba(0,0,0,.2);}
  #upgradePanel .upg:hover::before{opacity:1;}
  #upgradePanel .upg.locked{opacity:.35;cursor:default;pointer-events:none;}
  #upgradePanel .upg .title{font-size:20px;letter-spacing:.16em;margin-bottom:10px;font-weight:500;
    color:#2a2520;}
  #upgradePanel .upg .cost{font-size:13px;opacity:.7;margin-bottom:12px;letter-spacing:.08em;
    font-family:'Noto Serif SC',serif;}
  #upgradePanel .upg .desc{font-size:15px;opacity:.85;line-height:1.8;letter-spacing:.03em;
    font-family:'Noto Serif SC',serif;}
  #upgradePanel .close{position:absolute;top:32px;right:36px;cursor:pointer;
    font-size:28px;transition:all .3s;width:40px;height:40px;display:flex;align-items:center;justify-content:center;
    border-radius:50%;border:2px solid #d4af37;background:rgba(244,236,216,.6);
    color:#2a2520;opacity:.6;box-shadow:0 4px 12px rgba(0,0,0,.2);}
  #upgradePanel .close:hover{opacity:1;transform:scale(1.15);
    box-shadow:0 0 16px rgba(212,175,55,.5),0 4px 12px rgba(0,0,0,.3);}
  `;
  const s=$('style');s.textContent=css;document.head.appendChild(s);
  // Inject corner ornaments into DOM
  setTimeout(()=>{
    const panel=document.getElementById('upgradePanel');
    if(panel && !panel.querySelector('.ornament-br')){
      const ornament=document.createElement('div');
      ornament.className='ornament-br';
      panel.appendChild(ornament);
    }
  },100);
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
