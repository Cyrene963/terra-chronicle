/* =========================================================
   Terra Chronicle — 深渊路线图 (Roguelike Map)
   Slay-the-Spire 风格节点图:玩家选择路径前进。
   节点类型:战斗/精英/休息/商店/BOSS。
   ========================================================= */
'use strict';
(function(){
const $=(t,c,p)=>{const e=document.createElement(t);if(c)e.className=c;if(p)p.appendChild(e);return e;};

let root=null, injected=false, mapData=null, progress={floor:0,path:[]};

function injectStyle(){
  if(injected) return; injected=true;
  const css=`
  #dungeonMap{position:fixed;inset:0;z-index:85;display:none;opacity:0;
    transition:opacity .45s cubic-bezier(.2,.8,.2,1);
    background:radial-gradient(ellipse at 50% 40%,rgba(26,22,37,.95),rgba(13,10,20,.98));
    backdrop-filter:blur(20px);
    font-family:'Noto Serif SC',serif;color:#f6f1e7;overflow:auto;}
  #dungeonMap.on{display:block;opacity:1;animation:mapIn .5s cubic-bezier(.34,1.56,.64,1);}
  @keyframes mapIn{0%{transform:scale(.85);opacity:0}100%{transform:scale(1);opacity:1}}
  #dungeonMap .header{padding:32px 40px;text-align:center;}
  #dungeonMap .header h2{font-size:28px;letter-spacing:.24em;font-weight:400;margin-bottom:12px;
    background:linear-gradient(135deg,#f6f1e7 0%,#c9a24b 100%);
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
  #dungeonMap .header .sub{font-size:12px;letter-spacing:.45em;opacity:.65;text-transform:uppercase;
    font-family:'Cormorant Garamond',serif;}
  #dungeonMap .mapCanvas{position:relative;width:900px;height:600px;margin:0 auto 40px;padding:40px 0;}
  #dungeonMap .node{position:absolute;width:84px;height:84px;border-radius:50%;cursor:pointer;
    border:1.5px solid rgba(246,241,231,.25);
    background:rgba(246,241,231,.04);
    backdrop-filter:blur(12px) saturate(1.2);
    box-shadow:0 8px 32px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08);
    display:flex;align-items:center;justify-content:center;
    transition:all .3s cubic-bezier(.34,1.56,.64,1);flex-direction:column;gap:4px;}
  #dungeonMap .node:hover{transform:scale(1.18);border-color:rgba(201,162,75,.8);
    box-shadow:0 12px 40px rgba(201,162,75,.5),inset 0 1px 0 rgba(255,255,255,.15);}
  #dungeonMap .node.locked{opacity:.35;cursor:default;pointer-events:none;}
  #dungeonMap .node.current{border-color:#c9a24b;border-width:2px;
    box-shadow:0 0 24px rgba(201,162,75,.7),0 8px 32px rgba(0,0,0,.4);}
  #dungeonMap .node .icon{font-size:32px;filter:drop-shadow(0 2px 8px rgba(0,0,0,.4));}
  #dungeonMap .node .label{font-size:10px;letter-spacing:.18em;opacity:.8;margin-top:2px;}
  #dungeonMap .path{position:absolute;height:2px;background:rgba(246,241,231,.15);transform-origin:left center;}
  #dungeonMap .closeBtn{position:absolute;top:28px;right:36px;font-size:28px;cursor:pointer;opacity:.5;
    transition:all .3s;color:#f6f1e7;width:40px;height:40px;display:flex;align-items:center;justify-content:center;
    border-radius:50%;border:1px solid rgba(246,241,231,.2);background:rgba(246,241,231,.05);
    backdrop-filter:blur(10px);}
  #dungeonMap .closeBtn:hover{opacity:1;transform:scale(1.1);border-color:rgba(246,241,231,.4);}
  `;
  const s=$('style');s.textContent=css;document.head.appendChild(s);
}

function generateMap(){
  // 生成 3 层,每层 3-4 个节点,最后一层 BOSS
  const floors=[[],[],[]];
  const types=['combat','combat','elite','rest'];
  for(let f=0;f<2;f++){
    const n=3+(Math.random()<.5?1:0);
    for(let i=0;i<n;i++) floors[f].push({type:types[(Math.random()*types.length)|0], id:f+'_'+i});
  }
  floors[2].push({type:'boss',id:'2_0'});
  return floors;
}

function buildDOM(){
  if(root) return;
  injectStyle();
  root=$('div','',document.body); root.id='dungeonMap';
  root.innerHTML=`
    <div class="header">
      <h2>深渊路线图</h2>
      <div class="sub">选择你的道路 · 每个节点都是考验</div>
    </div>
    <div class="mapCanvas"></div>
    <div class="closeBtn">×</div>
  `;
  root.querySelector('.closeBtn').onclick=()=>close();
}

function renderMap(){
  const canvas=root.querySelector('.mapCanvas');
  canvas.innerHTML='';
  const cw=900, ch=600, floors=mapData.length;
  const fh=ch/(floors+1);

  mapData.forEach((floor,fi)=>{
    const y=fh*(fi+1);
    const nw=cw/(floor.length+1);
    floor.forEach((node,ni)=>{
      const x=nw*(ni+1);
      // 画路径(连接到下一层所有节点)
      if(fi<floors-1){
        mapData[fi+1].forEach((nextNode,nni)=>{
          const nx=cw/(mapData[fi+1].length+1)*(nni+1), ny=fh*(fi+2);
          const dx=nx-x, dy=ny-y, len=Math.hypot(dx,dy), ang=Math.atan2(dy,dx)*180/Math.PI;
          const path=$('div','path',canvas);
          path.style.left=x+'px'; path.style.top=y+'px';
          path.style.width=len+'px'; path.style.transform=`rotate(${ang}deg)`;
        });
      }
      // 画节点
      const locked = fi>progress.floor || (fi===progress.floor && progress.path.includes(node.id));
      const current = fi===progress.floor && !progress.path.includes(node.id);
      const nd=$('div','node',canvas);
      nd.classList.toggle('locked',locked);
      nd.classList.toggle('current',current);
      nd.style.left=(x-40)+'px'; nd.style.top=(y-40)+'px';
      const icons={combat:'⚔️',elite:'👹',rest:'🔥',boss:'💀'};
      const labels={combat:'战斗',elite:'精英',rest:'休息',boss:'BOSS'};
      nd.innerHTML=`<div class="icon">${icons[node.type]||'?'}</div><div class="label">${labels[node.type]||node.type}</div>`;
      if(!locked) nd.onclick=()=>selectNode(node);
    });
  });
}

function selectNode(node){
  progress.path.push(node.id);
  if(node.type==='combat' || node.type==='elite' || node.type==='boss'){
    close();
    // 触发战斗(boss 更强)
    const isBoss=node.type==='boss', isElite=node.type==='elite';
    window.Battle.enter({
      deck: window.Terra?.farm?.inventory?.cards||[],
      isBoss, isElite,
      onWin(loot){
        if(!loot) loot={};
        if(isBoss){ loot.blight_seed=(loot.blight_seed||0)+3; loot.beast_soul=(loot.beast_soul||0)+2; }
        else if(isElite){ loot.blight_seed=(loot.blight_seed||0)+2; loot.beast_soul=(loot.beast_soul||0)+1; }
        else { loot.blight_seed=(loot.blight_seed||0)+1; }
        if(window.Terra && window.Terra.farm){
          const f=window.Terra.farm;
          f.inventory.materials.blight_seed=(f.inventory.materials.blight_seed||0)+(loot.blight_seed||0);
          f.inventory.materials.beast_soul=(f.inventory.materials.beast_soul||0)+(loot.beast_soul||0);
          window.Terra.save();
        }
        progress.floor++;
        if(progress.floor>=mapData.length){ alert('深渊征服!回到农场休整。'); return; }
        open();
      },
      onLose(){
        alert('战败!回到农场休养生息。');
      }
    });
  } else if(node.type==='rest'){
    alert('你在篝火旁休息,恢复了体力。'); // TODO: 恢复机制
    progress.floor++;
    if(progress.floor>=mapData.length){ alert('深渊征服!'); close(); return; }
    renderMap();
  }
}

function open(){
  buildDOM();
  if(!mapData){ mapData=generateMap(); progress={floor:0,path:[]}; }
  renderMap();
  root.classList.add('on');
}

function close(){
  if(!root) return;
  root.classList.remove('on');
  setTimeout(()=>{if(root)root.style.display='none';},500);
}

window.DungeonMap = { open, close };
})();
