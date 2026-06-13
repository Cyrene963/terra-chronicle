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

/* 资产版本号: 内容更新时 +1,绕过浏览器/CDN 旧缓存 */
const ASSET_V='?v=5';
/* 贴图加载: mode='tile' → NEAREST+CLAMP(消除瓦片接缝+锐利);
   其余(精灵)→ LINEAR+mipmap(高清源缩小时干净不闪烁,painterly 风格不能用 NEAREST 否则缩小抖动) */
async function loadTex(src, mode){
  const tex=await PIXI.Assets.load(src+ASSET_V);
  const s=tex.source;
  if(mode==='tile'){ s.scaleMode='nearest'; s.addressMode='clamp-to-edge'; }
  else { s.scaleMode='linear'; s.autoGenerateMipmaps=true; }
  s.update?.();
  return tex;
}

/* ================= 1. 资产清单(换图接口) ================= */
const ASSETS = {
  //  src: 贴图路径(null=占位符)  winterSrc: 冬季覆雪变体  faceDir: 原画朝向(-1=朝左)
  player:   { src: 'assets/sprites/player_idle.png', w: 46,  h: 73,  anchorY: 1.0, faceDir: -1 },
  tree:     { src: 'assets/sprites/tree_oak.png',    w: 128, h: 125, anchorY: 0.96, collideR: 18,
              winterSrc: 'assets/sprites/tree_oak_winter.png' },
  cherry:   { src: 'assets/sprites/tree_cherry.png', w: 126, h: 119, anchorY: 0.96, collideR: 18,
              winterSrc: 'assets/sprites/tree_cherry_winter.png' },
  rock:     { src: 'assets/sprites/rock.png',        w: 62,  h: 44,  anchorY: 0.9,  collideR: 20 },
  bush:     { src: 'assets/sprites/bush.png',        w: 58,  h: 57,  anchorY: 0.92,
              winterSrc: 'assets/sprites/bush_winter.png' },
  house:    { src: 'assets/sprites/house.png',       w: 232, h: 213, anchorY: 0.97, collideR: 86,
              winterSrc: 'assets/sprites/house_winter.png' },
  windmill: { src: 'assets/sprites/windmill.png',    w: 128, h: 184, anchorY: 0.98, collideR: 30 },
  fence:    { src: 'assets/sprites/fence.png',       w: 66,  h: 53,  anchorY: 0.9 },
  crop:     { src: 'assets/sprites/crop.png',        w: 34,  h: 42,  anchorY: 1.0 },
  beast_water:{ src:'assets/sprites/beast_water.png',w: 62,  h: 64,  anchorY: 0.86 },
  // 地表瓦片贴图(无缝,引擎仍做四季 grading)
  tiles: {
    grass: { src: 'assets/sprites/tile_grass.png' },
    soil:  { src: 'assets/sprites/tile_soil.png' },
    water: { src: 'assets/sprites/tile_water.png' },
    sand:  { src: 'assets/sprites/tile_sand.png' },
    plot:  { src: 'assets/sprites/tile_plot.png' },
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
  grade:  [[255,255,255],[255,255,255],[252,252,250],[250,252,255]], // 近中性(季节色改由 ColorMatrixFilter)
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
await app.init({ resizeTo: window, background: 0x0d0f12, antialias: false,
  resolution: Math.min(window.devicePixelRatio||1, 2), autoDensity: true,
  roundPixels: true });   // 全 DPR 原生分辨率渲染(视网膜清晰) + 坐标取整消除移动发糊
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
const snowL = new PIXI.Container();              // 冬季积雪覆盖层
const overlayL = new PIXI.Container();           // 地表覆盖(作物/云影)
const objL = new PIXI.Container();               // Y-Sort 实体层
objL.sortableChildren = true;
const fxScreen = new PIXI.Container();           // 屏幕空间: 粒子/光/晕影
world.addChild(groundL, snowL, overlayL, objL);
app.stage.addChild(world, fxScreen);

/* —— 四季色彩分级: ColorMatrixFilter 对整个世界统一调色 —— */
/* 春=高饱和清新 / 夏=明亮高对比 / 秋=金黄枫红色相偏移 / 冬=去饱和冷调 */
const seasonFilter=new PIXI.ColorMatrixFilter();
world.filters=[seasonFilter];
world.filterArea=new PIXI.Rectangle(0,0,window.innerWidth,window.innerHeight); // 限定到屏幕,避免按整图分配滤镜纹理
function mkMat({s=1,br=1,rO=0,gO=0,bO=0}){        // 饱和度+亮度+RGB偏移 → 20格矩阵
  const lr=.2126,lg=.7152,lb=.0722,iv=1-s;
  return [(lr*iv+s)*br, lg*iv*br, lb*iv*br, 0, rO,
          lr*iv*br, (lg*iv+s)*br, lb*iv*br, 0, gO,
          lr*iv*br, lg*iv*br, (lb*iv+s)*br, 0, bO,
          0,0,0,1,0];
}
const SEASON_MAT=[
  mkMat({s:1.26, br:1.04, gO:.015}),                       // 春 · 清新高饱和
  mkMat({s:1.12, br:1.08, rO:.02}),                        // 夏 · 明亮高对比
  [ 1.02, .42, 0, 0, .05,                                  // 秋 · 绿叶转金(跨通道暖色相)
    0,    .90,.06, 0, .005,
    0,    .04,.55, 0,-.015,
    0,0,0,1,0 ],
  mkMat({s:.52, br:1.08, rO:-.02, bO:.06}),                // 冬 · 去饱和冷调
];
function applySeasonGrade(st){
  const i=((Math.floor(st)%4)+4)%4, j=(i+1)%4;
  const raw=st-Math.floor(st);
  const f = raw<0.72 ? 0 : (raw-0.72)/0.28;                // 季中保持本季满强度,仅季末过渡
  const A=SEASON_MAT[i], B=SEASON_MAT[j], m=new Array(20);
  for(let k=0;k<20;k++) m[k]=A[k]+(B[k]-A[k])*f;
  seasonFilter.matrix=m;
}

/* ================= 5. 瓦片地图渲染 ================= */
const KIND2PAL={g:'grass',G:'grassB',s:'soil',w:'water',b:'sand',p:'plot'};
const tileSprites=[], waterTiles=[], snowAt=[];
for(let y=0;y<MAP;y++)for(let x=0;x<MAP;x++){
  const k=grid[y][x];
  const t=ASSETS.tiles[{g:'grass',G:'grass',s:'soil',w:'water',b:'sand',p:'plot'}[k]];
  const sp=new PIXI.Sprite(PIXI.Texture.WHITE);
  sp.width=TS+2; sp.height=TS+2; sp.position.set(x*TS-1,y*TS-1);  // 1px 重叠:消除瓦片接缝
  if(t.src) loadTex(t.src,'tile').then(tex=>{sp.texture=tex;sp.width=TS+2;sp.height=TS+2;});
  const r=hash(x*13+7,y*11+3);
  sp._k=k; sp._j=0.975+r*0.05;                 // 每块明度抖动(极轻,避免棋盘格感)
  sp._ph=r*6.28;                               // 水面相位
  groundL.addChild(sp); tileSprites.push(sp);
  if(k==='w'){ waterTiles.push(sp); snowAt.push(null); }
  else {                                        // 积雪覆盖(冬季由 snowL.alpha 控制)
    const sn=new PIXI.Sprite(PIXI.Texture.WHITE);
    sn.width=TS+2; sn.height=TS+2; sn.position.set(x*TS-1,y*TS-1);
    sn.tint=0xf4f7fb; sn.alpha=.82+r*.18; snowL.addChild(sn); snowAt.push(sn);
  }
}
snowL.visible=false; snowL.alpha=0;

/* —— 视口剔除: 只渲染镜头附近的瓦片/物件(性能核心) —— */
function cullWorld(){
  const vw=app.screen.width, vh=app.screen.height, s=world.scale.x;
  const wx0=(0-world.x)/s, wy0=(0-world.y)/s, wx1=(vw-world.x)/s, wy1=(vh-world.y)/s;
  const tx0=Math.max(0,(wx0/TS|0)-2), ty0=Math.max(0,(wy0/TS|0)-2);
  const tx1=Math.min(MAP-1,(wx1/TS|0)+2), ty1=Math.min(MAP-1,(wy1/TS|0)+2);
  for(let y=0;y<MAP;y++){const rowV=y>=ty0&&y<=ty1;
    for(let x=0;x<MAP;x++){
      const v=rowV&&x>=tx0&&x<=tx1, i=y*MAP+x;
      tileSprites[i].visible=v; const sn=snowAt[i]; if(sn)sn.visible=v;
    }}
  for(const o of OBJECTS){const n=o.node;
    n.visible = !o.felled && n.x>wx0-220&&n.x<wx1+220&&n.y>wy0-300&&n.y<wy1+140;}
  for(const c of crops) c.visible = c.x>wx0-60&&c.x<wx1+60&&c.y>wy0-70&&c.y<wy1+70;
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
    loadTex(a.src).then(tex=>{sp.texture=tex; sp.width=a.w; sp.height=a.h;});
    node.addChild(sp); node._body=sp; node._graded=true;
    if(a.winterSrc){                              // 冬季覆雪变体(crossfade)
      const wsp=new PIXI.Sprite(); wsp.anchor.set(.5, a.anchorY??1); wsp.alpha=0;
      loadTex(a.winterSrc).then(tex=>{wsp.texture=tex; wsp.width=a.w; wsp.height=a.h;});
      node.addChild(wsp); node._winter=wsp;
    }
    if(kind==='house'){
      const lamp=new PIXI.Sprite(TEX_GLOW); lamp.anchor.set(.5);
      lamp.width=lamp.height=a.w*.6; lamp.y=-a.h*.36; lamp.tint=0xffc878;
      lamp.blendMode='add'; lamp.alpha=0; node.addChild(lamp); node._lamp=lamp;
    }
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
/* 耕地: 玩家手植作物(种植→成熟→收获,§13 农场交互) */
const crops=[];                // 已种下的作物节点(参与视口剔除)
const planted={};              // tileKey → { node, at, mature }
const GROW_SECONDS=DAY_SECONDS*0.6;

/* ================= 7. 主角 ================= */
function makePlayer(){
  const a=ASSETS.player;
  const node=new PIXI.Container();
  const sh=new PIXI.Sprite(TEX_SHADOW); sh.anchor.set(.5);
  sh.width=46; sh.height=18; node.addChild(sh);
  const rig=new PIXI.Container(); node.addChild(rig); node._rig=rig;
  if(a.src){
    const sp=new PIXI.Sprite(); sp.anchor.set(.5,1);
    loadTex(a.src).then(tex=>{sp.texture=tex;sp.width=a.w;sp.height=a.h;});
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
  if(e.code==='Space'){ e.preventDefault(); if(entered) interact(); }
  if(e.key==='f'||e.key==='F') timeScale=timeScale===1?10:1;
  const k=parseInt(e.key); if(k>=1&&k<=4) elapsed=((k-1)*SEASON_DAYS+3.5)*DAY_SECONDS;
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
function animateWalk(dt,moving){
  walkPh+=dt*(moving?11:4);
  const squash=moving?Math.sin(walkPh)*.045:Math.sin(walkPh)*.012;
  const PS=1.25, fd=ASSETS.player.faceDir||1;    // fd: 原画朝向(-1=朝左)
  player._rig.scale.set(facing*fd*PS*(1-squash*.6), PS*(1+squash));
  player._rig.y = moving? -Math.abs(Math.sin(walkPh))*3.2 : 0;
}
function manualMove(dt){                          // 键盘直接驱动
  let dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);
  let dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
  if(dx&&dy){dx*=Math.SQRT1_2;dy*=Math.SQRT1_2;}
  const nx=player.x+dx*SPEED*dt, ny=player.y+dy*SPEED*dt;
  if(dx&&!collides(nx,player.y)) player.x=nx;
  if(dy&&!collides(player.x,ny)) player.y=ny;
  player.zIndex=player.y;
  if(dx) facing=dx>0?1:-1;
  animateWalk(dt, !!(dx||dy));
}
function followPath(dt){                           // 沿 A* 路径自动行走
  const wp=player._path[0];
  let dx=wp.wx-player.x, dy=wp.wy-player.y;
  const d=Math.hypot(dx,dy);
  if(d<5){ player._path.shift();
    if(!player._path.length){ player._path=null; onArrive(); animateWalk(dt,false); }
    return; }
  dx/=d; dy/=d;
  const px=player.x, py=player.y;
  const nx=px+dx*SPEED*dt, ny=py+dy*SPEED*dt;
  if(!collides(nx,py)) player.x=nx;               // 轴分离:贴着障碍滑行,不整段放弃
  if(!collides(player.x,ny)) player.y=ny;
  if(Math.hypot(player.x-px,player.y-py) < SPEED*dt*0.3){   // 几乎没动 → 累计卡顿
    player._stuck=(player._stuck||0)+dt;
    if(player._stuck>0.5){ player._path=null; pendingAction=null; player._stuck=0; }
  } else player._stuck=0;
  player.zIndex=player.y;
  if(Math.abs(dx)>.05) facing=dx>0?1:-1;
  animateWalk(dt,true);
}
function movePlayer(dt){
  const wasd=keys.w||keys.a||keys.s||keys.d||keys.arrowup||keys.arrowdown||keys.arrowleft||keys.arrowright;
  if(wasd){ if(player._path){player._path=null;pendingAction=null;} manualMove(dt); return; }
  if(player._path){ followPath(dt); return; }
  animateWalk(dt,false);
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

/* ================= 8.5 A* 寻路 · 点击移动 · 上下文交互 ================= */
let pendingAction=null;                            // 到达终点后执行: {type:'farm',key}|{type:'chop',obj}
const solidTiles=new Set();                        // 实体碰撞体占据的格(动态,伐木后变化)
function rebuildSolidTiles(){
  solidTiles.clear();
  for(const c of colliders){
    const cx=Math.floor(c.x/TS), cy=Math.floor(c.y/TS);
    const rad=Math.max(0,Math.round(c.r/TS-0.25));
    for(let dy=-rad;dy<=rad;dy++)for(let dx=-rad;dx<=rad;dx++) solidTiles.add((cx+dx)+','+(cy+dy));
  }
}
function walkable(tx,ty){
  if(tx<0||ty<0||tx>=MAP||ty>=MAP) return false;
  if(blocked.has(tx+','+ty)) return false;         // 河流
  return !solidTiles.has(tx+','+ty);               // 树/石/屋/风车
}
function findPath(sx,sy,tx,ty){
  if(!walkable(tx,ty)) return null;
  if(sx===tx&&sy===ty) return [{x:sx,y:sy}];
  const open=[{x:sx,y:sy,g:0,f:0,p:null}], seen=new Set(), best=new Map([[sy*MAP+sx,0]]);
  const H=(x,y)=>{const dx=Math.abs(x-tx),dy=Math.abs(y-ty);return (dx+dy)+(Math.SQRT2-2)*Math.min(dx,dy);};
  let guard=0;
  while(open.length && guard++<12000){
    let bi=0; for(let i=1;i<open.length;i++) if(open[i].f<open[bi].f) bi=i;
    const cur=open.splice(bi,1)[0], ck=cur.y*MAP+cur.x;
    if(cur.x===tx&&cur.y===ty){ const path=[]; let n=cur; while(n){path.push({x:n.x,y:n.y});n=n.p;} return path.reverse(); }
    if(seen.has(ck)) continue; seen.add(ck);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const nx=cur.x+dx, ny=cur.y+dy;
      if(!walkable(nx,ny)) continue;
      if(dx&&dy && (!walkable(cur.x+dx,cur.y)||!walkable(cur.x,cur.y+dy))) continue;  // 禁止切墙角
      const ng=cur.g+(dx&&dy?Math.SQRT2:1), nk=ny*MAP+nx;
      if(best.has(nk)&&ng>=best.get(nk)) continue;
      best.set(nk,ng);
      open.push({x:nx,y:ny,g:ng,f:ng+H(nx,ny),p:cur});
    }
  }
  return null;
}
function lineWalk(x0,y0,x1,y1){                    // 视线直连(路径平滑用)
  let dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1,err=dx-dy,x=x0,y=y0,g=0;
  while(g++<500){ if(!walkable(x,y))return false; if(x===x1&&y===y1)return true;
    const e2=2*err; if(e2>-dy){err-=dy;x+=sx;} if(e2<dx){err+=dx;y+=sy;} }
  return false;
}
function smoothPath(path){
  if(!path||path.length<3) return path;
  const out=[path[0]]; let i=0;
  while(i<path.length-1){ let j=path.length-1;
    while(j>i+1 && !lineWalk(path[i].x,path[i].y,path[j].x,path[j].y)) j--;
    out.push(path[j]); i=j; }
  return out;
}
function nearestWalkable(tx,ty){
  if(walkable(tx,ty)) return {x:tx,y:ty};
  for(let r=1;r<=7;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
    if(Math.max(Math.abs(dx),Math.abs(dy))!==r) continue;
    if(walkable(tx+dx,ty+dy)) return {x:tx+dx,y:ty+dy};
  }
  return null;
}
function tilePath(sx,sy,tx,ty){                    // → 世界坐标航点数组 | null
  rebuildSolidTiles();
  let p=findPath(sx,sy,tx,ty);
  if(!p){ const nw=nearestWalkable(tx,ty); if(!nw) return null; p=findPath(sx,sy,nw.x,nw.y); }
  if(!p) return null;
  p=smoothPath(p);
  return p.map(t=>({wx:t.x*TS+TS/2, wy:t.y*TS+TS/2}));
}
function objectAtTile(tx,ty){
  for(const o of OBJECTS){ if(o.felled) continue;
    if(Math.floor(o.node.x/TS)===tx && Math.floor(o.node.y/TS)===ty) return o; }
  return null;
}
/* 点击/触摸 → 路由: 树→走到旁边砍伐; 耕地→走过去种/收; 空地→走过去 */
function commandTo(wx,wy){
  const tx=Math.floor(wx/TS), ty=Math.floor(wy/TS);
  const sx=Math.floor(player.x/TS), sy=Math.floor(player.y/TS);
  const o=objectAtTile(tx,ty);
  if(o && (o.kind==='tree'||o.kind==='cherry')){          // → 砍伐
    rebuildSolidTiles(); const nw=nearestWalkable(tx,ty);
    if(!nw) return; const path=tilePath(sx,sy,nw.x,nw.y);
    if(path){ player._path=path; pendingAction={type:'chop',obj:o}; toastHint('前往伐木…'); }
    return;
  }
  if(tileMeta[tx+','+ty]){                                 // → 种/收
    const path=tilePath(sx,sy,tx,ty);
    if(path){ player._path=path; pendingAction={type:'farm',key:tx+','+ty}; }
    return;
  }
  const path=tilePath(sx,sy,tx,ty);                        // → 行走
  if(path){ player._path=path; pendingAction=null; }
}
const chopLoop={obj:null,t:0};
function onArrive(){
  const a=pendingAction; pendingAction=null;
  if(!a) return;
  if(a.type==='farm') interactFarm(a.key);
  else if(a.type==='chop'){ chopLoop.obj=a.obj; chopLoop.t=0; }
}

/* ================= 8.6 水灵兽 AI(状态机:闲逛→前往→浇水) ================= */
const beast=makeNode('beast_water');
beast.x=29*TS+TS/2; beast.y=30*TS+TS/2; beast.zIndex=beast.y;
objL.addChild(beast);
const beastAI={ state:'idle', t:1.5, path:null, target:null, home:{x:beast.x,y:beast.y}, bob:0 };
function beastGoto(tx,ty){
  const sx=Math.floor(beast.x/TS), sy=Math.floor(beast.y/TS);
  const path=tilePath(sx,sy,tx,ty);
  if(!path) return false; beastAI.path=path; return true;
}
function beastStep(dt){
  beastAI.bob+=dt*3.2;
  if(beast._body) beast._body.y = Math.sin(beastAI.bob)*3.5;   // 漂浮
  beast._shadow.alpha=.28;
  // 沿路径移动
  if(beastAI.path && beastAI.path.length){
    const wp=beastAI.path[0]; let dx=wp.wx-beast.x, dy=wp.wy-beast.y; const d=Math.hypot(dx,dy);
    if(d<5){ beastAI.path.shift(); }
    else { dx/=d;dy/=d; const sp=145; beast.x+=dx*sp*dt; beast.y+=dy*sp*dt; beast.zIndex=beast.y; }
    if(beastAI.path && !beastAI.path.length) beastAI.path=null;
    return;
  }
  beastAI.t-=dt;
  if(beastAI.state==='idle'){
    if(beastAI.t<=0){
      beastAI.t=1.8+Math.random()*1.8;
      const dry=findDryPlot();
      if(dry){ const [tx,ty]=dry.split(',').map(Number);
        if(beastGoto(tx,ty)){ beastAI.state='seek'; beastAI.target=dry; setBeastStatus('seek'); return; } }
      const hx=Math.floor(beastAI.home.x/TS), hy=Math.floor(beastAI.home.y/TS);   // 否则在家附近闲逛
      const tx=hx+((Math.random()*9-4)|0), ty=hy+((Math.random()*9-4)|0);
      rebuildSolidTiles(); if(walkable(tx,ty)) beastGoto(tx,ty);
      setBeastStatus('idle');
    }
  } else if(beastAI.state==='seek'){
    const pc=planted[beastAI.target];                          // 到达(无路径了)
    if(pc && !pc.watered){ beastAI.state='water'; beastAI.t=2.0; setBeastStatus('water'); }
    else { beastAI.state='idle'; beastAI.t=.3; }
  } else if(beastAI.state==='water'){
    if((beastAI.t*5|0)!==((beastAI.t+dt)*5|0)) spawnWaterDrop();  // 周期喷水滴
    if(beastAI.t<=0){
      const pc=planted[beastAI.target];
      if(pc){ pc.watered=true; pc.boost=true; toastHint('水灵兽灌溉了一块田 · 生长加速'); }
      beastAI.state='idle'; beastAI.t=.5; setBeastStatus('idle');
    }
  }
}
function findDryPlot(){
  for(const key in planted){ const pc=planted[key]; if(!pc.mature&&!pc.watered) return key; }
  return null;
}
const waterDrops=[];
function spawnWaterDrop(){
  const g=new PIXI.Graphics(); g.circle(0,0,3).fill({color:0x8fd4e8,alpha:.9});
  g.x=beast.x+(Math.random()*16-8); g.y=beast.y-20; g._vy=40+Math.random()*30; g._life=0;
  overlayL.addChild(g); waterDrops.push(g);
}
function stepWaterDrops(dt){
  for(let i=waterDrops.length-1;i>=0;i--){const g=waterDrops[i]; g._life+=dt; g.y+=g._vy*dt; g.alpha=Math.max(0,.9-g._life*1.3);
    if(g._life>.7){overlayL.removeChild(g);waterDrops.splice(i,1);}}
}

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

/* 季节粒子(屏幕空间) — 共享纹理 Sprite,可被 WebGL 批渲染 */
function shapeTex(draw){
  const c=document.createElement('canvas');c.width=c.height=16;
  draw(c.getContext('2d'));return PIXI.Texture.from(c);
}
const TEX_PETAL=shapeTex(g=>{g.fillStyle='#f4c4d2';g.beginPath();g.ellipse(8,8,6.5,4,0,0,7);g.fill();});
const TEX_LEAF =shapeTex(g=>{g.fillStyle='#c47834';g.beginPath();g.ellipse(8,8,7,4.2,0,0,7);g.fill();});
const TEX_SNOW =shapeTex(g=>{g.fillStyle='#f8fafc';g.beginPath();g.arc(8,8,4.4,0,7);g.fill();});
const parts=[];
let emitAcc=0, wind=0;
function spawnParticles(st,dt,night){
  const s=((Math.floor(st)%4)+4)%4;
  const vw=app.screen.width, vh=app.screen.height;
  wind=Math.sin(elapsed*.13)*.6+Math.sin(elapsed*.047)*.4;        // 缓慢阵风
  /* 按"每秒个数"发射(与帧率解耦,杜绝低帧率下整行同时落下) */
  const rate = s===1?(night?3:0) : s===3?9 : 6;
  emitAcc+=dt*rate;
  while(emitAcc>=1){
    emitAcc-=1;
    if(parts.length>(quality===2?140:60)) break;
    let p;
    const sc=.45+Math.random()*.65;                               // 大小≈景深
    if(s===1&&night){
      p=new PIXI.Sprite(TEX_GLOW); p.width=p.height=8+sc*6; p.blendMode='add'; p.tint=0xffe896;
      p._fire=true; p._vx=0; p._vy=0;
      p.x=Math.random()*vw; p.y=vh*(.3+Math.random()*.5);
    } else {
      p=new PIXI.Sprite(s===0?TEX_PETAL:s===2?TEX_LEAF:TEX_SNOW);
      p.scale.set(sc);
      const depth=.5+sc*.8;
      /* 速度按屏幕高度缩放:整屏下落 9~16 秒,大屏小屏氛围一致 */
      p._vy=vh*(s===3? .055+sc*.05 : .07+sc*.06)*depth;
      p._vx=vh*(s===2?-.030:s===0?.012:-.008)*depth;
      p._spin=s===3?(Math.random()-.5)*.7:(Math.random()-.5)*3.2;
      p._swayA=(s===3?.006+Math.random()*.008:.010+Math.random()*.016)*vh;
      p._swayF=.7+Math.random()*.9;                               // 各自摆动频率,不同步
      p.alpha=.42+sc*.5;
      p.x=Math.random()*(vw+vh*.3)-vh*.15; p.y=-14-Math.random()*vh*.06;
    }
    p.anchor.set(.5); p._s=s; p._ph=Math.random()*6.28; p._life=0;
    partC.addChild(p); parts.push(p);
  }
}
function updateParticles(dt,curSeason){
  const vh=app.screen.height;
  for(let i=parts.length-1;i>=0;i--){const p=parts[i];
    p._ph+=dt*(p._fire?2:p._swayF||1); p._life+=dt;
    /* 换季: 旧季粒子快速淡出(樱花不会飘进冬天) */
    if(!p._fire && p._s!==curSeason){
      p.alpha-=dt*1.4;
      if(p.alpha<=0){partC.removeChild(p);parts.splice(i,1);continue;}
    }
    if(p._fire){
      p.x+=Math.sin(p._ph*.9)*20*dt; p.y+=Math.cos(p._ph*.7)*13*dt;
      p.alpha=Math.max(0,Math.sin(p._ph))*.9;
      if(p._life>7){partC.removeChild(p);parts.splice(i,1);} continue;
    }
    p.x+=(p._vx + wind*vh*.045*(p._s===3?1:.6) + Math.sin(p._ph)*p._swayA)*dt;
    p.y+=p._vy*dt;
    p.rotation+=p._spin*dt;
    if(p.y>vh+16){partC.removeChild(p);parts.splice(i,1);}
  }
}

/* ================= 10. 时间系统与主循环 ================= */
let elapsed=0, timeScale=1, entered=false;
let recolorClock=0, cullClock=0, curWaterBase=[84,150,164], curCrop=0x96be64;

/* —— 自适应画质: FPS 不足时逐级降载(软渲染/低端机自救) —— */
let quality=2, fpsN=0, fpsT0=performance.now(), seasonFilterOn=true;
function setQuality(q){
  if(q>=quality) return; quality=q;
  if(q===1){ app.renderer.resolution=1; cloudShadows.forEach(c=>c.visible=false); }
  if(q===0){ app.renderer.resolution=.75; cloudShadows.forEach(c=>c.visible=false);
    golden.visible=false; vignette.visible=false; }
  app.resize();
  console.info('[Terra] quality →', q===1?'mid':'low');
}
const dayPhase=()=> (elapsed%DAY_SECONDS)/DAY_SECONDS;
const sunlight=()=> Math.max(0,Math.sin(dayPhase()*Math.PI));

app.ticker.add(tk=>{
  const dt=Math.min(.05,tk.deltaMS/1000);
  fpsN++;
  const fnow=performance.now();
  if(fnow-fpsT0>=2500){
    const f=fpsN*1000/(fnow-fpsT0); fpsN=0; fpsT0=fnow;
    if(!window.__lockQ){ if(f<15) setQuality(0); else if(f<30) setQuality(1); }
  }
  elapsed+=dt*timeScale;
  const st=(elapsed/DAY_SECONDS/SEASON_DAYS)%4;
  const sun=sunlight(), night=1-sun;

  /* —— 世界调色: 重活 150ms 节流 —— */
  recolorClock-=dt;
  if(recolorClock<=0){ recolorClock=.15;
    applySeasonGrade(st);                                  // 四季色彩分级(ColorMatrixFilter)
    const TEXTURED=!!ASSETS.tiles.grass.src;
    const grade=pal('grade',st), gradeHex=hex(grade);
    if(TEXTURED){
      for(const sp of tileSprites){ if(sp._k==='w')continue;
        const j=sp._j; sp.tint=hex([grade[0]*j,grade[1]*j,grade[2]*j]); }
      curWaterBase=[grade[0]*.92,grade[1],Math.min(255,grade[2]*1.06)];
    } else {
      const base={};
      for(const k in KIND2PAL) base[k]=pal(KIND2PAL[k],st);
      for(const sp of tileSprites){ if(sp._k==='w')continue;
        const b=base[sp._k],j=sp._j; sp.tint=hex([b[0]*j,b[1]*j,b[2]*j]); }
      curWaterBase=base.w;
    }
    const sm=((st%4)+4)%4, wmix=Math.max(0,1-Math.abs(sm-3.5)*1.35);   // 冬季积雪
    snowL.visible=wmix>0.02; snowL.alpha=wmix*.88;
    const cCan=hex(pal('canopy',st)), cBloom=hex(pal('bloom',st)), cBush=hex(pal('bushC',st));
    curCrop=hex(pal('cropC',st));
    for(const o of OBJECTS){
      const n=o.node;
      if(n._graded){
        n._body.tint=gradeHex;
        if(n._winter){ n._winter.alpha=wmix; n._winter.tint=gradeHex; n._body.alpha=1-wmix; }
      }
      else if(o.kind==='tree'&&n._canopy) n._canopy.tint=cCan;
      else if(o.kind==='cherry'&&n._canopy) n._canopy.tint=cBloom;
      else if(o.kind==='bush'&&n._canopy) n._canopy.tint=cBush;
      n._shadow.alpha=.25+sun*.45;
    }
    for(const key in planted){                                         // 作物视觉(生长累计见每帧块)
      const pc=planted[key];
      const g=Math.min(1,(pc.grown||0)/GROW_SECONDS);
      pc.node._body.tint=pc.mature?0xffe9b0:gradeHex;                  // 成熟泛金
      if(!pc.mature) pc.node.scale.set(.32+g*.72);
    }
  }
  /* —— 每帧轻活: 水面闪烁/风车/夜灯/树摇 —— */
  const wph=elapsed*2;
  for(const sp of waterTiles){
    if(!sp.visible) continue;
    const j=.88+(Math.sin(wph+sp._ph)*.5+.5)*.24;
    sp.tint=hex([curWaterBase[0]*j,curWaterBase[1]*j,curWaterBase[2]*j]);
  }
  for(const o of OBJECTS){
    const n=o.node;
    if(!n.visible) continue;
    if(n._blades) n._blades.rotation+=dt*1.2;
    if(n._lamp) n._lamp.alpha=night>.5?(night-.5)*1.6:0;
    if(n._canopy&&o.kind!=='bush') n._canopy.rotation=Math.sin(elapsed*1.2+n.x*.01)*.012;
    else if(n._graded&&(o.kind==='tree'||o.kind==='cherry')){
      n._body.rotation=Math.sin(elapsed*1.1+n.x*.01)*.008;
      if(n._winter) n._winter.rotation=n._body.rotation;
    }
    if(o._shake>0){                                // 伐木受击晃动
      o._shake-=dt*2.4;
      n.scale.set(1+Math.sin(o._shake*26)*.05*Math.max(0,o._shake));
      if(o._shake<=0) n.scale.set(1);
    }
  }
  /* 玩家与镜头 */
  if(entered){ movePlayer(dt); }
  updateCamera(dt);
  /* 作物生长累计(浇水 boost 加速) + 灵兽 AI + 连续伐木 */
  for(const key in planted){ const pc=planted[key];
    if(!pc.mature){ pc.grown=(pc.grown||0)+dt*timeScale*(pc.boost?1.8:1);
      if(pc.grown>=GROW_SECONDS) pc.mature=true; } }
  if(entered){ beastStep(dt); stepWaterDrops(dt);
    if(chopLoop.obj){ const o=chopLoop.obj;
      if(o.felled||staminaUsed>=6) chopLoop.obj=null;
      else if(Math.hypot(o.node.x-player.x,o.node.y-player.y)>100) chopLoop.obj=null;
      else { chopLoop.t-=dt; if(chopLoop.t<=0){ chopLoop.t=.5; chop(o); } } }
  }
  seasonFilterOn = quality>0;                      // 低端机彻底移除滤镜(不依赖 .enabled,确保省开销)
  if(seasonFilterOn !== (world.filters && world.filters.length>0)){
    world.filters = seasonFilterOn ? [seasonFilter] : [];
  }
  if(seasonFilterOn) world.filterArea=new PIXI.Rectangle(0,0,app.screen.width,app.screen.height);
  cullClock-=dt;
  if(cullClock<=0){ cullClock=.12; cullWorld(); updateHint(); }

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
  spawnParticles(st,dt,night>.62); updateParticles(dt,((Math.floor(st)%4)+4)%4);

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
let staminaUsed=0;
const syncLeaves=()=>leaves.forEach((l,i)=>l.classList.toggle('spent', i<staminaUsed));
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
    staminaUsed=0; syncLeaves();                                       // 新一天体力恢复
    for(let i=fellQueue.length-1;i>=0;i--){                            // 伐倒的树次日重生
      const f=fellQueue[i];
      if(day>=f.day){ f.o.felled=false; f.o.hp=2;
        if(f.o._col) colliders.push(f.o._col);
        fellQueue.splice(i,1); }
    }}
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
/* 点击/触摸 = 寻路移动 + 上下文交互;右键 = 查看地籍档案 */
function screenToWorld(cx,cy){ return { wx:(cx-world.x)/world.scale.x, wy:(cy-world.y)/world.scale.y }; }
app.canvas.addEventListener('pointerdown',e=>{
  if(!entered || e.button===2) return;
  const {wx,wy}=screenToWorld(e.clientX,e.clientY);
  commandTo(wx,wy);
});
app.canvas.addEventListener('contextmenu',e=>{
  e.preventDefault(); if(!entered) return;
  const {wx,wy}=screenToWorld(e.clientX,e.clientY);
  const key=Math.floor(wx/TS)+','+Math.floor(wy/TS);
  if(tileMeta[key]) openPanel(tileMeta[key]);
});
app.canvas.style.touchAction='none';

/* 卡牌 3D 悬停 */
addEventListener('mousemove',e=>{
  const c=$('cardPeek'),f=c.querySelector('.face'),r=c.getBoundingClientRect();
  if(e.clientX>r.left-40&&e.clientX<r.right+40&&e.clientY>r.top-40&&e.clientY<r.bottom+40){
    const dx=(e.clientX-(r.left+r.width/2))/r.width,dy=(e.clientY-(r.top+r.height/2))/r.height;
    f.style.transform=`rotateY(${dx*22}deg) rotateX(${-dy*22}deg)`;
  }else f.style.transform='';
});

/* ================= 13. 农场交互闭环(state.js 接线) ================= */
/* 种地(空格) → 成熟 → 收获入库(originFertility 继承地块肥力)
   → Dock 显示背包 → 锻造按钮调用 Terra.craftCard → 卡牌翻面揭示 */
if(!Terra.load()) Terra.newGame('local');
const farm=Terra.farm;
farm.inventory.materials.wood ??= 8;           // 初始木材(伐木系统未上线前)

let whisperTimer;
function toastHint(t){ const w=$('whisper'); w.textContent=t; w.style.opacity=1;
  clearTimeout(whisperTimer); whisperTimer=setTimeout(()=>w.style.opacity=0,2600); }

const playerTileKey=()=>Math.floor(player.x/TS)+','+Math.floor((player.y-4)/TS);

/* 伐木 */
const fellQueue=[];
function nearestChoppable(){
  let best=null,bd=1e9;
  for(const o of OBJECTS){
    if((o.kind!=='tree'&&o.kind!=='cherry')||o.felled) continue;
    const dx=o.node.x-player.x, dy=o.node.y-player.y, d=dx*dx+dy*dy;
    if(d<bd){bd=d;best=o;}
  }
  return bd<95*95? best:null;
}
function chop(o){
  o.hp=(o.hp??2)-1; o._shake=1;
  if(o.hp>0){ toastHint('咔 —— 再砍一下'); return; }
  if(staminaUsed>=6){ toastHint('体力耗尽 · 待明日恢复'); o.hp=1; return; }
  staminaUsed++; syncLeaves();
  farm.inventory.materials.wood=(farm.inventory.materials.wood||0)+2;
  Terra.save(); updateDock(); toastHint('伐木 · 木材 +2');
  o.felled=true; o.node.visible=false;
  const ci=colliders.findIndex(c=>c.x===o.node.x&&c.y===o.node.y);
  if(ci>=0) o._col=colliders.splice(ci,1)[0];
  fellQueue.push({o, day:Math.floor(elapsed/DAY_SECONDS)+1});
}

function interactFarm(key){
  if(!tileMeta[key]) return;
  const pc=planted[key];
  if(!pc){                                        // 播种
    if(staminaUsed>=6){ toastHint('体力耗尽 · 待明日恢复'); return; }
    staminaUsed++; syncLeaves();
    const c=makeNode('crop');
    const [tx,ty]=key.split(',').map(Number);
    c.x=tx*TS+TS/2; c.y=ty*TS+TS/2+16; c._shadow.visible=false; c.scale.set(.32);
    overlayL.addChild(c); crops.push(c);
    planted[key]={node:c, grown:0, mature:false, watered:false, boost:false};
    toastHint('播种 星麦 · 静待生长');
  } else if(pc.mature){                           // 收获:质量继承产地肥力
    const meta=tileMeta[key];
    (farm.inventory.crops.starwheat ??= []).push({
      quality:+(meta.fert/100).toFixed(2), originFertility:meta.fert });
    Terra.save(); updateDock();
    toastHint(`收获 星麦 · 产地肥力 ${meta.fert}`);
    overlayL.removeChild(pc.node);
    const ci=crops.indexOf(pc.node); if(ci>=0)crops.splice(ci,1);
    delete planted[key];
  } else toastHint('成长中 · 再等等');
}
function interact(){                              // 空格:在当前位置就近交互
  const key=playerTileKey();
  if(tileMeta[key]){ interactFarm(key); return; }
  const t=nearestChoppable();
  if(t){ chop(t); return; }
  toastHint('站上耕地可播种 · 靠近树木可伐木');
}

function updateHint(){
  const el=$('hintAction'), txt=$('hintTxt');
  if(!entered){ el.style.opacity=0; return; }
  const key=playerTileKey();
  if(tileMeta[key]){
    const pc=planted[key];
    txt.textContent = !pc? '播种 · 体力×1' : pc.mature? '收获星麦' : '成长中 …';
    el.style.opacity = (!pc||pc.mature)? 1 : .55;
    return;
  }
  if(nearestChoppable()){ txt.textContent='伐木 · 体力×1'; el.style.opacity=1; return; }
  el.style.opacity=0;
}

function updateDock(){
  const wheat=(farm.inventory.crops.starwheat||[]).length;
  $('invWheat').textContent=wheat;
  $('invWood').textContent=farm.inventory.materials.wood||0;
  $('invCards').textContent=farm.inventory.cards.length;
  $('craftBtn').disabled = !(wheat>=3 && (farm.inventory.materials.wood||0)>=2);
}
$('craftBtn').onclick=()=>{
  const res=Terra.craftCard(farm,'card_sprout_guard', .55+Math.random()*.4);
  if(!res.ok){ toastHint('材料不足:星麦×3 木材×2'); return; }
  Terra.save(); updateDock();
  $('cvName').textContent=res.card.name;
  $('cvAtk').textContent=res.card.atk; $('cvDef').textContent=res.card.def;
  $('cvQ').textContent=Math.round(res.card.quality*100)+'%';
  $('cvAffix').innerHTML=res.card.affixes.length
    ? res.card.affixes.map(a=>'✦ '+a).join('<br>')
    : '无词条 · 高肥力与好手感可获得词条';
  $('cardReveal').classList.add('on');
};
$('cardReveal').onclick=()=>$('cardReveal').classList.remove('on');
updateDock();

/* 灵兽状态面板 */
const BEAST_STATE={idle:'闲逛中 …',seek:'前往灌溉 …',water:'正在浇水 …'};
function setBeastStatus(s){ const el=$('beastState'); if(el) el.textContent=BEAST_STATE[s]||'—'; }
setBeastStatus('idle');

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

/* 调试句柄(性能排查/控制台实验用) */
window.__dbg={app,world,groundL,snowL,overlayL,objL,fxScreen,player,cam,beast,beastAI,
  seasonFilter, findPath, planted, commandTo, interactFarm,
  beastStep, get quality(){return quality},
  get parts(){return parts.length}};

})();
