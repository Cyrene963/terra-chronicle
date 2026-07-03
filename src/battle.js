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

/* ---- 场景转场使用统一 AnimationManager ---- */
function fadeToBlack(callback){
  if(window.AnimationManager){
    window.AnimationManager.transition.fade(callback, 800);
  } else {
    // Fallback 如果 AnimationManager 未加载
    let fadeEl=document.getElementById('sceneFade');
    if(!fadeEl){
      fadeEl=$('div'); fadeEl.id='sceneFade';
      fadeEl.style.cssText='position:fixed;inset:0;z-index:100;background:#0a0a0e;opacity:0;pointer-events:none;transition:opacity .5s cubic-bezier(.4,0,.2,1)';
      document.body.appendChild(fadeEl);
    }
    fadeEl.style.opacity='1';
    setTimeout(()=>{if(callback)callback();},500);
  }
}
function fadeFromBlack(){
  // AnimationManager 会自动处理 fade in
}

function normalizeCardForBattle(c){
  const atk=Number.isFinite(c.atk)?c.atk:(c.type==='atk'?c.val||6:0);
  const def=Number.isFinite(c.def)?c.def:(c.type==='def'?c.val||5:0);
  const heal=Number.isFinite(c.heal)?c.heal:(c.type==='heal'?c.val||5:0);
  const qualityTag=c.quality?` · 产地${Math.round(c.quality*100)}`:'';
  const affixTag=c.affixes?.length?` · ${c.affixes.join('/')}`:'';
  if(heal>0) return {name:c.name,type:'heal',val:heal,cost:heal>=24?2:(c.cost||1),
    desc:c.desc||`恢复 ${heal} 点生命${qualityTag}${affixTag}${c.effectText?' · '+c.effectText:''}`,elem:c.element,quality:c.quality,affixes:c.affixes||[],archetype:c.archetype||'plain',effectText:c.effectText||''};
  if(def>=atk) return {name:c.name,type:'def',val:def,cost:def>=24?2:(c.cost||1),
    desc:c.desc||`获得 ${def} 点护甲${qualityTag}${affixTag}${c.effectText?' · '+c.effectText:''}`,elem:c.element,quality:c.quality,affixes:c.affixes||[],archetype:c.archetype||'plain',effectText:c.effectText||''};
  return {name:c.name,type:'atk',val:atk,cost:atk>=22?2:(c.cost||1),
    desc:c.desc||`造成 ${atk} 点伤害${qualityTag}${affixTag}${c.effectText?' · '+c.effectText:''}`,elem:c.element,quality:c.quality,affixes:c.affixes||[],archetype:c.archetype||'plain',effectText:c.effectText||''};
}

/* ---- 把锻造卡转成战斗牌;补充基础牌 ---- */
function buildDeck(crafted){
  const base=[
    {name:'划击',type:'atk',val:6,cost:1,desc:'造成 6 点伤害'},
    {name:'划击',type:'atk',val:6,cost:1,desc:'造成 6 点伤害'},
    {name:'格挡',type:'def',val:5,cost:1,desc:'获得 5 点护甲'},
    {name:'格挡',type:'def',val:5,cost:1,desc:'获得 5 点护甲'},
    {name:'蓄能',type:'atk',val:9,cost:2,desc:'造成 9 点伤害'},
    {name:'新芽愈合',type:'heal',val:6,cost:1,desc:'恢复 6 点生命'},
  ];
  const made=(crafted||[]).map(normalizeCardForBattle);
  return [...base,...made];
}

/* ---- 敌人意图 ---- */
function intentFor(turn, enemy){
  const type=enemy?.type||'normal';
  const weakCycle=['earth','fire','metal','light'];
  const weak=weakCycle[turn%weakCycle.length];
  if(type==='boss'){
    const phase=enemy.phase||1;
    const cycle=phase===1
      ? [
          {kind:'charge',val:0,weak:'earth',hint:'聚瘴:下回合重击'},
          {kind:'heavy',val:18+Math.floor(turn/3),weak:'fire',hint:'深渊重击'},
          {kind:'def',val:12,weak:'metal',hint:'结壳蓄防'},
          {kind:'atk',val:12+Math.floor(turn/4),weak:'light',hint:'污染藤鞭'}
        ]
      : [
          {kind:'heavy',val:24+Math.floor(turn/2),weak:'fire',hint:'狂化重击'},
          {kind:'atk',val:16+Math.floor(turn/3),weak:'light',hint:'连锁藤鞭'},
          {kind:'charge',val:0,weak:'earth',hint:'深渊聚势:连击蓄力'},
          {kind:'debuff',val:1,weak:'metal',hint:'瘴潮压制:能量侵蚀'}
        ];
    const intent={...cycle[(turn-1)%cycle.length], phase};
    if(phase===2 && intent.kind==='charge') intent.hint='深渊聚势:下一击更凶猛';
    return intent;
  }
  if(type==='elite'){
    const cycle=[
      {kind:'atk',val:11+Math.floor(turn/3),weak,hint:'精英突刺'},
      {kind:'debuff',val:1,weak:'light',hint:'瘴气压制:下回合能量-1'},
      {kind:'def',val:10,weak:'fire',hint:'硬化甲壳'}
    ];
    return cycle[(turn-1)%cycle.length];
  }
  const cycle=[
    {kind:'atk',val:8+Math.floor(turn/4),weak,hint:'污染藤鞭'},
    {kind:'def',val:6+Math.floor(turn/5),weak:'fire',hint:'结壳'},
    {kind:'charge',val:0,weak:'earth',hint:'聚瘴:下回合攻击增强'}
  ];
  return cycle[(turn-1)%cycle.length];
}

let S=null, cb=null, root=null, injected=false;

function injectStyle(){
  if(injected) return; injected=true;
  const css=`
  #battle{position:fixed;inset:0;z-index:80;display:none;opacity:0;
    transition:opacity .6s cubic-bezier(.4,0,.2,1);
    background:url('assets/ui/battle_bg.jpg?v=2') center/cover, radial-gradient(ellipse at 50% 30%,#2a2340 0%,#15121f 60%,#0a0810 100%);
    font-family:'Noto Serif SC',serif;color:#f6f1e7;overflow:hidden;}
  #battle.on{display:block;opacity:1;}
  #battle .arena{position:absolute;inset:0;display:flex;flex-direction:column;}
  #battle .enemyZone{flex:1;display:flex;align-items:center;justify-content:center;position:relative;}
  #battle .enemy{position:relative;text-align:center;transition:transform .12s;isolation:isolate;transform:translateY(-44px);}
  #battle .enemy::before{content:'';position:absolute;left:50%;bottom:28px;width:360px;height:82px;transform:translateX(-50%);border-radius:50%;
    background:radial-gradient(ellipse,rgba(55,20,82,.55),rgba(8,6,12,.58) 62%,transparent 74%);filter:blur(4px);z-index:-1;}
  #battle .enemy::after{content:'';position:absolute;left:50%;top:40px;width:460px;height:420px;transform:translateX(-50%);border-radius:50%;
    background:radial-gradient(circle,rgba(160,92,225,.18),transparent 62%);mix-blend-mode:screen;z-index:-1;pointer-events:none;}
  #battle .enemy img{width:min(440px,34vw);filter:drop-shadow(0 24px 48px rgba(0,0,0,.78)) drop-shadow(0 0 26px rgba(154,82,220,.2));image-rendering:auto;
    animation:ebreathe 3.4s ease-in-out infinite;transition:filter .08s;}
  #battle .enemy img.flash{filter:brightness(8) contrast(1.8) drop-shadow(0 24px 48px rgba(0,0,0,.7));}
  @keyframes ebreathe{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-5px) scale(1.018)}}
  #battle .miasma{position:absolute;border-radius:50%;pointer-events:none;mix-blend-mode:screen;
    background:radial-gradient(circle,rgba(186,120,224,.6),rgba(150,80,200,0));}
  #battle .enemy.hit{animation:none;}
  @keyframes eh{0%,100%{transform:translateX(0)}25%{transform:translateX(-12px)}75%{transform:translateX(12px)}}
  #battle .arena.chroma{animation:chromaticShake .2s ease-out;}
  @keyframes chromaticShake{
    0%{filter:none}
    10%{filter:drop-shadow(3px 0 0 rgba(255,0,0,.8)) drop-shadow(-3px 0 0 rgba(0,255,255,.7))}
    40%{filter:drop-shadow(2px 0 0 rgba(255,0,0,.5)) drop-shadow(-2px 0 0 rgba(0,255,255,.45))}
    100%{filter:none}
  }
  #battle .slash{position:absolute;pointer-events:none;width:220px;height:10px;background:linear-gradient(90deg,
    transparent,rgba(255,255,255,.98) 15%,rgba(255,245,230,.92) 50%,rgba(255,210,190,.75) 85%,transparent);
    transform-origin:center;box-shadow:0 0 24px rgba(255,255,255,.7),0 0 12px rgba(255,200,150,.5);mix-blend-mode:screen;
    animation:slashFade .38s ease-out forwards;z-index:92;}
  @keyframes slashFade{0%{opacity:1;transform:scaleX(.2)}35%{opacity:1;transform:scaleX(1.3)}100%{opacity:0;transform:scaleX(1.6)}}
  #battle .ename{position:absolute;top:-58px;left:50%;transform:translateX(-50%);font-size:26px;letter-spacing:.18em;
    color:#f6d27e;white-space:nowrap;text-shadow:0 2px 8px rgba(0,0,0,.85),0 0 2px rgba(0,0,0,.9);font-weight:800;background:linear-gradient(180deg,rgba(16,10,12,.88),rgba(37,22,22,.72));border:1px solid rgba(244,208,117,.38);border-radius:999px;padding:6px 22px;}
  #battle .ehp{width:340px;height:28px;border-radius:14px;background:rgba(0,0,0,.78);
    box-shadow:0 0 28px rgba(255,100,100,.45),inset 0 2px 10px rgba(0,0,0,.75);margin:18px auto 0;overflow:hidden;position:relative;}
  #battle .ehp i{position:absolute;inset:0;transform-origin:left;background:linear-gradient(90deg,#e85555,#ff9494);
    box-shadow:inset 0 2px 8px rgba(255,255,255,.35),inset 0 -2px 8px rgba(0,0,0,.4);transition:transform .4s cubic-bezier(.2,.8,.2,1);}
  #battle .ehp span{position:absolute;inset:0;text-align:center;font-size:14px;line-height:24px;color:#fff;
    font-family:'Cormorant Garamond',serif;font-weight:600;text-shadow:0 2px 8px rgba(0,0,0,.85),0 0 1px rgba(0,0,0,.9);}
  #battle .intent{margin:14px auto 0;font-size:19px;letter-spacing:.08em;color:#ffe0b4;min-height:34px;width:max-content;max-width:min(520px,80vw);background:rgba(18,10,12,.72);border:1px solid rgba(255,202,160,.28);border-radius:999px;padding:9px 22px;text-shadow:0 2px 8px rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;gap:10px;backdrop-filter:blur(8px) saturate(1.05);box-shadow:0 8px 24px rgba(0,0,0,.4);transition:all .3s ease;}
  #battle .intent .icon{font-size:26px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.6));animation:intentIconPulse 1.8s ease-in-out infinite;}
  @keyframes intentIconPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
  #battle .intent.atk{background:rgba(32,10,10,.82);border-color:rgba(255,110,90,.36);color:#ffb4a0;box-shadow:0 8px 24px rgba(0,0,0,.4),0 0 20px rgba(255,110,90,.12);}
  #battle .intent.atk .icon{color:#ff7a6a;}
  #battle .intent.def{background:rgba(10,22,32,.82);border-color:rgba(140,200,230,.36);color:#bce9ff;box-shadow:0 8px 24px rgba(0,0,0,.4),0 0 20px rgba(140,200,230,.12);}
  #battle .intent.def .icon{color:#9fd4e8;}
  #battle .intent.debuff{background:rgba(28,10,32,.82);border-color:rgba(200,140,230,.36);color:#e8c4ff;box-shadow:0 8px 24px rgba(0,0,0,.4),0 0 20px rgba(200,140,230,.12);}
  #battle .intent.debuff .icon{color:#d9a8ff;}
  #battle .eblock{display:inline-block;margin-left:10px;color:#9fd4e8;font-size:14px;padding:3px 10px;border-radius:999px;background:rgba(159,212,232,.14);}
  #battle .floatN{position:absolute;left:0;top:0;font-family:'Cormorant Garamond',serif;font-size:36px;font-weight:600;
    pointer-events:none;will-change:transform,opacity;text-shadow:0 2px 8px rgba(0,0,0,.6);}
  #battle .pbar{height:110px;display:flex;align-items:center;justify-content:space-between;padding:0 44px;
    border-top:1px solid rgba(246,241,231,.18);background:linear-gradient(180deg,rgba(10,8,16,.52),rgba(7,5,10,.88));box-shadow:0 -16px 48px rgba(0,0,0,.32);backdrop-filter:blur(10px) saturate(1.08);}
  #battle .vit{display:flex;align-items:center;gap:28px;}
  #battle .stat{display:flex;flex-direction:column;gap:7px;min-width:130px;}
  #battle .stat .lab{font-size:11px;letter-spacing:.26em;opacity:.92;color:#f4d075;text-shadow:0 2px 8px rgba(0,0,0,.7);}
  #battle .bar{width:160px;height:10px;border-radius:6px;background:rgba(255,255,255,.14);overflow:hidden;position:relative;box-shadow:inset 0 2px 8px rgba(0,0,0,.5);}
  #battle .bar i{position:absolute;inset:0;transform-origin:left;transition:transform .4s cubic-bezier(.34,1.56,.64,1);box-shadow:inset 0 1px 0 rgba(255,255,255,.25),inset 0 -1px 0 rgba(0,0,0,.3);}
  #battle .bar.hp i{background:linear-gradient(90deg,#8fc46a,#b6e08a);box-shadow:inset 0 1px 0 rgba(255,255,255,.3),inset 0 -1px 0 rgba(0,0,0,.3),0 0 12px rgba(143,196,106,.4);}
  #battle .bar.sh i{background:linear-gradient(90deg,#8fb6d8,#bcd8ee);box-shadow:inset 0 1px 0 rgba(255,255,255,.3),inset 0 -1px 0 rgba(0,0,0,.3),0 0 12px rgba(143,182,216,.4);}
  #battle .vnum{font-family:'Cormorant Garamond',serif;font-size:20px;color:#fff0ce;text-shadow:0 2px 8px rgba(0,0,0,.75);font-weight:600;}
  #battle .energy{display:flex;align-items:center;gap:12px;}
  #battle .orb{width:50px;height:50px;border-radius:50%;display:flex;align-items:center;justify-content:center;
    background:radial-gradient(circle at 38% 32%,#ffe9a8,#c9a24b 70%,#8a6d2c);color:#2b2722;
    font-family:'Cormorant Garamond',serif;font-size:23px;box-shadow:0 0 24px rgba(201,162,75,.6),inset 0 2px 8px rgba(255,255,255,.3);font-weight:600;}
  #battle .endBtn{border:1px solid var(--gold,#c9a24b);background:rgba(18,12,10,.68);color:#fff0ce;cursor:pointer;
    font-family:'Noto Serif SC',serif;font-size:14px;letter-spacing:.32em;text-indent:.3em;padding:14px 30px;
    border-radius:999px;position:relative;overflow:hidden;transition:all .4s cubic-bezier(.2,.85,.2,1);box-shadow:0 8px 24px rgba(0,0,0,.4);backdrop-filter:blur(8px) saturate(1.05);}
  #battle .endBtn::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,#f4d03f,#c9a24b);transform:scaleX(0);transform-origin:left;transition:transform .5s cubic-bezier(.65,0,.35,1);z-index:-1;}
  #battle .endBtn:hover{color:#2b2722;border-color:#f4d03f;box-shadow:0 8px 24px rgba(0,0,0,.4),0 0 28px rgba(244,208,63,.28);} #battle .endBtn:hover::before{transform:scaleX(1);}
  #battle .endBtn:active{transform:scale(.96);}
  #battle .hand{position:absolute;bottom:76px;left:0;right:0;height:clamp(244px,30vh,292px);display:flex;align-items:flex-end;
    justify-content:center;gap:clamp(6px,1vw,14px);pointer-events:none;perspective:900px;}
  #battle .hand::before{content:'';position:absolute;left:50%;bottom:-42px;width:min(920px,86vw);height:250px;transform:translateX(-50%);border-radius:48% 48% 0 0;
    background:linear-gradient(180deg,rgba(10,8,14,0),rgba(9,7,13,.74) 42%,rgba(7,5,10,.9));filter:blur(.2px);pointer-events:none;}
  #battle .card{width:clamp(154px,11.4vw,178px);height:clamp(218px,16vw,254px);margin:0;border-radius:16px;cursor:pointer;pointer-events:auto;
    background:url('assets/sprites/card_frame_terra_real.png?v=1') center/100% 100% no-repeat;
    border:0;box-shadow:0 16px 34px rgba(0,0,0,.52),0 0 22px rgba(218,176,91,.12);
    padding:18px 16px 16px;display:flex;flex-direction:column;color:#2f2419;text-shadow:none;
    transform-origin:bottom center;transition:transform .34s cubic-bezier(.16,1,.3,1),box-shadow .34s cubic-bezier(.16,1,.3,1),filter .34s;position:relative;will-change:transform;backface-visibility:hidden;}
  #battle .card::before{content:'';position:absolute;inset:11px;border-radius:12px;border:1px solid rgba(115,73,30,.13);pointer-events:none;}
  #battle .card.playing{animation:cardPlay .34s cubic-bezier(.2,.8,.2,1) forwards;z-index:20;}
  @keyframes cardPlay{0%{transform:translateY(0) scale(1) rotate(0deg)}40%{transform:translateY(-92px) scale(1.18) rotate(-2deg)}100%{transform:translateY(-28px) scale(.9) rotate(2deg);opacity:0}}
  #battle .card:hover{transform:translate3d(0,-30px,0) scale(1.055);box-shadow:0 30px 64px rgba(0,0,0,.66),0 0 30px rgba(218,176,91,.22);z-index:5;filter:saturate(1.08);}
  #battle .card.atk .cart{background:radial-gradient(circle at 50% 34%,rgba(255,211,120,.3),rgba(98,38,28,.62) 64%,rgba(21,10,10,.78));color:#ffcd7d;}
  #battle .card.def .cart{background:radial-gradient(circle at 50% 34%,rgba(158,209,232,.28),rgba(34,65,77,.58) 64%,rgba(10,18,24,.76));color:#bce9ff;}
  #battle .card.heal .cart{background:radial-gradient(circle at 50% 34%,rgba(184,232,145,.3),rgba(43,83,46,.6) 64%,rgba(13,26,16,.78));color:#c9f59a;}
  #battle .card.atk{border-color:rgba(226,146,99,.78);} #battle .card.def{border-color:rgba(142,185,198,.78);} #battle .card.heal{border-color:rgba(150,203,136,.78);}
  #battle .card.disabled{filter:grayscale(.7) brightness(.6);cursor:default;}
  #battle .card .cost{position:absolute;top:-10px;left:-10px;width:42px;height:42px;border-radius:50%;
    background:radial-gradient(circle at 38% 30%,#fff0b8,#c99b45 62%,#75542a);color:#2b2417;display:flex;align-items:center;
    justify-content:center;font-family:'Cormorant Garamond',serif;font-size:22px;border:1px solid rgba(255,236,174,.75);box-shadow:0 3px 12px rgba(0,0,0,.55),0 0 16px rgba(201,162,75,.24);z-index:2;}
  #battle .card .cname{font-size:clamp(14px,1vw,17px);letter-spacing:.08em;text-align:center;margin:4px 16px 9px;color:#4a2f16;font-weight:800;
    background:linear-gradient(180deg,rgba(248,222,165,.92),rgba(209,156,80,.76));border:1px solid rgba(102,61,28,.45);border-radius:999px;padding:3px 5px;text-shadow:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  #battle .card .cart{height:clamp(82px,6.2vw,98px);margin:0 7px 8px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:clamp(34px,2.8vw,44px);
    color:#f5d48c;background:radial-gradient(circle at 50% 35%,rgba(246,220,145,.22),rgba(63,36,22,.5) 64%,rgba(21,12,10,.72));
    border:1px solid rgba(220,175,91,.42);box-shadow:inset 0 0 22px rgba(0,0,0,.34),0 0 10px rgba(201,162,75,.1);position:relative;overflow:hidden;font-weight:800;}
  #battle .card .cart::before,#battle .card .cart::after{content:'';position:absolute;pointer-events:none;}
  #battle .card .cart::before{inset:14%;border-radius:50%;border:1px solid rgba(255,236,174,.18);}
  #battle .card .cart::after{width:78%;height:2px;background:linear-gradient(90deg,transparent,rgba(255,240,180,.75),transparent);transform:rotate(-28deg);filter:blur(.2px);}
  #battle .card .cartImg{position:relative;z-index:2;width:82%;height:82%;object-fit:contain;filter:drop-shadow(0 8px 10px rgba(0,0,0,.42));transform:translateZ(0);}
  #battle .card.def .cart::before{inset:18% 24%;border-radius:18px 18px 26px 26px;border:2px solid rgba(188,233,255,.42);background:linear-gradient(180deg,rgba(188,233,255,.12),transparent);}
  #battle .card.def .cart::after{width:44%;height:44%;border-radius:50%;background:radial-gradient(circle,rgba(188,233,255,.38),transparent 68%);transform:none;}
  #battle .card.heal .cart::before{inset:20%;border-radius:50% 50% 46% 46%;border:2px solid rgba(201,245,154,.42);background:radial-gradient(circle at 50% 70%,rgba(201,245,154,.22),transparent 60%);}
  #battle .card.heal .cart::after{width:52%;height:52%;border-radius:60% 0 60% 0;background:linear-gradient(135deg,rgba(201,245,154,.5),transparent);transform:rotate(38deg);}
  #battle .card.charge .cart::before{inset:17%;border-radius:50%;border:2px dashed rgba(255,213,122,.45);animation:chargeSpin 7s linear infinite;}
  #battle .card.charge .cart::after{width:34%;height:70%;border-radius:999px;background:linear-gradient(180deg,rgba(255,240,180,.72),rgba(255,134,76,.18));transform:rotate(24deg);}
  @keyframes chargeSpin{to{transform:rotate(360deg)}}
  #battle .card .ctype{font-size:clamp(12px,.9vw,14px);letter-spacing:.07em;text-align:center;color:#5b3514;opacity:1;margin:0 0 5px;text-shadow:0 1px 0 rgba(255,248,224,.5);font-weight:900;}
  #battle .card .cdesc{font-size:clamp(13.6px,1.04vw,15.4px);line-height:1.32;text-align:center;opacity:1;letter-spacing:.005em;background:rgba(255,248,224,.91);border:1px solid rgba(120,75,32,.32);border-radius:10px;padding:8px 8px;color:#26180c;min-height:52px;text-shadow:0 1px 0 rgba(255,248,224,.55);font-weight:900;}
  #battle .topbar{position:absolute;top:18px;left:50%;right:auto;transform:translateX(-50%);text-align:center;min-width:min(620px,82vw);background:linear-gradient(180deg,rgba(13,9,12,.84),rgba(25,15,20,.56));border:1px solid rgba(244,208,117,.24);border-radius:22px;padding:12px 24px;box-shadow:0 16px 42px rgba(0,0,0,.32);backdrop-filter:blur(10px) saturate(1.08);}
  #battle .topbar .t{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:18px;letter-spacing:.18em;opacity:1;color:#fff1cf;text-shadow:0 2px 8px rgba(0,0,0,.78);}
  #battle .buffline{margin-top:9px;font-size:11px;letter-spacing:.2em;color:#f4d03f;opacity:.84;text-shadow:0 2px 8px rgba(0,0,0,.7);padding:6px 12px;border-radius:999px;background:rgba(244,208,63,.08);display:inline-block;}
  #battle .bossphase{margin-top:8px;font-size:12px;letter-spacing:.24em;color:#ffb86c;opacity:.94;text-shadow:0 2px 10px rgba(0,0,0,.75);padding:5px 14px;border-radius:999px;background:rgba(255,184,108,.1);display:inline-block;}
  #battle .bossphase.enraged{color:#ff8e6c;background:rgba(255,142,108,.14);animation:enragedPulse 1.2s ease-in-out infinite;}
  @keyframes enragedPulse{0%,100%{opacity:.94}50%{opacity:1;transform:scale(1.02)}}
  #battle .deckcount{position:absolute;bottom:110px;font-size:12px;letter-spacing:.14em;opacity:.9;color:#f4d075;text-shadow:0 2px 8px rgba(0,0,0,.75);}
  #battle .deckcount.draw{left:34px;} #battle .deckcount.disc{right:34px;}
  #battle .result{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;
    background:radial-gradient(circle at 50% 38%,rgba(201,162,75,.18),transparent 34%),rgba(8,6,14,.82);backdrop-filter:blur(9px) saturate(1.1);text-align:center;gap:0;padding:32px;}
  #battle .result.on{display:flex;}
  #battle .result::before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,244,210,.05),transparent 22%,rgba(0,0,0,.22));pointer-events:none;}
  #battle .rewardPanel{position:relative;width:min(980px,92vw);max-height:88vh;display:flex;flex-direction:column;align-items:center;gap:18px;padding:72px 82px 78px;border:0;border-radius:30px;background:url('assets/sprites/reward_panel_terra_real.png?v=1') center/100% 100% no-repeat;box-shadow:0 34px 90px rgba(0,0,0,.58);overflow:hidden;}
  #battle .rewardPanel::before{content:'';position:absolute;inset:58px 72px 66px;border:1px solid rgba(132,83,31,.12);border-radius:22px;pointer-events:none;}
  #battle .result h2{position:relative;font-family:'Cormorant Garamond','Noto Serif SC',serif;font-size:clamp(38px,5vw,62px);font-weight:300;letter-spacing:.34em;text-indent:.34em;color:#6a3f16;text-shadow:0 2px 0 rgba(255,245,210,.6),0 8px 22px rgba(95,55,18,.18);}
  #battle .result h2::after{content:'';display:block;width:240px;max-width:48vw;height:1px;margin:14px auto 0;background:linear-gradient(90deg,transparent,rgba(244,208,63,.8),transparent);}
  #battle .result .loot{position:relative;font-size:15px;letter-spacing:.13em;line-height:1.9;opacity:.96;color:#5e3f1e;max-width:760px;font-weight:800;}
  #battle .result .loot .sub{display:block;margin-top:4px;opacity:.78;font-size:12px;letter-spacing:.16em;color:#7c5a2f;}
  #battle .result .gold{color:#f4d03f;}
  #battle .rewardChoices{position:relative;display:grid;grid-template-columns:repeat(3,minmax(178px,1fr));gap:20px 22px;justify-content:center;width:min(700px,86vw);margin-top:10px;}
  #battle .rewardChoice{position:relative;min-height:142px;border:1px solid rgba(218,176,91,.58);border-radius:18px;background:linear-gradient(180deg,rgba(255,247,219,.98),rgba(218,183,119,.94));padding:14px 15px 16px;cursor:pointer;color:#2f2012;text-shadow:none;box-shadow:0 18px 34px rgba(0,0,0,.3),inset 0 0 0 1px rgba(255,255,255,.48);transition:transform .25s,box-shadow .25s,border-color .25s,filter .25s;overflow:hidden;}
  #battle .rewardChoice::before{content:'';position:absolute;inset:6px;border:1px solid rgba(116,74,28,.24);border-radius:13px;pointer-events:none;}
  #battle .rewardChoice::after{content:'';position:absolute;left:-20%;right:-20%;top:-40%;height:70%;background:radial-gradient(ellipse at 50% 50%,rgba(255,255,255,.28),transparent 66%);pointer-events:none;}
  #battle .rewardChoice:hover{transform:translateY(-6px) scale(1.018);border-color:#f4d03f;box-shadow:0 24px 54px rgba(0,0,0,.42),0 0 28px rgba(244,208,63,.28),inset 0 0 0 1px rgba(255,255,255,.5);filter:saturate(1.06);}
  #battle .rewardChoice.rare{background:linear-gradient(180deg,rgba(238,232,255,.96),rgba(182,159,225,.84));}
  #battle .rewardChoice.epic{background:linear-gradient(180deg,rgba(255,231,196,.96),rgba(166,96,58,.86));}
  #battle .rewardChoice.beast{background:linear-gradient(180deg,rgba(224,250,232,.96),rgba(143,197,163,.84));}
  #battle .rewardChoice .rmeta{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px;font-size:10px;letter-spacing:.12em;color:#6b4a21;font-weight:900;}
  #battle .rewardChoice .ricon{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:rgba(80,51,24,.16);border:1px solid rgba(91,58,24,.28);font-size:20px;box-shadow:inset 0 0 12px rgba(255,255,255,.25);}
  #battle .rewardChoice .rtag{padding:4px 7px;border-radius:999px;background:rgba(78,49,22,.13);border:1px solid rgba(78,49,22,.16);}
  #battle .rewardChoice .rname{position:relative;font-size:17px;letter-spacing:.12em;color:#5b3514;margin:0 0 8px;font-weight:900;text-align:left;}
  #battle .rewardChoice .rdesc{position:relative;font-size:12.6px;line-height:1.55;letter-spacing:.035em;opacity:.92;text-align:left;font-weight:700;color:#352313;}
  @media(max-width:760px){#battle .rewardPanel{padding:28px 18px;width:94vw}#battle .rewardChoices{grid-template-columns:1fr 1fr;width:90vw}#battle .rewardChoice{min-height:132px}}
  `;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
}

function buildDOM(){
  root=document.getElementById('battle');
  if(root) return;
  root=document.createElement('div'); root.id='battle';
  root.innerHTML=`
    <div class="arena">
      <div class="topbar"><div class="t" id="b_turn">深渊副本 · 第 1 回合</div><div class="buffline" id="b_buffs"></div><div class="bossphase" id="b_bphase"></div></div>
      <div class="enemyZone">
        <div class="enemy" id="b_enemy">
          <div class="ename" id="b_ename">狂暴树精</div>
          <img id="b_eimg" src="assets/sprites/enemy_root_worm.png?v=3" alt="">
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
      <div class="rewardPanel">
        <h2 id="b_rtitle"></h2>
        <div class="loot" id="b_loot"></div>
        <div class="rewardChoices" id="b_rewards"></div>
      </div>
    </div>`;
  document.body.appendChild(root);
  root.querySelector('#b_end').onclick=endTurn;
}

function setEnemyPresentation(){
  if(!root||!S?.enemy) return;
  const name=root.querySelector('#b_ename');
  const img=root.querySelector('#b_eimg');
  const type=S.enemy.type;
  if(type==='boss'){
    if(name) name.textContent='深渊主核';
    if(img){ img.src='assets/sprites/enemy_blight.png?v=7'; img.style.width='440px'; }
  } else if(type==='elite'){
    if(name) name.textContent='菌甲精英';
    if(img){ img.src='assets/sprites/enemy_root_worm.png?v=3'; img.style.width='440px'; }
  } else {
    if(name) name.textContent='狂暴树精';
    if(img){ img.src='assets/sprites/enemy_root_worm.png?v=3'; img.style.width='420px'; }
  }
}

function floatNum(text,color,x,y,opts={}){
  if(window.BattleEffects){
    const typeMap={'#ff9b7a':'damage','#b6e08a':'heal','#bcd8ee':'shield','#f4d03f':'buff','#d9a8ff':'debuff'};
    BattleEffects.spawnDamageNumber(text,x,y,typeMap[color]||'damage',opts);
  }
}
function screenShake(mag,dur){
  const el=root.querySelector('.arena');
  if(window.BattleEffects) BattleEffects.screenShake(mag,dur,el);
}
function hitFlash(){
  const img=root.querySelector('#b_eimg');
  if(window.BattleEffects) BattleEffects.enemyRedFlash(img);
}
function spawnCardParticles(x,y,cardType){
  if(!window.BattleEffects) return;
  const colors={atk:[0xff7a6a,0xff9b7a],def:[0x9fd4e8,0xbce9ff],heal:[0x9fdc7b,0xc9f59a]};
  const col=colors[cardType]||colors.atk;
  for(let i=0;i<12+Math.random()*8;i++){
    const p=document.createElement('div');
    p.style.cssText=`position:absolute;left:${x}px;top:${y}px;width:${4+Math.random()*6}px;height:${4+Math.random()*6}px;border-radius:50%;background:#${col[Math.random()<0.5?0:1].toString(16)};pointer-events:none;z-index:95`;
    document.body.appendChild(p);
    const ang=Math.random()*Math.PI*2,speed=50+Math.random()*120;
    const vx=Math.cos(ang)*speed,vy=Math.sin(ang)*speed-80;
    const t0=performance.now();
    (function anim(){
      const dt=(performance.now()-t0)/1000;
      if(dt>0.8){p.remove();return;}
      const px=x+vx*dt,py=y+vy*dt+300*dt*dt;
      p.style.left=px+'px';p.style.top=py+'px';
      p.style.opacity=Math.max(0,1-dt*1.25);
      requestAnimationFrame(anim);
    })();
  }
}
function playerHurtFx(){ let v=root.querySelector('#b_hurt');
  if(!v){ v=$('div',null,root); v.id='b_hurt';
    v.style.cssText='position:absolute;inset:0;z-index:88;pointer-events:none;opacity:0;transition:opacity .1s;'+
      'box-shadow:inset 0 0 160px 40px rgba(200,40,40,.7);'; }
  v.style.opacity='1'; setTimeout(()=>v.style.opacity='0',130); }
function projectile(fromEl,cardType){
  const img=root.querySelector('#b_eimg');
  if(window.BattleEffects){
    BattleEffects.createCardProjectile(fromEl,img,cardType||'atk',null);
  }
}
let miasmaTimer=null;
function startMiasma(){ stopMiasma();
  miasmaTimer=setInterval(()=>{
    if(!Battle.active){ stopMiasma(); return; }
    const z=root.querySelector('.enemyZone'); if(!z) return;
    if(z.querySelectorAll('.miasma').length>=5) return;
    const m=$('div','miasma',z); const sz=12+Math.random()*22; m.style.width=m.style.height=sz+'px';
    m.style.left=(z.clientWidth/2+(Math.random()-.5)*190)+'px';
    m.style.top=(z.clientHeight*0.52+(Math.random()-.5)*120)+'px';
    const t0=performance.now(),drift=(Math.random()-.5)*46,rise=34+Math.random()*44;
    (function a(){ const t=(performance.now()-t0)/1900;
      if(t>=1){ m.remove(); return; }
      m.style.transform=`translate(${drift*t}px,${-rise*t}px)`;
      m.style.opacity=(t<.3? t/.3 : (1-t)/.7)*0.65;
      requestAnimationFrame(a);
    })();
  }, 700);
}
function stopMiasma(){ if(miasmaTimer){ clearInterval(miasmaTimer); miasmaTimer=null; } }
function elemName(e){ return ({earth:'土',fire:'火',metal:'金',light:'光',water:'水'})[e]||e||'—'; }
function hasAffix(c, name){ return (c.affixes||[]).includes(name); }
function cardTag(c){ return c.archetype||'plain'; }
function buffName(b){ return ({
  abyss_vigor:'深渊活力',
  ember_focus:'余烬专注',
  root_guard:'根甲护佑'
})[b?.id]||b?.name||'未知祝福'; }
function applyRunBuffs(){
  const buffs=Array.isArray(cb?.buffs)?cb.buffs:[];
  S.runBuffs=buffs.map(b=>({ ...b }));
  buffs.forEach(b=>{
    if(b.id==='abyss_vigor'){
      S.pMax+=b.hpMax||8; S.pHP+=b.hpMax||8;
    } else if(b.id==='ember_focus'){
      S.energyMax+=b.energyMax||1; S.energy+=b.energyFirstTurn||1;
    } else if(b.id==='root_guard'){
      S.startShield=(S.startShield||0)+(b.shield||6);
    }
  });
}
function spawnSlashes(){
  const img=root.querySelector('#b_eimg');
  if(window.BattleEffects) BattleEffects.spawnSlashEffects(img,2+(Math.random()<0.4?1:0));
}
function chromaticAberration(){
  const ar=root.querySelector('.arena');
  if(window.BattleEffects) BattleEffects.chromaticAberration(ar);
}

function showEnergyPreview(current, max){
  let preview=document.getElementById('energyPreview');
  if(!preview){
    preview=document.createElement('div');
    preview.id='energyPreview';
    preview.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-size:48px;font-weight:700;color:#f4d03f;text-shadow:0 4px 12px rgba(0,0,0,.8);pointer-events:none;opacity:0;transition:opacity .3s;z-index:95;font-family:"Cormorant Garamond",serif';
    document.body.appendChild(preview);
  }
  preview.textContent=`能量: ${current} / ${max}`;
  preview.style.opacity='1';
  setTimeout(()=>preview.style.opacity='0', 1200);
}

function cardVisual(c){
  const name=c?.name||'';
  if(name.includes('蓄能')) return {icon:'✦烈刃✦', label:'蓄势 · 炉火', cls:'charge', art:'assets/sprites/card_art_charge.png'};
  if(name.includes('格挡')||c?.type==='def') return {icon:'⬟根盾⬟', label:'守护 · 根甲', cls:'def', art:'assets/sprites/card_art_guard.png'};
  if(name.includes('愈')||name.includes('芽')||c?.type==='heal') return {icon:'✦新芽✦', label:'回复 · 新芽', cls:'heal', art:'assets/sprites/card_art_heal.png'};
  if(name.includes('划击')) return {icon:'⌁芽刃⌁', label:'攻击 · 大地', cls:'atk', art:'assets/sprites/card_art_slash.png'};
  if(c?.elem==='fire') return {icon:'✦火纹✦', label:'攻击 · 炉火', cls:'charge', art:'assets/sprites/card_art_charge.png'};
  if(c?.elem==='metal') return {icon:'⬡金痕⬡', label:'攻击 · 金痕', cls:'atk', art:'assets/sprites/card_art_slash.png'};
  return c?.type==='atk' ? {icon:'⌁刃光⌁', label:'攻击 · 大地', cls:'atk', art:'assets/sprites/card_art_slash.png'} : {icon:'✦灵纹✦', label:'符文 · 大地', cls:'heal', art:'assets/sprites/card_art_heal.png'};
}

function render(){
  const r=id=>root.querySelector(id);
  r('#b_turn').textContent=`深渊副本 · 第 ${S.turn} 回合`;
  const buffEl=r('#b_buffs');
  if(buffEl) buffEl.textContent=(S.runBuffs||[]).length?`远征祝福 · ${(S.runBuffs||[]).map(buffName).join(' / ')}`:'';
  const phaseEl=r('#b_bphase');
  if(phaseEl){
    if(S.enemy.type==='boss'){
      const phase=S.enemy.phase||1;
      phaseEl.textContent=phase===1 ? '深渊主核 · 第一阶段' : '深渊主核 · 暴走阶段';
      phaseEl.className='bossphase'+(phase===2?' enraged':'');
    } else {
      phaseEl.textContent='';
      phaseEl.className='bossphase';
    }
  }
  r('#b_ehpbar').style.transform=`scaleX(${Math.max(0,S.enemy.hp/S.enemy.max)})`;
  r('#b_ehptxt').textContent=`${Math.max(0,S.enemy.hp)} / ${S.enemy.max}`;
  const it=S.enemy.intent, iEl=r('#b_intent');
  if(it){
    let cls='intent', iconHtml='';
    if(it.kind==='atk'||it.kind==='heavy'){
      cls+=' atk';
      iconHtml='<span class="icon">⚔</span>';
    } else if(it.kind==='def'){
      cls+=' def';
      iconHtml='<span class="icon">🛡</span>';
    } else if(it.kind==='debuff'){
      cls+=' debuff';
      iconHtml='<span class="icon">⚡</span>';
    } else if(it.kind==='charge'){
      cls+=' debuff';
      iconHtml='<span class="icon">☄</span>';
    }
    iEl.className=cls;
    const weak=it.weak?`<span class="eblock">弱点:${elemName(it.weak)}</span>`:'';
    if(it.kind==='atk') iEl.innerHTML=`${iconHtml}<span>${it.hint||'即将攻击'} ${it.val}</span>${weak}`;
    else if(it.kind==='heavy') iEl.innerHTML=`${iconHtml}<span>${it.hint||'重击'} ${it.val}</span>${weak}`;
    else if(it.kind==='charge') iEl.innerHTML=`${iconHtml}<span>${it.hint||'聚瘴'}</span>${weak}`;
    else if(it.kind==='debuff') iEl.innerHTML=`${iconHtml}<span>${it.hint||'瘴气压制'}</span>${weak}`;
    else iEl.innerHTML=`${iconHtml}<span>${it.hint||'即将格挡'} ${it.val}</span>${weak}`;
    if(S.enemy.block>0) iEl.innerHTML+=`<span class="eblock">🛡${S.enemy.block}</span>`;
  } else iEl.textContent='';
  r('#b_hpbar').style.transform=`scaleX(${Math.max(0,S.pHP/S.pMax)})`;
  r('#b_shbar').style.transform=`scaleX(${Math.min(1,S.shield/S.pMax)})`;
  r('#b_vnum').textContent=`${Math.max(0,S.pHP)}♥  ${S.shield}🛡`;
  r('#b_orb').textContent=S.energy;
  r('#b_draw').textContent='抽牌堆 '+S.draw.length;
  r('#b_disc').textContent='弃牌堆 '+S.discard.length;
  // 手牌 + 能量预判提示
  const hand=r('#b_hand'); hand.innerHTML='';
  S.hand.forEach((c,i)=>{
    const playable = S.turn>0 && !S.over && S.phase==='player' && S.energy>=c.cost;
    const el=$('div','card '+c.type+(playable?'':' disabled'),hand);
    const visual=cardVisual(c);
    if(visual.cls) el.classList.add(visual.cls);

    // 能量不足时添加视觉反馈
    if(!playable && S.energy < c.cost) {
      el.style.filter = 'grayscale(0.7) brightness(0.6)';
      el.style.cursor = 'not-allowed';
    }

    el.innerHTML=`<div class="cost">${c.cost}</div><div class="cname">${c.name}</div>
      <div class="cart"><img class="cartImg" src="${visual.art}" alt="${visual.icon}"></div><div class="ctype">${visual.label}</div><div class="cdesc">${c.desc}</div>`;

    if(playable) {
      el.onclick=(ev)=>playCard(i, ev.currentTarget);
      // 悬停时显示能量预判
      el.onmouseenter=()=>{
        if(S.energy >= c.cost) {
          showEnergyHint(S.energy - c.cost, S.energyMax);
        }
      };
      el.onmouseleave=()=>hideEnergyHint();
    }
  });
}

function showEnergyHint(afterCost, max){
  let hint=document.getElementById('energyHint');
  if(!hint){
    hint=document.createElement('div');
    hint.id='energyHint';
    hint.style.cssText='position:fixed;top:20%;left:50%;transform:translateX(-50%);font-size:28px;font-weight:600;padding:12px 24px;border-radius:999px;background:rgba(10,12,14,.85);border:1px solid rgba(244,208,63,.6);backdrop-filter:blur(8px);pointer-events:none;opacity:0;transition:opacity .2s;z-index:94;font-family:"Noto Serif SC",serif';
    document.body.appendChild(hint);
  }
  const color = afterCost > 0 ? '#b6e08a' : '#ff9b7a';
  hint.innerHTML=`能量: ${afterCost} <span style="opacity:.6">/ ${max}</span>`;
  hint.style.color = color;
  hint.style.opacity='1';
}

function hideEnergyHint(){
  const hint=document.getElementById('energyHint');
  if(hint) hint.style.opacity='0';
}

function drawCards(n){
  for(let k=0;k<n;k++){
    if(!S.draw.length){ if(!S.discard.length) break; S.draw=shuffle(S.discard); S.discard=[]; }
    S.hand.push(S.draw.pop());
  }
}
function startPlayerTurn(){
  S.phase='player'; S.energy=Math.max(2,S.energyMax-(S.energyPenalty||0)); S.energyPenalty=0; S.shield=(S.turn===1?(S.startShield||0):0)+(S.startShieldCarry||0);
  S.playedTypes=[]; S.refinedUsed=false;
  S.enemy.intent=S.enemy.intent||intentFor(S.turn,S.enemy);
  drawCards(5); render();
}
function playCard(i, el){
  const c=S.hand[i]; if(!c||S.energy<c.cost||S.phase!=='player'||S.over) return;
  S.energy-=c.cost; S.discard.push(c); S.hand.splice(i,1);
  if(el) el.classList.add('playing');
  if(window.TerraSound) TerraSound.play('whoosh', 0.8);
  S.playedTypes.push(c.type);
  if(hasAffix(c,'工坊精炼')&&!S.refinedUsed){ S.refinedUsed=true; S.energy=Math.min(S.energyMax,S.energy+1); floatNum('+1能量','#f4d03f', innerWidth/2, innerHeight-220); }

  // 显示能量预判提示
  showEnergyPreview(S.energy, S.energyMax);

  if(c.type==='atk'){
    const cardType='atk';
    projectile(el,cardType); let dmgRaw=c.val;
    if(c.elem&&S.enemy.intent?.weak===c.elem) dmgRaw=Math.ceil(dmgRaw*1.5);
    if(hasAffix(c,'丰饶产地')&&S.playedTypes.includes('def')) dmgRaw+=4;
    if(hasAffix(c,'大师铭刻')) dmgRaw+=3;

    // 卡牌使用粒子爆发
    if(el){
      const rect=el.getBoundingClientRect();
      spawnCardParticles(rect.left+rect.width/2, rect.top+rect.height/2, cardType);
    }

    setTimeout(()=>{                               // 命中:斩击剑气+闪白+色差+震屏+弹性伤害数字
      if(!S||S.over) return;
      let dmg=dmgRaw; const blk=Math.min(S.enemy.block,dmg); S.enemy.block-=blk; dmg-=blk;

      // === Hades风格: 护甲破碎特效 ===
      if(blk > 0 && S.enemy.block === 0){
        const b=root.querySelector('#b_eimg').getBoundingClientRect();
        if(window.BattleEffects) BattleEffects.shieldBreakEffect(b.left+b.width/2, b.top+b.height*0.3);
      }

      if(hasAffix(c,'熔炉灼痕')){ S.enemy.hp-=3; floatNum('灼痕-3','#ffcf70', innerWidth/2+70, innerHeight*.36, {scale:0.85}); }
      S.enemy.hp-=dmg;
      if(window.TerraSound) TerraSound.play('hit');
      spawnSlashes(); hitFlash(); chromaticAberration(); screenShake(dmg>=10?22:15, 280);
      const b=root.querySelector('#b_eimg').getBoundingClientRect();
      const critMult=c.elem&&S.enemy.intent?.weak===c.elem?1.3:1;
      floatNum('-'+dmg+(c.elem&&S.enemy.intent?.weak===c.elem?' 破绽!':''),'#ff9b7a', b.left+b.width/2, b.top+b.height*0.4, {scale:0.9+dmg*0.015,critical:critMult>1});
      const e=root.querySelector('#b_enemy');
      if(window.BattleEffects) BattleEffects.enemyHitShake(e,S.enemy.type==='boss');
      if(S.enemy.type==='boss' && (S.enemy.phase||1)===1 && S.enemy.hp>0 && S.enemy.hp<=Math.ceil(S.enemy.max*0.45)){
        S.enemy.phase=2;
        S.enemy.block=0;
        S.enemy.intent={kind:'charge',val:0,weak:'earth',hint:'暴走转阶段:深渊正在苏醒',phase:2};
        if(window.TerraSound) TerraSound.play('click', 0.9);
        floatNum('暴走!','#ff8e6c', b.left+b.width/2, b.top-20, {scale:1.4,duration:1200});
        const phaseEl=root.querySelector('#b_bphase'); if(phaseEl) phaseEl.textContent='深渊主核 · 暴走阶段';
        hitFlash(); chromaticAberration(); screenShake(24, 360);

        // === Hades风格: Boss 阶段转换仪式感 ===
        if(window.BattleEffects) BattleEffects.levelUpCeremony(e, '暴走阶段');
      }
      if(S.enemy.hp<=0){ render(); return finish(true); }
      render();
    },280);
  } else if(c.type==='heal'){
    const before=S.pHP;
    S.pHP=Math.min(S.pMax, S.pHP+c.val);
    const healed=S.pHP-before;
    const sprout=Math.ceil(c.val*(S.pHP>=S.pMax?0.7:0.35));

    // 卡牌使用粒子爆发
    if(el){
      const rect=el.getBoundingClientRect();
      spawnCardParticles(rect.left+rect.width/2, rect.top+rect.height/2, 'heal');
    }

    if(cardTag(c)==='sprout'||hasAffix(c,'同季共鸣')){
      S.shield+=sprout;
      floatNum('新芽护甲+'+sprout,'#bcd8ee', innerWidth/2+80, innerHeight-210, {scale:0.8,delay:150});
    }
    floatNum('+'+healed,'#b6e08a', innerWidth/2, innerHeight-180, {scale:0.85+healed*0.02});
  } else {
    if(window.TerraSound) TerraSound.play('click', 0.7);
    S.shield+=c.val;

    // 卡牌使用粒子爆发
    if(el){
      const rect=el.getBoundingClientRect();
      spawnCardParticles(rect.left+rect.width/2, rect.top+rect.height/2, 'def');
    }

    if(cardTag(c)==='thorn'){
      const th=Math.ceil(c.val*.28);
      S.thorns=(S.thorns||0)+th;
      floatNum('荆棘+'+th,'#c7ff9b', innerWidth/2+80, innerHeight-215, {scale:0.8,delay:180});
    }
    if(hasAffix(c,'稳定工艺')) S.shield+=2;
    floatNum('+'+c.val,'#bcd8ee', innerWidth/2, innerHeight-180, {scale:0.85+c.val*0.015});
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
    if(it.kind==='atk'||it.kind==='heavy'){
      if(window.TerraSound) TerraSound.play('hit', 0.9);
      let dmg=it.val; const blk=Math.min(S.shield,dmg); S.shield-=blk; dmg-=blk;
      S.pHP-=dmg;
      if((S.thorns||0)>0){
        S.enemy.hp-=S.thorns;
        floatNum('荆棘-'+S.thorns,'#c7ff9b', innerWidth/2+70, innerHeight*.34, {scale:0.85});
        S.thorns=0;
      }
      if(dmg>0){
        screenShake(it.kind==='heavy'?28:20,300);
        playerHurtFx();
        floatNum('-'+dmg,'#ff8a8a', innerWidth/2, innerHeight-180, {scale:0.95+dmg*0.02,shake:true});
      } else if(blk>0){
        floatNum('格挡!','#bcd8ee', innerWidth/2, innerHeight-180, {scale:1.1});
      }
    } else if(it.kind==='debuff'){
      S.energyPenalty=it.val||1;
      floatNum('能量-'+S.energyPenalty,'#d9a8ff', innerWidth/2, innerHeight-190, {scale:0.9});
    } else if(it.kind==='charge'){
      S.enemy.block+=2;
      floatNum('聚瘴','#d9a8ff', innerWidth/2, innerHeight*.32, {scale:1.0});
    } else {
      S.enemy.block+=it.val;
      floatNum('+'+it.val+' 护甲','#9fd4e8', innerWidth/2, innerHeight*.34, {scale:0.85});
    }
    if(S.enemy.hp<=0){ render(); return finish(true); }
    if(S.pHP<=0){ render(); return finish(false); }
    S.turn++; S.enemy.intent=intentFor(S.turn,S.enemy);
    startPlayerTurn();
  }, 720);
}
function rewardChoices(){
  const base=[
    {name:'污染种子', tag:'材料', icon:'✦', rarity:'rare', loot:{blight_seed:1}, desc:'灵兽孵化与后续防御科技材料'},
    {name:'深渊活力', tag:'祝福', icon:'♥', rarity:'rare', loot:{buff:{id:'abyss_vigor',hpMax:8,fights:2}}, desc:'接下来 2 场战斗生命上限 +8'},
    {name:'余烬专注', tag:'祝福', icon:'✺', rarity:'rare', loot:{buff:{id:'ember_focus',energyFirstTurn:1,fights:1}}, desc:'下一场战斗开局额外 +1 能量'},
    {name:'远征木箱', tag:'资源', icon:'▣', rarity:'common', loot:{wood:4}, desc:'补足锻造与农场扩建所需木材'},
    {name:'驯化春露兽', tag:'灵兽', icon:'◌', rarity:'beast', loot:{beast:{species:'spring_drop',element:'water',level:1,assignment:'irrigate'}}, desc:'捕获水系灵兽幼体，回农场后巡田灌溉'}
  ];
  if(cb?.isElite) base.push({name:'精英残响', tag:'精英', icon:'◆', rarity:'epic', loot:{beast_soul:1, blight_seed:1, buff:{id:'root_guard',shield:6,fights:2}}, desc:'双资源 + 接下来 2 场开局护甲 +6'});
  if(cb?.isBoss) base.push({name:'深渊核心', tag:'首领', icon:'◈', rarity:'epic', loot:{beast_soul:2, blight_seed:2}, desc:'Boss 战利品，可连续推动工坊升级'});
  return base;
}

function pickReward(loot){
  if(!S||!S.over) return;
  S._loot=loot;
  exit();
}
function pickRewardByName(name){
  if(!S||!S.over) return false;
  const reward=rewardChoices().find(r=>r.name===name || r.name.includes(name));
  if(!reward) return false;
  pickReward(reward.loot);
  return true;
}

function finish(win){
  S.over=true; render();
  const res=root.querySelector('#b_result');
  const rewards=root.querySelector('#b_rewards');
  rewards.innerHTML='';
  root.querySelector('#b_rtitle').textContent = win?'胜 利':'败 退';
  if(win){
    // === Hades风格: 胜利仪式感 ===
    if(window.BattleEffects){
      setTimeout(() => {
        BattleEffects.levelUpCeremony(res, '胜 利');
      }, 200);
    }

    root.querySelector('#b_loot').innerHTML=
      `深渊退散，选择一份带回农场的战利品：
       <span class="sub">奖励会直接影响下一轮锻造、灵兽与升级路线</span>`;
    rewardChoices().forEach(r=>{
      const el=$('div',`rewardChoice ${r.rarity||'common'}`,rewards);
      el.innerHTML=`<div class="rmeta"><span class="ricon">${r.icon||'✦'}</span><span class="rtag">${r.tag||'战利品'}</span></div><div class="rname">${r.name}</div><div class="rdesc">${r.desc}</div>`;
      el.onclick=()=>{
        // === Hades风格: 奖励选择反馈 ===
        if(window.TerraSound) TerraSound.play('click', 0.9);
        el.style.transform='scale(0.95)';
        el.style.filter='brightness(1.2)';
        setTimeout(()=>pickReward(r.loot), 150);
      };
    });
  } else {
    root.querySelector('#b_loot').innerHTML=`你被击退回农场，休养生息后再战。<span class="sub">未获得战利品</span>`;
    const el=$('div','rewardChoice common',rewards);
    el.innerHTML='<div class="rmeta"><span class="ricon">↺</span><span class="rtag">撤退</span></div><div class="rname">返回农场</div><div class="rdesc">调整卡组与农场产出后再来。</div>';
    el.onclick=()=>exit();
  }
  setTimeout(()=>res.classList.add('on'),520);
  S._win=win;
}
function exit(){
  if(!Battle.active) return;
  const win=S?S._win:false, loot=S?S._loot||{}:{}, c=cb;
  Battle.active=false; cb=null; stopMiasma();
  fadeToBlack(()=>{
    root.classList.remove('on');
    setTimeout(()=>{ root.style.display='none'; S=null; fadeFromBlack(); }, 200);
    if(win&&c&&c.onWin) c.onWin(loot);
    else if(!win&&c&&c.onLose) c.onLose();
  });
}

const Battle={
  active:false,
  enter(opts){
    fadeToBlack(()=>{
      injectStyle(); buildDOM();
      cb=opts||{};
      const deck=shuffle(buildDeck(cb.deck));
      S={ pHP:60, pMax:60, shield:0, thorns:0, energy:3, energyMax:3,
          draw:deck, hand:[], discard:[], turn:1, phase:'player', over:false,
          enemy:{ hp:48, max:48, block:0, type:cb.isBoss?'boss':cb.isElite?'elite':'normal', intent:null } };
      S.enemy.intent=intentFor(1,S.enemy);
      if(cb.isBoss){ S.pMax=80; S.pHP=80; S.enemy.max=S.enemy.hp=90; }
      else if(cb.isElite){ S.enemy.max=S.enemy.hp=70; }
      applyRunBuffs();
      setEnemyPresentation();
      root.style.display='block'; root.querySelector('#b_result').classList.remove('on');
      const ar=root.querySelector('.arena'); if(ar) ar.style.transform='';
      requestAnimationFrame(()=>{
        root.classList.add('on');
        setTimeout(()=>fadeFromBlack(),300);  // 战斗场景显示后淡入
      });
      Battle.active=true;
      startPlayerTurn();
      if(Array.isArray(cb.debugHand)){ S.hand=cb.debugHand.map(normalizeCardForBattle); render(); }
      startMiasma();
    });
  },
  pickRewardByName,
};
window.Battle=Battle;
})();
