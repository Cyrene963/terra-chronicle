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
  #upgradePanel{position:fixed;inset:0;z-index:88;display:grid;place-items:center;
    padding:clamp(18px,3vw,46px);box-sizing:border-box;opacity:0;pointer-events:none;
    transform:scale(1.02);transition:opacity .35s ease,transform .45s cubic-bezier(.2,.85,.2,1);
    font-family:'Noto Serif SC',serif;color:#f7edda;overflow:hidden;}
  #upgradePanel::before{content:'';position:absolute;inset:0;background:
    radial-gradient(circle at 12% 10%,rgba(236,184,79,.18),transparent 28%),
    radial-gradient(circle at 84% 78%,rgba(94,158,128,.2),transparent 34%),
    linear-gradient(135deg,rgba(16,13,10,.82),rgba(7,8,12,.9));
    backdrop-filter:blur(10px) saturate(1.08);}
  #upgradePanel::after{content:'';position:absolute;inset:18px;border:1px solid rgba(236,201,126,.18);
    border-radius:28px;pointer-events:none;box-shadow:inset 0 0 80px rgba(0,0,0,.34);}
  #upgradePanel.on{opacity:1;pointer-events:auto;transform:scale(1);}
  #upgradePanel .shell{position:relative;width:min(1040px,100%);height:min(680px,calc(100vh - 42px));
    display:grid;grid-template-columns:minmax(0,1.05fr) 330px;gap:22px;padding:24px;
    border:1px solid rgba(232,198,126,.32);border-radius:26px;background:
    linear-gradient(145deg,rgba(47,35,24,.78),rgba(20,17,16,.78));
    box-shadow:0 34px 120px rgba(0,0,0,.62),inset 0 1px 0 rgba(255,244,216,.16);box-sizing:border-box;overflow:hidden;}
  #upgradePanel .left{display:flex;flex-direction:column;min-width:0;min-height:0;}
  #upgradePanel .hdr{font-size:11px;letter-spacing:.52em;text-transform:uppercase;color:#dec48a;opacity:.82;margin-bottom:10px;}
  #upgradePanel h3{font-weight:400;font-size:clamp(34px,4vw,54px);line-height:1;letter-spacing:.16em;margin:0 0 12px;
    color:#f4d79b;text-shadow:0 10px 34px rgba(0,0,0,.55),0 0 24px rgba(244,208,120,.18);}
  #upgradePanel .res{display:flex;gap:10px;flex-wrap:wrap;margin:4px 0 14px;font-size:12px;letter-spacing:.08em;}
  #upgradePanel .pill{border:1px solid rgba(236,201,126,.3);border-radius:999px;padding:7px 12px;background:rgba(255,241,205,.07);color:#f3e4c6;}
  #upgradePanel .upgrades{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;overflow:auto;padding:2px 4px 4px 0;min-height:0;}
  #upgradePanel .upgrades::-webkit-scrollbar{width:6px;} #upgradePanel .upgrades::-webkit-scrollbar-thumb{background:rgba(236,201,126,.35);border-radius:999px;}
  #upgradePanel .upg{min-height:148px;border:1px solid rgba(225,184,103,.34);border-radius:18px;padding:16px;
    cursor:pointer;transition:transform .25s ease,box-shadow .25s ease,border-color .25s ease,background .25s ease;
    background:linear-gradient(155deg,rgba(255,241,202,.12),rgba(255,255,255,.035));
    box-shadow:0 12px 34px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.08);position:relative;overflow:hidden;}
  #upgradePanel .upg::before{content:'';position:absolute;inset:-40% -20% auto auto;width:140px;height:140px;border-radius:50%;
    background:radial-gradient(circle,rgba(244,208,117,.24),transparent 66%);opacity:.7;}
  #upgradePanel .upg:hover{transform:translateY(-4px);border-color:rgba(250,219,145,.72);box-shadow:0 20px 54px rgba(0,0,0,.42),0 0 28px rgba(244,208,117,.13);}
  #upgradePanel .upg.locked{opacity:.56;cursor:default;filter:saturate(.65);} #upgradePanel .upg.locked:hover{transform:none;box-shadow:0 12px 34px rgba(0,0,0,.28);}
  #upgradePanel .upg.owned{border-color:rgba(135,211,153,.55);background:linear-gradient(155deg,rgba(126,211,143,.14),rgba(255,255,255,.035));}
  #upgradePanel .upg .title{position:relative;font-size:18px;letter-spacing:.1em;margin-bottom:7px;font-weight:600;color:#fff3d2;}
  #upgradePanel .upg .cost{position:relative;font-size:12px;opacity:.78;margin-bottom:8px;letter-spacing:.06em;color:#d7c3a0;}
  #upgradePanel .upg .desc{position:relative;font-size:13px;opacity:.9;line-height:1.75;letter-spacing:.02em;color:#f1e7d3;}
  #upgradePanel .buy{position:absolute;right:16px;bottom:14px;border:1px solid rgba(244,208,117,.54);border-radius:999px;padding:8px 13px;
    font-size:11px;letter-spacing:.18em;color:#251d13;background:linear-gradient(135deg,#f6daa0,#c99a45);box-shadow:0 8px 22px rgba(0,0,0,.28);}
  #upgradePanel .locked .buy{color:#d0bea0;background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.14);box-shadow:none;}
  #upgradePanel .side{border-left:1px solid rgba(236,201,126,.18);padding-left:22px;display:flex;flex-direction:column;justify-content:space-between;min-height:0;}
  #upgradePanel .blueprint{min-height:300px;border-radius:24px;border:1px solid rgba(236,201,126,.28);background:
    linear-gradient(160deg,rgba(238,205,140,.16),rgba(255,255,255,.03)),radial-gradient(circle at 50% 18%,rgba(236,201,126,.22),transparent 35%);
    display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:26px;box-shadow:inset 0 0 45px rgba(0,0,0,.22);}
  #upgradePanel .sigil{width:118px;height:118px;border-radius:32px;margin-bottom:22px;background:
    conic-gradient(from 45deg,rgba(244,208,117,.2),rgba(115,184,142,.25),rgba(244,208,117,.2));
    display:grid;place-items:center;font-size:54px;box-shadow:0 18px 50px rgba(0,0,0,.34),inset 0 0 28px rgba(244,208,117,.18);}
  #upgradePanel .side h4{font-size:24px;font-weight:400;letter-spacing:.2em;margin:0 0 12px;color:#ffe4aa;}
  #upgradePanel .side p{font-size:13px;line-height:1.9;color:#dcc9aa;margin:0;}
  #upgradePanel .tip{font-size:12px;line-height:1.9;color:#cdb891;opacity:.88;border-top:1px solid rgba(236,201,126,.16);padding-top:18px;}
  #upgradePanel .close{position:absolute;top:18px;right:18px;cursor:pointer;z-index:2;width:42px;height:42px;display:grid;place-items:center;
    border-radius:50%;border:1px solid rgba(236,201,126,.36);background:rgba(20,16,12,.55);color:#f7dfae;font-size:28px;transition:all .25s;}
  #upgradePanel .close:hover{transform:scale(1.08);background:rgba(244,208,117,.18);box-shadow:0 0 22px rgba(244,208,117,.18);}
  @media (max-width:760px){#upgradePanel{padding:12px;}#upgradePanel .shell{height:calc(100vh - 24px);grid-template-columns:1fr;padding:18px;}#upgradePanel .side{display:none;}#upgradePanel .upgrades{grid-template-columns:1fr;}#upgradePanel h3{font-size:34px;}}
  `;
  const s=$('style');s.textContent=css;document.head.appendChild(s);
}

function buildDOM(){
  if(root) return;
  injectStyle();
  root=$('div','',document.body); root.id='upgradePanel';
  root.innerHTML=`
    <div class="shell">
      <div class="left">
        <div class="hdr">Farm Atelier · 基建蓝图</div>
        <h3>工坊升级</h3>
        <div class="res"></div>
        <div class="upgrades"></div>
      </div>
      <aside class="side">
        <div class="blueprint">
          <div class="sigil">⚒</div>
          <h4>大地工坊</h4>
          <p>把深渊战利品转化成农场生产力。工坊越强，作物产地、卡牌锻造与灵兽劳作会更快形成正循环。</p>
        </div>
        <div class="tip">选择一张蓝图即可升级；锁定项会显示缺少的前置或资源。这里不再使用会裁屏的小弹窗，而是完整游戏菜单。</div>
      </aside>
      <div class="close">×</div>
    </div>
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
  const wood=f.inventory.materials.wood||0, soul=f.inventory.materials.beast_soul||0, seed=f.inventory.materials.blight_seed||0;
  f.upgrades ??= [];
  root.querySelector('.res').innerHTML=`<span class="pill">木材 ${wood}</span><span class="pill">灵兽灵魂 ${soul}</span><span class="pill">污染种子 ${seed}</span>`;
  const upgs=root.querySelector('.upgrades'); upgs.innerHTML='';
  UPGRADES.forEach(u=>{
    const owned=f.upgrades?.includes(u.id);
    const reqMet=!u.req || f.upgrades?.includes(u.req);
    const canBuy=!owned && reqMet && wood>=u.cost.wood && soul>=u.cost.soul;
    const div=$('div','upg',upgs);
    div.classList.toggle('locked',!canBuy && !owned);
    div.classList.toggle('owned',owned);
    const missing=[];
    if(u.req&&!reqMet) missing.push('需要 '+UPGRADES.find(x=>x.id===u.req)?.name);
    if(wood<u.cost.wood) missing.push(`木材差 ${u.cost.wood-wood}`);
    if(soul<u.cost.soul) missing.push(`灵魂差 ${u.cost.soul-soul}`);
    const status=owned?'已完成':canBuy?'升级':'锁定';
    div.innerHTML=`
      <div class="title">${u.name}</div>
      <div class="cost">消耗 · 木材×${u.cost.wood} 灵兽灵魂×${u.cost.soul}</div>
      <div class="desc">${u.desc}${missing.length?`<br><span style="color:#d6a987">${missing.join(' · ')}</span>`:''}</div>
      <div class="buy">${status}</div>
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
