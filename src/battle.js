/* =========================================================
   Terra Chronicle — 卡牌地城战斗 (Slay-the-Spire 核心)
   纯回合逻辑 + DOM 战斗场景(自注入样式)。
   Battle.enter({ deck, onWin, onLose }) 由 main.js 在玩家进入传送门时调用。
   卡组来自 state.js 锻造产物;不足时补基础牌,保证永远可玩。
   ========================================================= */
'use strict';
(function(){
const $=(t,c,p)=>{const e=document.createElement(t);if(c)e.className=c;if(p)p.appendChild(e);return e;};
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;}

/* ---- 把锻造卡转成战斗牌;补充基础牌 ---- */
function buildDeck(crafted){
  const base=[
    {name:'划击',type:'atk',val:6,cost:1,desc:'造成 6 点伤害'},
    {name:'划击',type:'atk',val:6,cost:1,desc:'造成 6 点伤害'},
    {name:'格挡',type:'def',val:5,cost:1,desc:'获得 5 点护甲'},
    {name:'格挡',type:'def',val:5,cost:1,desc:'获得 5 点护甲'},
    {name:'蓄能',type:'atk',val:9,cost:2,desc:'造成 9 点伤害'},
  ];
  const made=(crafted||[]).map(c=>{
    if(c.def>=c.atk) return {name:c.name,type:'def',val:c.def,cost:c.def>=24?2:1,
      desc:`获得 ${c.def} 点护甲`,elem:c.element,quality:c.quality};
    return {name:c.name,type:'atk',val:c.atk,cost:c.atk>=22?2:1,
      desc:`造成 ${c.atk} 点伤害`,elem:c.element,quality:c.quality};
  });
  return [...base,...made];
}

/* ---- 敌人意图 ---- */
function rollIntent(turn){
  // 前期偏攻击,偶尔防御
  if(Math.random()<0.28) return {kind:'def',val:6};
  return {kind:'atk',val:8+((Math.random()*5)|0)+Math.floor(turn/3)};  // 随回合渐强
}

let S=null, cb=null, root=null, injected=false;

function injectStyle(){
  if(injected) return; injected=true;
  const css=`
  #battle{position:fixed;inset:0;z-index:80;display:none;opacity:0;
    transition:opacity .6s cubic-bezier(.4,0,.2,1);
    background:radial-gradient(ellipse at 50% 30%,#2a2340 0%,#15121f 60%,#0a0810 100%);
    font-family:'Noto Serif SC',serif;color:#f6f1e7;overflow:hidden;}
  #battle.on{display:block;opacity:1;}
  #battle .arena{position:absolute;inset:0;display:flex;flex-direction:column;}
  #battle .enemyZone{flex:1;display:flex;align-items:center;justify-content:center;position:relative;}
  #battle .enemy{position:relative;text-align:center;transition:transform .12s;}
  #battle .enemy img{width:230px;filter:drop-shadow(0 18px 36px rgba(0,0,0,.55));image-rendering:auto;
    animation:ebreathe 3.4s ease-in-out infinite;transition:filter .08s;}
  #battle .enemy img.flash{filter:brightness(6) contrast(1.4) drop-shadow(0 18px 36px rgba(0,0,0,.55));}
  @keyframes ebreathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.035,.962)}}
  #battle .miasma{position:absolute;border-radius:50%;pointer-events:none;mix-blend-mode:screen;
    background:radial-gradient(circle,rgba(186,120,224,.6),rgba(150,80,200,0));}
  #battle .enemy.hit{animation:eh .3s;}
  @keyframes eh{0%,100%{transform:translateX(0)}25%{transform:translateX(-12px)}75%{transform:translateX(12px)}}
  #battle .arena.chroma{animation:chromaticShake .2s ease-out;}
  @keyframes chromaticShake{
    0%{filter:none}
    10%{filter:drop-shadow(3px 0 0 rgba(255,0,0,.8)) drop-shadow(-3px 0 0 rgba(0,255,255,.7))}
    40%{filter:drop-shadow(2px 0 0 rgba(255,0,0,.5)) drop-shadow(-2px 0 0 rgba(0,255,255,.45))}
    100%{filter:none}
  }
  #battle .slash{position:absolute;pointer-events:none;width:180px;height:8px;background:linear-gradient(90deg,
    transparent,rgba(255,255,255,.95) 20%,rgba(255,240,220,.85) 50%,rgba(255,200,180,.7) 80%,transparent);
    transform-origin:center;box-shadow:0 0 20px rgba(255,255,255,.6);mix-blend-mode:screen;
    animation:slashFade .35s ease-out forwards;}
  @keyframes slashFade{0%{opacity:1;transform:scaleX(.3)}40%{opacity:1;transform:scaleX(1.2)}100%{opacity:0;transform:scaleX(1.5)}}
  #battle .ename{position:absolute;top:-6px;left:50%;transform:translateX(-50%);font-size:13px;letter-spacing:.3em;opacity:.85;white-space:nowrap;}
  #battle .ehp{width:230px;height:10px;border-radius:6px;background:rgba(255,255,255,.12);margin:14px auto 0;overflow:hidden;position:relative;}
  #battle .ehp i{position:absolute;inset:0;transform-origin:left;background:linear-gradient(90deg,#d65a5a,#e88);transition:transform .4s cubic-bezier(.2,.8,.2,1);}
  #battle .ehp span{position:absolute;inset:0;text-align:center;font-size:10px;line-height:10px;color:#fff;font-family:'Cormorant Garamond',serif;}
  #battle .intent{margin-top:10px;font-size:15px;letter-spacing:.14em;color:#ffcaa0;height:20px;}
  #battle .intent.def{color:#9fd4e8;}
  #battle .eblock{display:inline-block;margin-left:8px;color:#9fd4e8;font-size:13px;}
  #battle .floatN{position:absolute;left:0;top:0;font-family:'Cormorant Garamond',serif;font-size:36px;font-weight:600;
    pointer-events:none;will-change:transform,opacity;text-shadow:0 2px 8px rgba(0,0,0,.6);}
  #battle .pbar{height:96px;display:flex;align-items:center;justify-content:space-between;padding:0 40px;
    border-top:1px solid rgba(246,241,231,.1);background:rgba(10,8,16,.4);}
  #battle .vit{display:flex;align-items:center;gap:26px;}
  #battle .stat{display:flex;flex-direction:column;gap:6px;min-width:120px;}
  #battle .stat .lab{font-size:10px;letter-spacing:.4em;opacity:.55;}
  #battle .bar{width:150px;height:9px;border-radius:5px;background:rgba(255,255,255,.12);overflow:hidden;position:relative;}
  #battle .bar i{position:absolute;inset:0;transform-origin:left;transition:transform .4s;}
  #battle .bar.hp i{background:linear-gradient(90deg,#8fc46a,#b6e08a);}
  #battle .bar.sh i{background:linear-gradient(90deg,#8fb6d8,#bcd8ee);}
  #battle .vnum{font-family:'Cormorant Garamond',serif;font-size:15px;}
  #battle .energy{display:flex;align-items:center;gap:10px;}
  #battle .orb{width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;
    background:radial-gradient(circle at 38% 32%,#ffe9a8,#c9a24b 70%,#8a6d2c);color:#2b2722;
    font-family:'Cormorant Garamond',serif;font-size:21px;box-shadow:0 0 22px rgba(201,162,75,.55);}
  #battle .endBtn{border:1px solid var(--gold,#c9a24b);background:none;color:#f6f1e7;cursor:pointer;
    font-family:'Noto Serif SC',serif;font-size:13px;letter-spacing:.3em;text-indent:.3em;padding:12px 26px;
    border-radius:999px;position:relative;overflow:hidden;transition:color .4s;}
  #battle .endBtn::before{content:'';position:absolute;inset:0;background:#c9a24b;transform:scaleX(0);transform-origin:left;transition:transform .4s;z-index:-1;}
  #battle .endBtn:hover{color:#2b2722;} #battle .endBtn:hover::before{transform:scaleX(1);}
  #battle .hand{position:absolute;bottom:96px;left:0;right:0;height:210px;display:flex;align-items:flex-end;
    justify-content:center;gap:-10px;pointer-events:none;}
  #battle .card{width:132px;height:188px;margin:0 -6px;border-radius:12px;cursor:pointer;pointer-events:auto;
    background:linear-gradient(160deg,#3a3450,#221d33);border:1px solid rgba(201,162,75,.4);
    box-shadow:0 14px 30px rgba(0,0,0,.5);padding:12px;display:flex;flex-direction:column;
    transform-origin:bottom center;transition:transform .22s cubic-bezier(.2,.8,.2,1),box-shadow .22s;position:relative;}
  #battle .card:hover{transform:translateY(-26px) scale(1.07);box-shadow:0 26px 50px rgba(0,0,0,.6);z-index:5;}
  #battle .card.atk{border-color:rgba(232,140,120,.6);} #battle .card.def{border-color:rgba(150,190,220,.6);}
  #battle .card.disabled{filter:grayscale(.7) brightness(.6);cursor:default;}
  #battle .card .cost{position:absolute;top:-10px;left:-10px;width:32px;height:32px;border-radius:50%;
    background:radial-gradient(circle at 38% 32%,#ffe9a8,#c9a24b);color:#2b2722;display:flex;align-items:center;
    justify-content:center;font-family:'Cormorant Garamond',serif;font-size:17px;box-shadow:0 2px 10px rgba(0,0,0,.5);}
  #battle .card .cname{font-size:14px;letter-spacing:.12em;text-align:center;margin-top:6px;}
  #battle .card .cart{flex:1;margin:8px 4px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:34px;
    background:rgba(0,0,0,.22);}
  #battle .card .cdesc{font-size:11px;line-height:1.5;text-align:center;opacity:.85;letter-spacing:.04em;}
  #battle .topbar{position:absolute;top:22px;left:0;right:0;text-align:center;}
  #battle .topbar .t{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:15px;letter-spacing:.3em;opacity:.7;}
  #battle .deckcount{position:absolute;bottom:104px;font-size:11px;letter-spacing:.2em;opacity:.55;}
  #battle .deckcount.draw{left:34px;} #battle .deckcount.disc{right:34px;}
  #battle .result{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;
    background:rgba(8,6,14,.78);backdrop-filter:blur(6px);text-align:center;gap:24px;}
  #battle .result.on{display:flex;}
  #battle .result h2{font-size:46px;font-weight:300;letter-spacing:.3em;text-indent:.3em;}
  #battle .result .loot{font-size:15px;letter-spacing:.16em;line-height:2;opacity:.9;}
  #battle .result .gold{color:#c9a24b;}
  #battle .result button{margin-top:10px;border:1px solid rgba(246,241,231,.5);background:none;color:#f6f1e7;cursor:pointer;
    font-family:'Noto Serif SC',serif;font-size:13px;letter-spacing:.4em;text-indent:.4em;padding:13px 40px;border-radius:999px;}
  #battle .result button:hover{background:#f6f1e7;color:#2b2722;}
  `;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
}

function buildDOM(){
  root=document.getElementById('battle');
  if(root) return;
  root=document.createElement('div'); root.id='battle';
  root.innerHTML=`
    <div class="arena">
      <div class="topbar"><div class="t" id="b_turn">深渊副本 · 第 1 回合</div></div>
      <div class="enemyZone">
        <div class="enemy" id="b_enemy">
          <div class="ename" id="b_ename">污染木灵</div>
          <img id="b_eimg" src="assets/sprites/enemy_blight.png?v=6" alt="">
          <div class="ehp"><i id="b_ehpbar"></i><span id="b_ehptxt"></span></div>
          <div class="intent" id="b_intent"></div>
        </div>
      </div>
      <div class="pbar">
        <div class="vit">
          <div class="stat"><span class="lab">生命 HP</span><div class="bar hp"><i id="b_hpbar"></i></div></div>
          <div class="stat"><span class="lab">护甲 SHIELD</span><div class="bar sh"><i id="b_shbar"></i></div></div>
          <span class="vnum" id="b_vnum"></span>
        </div>
        <div class="energy"><div class="orb" id="b_orb">3</div>
          <button class="endBtn" id="b_end">结 束 回 合</button></div>
      </div>
      <div class="hand" id="b_hand"></div>
      <div class="deckcount draw" id="b_draw">抽牌堆 0</div>
      <div class="deckcount disc" id="b_disc">弃牌堆 0</div>
    </div>
    <div class="result" id="b_result">
      <h2 id="b_rtitle"></h2>
      <div class="loot" id="b_loot"></div>
      <button id="b_back">返 回 农 场</button>
    </div>`;
  document.body.appendChild(root);
  root.querySelector('#b_end').onclick=endTurn;
  root.querySelector('#b_back').onclick=exit;
}

function floatNum(text,color,x,y){                 // 抛物线弹跳伤害数字(FCT)
  const f=$('div','floatN',root); f.textContent=text; f.style.color=color;
  const vx=(Math.random()-.5)*140, vy=-180-Math.random()*50, g=560, t0=performance.now();
  (function step(){ const t=(performance.now()-t0)/1000;
    const px=x+vx*t, py=y+vy*t+0.5*g*t*t;
    f.style.transform=`translate(${px}px,${py}px) scale(${1+Math.min(t*1.6,.45)})`;
    f.style.opacity = t<0.08 ? t*12 : Math.max(0,1-(t-0.08)*1.25);
    if(t<1.0) requestAnimationFrame(step); else f.remove();
  })();
}
function screenShake(mag,dur){                       // 屏幕震动
  const el=root.querySelector('.arena'); if(!el) return; const t0=performance.now();
  (function s(){ const e=(performance.now()-t0)/dur;
    if(e>=1){ el.style.transform=''; return; }
    const m=mag*(1-e); el.style.transform=`translate(${(Math.random()-.5)*m}px,${(Math.random()-.5)*m}px)`;
    requestAnimationFrame(s);
  })();
}
function hitFlash(){ const img=root.querySelector('#b_eimg'); if(!img) return;
  img.classList.add('flash'); setTimeout(()=>img.classList.remove('flash'),100); }
function playerHurtFx(){ let v=root.querySelector('#b_hurt');
  if(!v){ v=$('div',null,root); v.id='b_hurt';
    v.style.cssText='position:absolute;inset:0;z-index:88;pointer-events:none;opacity:0;transition:opacity .1s;'+
      'box-shadow:inset 0 0 160px 40px rgba(200,40,40,.7);'; }
  v.style.opacity='1'; setTimeout(()=>v.style.opacity='0',130); }
function projectile(fromEl){                         // 卡牌飞向敌人的光弹
  const img=root.querySelector('#b_eimg'); if(!img) return;
  const r1=fromEl?fromEl.getBoundingClientRect():{left:innerWidth/2,top:innerHeight-170,width:0,height:0};
  const r2=img.getBoundingClientRect();
  const p=$('div',null,root);
  p.style.cssText='position:fixed;z-index:90;width:26px;height:26px;border-radius:50%;pointer-events:none;'+
    'background:radial-gradient(circle,#fff,#ffd27a 55%,rgba(255,150,60,0));';
  const x0=r1.left+r1.width/2,y0=r1.top,x1=r2.left+r2.width/2,y1=r2.top+r2.height*0.45,t0=performance.now();
  (function a(){ const t=Math.min(1,(performance.now()-t0)/180);
    p.style.left=(x0+(x1-x0)*t-13)+'px'; p.style.top=(y0+(y1-y0)*t-13)+'px';
    p.style.transform=`scale(${0.6+t*0.9})`;
    if(t<1) requestAnimationFrame(a); else p.remove();
  })();
}
let miasmaTimer=null;
function startMiasma(){ stopMiasma();
  miasmaTimer=setInterval(()=>{
    if(!Battle.active){ stopMiasma(); return; }
    const z=root.querySelector('.enemyZone'); if(!z) return;
    const m=$('div','miasma',z); const sz=14+Math.random()*28; m.style.width=m.style.height=sz+'px';
    m.style.left=(z.clientWidth/2+(Math.random()-.5)*190)+'px';
    m.style.top=(z.clientHeight*0.52+(Math.random()-.5)*120)+'px';
    const t0=performance.now(),drift=(Math.random()-.5)*46,rise=34+Math.random()*44;
    (function a(){ const t=(performance.now()-t0)/1900;
      if(t>=1){ m.remove(); return; }
      m.style.transform=`translate(${drift*t}px,${-rise*t}px)`;
      m.style.opacity=(t<.3? t/.3 : (1-t)/.7)*0.65;
      requestAnimationFrame(a);
    })();
  }, 300);
}
function stopMiasma(){ if(miasmaTimer){ clearInterval(miasmaTimer); miasmaTimer=null; } }
function spawnSlashes(){                                 // 在敌人身上划出 2-3 道斜斩剑气
  const img=root.querySelector('#b_eimg'); if(!img) return;
  const r=img.getBoundingClientRect();
  const n=2+(Math.random()<0.4?1:0);
  for(let i=0;i<n;i++){
    const s=$('div','slash',root);
    s.style.left=(r.left+r.width*0.3+Math.random()*r.width*0.4)+'px';
    s.style.top=(r.top+r.height*0.25+Math.random()*r.height*0.4)+'px';
    s.style.transform=`rotate(${-45+Math.random()*90}deg)`;
    setTimeout(()=>s.remove(), 400);
  }
}
function chromaticAberration(){                          // 全屏色差畸变 0.2s
  const ar=root.querySelector('.arena'); if(!ar) return;
  ar.classList.add('chroma'); setTimeout(()=>ar.classList.remove('chroma'), 200);
}

function render(){
  const r=id=>root.querySelector(id);
  r('#b_turn').textContent=`深渊副本 · 第 ${S.turn} 回合`;
  r('#b_ehpbar').style.transform=`scaleX(${Math.max(0,S.enemy.hp/S.enemy.max)})`;
  r('#b_ehptxt').textContent=`${Math.max(0,S.enemy.hp)} / ${S.enemy.max}`;
  const it=S.enemy.intent, iEl=r('#b_intent');
  if(it){ iEl.className='intent'+(it.kind==='def'?' def':'');
    iEl.innerHTML = it.kind==='atk' ? `⚔ 即将攻击 ${it.val}` : `🛡 即将格挡 ${it.val}`;
    if(S.enemy.block>0) iEl.innerHTML+=`<span class="eblock">🛡${S.enemy.block}</span>`;
  } else iEl.textContent='';
  r('#b_hpbar').style.transform=`scaleX(${Math.max(0,S.pHP/S.pMax)})`;
  r('#b_shbar').style.transform=`scaleX(${Math.min(1,S.shield/S.pMax)})`;
  r('#b_vnum').textContent=`${Math.max(0,S.pHP)}♥  ${S.shield}🛡`;
  r('#b_orb').textContent=S.energy;
  r('#b_draw').textContent='抽牌堆 '+S.draw.length;
  r('#b_disc').textContent='弃牌堆 '+S.discard.length;
  // 手牌
  const hand=r('#b_hand'); hand.innerHTML='';
  S.hand.forEach((c,i)=>{
    const playable = S.turn>0 && !S.over && S.phase==='player' && S.energy>=c.cost;
    const el=$('div','card '+c.type+(playable?'':' disabled'),hand);
    el.innerHTML=`<div class="cost">${c.cost}</div><div class="cname">${c.name}</div>
      <div class="cart">${c.type==='atk'?'⚔':'🛡'}</div><div class="cdesc">${c.desc}</div>`;
    if(playable) el.onclick=(ev)=>playCard(i, ev.currentTarget);
  });
}

function drawCards(n){
  for(let k=0;k<n;k++){
    if(!S.draw.length){ if(!S.discard.length) break; S.draw=shuffle(S.discard); S.discard=[]; }
    S.hand.push(S.draw.pop());
  }
}
function startPlayerTurn(){
  S.phase='player'; S.energy=S.energyMax; S.shield=0;
  S.enemy.intent=S.enemy.intent||rollIntent(S.turn);
  drawCards(5); render();
}
function playCard(i, el){
  const c=S.hand[i]; if(!c||S.energy<c.cost||S.phase!=='player'||S.over) return;
  S.energy-=c.cost; S.discard.push(c); S.hand.splice(i,1);
  if(c.type==='atk'){
    projectile(el); const dmgRaw=c.val;
    setTimeout(()=>{                               // 命中:斩击剑气+闪白+色差+震屏+抛物线伤害数字
      if(!S||S.over) return;
      let dmg=dmgRaw; const blk=Math.min(S.enemy.block,dmg); S.enemy.block-=blk; dmg-=blk;
      S.enemy.hp-=dmg;
      spawnSlashes(); hitFlash(); chromaticAberration(); screenShake(dmg>=10?22:15, 280);
      const b=root.querySelector('#b_eimg').getBoundingClientRect();
      floatNum('-'+dmg,'#ff9b7a', b.left+b.width/2, b.top+b.height*0.4);
      const e=root.querySelector('#b_enemy'); e.classList.add('hit'); setTimeout(()=>e.classList.remove('hit'),300);
      if(S.enemy.hp<=0){ render(); return finish(true); }
      render();
    },175);
  } else {
    S.shield+=c.val;
    floatNum('+'+c.val,'#bcd8ee', innerWidth/2, innerHeight-180);
  }
  render();
}
function endTurn(){
  if(S.phase!=='player'||S.over) return;
  S.phase='enemy';
  S.discard.push(...S.hand); S.hand=[];
  render();
  setTimeout(()=>{
    if(!S) return;
    const it=S.enemy.intent;
    if(it.kind==='atk'){
      let dmg=it.val; const blk=Math.min(S.shield,dmg); S.shield-=blk; dmg-=blk;
      S.pHP-=dmg;
      if(dmg>0){ screenShake(20,300); playerHurtFx(); }
      floatNum('-'+dmg,'#ff8a8a', innerWidth/2, innerHeight-180);
    } else { S.enemy.block+=it.val; }
    if(S.pHP<=0){ render(); return finish(false); }
    S.turn++; S.enemy.intent=rollIntent(S.turn);
    startPlayerTurn();
  }, 720);
}
function finish(win){
  S.over=true; render();
  const res=root.querySelector('#b_result');
  root.querySelector('#b_rtitle').textContent = win?'胜 利':'败 退';
  if(win){
    root.querySelector('#b_loot').innerHTML=
      `深渊退散，你拾得：<br><span class="gold">污染种子 ×1</span> · <span class="gold">灵兽灵魂 ×1</span><br>
       <span style="opacity:.6;font-size:12px">可带回农场培育更强的作物与灵兽</span>`;
  } else {
    root.querySelector('#b_loot').innerHTML=`你被击退回农场，休养生息后再战。<br><span style="opacity:.6;font-size:12px">未获得战利品</span>`;
  }
  setTimeout(()=>res.classList.add('on'),520);
  S._win=win;
}
function exit(){
  if(!Battle.active) return;
  const win=S?S._win:false, c=cb;
  Battle.active=false; cb=null; stopMiasma();       // 立即解锁世界输入 + 触发回调(视觉淡出独立)
  root.classList.remove('on');
  setTimeout(()=>{ root.style.display='none'; S=null; }, 600);
  if(win&&c&&c.onWin) c.onWin({ blight_seed:1, beast_soul:1 });
  else if(!win&&c&&c.onLose) c.onLose();
}

const Battle={
  active:false,
  enter(opts){
    injectStyle(); buildDOM();
    cb=opts||{};
    const deck=shuffle(buildDeck(cb.deck));
    S={ pHP:60, pMax:60, shield:0, energy:3, energyMax:3,
        draw:deck, hand:[], discard:[], turn:1, phase:'player', over:false,
        enemy:{ hp:48, max:48, block:0, intent:rollIntent(1) } };
    root.style.display='block'; root.querySelector('#b_result').classList.remove('on');
    const ar=root.querySelector('.arena'); if(ar) ar.style.transform='';   // 清除上一场残留的震屏偏移
    requestAnimationFrame(()=>root.classList.add('on'));
    Battle.active=true;
    startPlayerTurn(); startMiasma();
  },
};
window.Battle=Battle;
})();
