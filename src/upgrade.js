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
    rgba(8,10,14,.72);
    backdrop-filter:blur(10px) saturate(1.08);}
  #upgradePanel::after{content:'';position:absolute;inset:18px;border:1px solid rgba(236,201,126,.18);
    border-radius:28px;pointer-events:none;box-shadow:inset 0 0 80px rgba(0,0,0,.34);}
  #upgradePanel.panel-on{opacity:1;pointer-events:auto;transform:scale(1);}
  #upgradePanel .shell{position:relative;width:min(1040px,100%);height:min(680px,calc(100vh - 42px));
    display:grid;grid-template-columns:minmax(0,1.05fr) 330px;gap:22px;padding:24px;
    box-sizing:border-box;overflow:hidden;}
  #upgradePanel .left{display:flex;flex-direction:column;min-width:0;min-height:0;}
  #upgradePanel .hdr{font-size:11px;letter-spacing:.52em;text-transform:uppercase;color:#dec48a;opacity:.82;margin-bottom:10px;}
  #upgradePanel h3{font-weight:400;font-size:clamp(34px,4vw,54px);line-height:1;letter-spacing:.16em;margin:0 0 12px;
    color:#f4d79b;text-shadow:0 10px 34px rgba(0,0,0,.55),0 0 24px rgba(244,208,120,.18);}
  #upgradePanel .res{display:flex;gap:10px;flex-wrap:wrap;margin:4px 0 14px;font-size:12px;letter-spacing:.08em;}
  #upgradePanel .pill{border:1px solid rgba(236,201,126,.3);border-radius:999px;padding:8px 14px;background:rgba(255,241,205,.07);color:#f3e4c6;}
  #upgradePanel .upgrades{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;overflow:auto;padding:2px 4px 4px 0;min-height:0;}
  #upgradePanel .upgrades::-webkit-scrollbar{width:6px;} #upgradePanel .upgrades::-webkit-scrollbar-thumb{background:rgba(236,201,126,.35);border-radius:999px;}
  #upgradePanel .upg{min-height:158px;border:1px solid rgba(225,184,103,.34);border-radius:18px;padding:18px 20px;
    cursor:pointer;transition:transform .25s cubic-bezier(.2,.85,.2,1),box-shadow .25s cubic-bezier(.2,.85,.2,1),border-color .25s cubic-bezier(.2,.85,.2,1),background .25s cubic-bezier(.2,.85,.2,1);
    background:linear-gradient(155deg,rgba(255,241,202,.12),rgba(255,255,255,.035));
    box-shadow:0 12px 34px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.08);position:relative;overflow:hidden;}
  #upgradePanel .upg::before{content:'';position:absolute;inset:-40% -20% auto auto;width:140px;height:140px;border-radius:50%;
    background:radial-gradient(circle,rgba(244,208,117,.24),transparent 66%);opacity:.7;}
  #upgradePanel .upg:hover{transform:translateY(-4px);border-color:rgba(250,219,145,.72);box-shadow:0 20px 54px rgba(0,0,0,.42),0 0 28px rgba(244,208,117,.13);,inset 0 0 0 1px rgba(244,208,117,.18);}
  #upgradePanel .upg:active{transform:translateY(-2px);}
  #upgradePanel .upg.locked{opacity:.56;cursor:default;filter:saturate(.65);} #upgradePanel .upg.locked:hover{transform:none;box-shadow:0 12px 34px rgba(0,0,0,.28);}
  #upgradePanel .upg.owned{border-color:rgba(135,211,153,.55);background:linear-gradient(155deg,rgba(126,211,143,.14),rgba(255,255,255,.035));}
  #upgradePanel .upg .title{position:relative;font-size:18px;font-size:19px;letter-spacing:.1em;margin-bottom:7px;font-weight:600;color:#fff3d2;}
  #upgradePanel .upg .cost{position:relative;font-size:12px;opacity:.78;margin-bottom:8px;letter-spacing:.06em;color:#d7c3a0;}
  #upgradePanel .upg .desc{position:relative;font-size:13px;font-size:13.5px;opacity:.9;line-height:1.75;letter-spacing:.02em;color:#f1e7d3;}
  #upgradePanel .buy{position:absolute;right:16px;bottom:14px;border:1px solid rgba(244,208,117,.54);border-radius:999px;padding:9px 16px;
    font-size:11px;letter-spacing:.18em;font-size:12px;letter-spacing:.2em;color:#251d13;background:linear-gradient(135deg,#f6daa0,#c99a45);box-shadow:0 8px 22px rgba(0,0,0,.28);}
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
  #upgradePanel .close{position:absolute;top:18px;right:18px;cursor:pointer;z-index:10;width:42px;height:42px;display:grid;place-items:center;
    border-radius:50%;border:1px solid rgba(236,201,126,.36);background:rgba(20,16,12,.55);color:#f7dfae;font-size:28px;transition:all .25s cubic-bezier(.2,.85,.2,1);}
  #upgradePanel .close:hover{transform:scale(1.12) rotate(90deg);background:rgba(244,208,117,.18);box-shadow:0 0 22px rgba(244,208,117,.18);}
  #upgradePanel .toast{position:absolute;left:50%;top:28px;transform:translate(-50%,-12px) scale(.96);min-width:min(460px,calc(100% - 84px));
    border:1px solid rgba(244,208,117,.48);border-radius:18px;padding:14px 18px;background:linear-gradient(180deg,rgba(45,32,22,.96),rgba(17,13,14,.96));
    color:#f8e6bd;text-align:center;box-shadow:0 18px 55px rgba(0,0,0,.5);opacity:0;pointer-events:none;transition:opacity .25s ease,transform .25s ease;z-index:4;}
  #upgradePanel .toast.on{opacity:1;transform:translate(-50%,0) scale(1);}
  #upgradePanel .toast .tt{font-size:16px;letter-spacing:.14em;color:#f4d075;margin-bottom:4px;}
  #upgradePanel .toast .tb{font-size:12px;letter-spacing:.06em;line-height:1.6;color:#e5d4b7;}
  @media (max-width:760px){#upgradePanel{padding:12px;}#upgradePanel .shell{height:calc(100vh - 24px);grid-template-columns:1fr;padding:18px;}#upgradePanel .side{display:none;}#upgradePanel .upgrades{grid-template-columns:1fr;}#upgradePanel h3{font-size:34px;}}
  `;
  const s=$('style');s.textContent=css;document.head.appendChild(s);
}

function buildDOM(){
  if(root) return;
  injectStyle();
  root=$('div','',document.body); root.id='upgradePanel';
  root.innerHTML=`
    <div class="shell panel-parchment">
      <div class="left">
        <div class="panel-header">
          <div class="panel-kicker">Farm Atelier · 基建蓝图</div>
          <h3 class="panel-title">工坊升级</h3>
        </div>
        <div class="res"></div>
        <div class="upgrades panel-scroll"></div>
      </div>
      <aside class="side">
        <div class="blueprint">
          <div class="sigil">⚒</div>
          <h4>大地工坊</h4>
          <p>把深渊战利品转化成农场生产力。工坊越强，作物产地、卡牌锻造与灵兽劳作会更快形成正循环。</p>
        </div>
        <div class="tip">选择一张蓝图即可升级；锁定项会显示缺少的前置或资源。这里不再使用会裁屏的小弹窗，而是完整游戏菜单。</div>
      </aside>
      <div class="panel-close close">×</div>
      <div class="panel-toast toast"><div class="panel-toast-title tt"></div><div class="panel-toast-body tb"></div></div>
    </div>
  `;
  root.querySelector('.panel-close').onclick=()=>close();
}

const UPGRADES=[
  {id:'workshop_2',name:'工坊 II 级',cost:{wood:8,soul:2},unlock:'unlock_cards_tier2',
   desc:'锻造倍率 +10%, 产出卡牌追加「工坊精炼」词条'},
  {id:'workshop_3',name:'工坊 III 级',cost:{wood:16,soul:4},unlock:'unlock_cards_tier3',req:'workshop_2',
   desc:'锻造倍率 +18%, 工艺固定高阶,追加「大师铭刻」'},
  {id:'farmland_2',name:'农田扩建 II',cost:{wood:10,soul:1},unlock:'expand_farmland',
   desc:'每次收获额外获得 星麦×1,让锻造循环更快启动'},
  {id:'beast_capacity',name:'灵兽栖地',cost:{wood:12,soul:3},unlock:'more_beasts',
   desc:'水灵兽灌溉时间缩短,更快触发生长加速'},
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

function showToast(title, body){
  const toast=root?.querySelector('.toast'); if(!toast) return;
  toast.querySelector('.tt').textContent=title;
  toast.querySelector('.tb').textContent=body||'';
  toast.classList.add('on');
  clearTimeout(showToast._timer);
  showToast._timer=setTimeout(()=>toast.classList.remove('on'),1500);
}

function buy(u){
  const f=window.Terra?.farm; if(!f) return;
  f.inventory.materials.wood-=u.cost.wood;
  f.inventory.materials.beast_soul-=u.cost.soul;
  if(!f.upgrades) f.upgrades=[];
  f.upgrades.push(u.id);
  window.Terra.save();
  if(window.updateDock) updateDock();

  // 升级完成特效：金色粒子爆发
  spawnUpgradeParticles();

  showToast('升级完成', `${u.name} 已写入大地工坊蓝图。`);
  render();
}

function spawnUpgradeParticles(){
  const centerX=window.innerWidth/2, centerY=window.innerHeight/2;
  for(let i=0;i<24;i++){
    const p=document.createElement('div');
    p.style.cssText=`position:fixed;left:${centerX}px;top:${centerY}px;width:${6+Math.random()*8}px;height:${6+Math.random()*8}px;border-radius:50%;background:#f4d03f;pointer-events:none;z-index:95;box-shadow:0 0 8px #f4d03f`;
    document.body.appendChild(p);
    const ang=Math.random()*Math.PI*2,speed=100+Math.random()*200;
    const vx=Math.cos(ang)*speed,vy=Math.sin(ang)*speed-120;
    const t0=performance.now();
    (function anim(){
      const dt=(performance.now()-t0)/1000;
      if(dt>1.2){p.remove();return;}
      const px=centerX+vx*dt,py=centerY+vy*dt+350*dt*dt;
      p.style.left=px+'px';p.style.top=py+'px';
      p.style.opacity=Math.max(0,1-dt*0.83);
      requestAnimationFrame(anim);
    })();
  }
}

function open(){
  buildDOM(); render();
  root.classList.add('panel-on');
}

function close(){
  if(!root) return;
  root.classList.remove('panel-on');
}

window.FarmUpgrade={open,close};
})();
