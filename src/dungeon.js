/* =========================================================
   Terra Chronicle — 深渊路线图 (Roguelike Map)
   Slay-the-Spire 风格节点图:玩家选择路径前进。
   节点类型:战斗/精英/休息/商店/BOSS。
   ========================================================= */
'use strict';
(function(){
const $=(t,c,p)=>{const e=document.createElement(t);if(c)e.className=c;if(p)p.appendChild(e);return e;};

let root=null, injected=false, mapData=null, progress={floor:0,path:[]}, runBuffs=[];

function injectStyle(){
  if(injected) return; injected=true;
  const css=`
  #dungeonMap{position:fixed;inset:0;z-index:85;display:none;opacity:0;
    transition:opacity .45s cubic-bezier(.2,.8,.2,1);font-family:'Noto Serif SC',serif;color:#f4ecd8;overflow:hidden;
    background:url('assets/ui/dungeon_entrance_bg.jpg') center/cover,#100d12;}
  #dungeonMap::before{content:'';position:absolute;inset:0;background:
    radial-gradient(circle at 68% 24%,rgba(196,124,255,.22),transparent 30%),
    radial-gradient(circle at 18% 78%,rgba(236,183,82,.2),transparent 30%),
    linear-gradient(180deg,rgba(8,6,12,.42),rgba(6,6,10,.88));backdrop-filter:blur(3px) saturate(1.08);}
  #dungeonMap::after{content:'';position:absolute;inset:22px;border:1px solid rgba(244,208,117,.18);border-radius:30px;pointer-events:none;box-shadow:inset 0 0 90px rgba(0,0,0,.5);}
  #dungeonMap.on{display:block;opacity:1;animation:mapIn .55s cubic-bezier(.2,.9,.2,1);}
  @keyframes mapIn{0%{transform:scale(1.04);filter:blur(8px);opacity:0}100%{transform:scale(1);filter:blur(0);opacity:1}}
  #dungeonMap .header{position:absolute;left:44px;top:36px;z-index:2;max-width:420px;}
  #dungeonMap .eyebrow{font-size:11px;letter-spacing:.5em;color:#d5b777;text-transform:uppercase;opacity:.78;margin-bottom:10px;}
  #dungeonMap .header h2{font-size:clamp(42px,5vw,68px);line-height:.98;letter-spacing:.18em;font-weight:400;margin:0 0 14px;
    color:#f8d891;text-shadow:0 18px 45px rgba(0,0,0,.7),0 0 28px rgba(244,208,117,.2);}
  #dungeonMap .header .sub{font-size:13px;letter-spacing:.14em;line-height:1.9;opacity:.82;color:#e5d4b7;}
  #dungeonMap .legend{position:absolute;left:44px;bottom:38px;z-index:2;display:flex;gap:10px;flex-wrap:wrap;max-width:430px;}
  #dungeonMap .legend span{font-size:11px;letter-spacing:.12em;border:1px solid rgba(244,208,117,.24);border-radius:999px;padding:8px 12px;background:rgba(0,0,0,.24);backdrop-filter:blur(8px);}
  #dungeonMap .mapWrap{position:absolute;inset:28px 28px 28px 420px;z-index:1;display:grid;place-items:center;}
  #dungeonMap .mapCanvas{position:relative;width:min(760px,calc(100vw - 470px));height:min(650px,calc(100vh - 78px));min-width:460px;min-height:520px;
    border-radius:34px;border:1px solid rgba(244,208,117,.34);background:
    radial-gradient(circle at 68% 25%,rgba(150,75,225,.18),transparent 28%),
    radial-gradient(circle at 42% 58%,rgba(244,208,117,.12),transparent 42%),
    linear-gradient(145deg,rgba(91,62,36,.58),rgba(28,20,22,.66) 52%,rgba(12,10,16,.74));
    box-shadow:0 28px 95px rgba(0,0,0,.48),inset 0 1px 0 rgba(255,255,255,.08);overflow:hidden;}
  #dungeonMap .mapCanvas::before{content:'';position:absolute;inset:18px;border:1px solid rgba(244,208,117,.18);border-radius:26px;background:
    radial-gradient(circle at 25% 28%,rgba(255,226,158,.08),transparent 2px),radial-gradient(circle at 70% 38%,rgba(255,226,158,.08),transparent 2px),radial-gradient(circle at 56% 72%,rgba(166,111,255,.14),transparent 3px);}
  #dungeonMap .path{position:absolute;height:3px;background:linear-gradient(90deg,transparent,rgba(166,111,255,.22),rgba(255,226,158,.68),rgba(244,208,117,.52),transparent);
    transform-origin:left center;box-shadow:0 0 10px rgba(244,208,117,.18);border-radius:999px;opacity:.72;}
  #dungeonMap .node{position:absolute;width:124px;height:124px;border-radius:28px;cursor:pointer;border:1px solid rgba(244,208,117,.58);
    background:linear-gradient(155deg,rgba(83,52,28,.76),rgba(28,19,22,.78));box-shadow:0 18px 46px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,245,202,.16),inset 0 0 0 4px rgba(255,229,160,.05);
    display:flex;align-items:center;justify-content:center;transition:transform .28s ease,box-shadow .28s ease,border-color .28s ease;flex-direction:column;gap:7px;overflow:hidden;}
  #dungeonMap .node::before{content:'';position:absolute;inset:-45% -30% auto auto;width:150px;height:150px;border-radius:50%;background:radial-gradient(circle,rgba(244,208,117,.22),transparent 68%);}
  #dungeonMap .node:hover{transform:translateY(-8px) scale(1.04);border-color:#ffe0a0;box-shadow:0 28px 70px rgba(0,0,0,.58),0 0 32px rgba(244,208,117,.16);}
  #dungeonMap .node.locked{opacity:.34;cursor:default;pointer-events:none;filter:saturate(.55);}
  #dungeonMap .node.completed{opacity:.72;border-color:rgba(125,211,151,.5);}
  #dungeonMap .node.completed::after{content:'✓';position:absolute;top:10px;right:12px;font-size:22px;color:#8ee5a4;text-shadow:0 0 14px rgba(74,222,128,.6);}
  #dungeonMap .node.current{animation:nodePulse 2.2s ease-in-out infinite;border-color:#ffe0a0;}
  @keyframes nodePulse{0%,100%{box-shadow:0 18px 46px rgba(0,0,0,.45),0 0 22px rgba(244,208,117,.24)}50%{box-shadow:0 24px 62px rgba(0,0,0,.56),0 0 44px rgba(244,208,117,.42)}}
  #dungeonMap .node.elite{border-radius:50% 22% 50% 22%;} #dungeonMap .node.rest{border-radius:50%;} #dungeonMap .node.boss{width:148px;height:148px;border-radius:36px;border-width:2px;}
  #dungeonMap .node .icon{position:relative;width:44px;height:44px;filter:drop-shadow(0 8px 18px rgba(0,0,0,.75));}
  #dungeonMap .node .emoji{position:relative;font-size:42px;line-height:1;filter:drop-shadow(0 8px 18px rgba(0,0,0,.75));}
  #dungeonMap .node .label{position:relative;font-size:15px;letter-spacing:.12em;color:#fff4d0;font-weight:800;text-shadow:0 2px 8px rgba(0,0,0,.75);}
  #dungeonMap .node .reward{position:relative;font-size:11px;letter-spacing:.04em;color:#ffe2a8;opacity:1;text-align:center;max-width:108px;line-height:1.28;text-shadow:0 2px 8px rgba(0,0,0,.75);}
  #dungeonMap .node.current::after{content:'可选';position:absolute;top:9px;right:10px;font-size:10px;letter-spacing:.12em;color:#2a1b0d;background:#f4d075;border-radius:999px;padding:3px 7px;box-shadow:0 3px 10px rgba(0,0,0,.36);}
  #dungeonMap .closeBtn{position:absolute;top:36px;right:42px;font-size:32px;cursor:pointer;color:#f6d99d;opacity:.72;transition:all .25s;
    width:46px;height:46px;display:grid;place-items:center;border-radius:50%;border:1px solid rgba(244,208,117,.28);background:rgba(0,0,0,.26);z-index:2;}
  #dungeonMap .closeBtn:hover{opacity:1;transform:scale(1.08);background:rgba(244,208,117,.14);box-shadow:0 0 24px rgba(244,208,117,.18);}
  #dungeonToast{position:fixed;left:50%;top:12vh;transform:translate(-50%,-16px) scale(.96);z-index:140;min-width:min(520px,calc(100vw - 38px));max-width:680px;
    border:1px solid rgba(244,208,117,.42);border-radius:22px;padding:20px 24px;background:linear-gradient(180deg,rgba(41,29,24,.94),rgba(14,11,16,.96));
    color:#f9ebc8;text-align:center;box-shadow:0 24px 80px rgba(0,0,0,.58),inset 0 1px 0 rgba(255,255,255,.08);opacity:0;pointer-events:none;transition:opacity .28s ease,transform .28s ease;font-family:'Noto Serif SC',serif;}
  #dungeonToast.on{opacity:1;transform:translate(-50%,0) scale(1);}
  #dungeonToast .dtTitle{font-size:20px;letter-spacing:.18em;color:#f4d075;margin-bottom:8px;}
  #dungeonToast .dtBody{font-size:14px;letter-spacing:.08em;line-height:1.8;color:#eadab8;}
  @media (max-width:840px){#dungeonMap{overflow:auto;}#dungeonMap .header{position:relative;left:auto;top:auto;padding:28px 24px 0;}#dungeonMap .legend{display:none;}#dungeonMap .mapWrap{position:relative;inset:auto;padding:20px;}#dungeonMap .mapCanvas{width:100%;min-width:0;height:560px;}#dungeonMap .closeBtn{top:22px;right:22px;}}
  `;
  const s=$('style');s.textContent=css;document.head.appendChild(s);
}

function generateMap(){
  // 3 floors, vertical linear progression: 1-2 nodes per floor, BOSS at end
  const floors=[[],[],[]];


  // Floor 0: 2 combat nodes
  floors[0].push({type:'combat', id:'0_0'});
  floors[0].push({type:'combat', id:'0_1'});

  // Floor 1: non-combat choice layer, making event/chest systems visible every run
  floors[1].push({type:'event', id:'1_0'});
  floors[1].push({type:'chest', id:'1_1'});

  // Floor 2: BOSS
  floors[2].push({type:'boss',id:'2_0'});

  return floors;
}

function rewardPreviewFor(type){
  return ({
    combat:'材料或临时祝福 · 影响下一战',
    elite:'精英残响 + 根甲护佑',
    rest:'恢复整备 · 保留路线节奏',
    event:'地脉事件 · 选择风险收益',
    chest:'遗物宝箱 · 材料或卡牌补给',
    boss:'深渊核心 · 工坊突破材料'
  })[type]||'未知回响';
}

function buffName(b){ return ({abyss_vigor:'深渊活力',ember_focus:'余烬专注',root_guard:'根甲护佑'})[b?.id]||b?.name||'未知祝福'; }
function addRunBuff(buff){
  if(!buff) return;
  const next={...buff, fights:buff.fights||1};
  const existing=runBuffs.find(b=>b.id===next.id);
  if(existing) existing.fights=Math.max(existing.fights||1,next.fights||1);
  else runBuffs.push(next);
}
function consumeRunBuffs(){
  runBuffs=runBuffs.map(b=>({...b,fights:(b.fights||1)-1})).filter(b=>(b.fights||0)>0);
}
function activeBuffSummary(){ return runBuffs.length?`当前祝福: ${runBuffs.map(b=>`${buffName(b)}×${b.fights||1}`).join(' / ')}`:''; }

function grantLoot(loot){
  if(!loot || !window.Terra?.farm) return '';
  const f=window.Terra.farm, labels=[];
  if(loot.buff){ addRunBuff(loot.buff); labels.push(buffName(loot.buff)); }
  for(const [k,v] of Object.entries(loot)){
    if(k==='buff') continue;
    if(k==='beast'){
      f.beasts ??= [];
      const id=`${v.species||'beast'}_${Date.now().toString(36)}`;
      f.beasts.push({id,...v,stamina:100,xp:0,evolution:{diet:{},laborHistory:{}}});
      window.normalizeBeasts?.(); window.updateBeastRosterUI?.(); labels.push('春露兽');
      continue;
    }
    f.inventory.materials[k]=(f.inventory.materials[k]||0)+v;
    labels.push(`${k}×${v}`);
  }
  window.Terra.save();
  return labels.join(' · ');
}

function showToast(title, body, after){
  injectStyle();
  let toast=document.getElementById('dungeonToast');
  if(!toast){
    toast=$('div','',document.body); toast.id='dungeonToast';
    toast.innerHTML='<div class="dtTitle"></div><div class="dtBody"></div>';
  }
  toast.querySelector('.dtTitle').textContent=title;
  toast.querySelector('.dtBody').textContent=body||'';
  toast.classList.add('on');
  clearTimeout(showToast._timer);
  showToast._timer=setTimeout(()=>{ toast.classList.remove('on'); if(after) after(); }, 1500);
}

function buildDOM(){
  if(root) return;
  injectStyle();
  root=$('div','',document.body); root.id='dungeonMap';
  root.innerHTML=`
    <div class="header">
      <div class="eyebrow">Abyss Expedition</div>
      <h2>深渊星图</h2>
      <div class="sub">选择一条路线进入污染地脉。战斗奖励会带回农场，改变下一轮锻造、灵兽和工坊升级方向。</div>
    </div>
    <div class="legend"><span>⚔ 战斗</span><span>◆ 精英</span><span>🔥 休息</span><span>✦ 事件</span><span>▣ 宝箱</span><span>♛ 深渊核心</span></div>
    <div class="mapWrap"><div class="mapCanvas"></div></div>
    <div class="closeBtn">×</div>
  `;
  root.querySelector('.closeBtn').onclick=()=>close();
}

function renderMap(){
  const sub=root.querySelector('.header .sub');
  if(sub) sub.innerHTML=`选择一条路线进入污染地脉。战斗奖励会带回农场，并让临时祝福影响下一场战斗。${activeBuffSummary()?'<br><span style="color:#f4d03f">'+activeBuffSummary()+'</span>':''}`;
  const canvas=root.querySelector('.mapCanvas');
  canvas.innerHTML='';
  const w=canvas.clientWidth||760, h=canvas.clientHeight||620;
  const positions={
    '0_0':[.27,.25], '0_1':[.72,.25],
    '1_0':[.50,.52],
    '2_0':[.50,.78]
  };

  mapData.forEach((floor,fi)=>{
    floor.forEach((node)=>{
      const [px,py]=positions[node.id]||[.5,.22+fi*.28];
      const x=px*w, y=py*h;

      if(fi<mapData.length-1){
        mapData[fi+1].forEach((nextNode)=>{
          const [npx,npy]=positions[nextNode.id]||[.5,.22+(fi+1)*.28];
          const nx=npx*w, ny=npy*h;
          const dx=nx-x, dy=ny-y, len=Math.hypot(dx,dy), ang=Math.atan2(dy,dx)*180/Math.PI;
          const path=$('div','path',canvas);
          path.style.left=x+'px';
          path.style.top=y+'px';
          path.style.width=len+'px';
          path.style.transform=`rotate(${ang}deg)`;
        });
      }

      const completed = progress.path.includes(node.id);
      const locked = fi>progress.floor || (fi===progress.floor && completed);
      const current = fi===progress.floor && !completed;

      const nd=$('div','node '+node.type,canvas);
      nd.classList.toggle('locked',locked);
      nd.classList.toggle('current',current);
      nd.classList.toggle('completed',completed);
      const size=node.type==='boss'?148:124;
      nd.style.left=(x-size/2)+'px';
      nd.style.top=(y-size/2)+'px';

      const icons={combat:'icon_combat.png',elite:'◆',rest:'🔥',event:'✦',chest:'▣',boss:'icon_boss.png'};
      const labels={combat:'战斗',elite:'精英',rest:'篝火',event:'地脉事件',chest:'遗物宝箱',boss:'深渊核心'};
      const icon=icons[node.type]||'?';
      const iconHTML = icon.endsWith?.('.png')
        ? `<img src="assets/ui/${icon}" class="icon" alt="${labels[node.type]||node.type}"/>`
        : `<div class="emoji">${icon}</div>`;
      nd.innerHTML=`${iconHTML}<div class="label">${labels[node.type]||node.type}</div><div class="reward">${rewardPreviewFor(node.type)}</div>`;

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
      buffs: runBuffs.map(b=>({...b})),
      onWin(loot){
        if(!loot) loot={};
        grantLoot(loot);
        consumeRunBuffs();
        progress.floor++;
        if(progress.floor>=mapData.length){ showToast('深渊征服', '战利品已带回农场，回到地表休整。'); return; }
        open();
      },
      onLose(){
        showToast('败退', '你被击退回农场，休养生息后再战。');
      }
    });
  } else if(node.type==='rest'){
    showToast('篝火休整', '你在篝火旁恢复体力，保留路线节奏。');
    progress.floor++;
    if(progress.floor>=mapData.length){ showToast('深渊征服', '路线已完成，返回农场整备。', close); return; }
    renderMap();
  } else if(node.type==='event'){
    const summary=grantLoot({buff:{id:'ember_focus',energyFirstTurn:1,fights:1}, blight_seed:1});
    showToast('地脉事件', `你稳定了污染裂隙，获得 ${summary || '余烬专注'}。`);
    progress.floor++;
    if(progress.floor>=mapData.length){ showToast('深渊征服', '路线已完成，返回农场整备。', close); return; }
    renderMap();
  } else if(node.type==='chest'){
    const summary=grantLoot({wood:3, beast_soul:1});
    showToast('遗物宝箱', `开启旧世木箱，获得 ${summary}。`);
    progress.floor++;
    if(progress.floor>=mapData.length){ showToast('深渊征服', '路线已完成，返回农场整备。', close); return; }
    renderMap();
  }
}

function open(){
  buildDOM();
  if(!mapData){ mapData=generateMap(); progress={floor:0,path:[]}; }
  root.style.display='block';
  renderMap();
  requestAnimationFrame(()=>root.classList.add('on'));
}

function close(){
  if(!root) return;
  root.classList.remove('on');
  setTimeout(()=>{if(root)root.style.display='none';},500);
}

window.DungeonMap = { open, close, grantLoot };
})();
