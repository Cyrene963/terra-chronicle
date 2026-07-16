/* =========================================================
   Terra Chronicle — 深渊路线图 (Roguelike Map)
   Slay-the-Spire 风格节点图:玩家选择路径前进。
   节点类型:战斗/精英/休息/商店/BOSS。
   ========================================================= */
'use strict';
(function(){
const $=(t,c,p)=>{const e=document.createElement(t);if(c)e.className=c;if(p)p.appendChild(e);return e;};

let root=null, injected=false, mapData=null, progress={floor:0,path:[]}, runBuffs=[], openToken=0;

function injectStyle(){
  if(injected) return; injected=true;
  const css=`
  #dungeonMap{position:fixed;inset:0;z-index:85;display:none;opacity:0;
    transition:opacity .45s cubic-bezier(.2,.8,.2,1);font-family:'Noto Serif SC',serif;color:#f4ecd8;overflow:hidden;
    background:url('assets/ui/dungeon_entrance_bg.jpg') center/cover,#211a12;}
  #dungeonMap::before{content:'';position:absolute;inset:0;background:
    radial-gradient(circle at 68% 24%,rgba(163,196,117,.14),transparent 30%),
    radial-gradient(circle at 18% 78%,rgba(236,183,82,.18),transparent 30%),
    linear-gradient(180deg,rgba(32,24,16,.34),rgba(14,11,8,.78));backdrop-filter:blur(2px) saturate(1.02);}
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
    border-radius:8px;border:1px solid rgba(120,77,31,.52);background:
    linear-gradient(rgba(238,220,178,.78),rgba(208,177,119,.72)),url('assets/sprites/scroll_paper.png') center/cover;
    box-shadow:0 28px 95px rgba(0,0,0,.48),inset 0 0 0 7px rgba(100,61,25,.13),inset 0 1px 0 rgba(255,255,255,.28);overflow:hidden;}
  #dungeonMap .mapCanvas::before{content:'';position:absolute;inset:18px;border:1px solid rgba(244,208,117,.18);border-radius:26px;background:
    radial-gradient(circle at 25% 28%,rgba(255,226,158,.08),transparent 2px),radial-gradient(circle at 70% 38%,rgba(255,226,158,.08),transparent 2px),radial-gradient(circle at 56% 72%,rgba(166,111,255,.14),transparent 3px);}
  #dungeonMap .path{position:absolute;height:3px;background:repeating-linear-gradient(90deg,rgba(100,65,32,.18) 0 8px,rgba(100,65,32,.72) 8px 15px);
    transform-origin:left center;box-shadow:0 1px 0 rgba(255,244,207,.35);border-radius:999px;opacity:.82;}
  #dungeonMap .node{position:absolute;width:124px;height:124px;border-radius:50%;cursor:pointer;border:1px solid rgba(105,66,29,.34);
    background:radial-gradient(circle at 50% 46%,rgba(255,244,205,.68),rgba(178,132,72,.2) 62%,rgba(82,47,19,.1));box-shadow:0 12px 28px rgba(67,39,18,.28);
    display:grid;place-items:center;transition:transform .28s ease,box-shadow .28s ease,border-color .28s ease;overflow:visible;}
  #dungeonMap .node::before{content:'';position:absolute;inset:14px;border-radius:28px;background:radial-gradient(circle,rgba(244,208,117,.08),transparent 68%);pointer-events:none;}
  #dungeonMap .node:hover{transform:translateY(-8px) scale(1.04);border-color:#ffe0a0;box-shadow:0 28px 70px rgba(0,0,0,.58),0 0 32px rgba(244,208,117,.16);}
  #dungeonMap .node.locked{opacity:.5;cursor:default;pointer-events:none;filter:saturate(.68);}
  #dungeonMap .node.completed{opacity:.72;border-color:rgba(125,211,151,.5);}
  #dungeonMap .node.completed::after{content:'✓';position:absolute;top:10px;right:12px;font-size:22px;color:#8ee5a4;text-shadow:0 0 14px rgba(74,222,128,.6);}
  #dungeonMap .node.current{animation:nodePulse 2.2s ease-in-out infinite;border-color:#ffe0a0;}
  @keyframes nodePulse{0%,100%{box-shadow:0 18px 46px rgba(0,0,0,.45),0 0 22px rgba(244,208,117,.24)}50%{box-shadow:0 24px 62px rgba(0,0,0,.56),0 0 44px rgba(244,208,117,.42)}}
  #dungeonMap .node.boss{width:148px;height:148px;border-radius:40px;border-width:2px;}
  #dungeonMap .node .icon{position:relative;width:96px;height:96px;object-fit:contain;filter:drop-shadow(0 12px 22px rgba(0,0,0,.72));}
  #dungeonMap .node.boss .icon{width:122px;height:122px;}
  #dungeonMap .node .label{position:absolute;left:50%;bottom:-25px;transform:translateX(-50%);white-space:nowrap;font-size:13px;letter-spacing:.1em;color:#4b2f18;font-weight:900;text-shadow:0 1px 0 rgba(255,245,213,.7);background:rgba(242,222,178,.9);border:1px solid rgba(112,71,31,.3);border-radius:5px;padding:4px 9px;}
  #dungeonMap .node .impact{position:absolute;left:50%;top:calc(100% + 31px);transform:translateX(-50%);width:154px;text-align:center;font-size:9px;line-height:1.35;letter-spacing:.025em;color:#6a4624;font-weight:800;text-shadow:0 1px rgba(255,246,218,.65);}
  #dungeonMap .node.boss .impact{top:auto;bottom:calc(100% + 8px);width:150px;}
  #dungeonMap .node.locked .label{color:#d9c89f;background:rgba(8,7,9,.72);} #dungeonMap .node.boss .label{color:#f4d075;}
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
  @media (max-width:520px){
    #dungeonMap{overflow:hidden;padding-top:max(8px,env(safe-area-inset-top));}
    #dungeonMap::after{inset:8px;border-radius:18px;}
    #dungeonMap .header{padding:14px 62px 0 16px;max-width:none;}
    #dungeonMap .eyebrow{font-size:9px;letter-spacing:.28em;margin-bottom:4px;}
    #dungeonMap .header h2{font-size:30px;letter-spacing:.1em;margin-bottom:6px;}
    #dungeonMap .header .sub{font-size:10px;line-height:1.45;letter-spacing:.05em;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
    #dungeonMap .mapWrap{height:calc(100dvh - 112px);padding:8px 12px max(10px,env(safe-area-inset-bottom));}
    #dungeonMap .mapCanvas{height:100%;min-height:0;border-radius:6px;}
    #dungeonMap .node{width:88px;height:88px;}
    #dungeonMap .node .icon{width:62px;height:62px;}
    #dungeonMap .node .label{bottom:-21px;font-size:10px;padding:4px 7px;}
    #dungeonMap .node .impact{top:calc(100% + 25px);width:120px;font-size:8px;line-height:1.2;}
    #dungeonMap .node.boss .impact{width:118px;}
    #dungeonMap .node.current::after{top:2px;right:0;font-size:8px;padding:2px 5px;}
    #dungeonMap .closeBtn{top:max(12px,env(safe-area-inset-top));right:12px;width:46px;height:46px;}
  }
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
    event:'选择风险收益',
    chest:'材料或卡牌补给',
    boss:'工坊突破材料'
  })[type]||'未知回响';
}

function farmImpactFor(type){
  return ({
    combat:'材料 / 祝福 → 下一战与炼金',
    elite:'高阶残响 → 卡组与工坊',
    rest:'恢复状态 → 保住远征路线',
    event:'污染种子 → 灵兽孵化',
    chest:'木材 / 灵魂 → 扩建与进化',
    boss:'深渊核心 → 工坊突破'
  })[type]||'未知回流';
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
  if(!loot || !window.Terra?.farm) return null;
  const f=window.Terra.farm, labels=[];
  const oldMaterials={...f.inventory.materials},oldBeasts=[...(f.beasts||[])],oldBuffs=runBuffs.map(b=>({...b}));
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
  if(window.Terra.save()===false){
    f.inventory.materials=oldMaterials;f.beasts=oldBeasts;runBuffs=oldBuffs;
    window.normalizeBeasts?.();window.updateBeastRosterUI?.();return null;
  }
  window.updateDock?.();
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
  const toastToken=openToken;
  showToast._timer=setTimeout(()=>{
    toast.classList.remove('on');
    if(toastToken===openToken&&root?.classList.contains('on')&&after) after();
  }, 1500);
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
    <div class="legend"><span>战斗</span><span>精英</span><span>休息</span><span>事件</span><span>宝箱</span><span>深渊核心</span></div>
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
    '1_0':[.36,.55], '1_1':[.64,.55],
    '2_0':[.50,.82]
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

      const icons={combat:'node_combat.png',elite:'node_elite.png',rest:'node_rest.png',event:'node_event.png',chest:'node_chest.png',boss:'node_boss.png'};
      const labels={combat:'战斗',elite:'精英',rest:'篝火',event:'地脉事件',chest:'遗物宝箱',boss:'深渊核心'};
      const icon=icons[node.type]||'?';
      nd.title=`${labels[node.type]||node.type} · ${rewardPreviewFor(node.type)}`;
      nd.innerHTML=`<img src="assets/ui/${icon}" class="icon" alt="${labels[node.type]||node.type}"/><div class="label">${labels[node.type]||node.type}</div><div class="impact">${farmImpactFor(node.type)}</div>`;

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
        const summary=grantLoot(loot);
        if(summary===null){
          progress.path.pop();
          open();
          showToast('存档暂不可用', '战利品与路线进度均未提交，请重试当前节点。');
          return;
        }
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
    if(summary===null){progress.path.pop();showToast('存档暂不可用','事件奖励与路线进度均未提交，请重试。');renderMap();return;}
    showToast('地脉事件', `你稳定了污染裂隙，获得 ${summary}.`);
    progress.floor++;
    if(progress.floor>=mapData.length){ showToast('深渊征服', '路线已完成，返回农场整备。', close); return; }
    renderMap();
  } else if(node.type==='chest'){
    const summary=grantLoot({wood:3, beast_soul:1});
    if(summary===null){progress.path.pop();showToast('存档暂不可用','宝箱奖励与路线进度均未提交，请重试。');renderMap();return;}
    showToast('遗物宝箱', `开启旧世木箱，获得 ${summary}。`);
    progress.floor++;
    if(progress.floor>=mapData.length){ showToast('深渊征服', '路线已完成，返回农场整备。', close); return; }
    renderMap();
  }
}

function open(){
  const token=++openToken;
  window.SurfaceLifecycle?.beforeOpen?.('dungeon');
  buildDOM();
  if(!mapData){ mapData=generateMap(); progress={floor:0,path:[]}; }

  // 使用 AnimationManager 的 iris 转场
  if(window.AnimationManager){
    // 先设置 display 但保持透明
    root.style.display='block';
    root.style.opacity='0';
    renderMap();

    requestAnimationFrame(()=>{
      if(token!==openToken) return;
      root.style.transition='opacity 0.55s cubic-bezier(.2,.9,.2,1)';
      root.style.opacity='1';
      root.classList.add('on');
    });
  } else {
    // Fallback
    root.style.display='block';
    renderMap();
    requestAnimationFrame(()=>{ if(token===openToken) root.classList.add('on'); });
  }
}

function close(options={}){
  if(!root) return;
  openToken++;
  clearTimeout(showToast._timer);
  document.getElementById('dungeonToast')?.classList.remove('on');
  const closeToken=openToken;
  if(options.immediate){
    root.classList.remove('on'); root.style.opacity='0'; root.style.display='none';
    window.SurfaceLifecycle?.afterClose?.('dungeon');
    return;
  }

  window.SurfaceLifecycle?.afterClose?.('dungeon');

  // 使用转场效果返回
  if(window.AnimationManager){
    root.style.transition='opacity 0.45s cubic-bezier(.4,0,.2,1)';
    root.style.opacity='0';
    root.classList.remove('on');
    setTimeout(()=>{if(closeToken!==openToken)return;if(root)root.style.display='none';},450);
  } else {
    // Fallback
    root.classList.remove('on');
    setTimeout(()=>{if(closeToken!==openToken)return;if(root)root.style.display='none';},500);
  }
}

window.DungeonMap = { open, close, grantLoot };
window.SurfaceLifecycle?.register?.('dungeon', { close });
})();
