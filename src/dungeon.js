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
    background:linear-gradient(180deg, #1a1612 0%, #0a0810 100%);
    font-family:'Cormorant Garamond',serif;color:#f4ecd8;overflow:auto;}
  #dungeonMap.on{display:block;opacity:1;animation:mapIn .5s cubic-bezier(.34,1.56,.64,1);}
  @keyframes mapIn{0%{transform:scale(.85);opacity:0}100%{transform:scale(1);opacity:1}}
  #dungeonMap .header{padding:38px 40px;text-align:center;
    border-bottom:2px solid rgba(212,175,55,.3);
    background:linear-gradient(180deg, rgba(244,236,216,.08) 0%, transparent 100%);
    position:relative;z-index:1;}
  #dungeonMap .header h2{font-size:36px;letter-spacing:.28em;font-weight:400;margin-bottom:14px;
    color:#f4d03f;text-shadow:0 3px 12px rgba(0,0,0,.9), 0 0 24px rgba(244,208,63,.5), 0 6px 20px rgba(0,0,0,.7);}
  #dungeonMap .header .sub{font-size:13px;letter-spacing:.5em;opacity:.7;text-transform:uppercase;
    font-style:italic;color:#c9a561;}
  #dungeonMap .mapCanvas{position:relative;width:900px;height:600px;margin:0 auto 40px;padding:40px 0;z-index:1;}
  #dungeonMap .node{position:absolute;width:120px;height:120px;border-radius:50%;cursor:pointer;
    border:2px solid #d4af37;
    background:linear-gradient(135deg, rgba(244,236,216,.12) 0%, rgba(232,220,191,.08) 100%);
    box-shadow:0 10px 40px rgba(0,0,0,.7),inset 0 1px 0 rgba(244,236,216,.15),0 0 30px rgba(212,175,55,.2);
    display:flex;align-items:center;justify-content:center;
    transition:all .3s cubic-bezier(.34,1.56,.64,1);flex-direction:column;gap:4px;
    position:relative;}
  #dungeonMap .node::before{content:'';position:absolute;inset:-4px;border-radius:50%;
    border:1px solid rgba(212,175,55,.4);opacity:0;transition:opacity .3s;}
  #dungeonMap .node:hover{transform:scale(1.2);
    box-shadow:0 12px 48px rgba(212,175,55,.4),inset 0 1px 0 rgba(244,236,216,.25),0 0 40px rgba(212,175,55,.5),0 6px 30px rgba(0,0,0,.8);}
  #dungeonMap .node:hover::before{opacity:1;}
  #dungeonMap .node.locked{opacity:.25;cursor:default;pointer-events:none;}
  #dungeonMap .node.completed{opacity:.6;}
  #dungeonMap .node.completed::after{content:'✓';position:absolute;top:8px;right:8px;
    font-size:24px;color:#4ade80;font-weight:bold;
    text-shadow:0 2px 8px rgba(0,0,0,.8),0 0 12px rgba(74,222,128,.6);}
  #dungeonMap .node.current{border-color:#f4d03f;border-width:3px;
    box-shadow:0 0 32px rgba(244,208,63,.8),0 10px 40px rgba(0,0,0,.7),inset 0 1px 0 rgba(244,236,216,.25);
    animation:goldPulse 2s ease-in-out infinite;}
  @keyframes goldPulse{0%,100%{box-shadow:0 0 32px rgba(244,208,63,.8),0 10px 40px rgba(0,0,0,.7)}
    50%{box-shadow:0 0 48px rgba(244,208,63,1),0 10px 40px rgba(0,0,0,.7)}}
  #dungeonMap .node .icon{width:48px;height:48px;filter:drop-shadow(0 3px 16px rgba(0,0,0,.8));}
  #dungeonMap .node .label{font-size:11px;letter-spacing:.2em;opacity:.85;margin-top:3px;
    font-family:'Noto Serif SC',serif;color:#e8dcbf;}
  #dungeonMap .path{position:absolute;height:2px;
    background:linear-gradient(90deg, transparent, rgba(244,208,63,0.7), transparent);
    transform-origin:left center;
    box-shadow:0 0 8px rgba(244,208,63,0.5);}
  #dungeonMap .closeBtn{position:absolute;top:32px;right:40px;font-size:32px;cursor:pointer;
    color:#d4af37;opacity:.6;transition:all .3s;
    width:44px;height:44px;display:flex;align-items:center;justify-content:center;
    border-radius:50%;border:2px solid rgba(212,175,55,.4);
    background:linear-gradient(135deg, rgba(244,236,216,.08), rgba(232,220,191,.04));
    box-shadow:0 4px 16px rgba(0,0,0,.3),inset 0 1px 0 rgba(244,236,216,.1);z-index:2;}
  #dungeonMap .closeBtn:hover{opacity:1;transform:scale(1.12);
    border-color:#d4af37;box-shadow:0 0 20px rgba(212,175,55,.4),0 4px 16px rgba(0,0,0,.4),0 6px 24px rgba(0,0,0,.6);}
  `;
  const s=$('style');s.textContent=css;document.head.appendChild(s);
}

function generateMap(){
  // 3 floors, vertical linear progression: 1-2 nodes per floor, BOSS at end
  const floors=[[],[],[]];
  const types=['combat','elite','rest'];

  // Floor 0: 2 combat nodes
  floors[0].push({type:'combat', id:'0_0'});
  floors[0].push({type:'combat', id:'0_1'});

  // Floor 1: 1 elite or rest node
  floors[1].push({type:types[(Math.random()*types.length)|0], id:'1_0'});

  // Floor 2: BOSS
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
  const centerX=450; // Center of 900px canvas
  const startY=100;
  const floorSpacing=200;

  mapData.forEach((floor,fi)=>{
    floor.forEach((node,ni)=>{
      const x=centerX;
      const y=startY + fi * floorSpacing + (ni * 80); // Slight offset for multiple nodes on same floor

      // Draw path to next floor nodes (only if not last floor)
      if(fi<mapData.length-1){
        mapData[fi+1].forEach((nextNode,nni)=>{
          const nx=centerX;
          const ny=startY + (fi+1) * floorSpacing + (nni * 80);
          const dx=nx-x, dy=ny-y, len=Math.hypot(dx,dy), ang=Math.atan2(dy,dx)*180/Math.PI;
          const path=$('div','path',canvas);
          path.style.left=x+'px';
          path.style.top=y+'px';
          path.style.width=len+'px';
          path.style.transform=`rotate(${ang}deg)`;
        });
      }

      // Draw node
      const completed = progress.path.includes(node.id);
      const locked = fi>progress.floor || (fi===progress.floor && completed);
      const current = fi===progress.floor && !completed;

      const nd=$('div','node',canvas);
      nd.classList.toggle('locked',locked);
      nd.classList.toggle('current',current);
      nd.classList.toggle('completed',completed);
      nd.style.left=(x-60)+'px'; // Center 120px node
      nd.style.top=(y-60)+'px';

      const icons={combat:'icon_combat.png',elite:'⚔️',rest:'🔥',boss:'icon_boss.png'};
      const labels={combat:'战斗',elite:'精英',rest:'休息',boss:'BOSS'};
      const iconHTML = (icons[node.type]||'?').endsWith('.png')
        ? `<img src="assets/ui/${icons[node.type]}" class="icon" alt="${labels[node.type]||node.type}"/>`
        : `<div class="icon" style="font-size:48px;">${icons[node.type]||'?'}</div>`;
      nd.innerHTML=`${iconHTML}<div class="label">${labels[node.type]||node.type}</div>`;

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
