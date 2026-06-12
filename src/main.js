/* =========================================================
   Terra Chronicle — 2.5D 探索原型 v1 (PixiJS v8 / WebGL)
   世界层: Tilemap + Y-Sort 精灵 + WASD 主角 + 平滑跟随镜头
   氛围层: 四季连续调色 · 昼夜光 · 云影 · 季节粒子 · 晕影
   界面层: DOM (index.html)
   ---------------------------------------------------------
   美术资产接口: 所有可见物均通过 ASSETS 表声明。
   把 AI 生成的 PNG 路径填进对应 src 字段即可替换占位符,
   其余逻辑(碰撞/遮挡/动画/换色)不需要任何改动。
   ========================================================= */
'use strict';

/* ================= 1. 资产清单(换图接口) ================= */
const ASSETS = {
  //                src: 'assets/sprites/xxx.png'  ← 填这里
  player:   { src: null, w: 40,  h: 62,  anchorY: 1.0 },
  tree:     { src: null, w: 96,  h: 140, anchorY: 0.96, collideR: 18 },
  cherry:   { src: null, w: 96,  h: 132, anchorY: 0.96, collideR: 18 },
  rock:     { src: null, w: 52,  h: 40,  anchorY: 0.9,  collideR: 20 },
  bush:     { src: null, w: 56,  h: 44,  anchorY: 0.92 },
  house:    { src: null, w: 220, h: 200, anchorY: 0.97, collideR: 86 },
  windmill: { src: null, w: 110, h: 230, anchorY: 0.98, collideR: 30 },
  fence:    { src: null, w: 60,  h: 40,  anchorY: 0.9 },
  crop:     { src: null, w: 40,  h: 44,  anchorY: 1.0 },
  // 地表瓦片同样可换贴图(64x64 PNG),src 为空时用调色矩形
  tiles: {
    grass: { src: null }, soil: { src: null }, water: { src: null },
    sand:  { src: null }, plot: { src: null },
  },
};

/* ================= 2. 世界常量与调色脚本 ================= */
const TS = 64, MAP = 56;                       // 瓦片尺寸 / 地图边长
const DAY_SECONDS = 30, SEASON_DAYS = 7;       // demo 时间节奏
const SEASONS = [
  { name: '春', latin: 'VER' }, { name: '夏', latin: 'AESTAS' },
  { name: '秋', latin: 'AUTUMNUS' }, { name: '冬', latin: 'HIEMS' }];

const PAL = {
  grass:  [[126,168,88],[100,150,68],[168,140,66],[208,214,220]],
  grassB: [[140,180,100],[112,162,78],[182,154,76],[218,223,228]],
  soil:   [[124,96,70],[116,90,64],[108,84,62],[150,138,130]],
  plot:   [[104,80,58],[98,76,55],[92,72,53],[138,128,122]],
  water:  [[84,150,164],[64,138,156],[88,132,150],[122,150,168]],
  sand:   [[196,176,132],[202,180,130],[188,162,116],[206,202,196]],
  canopy: [[88,138,76],[58,112,62],[186,108,48],[104,118,112]],
  bloom:  [[224,168,192],[96,146,84],[206,140,58],[170,178,172]],   // 春樱
  bushC:  [[110,152,86],[84,130,72],[170,120,60],[140,150,144]],
  cropC:  [[150,190,100],[200,176,80],[214,150,60],[168,174,182]],
  ambient:[[255,250,240],[255,252,238],[255,238,214],[228,236,248]], // 全局光乘色
};
const lerp = (a,b,t)=>a+(b-a)*t;
function pal(key, st){
  const i=((Math.floor(st)%4)+4)%4, j=(i+1)%4, f=st-Math.floor(st);
  const A=PAL[key][i], B=PAL[key][j];
  return [lerp(A[0],B[0],f), lerp(A[1],B[1],f), lerp(A[2],B[2],f)];
}
const hex = c => (Math.min(255,Math.max(0,c[0]))<<16 | Math.min(255,Math.max(0,c[1]))<<8 | Math.min(255,Math.max(0,c[2])))>>>0 ;
function hash(x,y){let h=(Math.imul(x,374761393)+Math.imul(y,668265263))|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return (h>>>0)/4294967296;}

/* ================= 3. 地图生成 ================= */
// kind: g=草A G=草B s=土路 w=水 b=桥(沙) p=耕地
const grid=[], blocked=new Set(), tileMeta={};
const NAMES=['河畔田','缓丘地','灵脉壤','老橡园','黑土塬','雾谷田'];
const LATINS=['Ager Fluminis','Collis Lenis','Solum Animae','Quercetum','Terra Nigra','Vallis Nebulae'];
const riverX = y => 34 + Math.sin(y*0.18)*5.5;
function genMap(){
  for(let y=0;y<MAP;y++){ grid.push([]);
    for(let x=0;x<MAP;x++){
      const r=hash(x,y); let k = r>.5?'g':'G';
      const rx=riverX(y);
      if(Math.abs(x-rx)<1.6) k='w';
      // 桥:两处
      if(k==='w' && (Math.abs(y-26)<1.8 || Math.abs(y-44)<1.4)) k='b';
      grid[y].push(k);
    }
  }
  // 耕地两片(带肥力档案)
  const plots=[[22,28,8,5],[14,36,7,4]];
  for(const [px,py,pw,ph] of plots)
    for(let y=py;y<py+ph;y++)for(let x=px;x<px+pw;x++){
      grid[y][x]='p';
      const r=hash(x,y);
      tileMeta[x+','+y]={name:NAMES[(r*6)|0],latin:LATINS[(r*6)|0],
        fert:55+((r*97)%1)*42|0,moist:40+((r*53)%1)*55|0,
        pest:5+((r*29)%1)*28|0,mana:20+((r*71)%1)*70|0};
    }
  // 小路:屋前向东过桥到果园 + 向南
  for(let x=24;x<=46;x++){const y=26+Math.round(Math.sin(x*.3)*1.2); grid[y][x]='b'===grid[y][x]?'b':(grid[y][x]==='w'?grid[y][x]:'s'); grid[y+1][x]=grid[y+1][x]==='w'?'w':'s';}
  for(let y=14;y<=26;y++){ if(grid[y][21]!=='w')grid[y][21]='s'; }
  // 水域阻挡
  for(let y=0;y<MAP;y++)for(let x=0;x<MAP;x++) if(grid[y][x]==='w') blocked.add(x+','+y);
}
genMap();

/* 场景物件布点: {kind,x,y(瓦片坐标,物件脚底)} */
const OBJECTS=[];
function placeObjects(){
  const occupied=(tx,ty)=>['w','p','s','b'].includes(grid[ty]?.[tx]);
  // 边界密林(留出内圈),圈住世界
  for(let y=1;y<MAP-1;y++)for(let x=1;x<MAP-1;x++){
    const edge=Math.min(x,y,MAP-1-x,MAP-1-y);
    const r=hash(x*7+3,y*5+1);
    if(edge<3 && r<.62 && !occupied(x,y)){OBJECTS.push({kind:'tree',tx:x,ty:y});continue;}
    if(edge<3) continue;
    if(occupied(x,y)) continue;
    // 内部散布
    if(r>.965) OBJECTS.push({kind:'tree',tx:x,ty:y});
    else if(r>.948 && x>riverX(y)+3 && y>32 && y<48) OBJECTS.push({kind:'cherry',tx:x,ty:y});
    else if(r>.938) OBJECTS.push({kind:'rock',tx:x,ty:y});
    else if(r>.92) OBJECTS.push({kind:'bush',tx:x,ty:y});
  }
  // 樱花果园(东岸)
  for(let gy=36;gy<=44;gy+=3)for(let gx=42;gx<=50;gx+=3)
    if(!occupied(gx,gy)) OBJECTS.push({kind:'cherry',tx:gx,ty:gy});
  // 农庄
  OBJECTS.push({kind:'house',tx:20,ty:24});
  OBJECTS.push({kind:'windmill',tx:16,ty:20});
  // 耕地栅栏(留缺口)
  for(let x=21;x<=30;x++){ if(x!==25&&x!==26){OBJECTS.push({kind:'fence',tx:x,ty:27.4});OBJECTS.push({kind:'fence',tx:x,ty:33.4});} }
}
placeObjects();

/* ================= 4. PIXI 启动 ================= */
(async ()=>{
const app = new PIXI.Application();
await app.init({ resizeTo: window, background: 0x0d0f12, antialias: true,
  resolution: Math.min(window.devicePixelRatio||1, 2), autoDensity: true });
document.getElementById('stage').appendChild(app.canvas);

/* ---- 通用纹理 ---- */
function radialTex(size, inner, outer){
  const c=document.createElement('canvas');c.width=c.height=size;
  const g=c.getContext('2d'), gr=g.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
  gr.addColorStop(0,inner);gr.addColorStop(1,outer);
  g.fillStyle=gr;g.fillRect(0,0,size,size);
  return PIXI.Texture.from(c);
}
const TEX_GLOW   = radialTex(256,'rgba(255,255,255,1)','rgba(255,255,255,0)');
const TEX_SHADOW = radialTex(128,'rgba(0,0,0,.34)','rgba(0,0,0,0)');
const TEX_VIGNET = (()=>{const c=document.createElement('canvas');c.width=c.height=512;
  const g=c.getContext('2d'),gr=g.createRadialGradient(256,256,150,256,256,360);
  gr.addColorStop(0,'rgba(8,10,14,0)');gr.addColorStop(1,'rgba(8,10,14,.46)');
  g.fillStyle=gr;g.fillRect(0,0,512,512);return PIXI.Texture.from(c);})();

/* ---- 图层结构 ---- */
const world = new PIXI.Container();              // 镜头作用对象
const groundL = new PIXI.Container();            // 瓦片层
const overlayL = new PIXI.Container();           // 地表覆盖(作物/云影)
const objL = new PIXI.Container();               // Y-Sort 实体层
objL.sortableChildren = true;
const fxScreen = new PIXI.Container();           // 屏幕空间: 粒子/光/晕影
world.addChild(groundL, overlayL, objL);
app.stage.addChild(world, fxScreen);

/* ================= 5. 瓦片地图渲染 ================= */
const KIND2PAL={g:'grass',G:'grassB',s:'soil',w:'water',b:'sand',p:'plot'};
const tileSprites=[];
for(let y=0;y<MAP;y++)for(let x=0;x<MAP;x++){
  const k=grid[y][x];
  const t=ASSETS.tiles[{g:'grass',G:'grass',s:'soil',w:'water',b:'sand',p:'plot'}[k]];
  const sp=new PIXI.Sprite(PIXI.Texture.WHITE);
  sp.width=TS+1; sp.height=TS+1; sp.position.set(x*TS,y*TS);
  if(t.src) PIXI.Assets.load(t.src).then(tex=>{sp.texture=tex;sp.width=TS+1;sp.height=TS+1;});
  const r=hash(x*13+7,y*11+3);
  sp._k=k; sp._j=0.965+r*0.07;                 // 每块明度抖动(轻,避免棋盘感)
  sp._ph=r*6.28;                               // 水面相位
  groundL.addChild(sp); tileSprites.push(sp);
}

/* ================= 6. 精灵节点工厂(占位符 ⇄ 贴图) ================= */
function makeNode(kind){
  const a=ASSETS[kind];
  const node=new PIXI.Container();
  // 柔和落影
  const sh=new PIXI.Sprite(TEX_SHADOW); sh.anchor.set(.5);
  sh.width=a.w*1.15; sh.height=a.w*.42; sh.y=-2; node.addChild(sh); node._shadow=sh;
  if(a.src){
    const sp=new PIXI.Sprite(); sp.anchor.set(.5, a.anchorY??1);
    PIXI.Assets.load(a.src).then(tex=>{sp.texture=tex; sp.width=a.w; sp.height=a.h;});
    node.addChild(sp); node._body=sp;
    return node;
  }
  // —— 占位符(有设计感的极简形状,非最终美术) ——
  const g=new PIXI.Graphics(); node.addChild(g); node._body=g;
  const W=a.w,H=a.h;
  if(kind==='tree'||kind==='cherry'){
    g.roundRect(-5,-H*.42,10,H*.42,4).fill(0x6b4a34);
    const cv=new PIXI.Graphics();
    cv.circle(-W*.22,-H*.52,W*.30).fill(0xffffff);
    cv.circle(W*.20,-H*.55,W*.33).fill(0xffffff);
    cv.circle(0,-H*.72,W*.34).fill(0xffffff);
    node.addChild(cv); node._canopy=cv;
  } else if(kind==='rock'){
    g.poly([-W*.45,0, -W*.3,-H*.7, W*.05,-H*.95, W*.45,-H*.45, W*.38,0]).fill(0x8d8d93);
    g.poly([-W*.3,-H*.68, W*.04,-H*.92, W*.1,-H*.6]).fill(0xa8a8af);
  } else if(kind==='bush'){
    const cv=new PIXI.Graphics();
    cv.circle(-W*.2,-H*.3,W*.26).fill(0xffffff);
    cv.circle(W*.16,-H*.34,W*.3).fill(0xffffff);
    cv.circle(0,-H*.52,W*.26).fill(0xffffff);
    node.addChild(cv); node._canopy=cv;
  } else if(kind==='house'){
    g.rect(-W*.4,-H*.52,W*.8,H*.52).fill(0xe7ddc8);
    g.poly([-W*.48,-H*.5, 0,-H*.92, W*.48,-H*.5]).fill(0x9c5a40);
    g.rect(-W*.07,-H*.30,W*.14,H*.30).fill(0x6b4a34);          // 门
    g.rect(-W*.30,-H*.40,W*.12,W*.055).fill(0x8fb6c9);          // 窗
    g.rect(W*.18,-H*.40,W*.12,W*.055).fill(0x8fb6c9);
    const lamp=new PIXI.Sprite(TEX_GLOW); lamp.anchor.set(.5);
    lamp.width=lamp.height=W*.6; lamp.y=-H*.36; lamp.tint=0xffc878;
    lamp.blendMode='add'; lamp.alpha=0; node.addChild(lamp); node._lamp=lamp;
  } else if(kind==='windmill'){
    g.poly([-W*.18,0, -W*.10,-H*.62, W*.10,-H*.62, W*.18,0]).fill(0xefe8da);
    g.poly([-W*.14,-H*.60, 0,-H*.72, W*.14,-H*.60]).fill(0x9c6a46);
    const bl=new PIXI.Graphics();
    for(let i=0;i<4;i++){
      const ang=i*Math.PI/2;
      bl.moveTo(0,0).lineTo(Math.cos(ang)*W*.62,Math.sin(ang)*W*.62)
        .stroke({width:7,color:0xf6f1e7,alpha:.95});
    }
    bl.y=-H*.66; node.addChild(bl); node._blades=bl;
  } else if(kind==='fence'){
    g.rect(-W*.46,-H*.55,W*.92,5).fill(0x9a7752);
    g.rect(-W*.42,-H*.8,7,H*.8).fill(0x8a6a48);
    g.rect(W*.35,-H*.8,7,H*.8).fill(0x8a6a48);
  } else if(kind==='crop'){
    const cv=new PIXI.Graphics(); node.addChild(cv); node._canopy=cv; node._isCrop=true;
  } else if(kind==='player'){ /* 主角占位在 makePlayer 内 */ }
  return node;
}

/* ---- 实体布点 + 碰撞表 ---- */
const colliders=[];   // {x,y,r} 世界坐标
for(const o of OBJECTS){
  const n=makeNode(o.kind);
  n.x=o.tx*TS+TS/2; n.y=o.ty*TS+TS/2;
  n.zIndex=n.y;
  objL.addChild(n); o.node=n;
  const a=ASSETS[o.kind];
  if(a.collideR) colliders.push({x:n.x,y:n.y,r:a.collideR});
}
/* 耕地作物(随季节生长,在 overlay 层不参与遮挡) */
const crops=[];
for(const key in tileMeta){
  const [x,y]=key.split(',').map(Number);
  if(hash(x*3,y*9)<.75){
    const c=makeNode('crop'); c.x=x*TS+TS/2; c.y=y*TS+TS/2+18; c._shadow.visible=false;
    overlayL.addChild(c); crops.push(c);
  }
}

/* ================= 7. 主角 ================= */
function makePlayer(){
  const a=ASSETS.player;
  const node=new PIXI.Container();
  const sh=new PIXI.Sprite(TEX_SHADOW); sh.anchor.set(.5);
  sh.width=46; sh.height=18; node.addChild(sh);
  const rig=new PIXI.Container(); node.addChild(rig); node._rig=rig;
  if(a.src){
    const sp=new PIXI.Sprite(); sp.anchor.set(.5,1);
    PIXI.Assets.load(a.src).then(tex=>{sp.texture=tex;sp.width=a.w;sp.height=a.h;});
    rig.addChild(sp);
  } else {
    // 纸片人占位:亚麻袍 + 草帽,饥荒式比例
    const g=new PIXI.Graphics();
    g.ellipse(0,-14,11,14).fill(0xe8dfc8);                       // 袍身
    g.roundRect(-4,-6,3.4,7,2).fill(0x4a4038);                   // 腿
    g.roundRect(1,-6,3.4,7,2).fill(0x4a4038);
    g.circle(0,-34,8.5).fill(0xf2e3cf);                          // 头
    g.ellipse(0,-40,13,4.4).fill(0xc9a24b);                      // 草帽檐
    g.ellipse(0,-43,7,4.2).fill(0xd4b05e);                       // 帽顶
    g.circle(-3,-34,1.1).fill(0x2b2722);                         // 眼
    g.circle(3,-34,1.1).fill(0x2b2722);
    rig.addChild(g);
  }
  return node;
}
const player=makePlayer();
player.x=23*TS; player.y=26.6*TS; player.zIndex=player.y;
objL.addChild(player);

/* WASD 输入 */
const keys={};
addEventListener('keydown',e=>{
  keys[e.key.toLowerCase()]=true;
  if(e.key==='f'||e.key==='F') timeScale=timeScale===1?10:1;
  const k=parseInt(e.key); if(k>=1&&k<=4) elapsed=((k-1)*SEASON_DAYS+0.42)*DAY_SECONDS;
});
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});

const SPEED=235;
function tileBlockedAt(wx,wy){
  const tx=Math.floor(wx/TS), ty=Math.floor(wy/TS);
  if(tx<0||ty<0||tx>=MAP||ty>=MAP) return true;
  return blocked.has(tx+','+ty);
}
function collides(wx,wy){
  // 脚底碰撞盒(瓦片) + 物件圆
  if(tileBlockedAt(wx-12,wy)||tileBlockedAt(wx+12,wy)||tileBlockedAt(wx,wy-6)||tileBlockedAt(wx,wy+6)) return true;
  for(const c of colliders){
    const dx=wx-c.x, dy=(wy-c.y)*1.6;           // 椭圆判定贴合俯视
    if(dx*dx+dy*dy < c.r*c.r) return true;
  }
  return false;
}
let walkPh=0, facing=1;
function movePlayer(dt){
  let dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);
  let dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
  if(dx&&dy){dx*=Math.SQRT1_2;dy*=Math.SQRT1_2;}
  const nx=player.x+dx*SPEED*dt, ny=player.y+dy*SPEED*dt;
  if(dx&&!collides(nx,player.y)) player.x=nx;
  if(dy&&!collides(player.x,ny)) player.y=ny;
  player.zIndex=player.y;
  if(dx) facing=dx>0?1:-1;
  const moving=dx||dy;
  walkPh+=dt*(moving?11:4);
  const squash=moving?Math.sin(walkPh)*.045:Math.sin(walkPh)*.012;
  const PS=1.25;                                // 主角整体放大
  player._rig.scale.set(facing*PS*(1-squash*.6), PS*(1+squash));
  player._rig.y = moving? -Math.abs(Math.sin(walkPh))*3.2 : 0;
}

/* ================= 8. 镜头 ================= */
const cam={x:player.x,y:player.y,zoom:.62,tzoom:1};
function updateCamera(dt){
  const k=Math.min(1,dt*4.2);
  cam.x+=(player.x-cam.x)*k; cam.y+=(player.y-cam.y)*k;
  cam.zoom+=(cam.tzoom-cam.zoom)*Math.min(1,dt*2.2);
  const vw=app.screen.width, vh=app.screen.height;
  // 镜头不越出世界边缘
  const half_w=vw/2/cam.zoom, half_h=vh/2/cam.zoom;
  const cx=Math.max(half_w,Math.min(MAP*TS-half_w,cam.x));
  const cy=Math.max(half_h,Math.min(MAP*TS-half_h,cam.y));
  world.scale.set(cam.zoom);
  world.position.set(vw/2-cx*cam.zoom, vh/2-cy*cam.zoom);
}

/* ================= 9. 氛围层 ================= */
// 全局光(乘) + 暮金(加) + 晕影 + 太阳柔光
const ambient=new PIXI.Sprite(PIXI.Texture.WHITE); ambient.blendMode='multiply';
const golden=new PIXI.Sprite(TEX_GLOW); golden.blendMode='add'; golden.anchor.set(.5);
const vignette=new PIXI.Sprite(TEX_VIGNET);
const partC=new PIXI.Container();
fxScreen.addChild(ambient, golden, partC, vignette);

// 云影(世界空间,乘)
const cloudShadows=[];
for(let i=0;i<6;i++){
  const c=new PIXI.Sprite(TEX_SHADOW); c.anchor.set(.5);
  c.width=900+hash(i,7)*700; c.height=c.width*.55;
  c.alpha=.09; c.blendMode='multiply';
  c.x=hash(i,3)*MAP*TS; c.y=hash(i,5)*MAP*TS; c._v=6+hash(i,9)*8;
  overlayL.addChild(c); cloudShadows.push(c);
}

/* 季节粒子(屏幕空间) */
const parts=[];
function spawnParticles(st,dt,night){
  const s=((Math.floor(st)%4)+4)%4;
  const vw=app.screen.width;
  const budget=s===1?(night?1:0):s===3?3:2;
  for(let i=0;i<budget;i++){
    if(parts.length>200) break;
    const p=new PIXI.Graphics(); p._s=s; p._ph=Math.random()*6.28; p._life=0;
    if(s===0){p.ellipse(0,0,3.4,2).fill({color:0xf4c4d2,alpha:.9});p._vx=8;p._vy=40;}
    else if(s===1&&night){p.circle(0,0,1.8).fill({color:0xffe896,alpha:.9});p.blendMode='add';
      p._fire=true;p._vx=0;p._vy=0;p.x=Math.random()*vw;p.y=app.screen.height*(.3+Math.random()*.5);}
    else if(s===2){p.ellipse(0,0,3.8,2.2).fill({color:0xc47834,alpha:.9});p._vx=-30;p._vy=46;}
    else {p.circle(0,0,2.1).fill({color:0xf8fafc,alpha:.92});p._vx=4;p._vy=34;}
    if(!p._fire){p.x=Math.random()*vw*1.1-vw*.05;p.y=-12;}
    partC.addChild(p); parts.push(p);
  }
}
function updateParticles(dt){
  for(let i=parts.length-1;i>=0;i--){const p=parts[i];
    p._ph+=dt*2; p._life+=dt;
    if(p._fire){
      p.x+=Math.sin(p._ph*.9)*20*dt; p.y+=Math.cos(p._ph*.7)*13*dt;
      p.alpha=Math.max(0,Math.sin(p._ph))*.9;
      if(p._life>7){partC.removeChild(p);parts.splice(i,1);} continue;
    }
    p.x+=(p._vx+Math.sin(p._ph)*14)*dt; p.y+=p._vy*dt;
    p.rotation=p._ph*.8;
    if(p.y>app.screen.height+16){partC.removeChild(p);parts.splice(i,1);}
  }
}

/* ================= 10. 时间系统与主循环 ================= */
let elapsed=0, timeScale=1, entered=false;
const dayPhase=()=> (elapsed%DAY_SECONDS)/DAY_SECONDS;
const sunlight=()=> Math.max(0,Math.sin(dayPhase()*Math.PI));

app.ticker.add(tk=>{
  const dt=Math.min(.05,tk.deltaMS/1000);
  elapsed+=dt*timeScale;
  const st=(elapsed/DAY_SECONDS/SEASON_DAYS)%4;
  const sun=sunlight(), night=1-sun;

  /* 瓦片调色(每帧 kind 基色一次,逐块乘抖动) */
  const base={};
  for(const k in KIND2PAL) base[k]=pal(KIND2PAL[k],st);
  const wph=elapsed*2;
  for(const sp of tileSprites){
    const b=base[sp._k]; let j=sp._j;
    if(sp._k==='w') j=.9+(Math.sin(wph+sp._ph)*.5+.5)*.22;
    sp.tint=hex([b[0]*j,b[1]*j,b[2]*j]);
  }
  /* 树冠/灌木/作物换色 + 生长 */
  const cCan=hex(pal('canopy',st)), cBloom=hex(pal('bloom',st)),
        cBush=hex(pal('bushC',st)), cCrop=pal('cropC',st);
  for(const o of OBJECTS){
    const n=o.node;
    if(o.kind==='tree'&&n._canopy) n._canopy.tint=cCan;
    if(o.kind==='cherry'&&n._canopy) n._canopy.tint=cBloom;
    if(o.kind==='bush'&&n._canopy) n._canopy.tint=cBush;
    if(o.kind==='windmill'&&n._blades) n._blades.rotation+=dt*1.2;
    if(n._lamp) n._lamp.alpha=night>.5?(night-.5)*1.6:0;
    if(n._canopy&&o.kind!=='bush') n._canopy.rotation=Math.sin(elapsed*1.2+n.x*.01)*.012; // 风
    n._shadow.alpha=.25+sun*.45;
  }
  const grow=Math.min(1,(st%1)*1.55+.12);
  for(const c of crops){
    const g=c._canopy; g.clear();
    const h=8+grow*22;
    for(let k=-1;k<=1;k++)
      g.moveTo(k*9,0).quadraticCurveTo(k*9+2,-h*.6,k*9+Math.sin(elapsed*1.4+c.x)*2.5,-h)
       .stroke({width:2.4,color:hex(cCrop),alpha:.95});
  }
  /* 玩家与镜头 */
  if(entered){ movePlayer(dt); }
  updateCamera(dt);

  /* 氛围 */
  const vw=app.screen.width, vh=app.screen.height;
  ambient.width=vw; ambient.height=vh;
  const amb=pal('ambient',st);
  ambient.tint=hex([lerp(amb[0],70,night*.78),lerp(amb[1],86,night*.74),lerp(amb[2],132,night*.6)]);
  const p=dayPhase(), dusk=Math.max(0,1-Math.abs(p-.42)*9)+Math.max(0,1-Math.abs(p-.08)*9);
  golden.x=vw*.5; golden.y=vh*.55; golden.width=vw*1.5; golden.height=vh*1.2;
  golden.tint=0xe89646; golden.alpha=dusk*.34;
  vignette.width=vw; vignette.height=vh;
  for(const c of cloudShadows){ c.x+=c._v*dt; if(c.x>MAP*TS+600)c.x=-600; }
  spawnParticles(st,dt,night>.62); updateParticles(dt);

  updateHUD(st,Math.floor(elapsed/DAY_SECONDS));
  springTick(dt);
});

/* ================= 11. HUD(DOM) ================= */
const $=id=>document.getElementById(id);
(function buildDial(){
  const NS='http://www.w3.org/2000/svg';
  for(let i=0;i<4;i++){const a0=i*90-90+4,a1=(i+1)*90-90-4,r=50,c=54,rad=x=>x*Math.PI/180;
    const pth=document.createElementNS(NS,'path');
    pth.setAttribute('d',`M ${c+r*Math.cos(rad(a0))} ${c+r*Math.sin(rad(a0))} A ${r} ${r} 0 0 1 ${c+r*Math.cos(rad(a1))} ${c+r*Math.sin(rad(a1))}`);
    pth.setAttribute('fill','none');pth.setAttribute('stroke','rgba(246,241,231,.35)');pth.setAttribute('stroke-width','1');
    pth.id='arc'+i; $('dialRing').appendChild(pth);}
})();
const leaves=[];
for(let i=0;i<6;i++){const d=document.createElement('div');d.className='leaf';$('stamina').appendChild(d);leaves.push(d);}
const WEATHER=[['细雨润物','花瓣随风','溪水初涨'],['烈日当空','麦浪翻金','夜萤点点'],['西风渐紧','落叶铺金','果实低垂'],['初雪无声','炉火可亲','大地休眠']];
let lastDay=-1,lastSI=-1;
function updateHUD(st,day){
  const si=((Math.floor(st)%4)+4)%4, ang=st/4*360;
  $('dialDot').setAttribute('cx',54+50*Math.cos((ang-90)*Math.PI/180));
  $('dialDot').setAttribute('cy',54+50*Math.sin((ang-90)*Math.PI/180));
  for(let i=0;i<4;i++)$('arc'+i).setAttribute('stroke',i===si?'#c9a24b':'rgba(246,241,231,.35)');
  if(si!==lastSI){lastSI=si;$('seasonName').textContent=SEASONS[si].name;$('seasonLatin').textContent=SEASONS[si].latin;
    $('weatherTag').textContent='— '+WEATHER[si][(Math.random()*3)|0]+' —';}
  if(day!==lastDay){lastDay=day;$('dayNum').textContent=String(day%28+1).padStart(2,'0');
    if(day%3===0)$('weatherTag').textContent='— '+WEATHER[si][(Math.random()*3)|0]+' —';
    leaves.forEach(l=>l.classList.remove('spent'));}
}

/* 地块面板(弹簧物理) */
const spring={x:110,v:0,target:110};
function springTick(dt){
  const a=-170*(spring.x-spring.target)-20*spring.v;
  spring.v+=a*dt; spring.x+=spring.v*dt;
  $('panel').style.transform=`translateX(${spring.x}%)`;
}
$('panelClose').onclick=()=>{spring.target=110;};
function openPanel(meta){
  $('tileName').textContent=meta.name; $('tileLatin').textContent=meta.latin;
  spring.target=0;
  const set=(vid,bid,val,delay)=>{
    const v=$(vid),b=$(bid);
    b.style.transition='none';b.style.transform='scaleX(0)';
    const t0=performance.now();
    setTimeout(()=>{b.style.transition='transform 1.1s cubic-bezier(.2,.8,.2,1)';b.style.transform=`scaleX(${val/100})`;},delay);
    (function roll(){const e=(performance.now()-t0-delay)/900;
      if(e<0)return requestAnimationFrame(roll);
      const cur=Math.min(1,e);v.textContent=Math.round(val*(1-Math.pow(1-cur,3)));
      if(cur<1)requestAnimationFrame(roll);})();
  };
  set('vFert','bFert',meta.fert,120);set('vMoist','bMoist',meta.moist,240);
  set('vPest','bPest',meta.pest,360);set('vMana','bMana',meta.mana,480);
  $('whisper').style.opacity=0;
}
app.canvas.addEventListener('click',e=>{
  if(!entered) return;
  const wx=(e.clientX-world.x)/world.scale.x, wy=(e.clientY-world.y)/world.scale.y;
  const key=Math.floor(wx/TS)+','+Math.floor(wy/TS);
  if(tileMeta[key]){
    openPanel(tileMeta[key]);
    const free=leaves.find(l=>!l.classList.contains('spent'));if(free)free.classList.add('spent');
  }
});

/* 卡牌 3D 悬停 */
addEventListener('mousemove',e=>{
  const c=$('cardPeek'),f=c.querySelector('.face'),r=c.getBoundingClientRect();
  if(e.clientX>r.left-40&&e.clientX<r.right+40&&e.clientY>r.top-40&&e.clientY<r.bottom+40){
    const dx=(e.clientX-(r.left+r.width/2))/r.width,dy=(e.clientY-(r.top+r.height/2))/r.height;
    f.style.transform=`rotateY(${dx*22}deg) rotateX(${-dy*22}deg)`;
  }else f.style.transform='';
});

/* ================= 12. 标题 → 世界 转场 ================= */
function enterWorld(){
  if(entered)return; entered=true;
  const title=$('title');
  title.querySelector('.bg').style.transition='transform 2.4s cubic-bezier(.55,0,.3,1)';
  title.querySelector('.bg').style.transform='scale(1.22)';
  title.querySelector('.card').style.transition='opacity 1.1s, transform 1.4s cubic-bezier(.55,0,.3,1)';
  title.querySelector('.card').style.opacity=0;
  title.querySelector('.card').style.transform='translateY(-8vh) scale(.96)';
  // 云幕
  const cv=$('clouds'),cc=cv.getContext('2d');
  const dpr=Math.min(devicePixelRatio||1,2),vw=innerWidth,vh=innerHeight;
  cv.width=vw*dpr;cv.height=vh*dpr;cv.style.width=vw+'px';cv.style.height=vh+'px';cv.style.opacity=1;
  const t0=performance.now(),blobs=Array.from({length:26},()=>({x:Math.random()*1.6-.3,y:Math.random(),r:.12+Math.random()*.22,v:1.1+Math.random()*.9}));
  (function sweep(){const e=(performance.now()-t0)/2400;
    cc.setTransform(dpr,0,0,dpr,0,0);cc.clearRect(0,0,vw,vh);
    for(const b of blobs){const x=vw*(b.x+e*b.v*1.8-1.1),y=vh*b.y,r=b.r*vw*(1+e*.5);
      const gg=cc.createRadialGradient(x,y,0,x,y,r);
      const a=Math.min(1,Math.min(e*3,(1.05-e)*2.6));
      gg.addColorStop(0,`rgba(250,248,242,${.95*a})`);gg.addColorStop(1,'rgba(250,248,242,0)');
      cc.fillStyle=gg;cc.beginPath();cc.arc(x,y,r,0,7);cc.fill();}
    if(e<1.05)requestAnimationFrame(sweep);else cv.style.opacity=0;})();
  // 镜头降落到主角
  setTimeout(()=>{title.style.opacity=0;title.style.pointerEvents='none';
    cam.zoom=.5;cam.tzoom=1;
    document.body.classList.add('hud-on');},900);
  setTimeout(()=>{title.remove();
    $('whisper').style.opacity=1;
    setTimeout(()=>{$('whisper').style.opacity=0;},10000);},3200);
}
$('enter').onclick=enterWorld;

})();
