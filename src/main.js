/* =========================================================
   Terra Chronicle — 2.5D 探索原型 v9.14 (PixiJS v8 / WebGL)
   世界层: Tilemap + Y-Sort 精灵 + WASD 主角 + 平滑跟随镜头
   氛围层: 四季连续调色 · 昼夜光 · 云影 · 季节粒子 · 晕影
   界面层: DOM (index.html)
   ---------------------------------------------------------
   v9.14 改进: 画风与美术最终抛光
               — 水面高级 Shader (反射+折射+菲涅尔+泡沫)
               — Sprite-based 季节粒子 (真实樱花/树叶/雪花纹理+旋转)
               — 后处理管线 (Bloom/Fog/God Rays/增强晕影/色差)
               — 材质增强系统 (程序化木质/石头/草叶纹理+AO)
   v9.12 改进: Gris / Hollow Knight 美术层次原则全面应用
               — 色彩对比度优化(前景高亮/背景深沉/金色边框)
               — 视觉引导强化(季节弧段辉光/FAB脉冲加强)
               — UI自然融合(毛玻璃+内光晕+drop-shadow统一)
               — 细节打磨(边缘光/阴影层次/渐变优化)
   v9.8 改进: 季节盘重设计 — 四季差异化弧段 + 季节切换动画 + 进度环
              + 时钟连接线 + 天气标签动态联动 + tabular-nums 等宽数字
   v9.6 改进: 视觉引导强化 — 传送门/孵化阵/熔炉呼吸光环 + 炼金FAB悬浮按钮
              + 敌人意图图标化与色彩编码 + 卡牌悬停增强 + 全屏状态脉冲
   v9.6 改进: 多层次交互反馈 — 粒子爆发 + 数字飘字 + 音效预留 + 过程动画
   v9.3 改进: 所有交互元素添加 data-testid，锻造按钮 disabled 状态优化
   v9.1 修复: Title page 'Enter Game' 按钮可见性问题
   美术资产接口: 所有可见物均通过 ASSETS 表声明。
   把 AI 生成的 PNG 路径填进对应 src 字段即可替换占位符,
   其余逻辑(碰撞/遮挡/动画/换色)不需要任何改动。
   ========================================================= */
'use strict';

/* 资产版本号: 内容更新时 +1,绕过浏览器/CDN 旧缓存 */
const ASSET_V="?v=13";
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
/* season:[春,夏,秋,冬] 四季专属贴图(取代代码调色);缺省回退到 src */
const ASSETS = {
  player:   { src: 'assets/sprites/player_idle.png', w: 46,  h: 73,  anchorY: 1.0, faceDir: -1 },
  tree:     { src: 'assets/sprites/tree_oak.png',    w: 128, h: 125, anchorY: 0.96, collideR: 18,
              season: ['assets/sprites/tree_oak.png','assets/sprites/tree_oak.png','assets/sprites/tree_oak_autumn.png','assets/sprites/tree_oak_winter.png'] },
  cherry:   { src: 'assets/sprites/tree_cherry.png', w: 126, h: 119, anchorY: 0.96, collideR: 18,
              season: ['assets/sprites/tree_cherry.png','assets/sprites/tree_cherry.png','assets/sprites/tree_cherry_autumn.png','assets/sprites/tree_cherry_winter.png'] },
  rock:     { src: 'assets/sprites/rock.png',        w: 62,  h: 44,  anchorY: 0.9,  collideR: 20 },
  bush:     { src: 'assets/sprites/bush.png',        w: 58,  h: 57,  anchorY: 0.92,
              season: ['assets/sprites/bush.png','assets/sprites/bush.png','assets/sprites/bush.png','assets/sprites/bush_winter.png'] },
  house:    { src: 'assets/sprites/house.png',       w: 232, h: 213, anchorY: 0.97, collideR: 86,
              season: ['assets/sprites/house.png','assets/sprites/house.png','assets/sprites/house.png','assets/sprites/house_winter.png'] },
  windmill: { src: 'assets/sprites/windmill_base.png', w: 118, h: 178, anchorY: 0.98, collideR: 30,
              bladesSrc: 'assets/sprites/windmill_blades.png', bladesW: 92, hubY: -0.74 },
  fence:    { src: 'assets/sprites/fence.png',       w: 66,  h: 53,  anchorY: 0.9 },
  crop:     { src: 'assets/sprites/crop.png',        w: 48,  h: 58,  anchorY: 1.0,
              growth: ['assets/sprites/crop_seedling.png','assets/sprites/crop_growing.png','assets/sprites/crop.png'] },
  crop_dewberry:{ src:'assets/sprites/crop_dewberry.png',w: 52, h: 56, anchorY: 1.0,
              growth: ['assets/sprites/crop_dewberry_seedling.png','assets/sprites/crop_dewberry_growing.png','assets/sprites/crop_dewberry.png'] },
  beast_water:{ src:'assets/sprites/beast_water.png',w: 82,  h: 88,  anchorY: 0.88 },
  beast_fire:{ src:'assets/sprites/beast_fire.png', w: 58,  h: 66,  anchorY: 0.86 },
  beast_shrine_fox_spirit:{ src:'assets/sprites/beast_shrine_fox_spirit.png', w: 80, h: 82, anchorY: 0.88 },
  beast_sacred_fawnling:{ src:'assets/sprites/beast_sacred_fawnling.png', w: 78, h: 82, anchorY: 0.90 },
  beast_white_serpent_shrine:{ src:'assets/sprites/beast_white_serpent_shrine.png', w: 84, h: 88, anchorY: 0.90 },
  beast_deepsea_noble:{ src:'assets/sprites/beast_deepsea_noble.png', w: 80, h: 86, anchorY: 0.88 },
  portal:   { src: 'assets/sprites/portal.png',      w: 120, h: 132, anchorY: 0.92, collideR: 26 },
  incubator:{ src: 'assets/sprites/incubator.png',   w: 96,  h: 104, anchorY: 0.92, collideR: 30 },
  furnace:  { src: 'assets/sprites/furnace.png',     w: 104, h: 96,  anchorY: 0.92, collideR: 30 },
  // 地表瓦片(扁平手绘,季节专属);grass 随季换图
  tiles: {
    grass: { src: 'assets/sprites/tile_grass.png',
             season:['assets/sprites/grass_spring.png','assets/sprites/tile_grass.png','assets/sprites/grass_autumn.png','assets/sprites/tile_grass.png'] },
    soil:  { src: 'assets/sprites/tile_soil.png' },
    water: { src: 'assets/sprites/tile_water.png' },
    sand:  { src: 'assets/sprites/tile_sand.png' },
    plot:  { src: 'assets/sprites/tile_plot.png' },
  },
};

const SELECTED_PET_DEFS = {
  beast_shrine_fox_spirit:{
    name:'神社狐灵', element:'spirit', role:'侦察 / 符咒', branches:['巡界狐','御札狐','稻荷狐'],
    passive:'狐火巡界', active:'御札标记', effect:{rare:0.08,pest:-4,spiritCharm:1}, cost:{beast_soul:1}
  },
  beast_sacred_fawnling:{
    name:'御鹿幼灵', element:'earth', role:'土壤 / 成长', branches:['林冠鹿','晨露鹿','祭铃鹿'],
    passive:'鹿鸣丰壤', active:'踏青祝福', effect:{soil:7,grow:0.15,quality:3}, cost:{beast_soul:1}
  },
  beast_white_serpent_shrine:{
    name:'白蛇社灵', element:'water', role:'水脉 / 净化', branches:['社泉蛇','白虹蛇','神乐蛇'],
    passive:'社泉守护', active:'蛇行净流', effect:{water:0.8,pest:-7,quality:2}, cost:{beast_soul:1,blight_seed:1}
  },
  beast_deepsea_noble:{
    name:'深海贵族', element:'water', role:'高级灌溉 / 灵脉调律', branches:['珍珠侍从','蓝宝石公爵','月潮王裔'],
    passive:'潮汐礼仪', active:'蓝宝石潮声', effect:{water:1.2,dewberryQuality:5,grow:0.12}, cost:{beast_soul:2}
  }
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
  // 深渊传送门(东北角):清掉该格已有物件再放置
  for(let i=OBJECTS.length-1;i>=0;i--){ const o=OBJECTS[i];
    if(Math.abs(o.tx-47)<2 && Math.abs(o.ty-10)<2) OBJECTS.splice(i,1); }
  OBJECTS.push({kind:'portal',tx:47,ty:10,glow:true});
  // 孵化阵 + 工坊熔炉(农庄附近):清格再放
  for(let i=OBJECTS.length-1;i>=0;i--){ const o=OBJECTS[i];
    if((Math.abs(o.tx-17)<2&&Math.abs(o.ty-31)<2)||(Math.abs(o.tx-25)<2&&Math.abs(o.ty-22)<2)) OBJECTS.splice(i,1); }
  OBJECTS.push({kind:'incubator',tx:17,ty:31,glow:true});
  OBJECTS.push({kind:'furnace',tx:25,ty:22,glow:true});
}
placeObjects();

/* ================= 4. PIXI 启动 ================= */
(async ()=>{
const app = new PIXI.Application();
let feedbackSystem = null;  // 交互反馈系统（在图层初始化后创建）

// 检测 headless 环境
const isHeadless = navigator.webdriver || navigator.userAgent.includes('HeadlessChrome');

await app.init({ resizeTo: window, background: 0x0d0f12, antialias: false,
  resolution: isHeadless ? 1 : Math.min(window.devicePixelRatio||1, 2),
  autoDensity: true,
  roundPixels: true,
  preference: isHeadless ? 'webgl' : 'webgl2' });   // headless 环境使用 WebGL 1
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
const groundL = new PIXI.Container();            // 瓦片层(草/土/沙/耕地)
const waterL = new PIXI.Container();             // 水面层(独立,轻量波纹滤镜)
const foamL = new PIXI.Container();              // 水岸泡沫
const snowL = new PIXI.Container();              // 冬季积雪覆盖层
const overlayL = new PIXI.Container();           // 地表覆盖(作物/云影)
const objL = new PIXI.Container();               // Y-Sort 实体层
objL.sortableChildren = true;
const fxScreen = new PIXI.Container();           // 屏幕空间: 粒子/光/晕影
world.addChild(groundL, waterL, foamL, snowL, overlayL, objL);
app.stage.addChild(world, fxScreen);

/* 初始化交互反馈系统 */
feedbackSystem = typeof FeedbackSystem !== 'undefined' ? new FeedbackSystem(app, overlayL, fxScreen) : null;

/* DPR/视口加固: 画布撑满屏 + resize/恢复可见时同步渲染器、滤镜与转场云幕画布 */
app.canvas.style.width='100%'; app.canvas.style.height='100%';
app.canvas.style.display='block';
function syncViewport(){
  const vw=Math.max(1, Math.round(window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth || 1));
  const vh=Math.max(1, Math.round(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 1));
  app.renderer.resize(vw, vh);
  app.canvas.style.width=vw+'px';
  app.canvas.style.height=vh+'px';
  world.filterArea=null;
  const clouds=document.getElementById('clouds');
  if(clouds){
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const cw=Math.max(1, Math.round(vw*dpr));
    const ch=Math.max(1, Math.round(vh*dpr));
    if(clouds.width!==cw || clouds.height!==ch){
      clouds.width=cw; clouds.height=ch;
    }
    clouds.style.width=vw+'px';
    clouds.style.height=vh+'px';
  }
  app.render();
}
let viewportSyncTimer=0;
function scheduleViewportSync(){
  cancelAnimationFrame(viewportSyncTimer);
  viewportSyncTimer=requestAnimationFrame(()=>{
    syncViewport();
    requestAnimationFrame(syncViewport);
  });
}
syncViewport();
addEventListener('resize',scheduleViewportSync);
addEventListener('orientationchange',scheduleViewportSync);
addEventListener('pageshow',scheduleViewportSync);
addEventListener('focus',scheduleViewportSync);
document.addEventListener('visibilitychange',()=>{
  if(!document.hidden) scheduleViewportSync();
});
window.visualViewport?.addEventListener('resize',scheduleViewportSync);
window.visualViewport?.addEventListener('scroll',scheduleViewportSync);

/* —— 四季色彩分级: ColorMatrixFilter 对整个世界统一调色 —— */
/* 春=高饱和清新 / 夏=明亮高对比 / 秋=金黄枫红色相偏移 / 冬=去饱和冷调 */
const seasonFilter=new PIXI.ColorMatrixFilter();
world.filters=[seasonFilter];
// filterArea auto-calculated by PIXI to avoid black blocks
function mkMat({s=1,br=1,rO=0,gO=0,bO=0}){        // 饱和度+亮度+RGB偏移 → 20格矩阵
  const lr=.2126,lg=.7152,lb=.0722,iv=1-s;
  return [(lr*iv+s)*br, lg*iv*br, lb*iv*br, 0, rO,
          lr*iv*br, (lg*iv+s)*br, lb*iv*br, 0, gO,
          lr*iv*br, lg*iv*br, (lb*iv+s)*br, 0, bO,
          0,0,0,1,0];
}
const SEASON_MAT=[                                 // 主季节色由专属贴图承担,滤镜仅做轻微氛围润色
  mkMat({s:1.12, br:1.03, gO:.012}),                       // 春 · 清新
  mkMat({s:1.06, br:1.06, rO:.015}),                       // 夏 · 明亮
  mkMat({s:1.05, br:1.0,  rO:.04, bO:-.035}),              // 秋 · 暖调
  mkMat({s:.80,  br:1.06, rO:-.015, bO:.045}),             // 冬 · 冷调
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
const tileSprites=[], waterTiles=[], snowAt=[], grassTiles=[];
for(let y=0;y<MAP;y++)for(let x=0;x<MAP;x++){
  const k=grid[y][x];
  const t=ASSETS.tiles[{g:'grass',G:'grass',s:'soil',w:'water',b:'sand',p:'plot'}[k]];
  const sp=new PIXI.Sprite(PIXI.Texture.WHITE);
  sp.width=TS+2; sp.height=TS+2; sp.position.set(x*TS-1,y*TS-1);  // 1px 重叠:消除瓦片接缝
  if(t.src) loadTex(t.src,'tile').then(tex=>{sp.texture=tex;sp.width=TS+2;sp.height=TS+2;});
  const r=hash(x*13+7,y*11+3);
  sp._k=k; sp._j=0.975+r*0.05;                 // 每块明度抖动(极轻,避免棋盘格感)
  sp._ph=r*6.28;                               // 水面相位
  if(k==='g'||k==='G') grassTiles.push(sp);    // 草地:随季换图
  if(k==='w'){ waterL.addChild(sp); waterTiles.push(sp); snowAt.push(null); }   // 水→独立层
  else {
    groundL.addChild(sp);
    const sn=new PIXI.Sprite(PIXI.Texture.WHITE);   // 积雪覆盖(冬季由 snowL.alpha 控制)
    sn.width=TS+2; sn.height=TS+2; sn.position.set(x*TS-1,y*TS-1);
    sn.tint=0xf4f7fb; sn.alpha=.82+r*.18; snowL.addChild(sn); snowAt.push(sn);
  }
  tileSprites.push(sp);
}
snowL.visible=false; snowL.alpha=0;

/* ================= 5.5 水面优化（轻量级边缘柔化）================= */
// 在水陆边界添加半透明泡沫层,用最轻量的方式平滑过渡(无重度滤镜)
const isWater=(x,y)=>grid[y]&&grid[y][x]==='w';
for(let y=0;y<MAP;y++)for(let x=0;x<MAP;x++){
  if(!isWater(x,y)) continue;
  // 检测4邻方向是否有陆地,有则在边缘叠加柔光泡沫
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  for(const [dx,dy] of dirs){
    if(isWater(x+dx,y+dy)) continue;
    const foam=new PIXI.Sprite(TEX_GLOW); foam.anchor.set(.5);
    foam.width=TS*1.2; foam.height=TS*1.2;
    foam.x=x*TS+TS/2+dx*TS*0.35; foam.y=y*TS+TS/2+dy*TS*0.35;
    foam._ph=hash(x*19+dx*7,y*23+dy*5)*6.28;
    foam.tint=0xeefaff; foam.alpha=.28; foam.blendMode='add';
    foamL.addChild(foam);
  }
}

// 位移波纹滤镜(给水面微扰动效,仅 quality>0 时启用)
// v9.14: 尝试升级为高级水面 shader
let waterDisp=null, waterDispFilter=null, waterShaderSystem=null;
(function(){
  // headless 环境直接跳过水面滤镜，避免 GPU ReadPixels 压力
  if(navigator.webdriver || navigator.userAgent.includes('HeadlessChrome')) {
    console.log('[Terra] Headless 环境检测，禁用水面滤镜');
    return;
  }

  // 优先使用高级 shader 系统
  if (typeof WaterShaderSystem !== 'undefined' && WaterShaderSystem.createAdvancedWaterSystem) {
    try {
      waterShaderSystem = WaterShaderSystem.createAdvancedWaterSystem(waterL, {
        waveStrength: 0.012,
        fresnelPower: 2.8,
        waterColorShallow: [0.55, 0.82, 0.88],
        waterColorDeep: [0.18, 0.50, 0.68],
        causticStrength: 0.0  // 焦散默认关闭(性能)
      });
      console.log('[Terra] Advanced water shader initialized');
      try{ const f=new PIXI.BlurFilter({strength:2.2,quality:2}); f.padding=6;
        waterL.filters=[...(waterL.filters||[]),f]; }catch(e){}
      return;
    } catch (e) {
      console.warn('[Terra] Failed to init advanced water shader:', e);
    }
  }

  // 降级: 旧版位移滤镜
  const c=document.createElement('canvas'); c.width=c.height=128;
  const g=c.getContext('2d');
  for(let i=0;i<60;i++){ const gx=Math.random()*128,gy=Math.random()*128,rr=8+Math.random()*22;
    const gr=g.createRadialGradient(gx,gy,0,gx,gy,rr);
    const v=120+((Math.random()*70)|0);
    gr.addColorStop(0,`rgb(${v},${v},255)`); gr.addColorStop(1,'rgb(128,128,255)');
    g.fillStyle=gr; g.fillRect(gx-rr,gy-rr,rr*2,rr*2); }
  waterDisp=new PIXI.Sprite(PIXI.Texture.from(c));
  waterDisp.texture.source.addressMode='repeat';
  waterDisp.scale.set(3); waterDisp.renderable=false; waterL.addChild(waterDisp);
  // DisplacementFilter 默认不启用,由 setQuality() 按需开启
})();

/* —— 季节专属贴图切换(取代代码强行调色,参照冬季成功经验) —— */
let seasonIdx=1, snowTarget=0;
function preloadSeasons(){
  const set=new Set();
  for(const k in ASSETS){ const a=ASSETS[k]; if(a&&a.season) a.season.forEach(s=>set.add(s)); }
  if(ASSETS.tiles.grass.season) ASSETS.tiles.grass.season.forEach(s=>set.add(s));
  set.forEach(s=>loadTex(s));
}
preloadSeasons();
let grassSwap=null;
function swapSeason(idx){
  for(const o of OBJECTS){ const n=o.node, a=ASSETS[o.kind];
    if(n._alt && a.season){
      loadTex(a.season[idx]).then(tex=>{ n._alt.texture=tex; n._alt.width=a.w; n._alt.height=a.h; });
      n._fadeT=0;
    }
  }
  if(ASSETS.tiles.grass.season)
    loadTex(ASSETS.tiles.grass.season[idx]).then(tex=>{ grassSwap={t:0,tex,done:false}; });
  snowTarget = idx===3 ? 0.9 : 0;
}

/* —— 视口剔除: 只渲染镜头附近的瓦片/物件(性能核心) —— */
function cullWorld(){
  // Previous broad culling pass was disabled for render stability. Keep this as a no-op so the ticker
  // does not re-touch every tile/object every 120ms.
}

/* ================= 6. 精灵节点工厂(占位符 ⇄ 贴图) ================= */
function makeNode(kind){
  const a=ASSETS[kind];
  const node=new PIXI.Container();
  const sh=new PIXI.Sprite(TEX_SHADOW); sh.anchor.set(.5);
  sh.width=a.w*1.15; sh.height=a.w*.42; sh.y=-2; node.addChild(sh); node._shadow=sh;

  // Animated beasts: fire, water, and 4 elite shrine beasts
  const walkSheetMap = {
    'beast_water': 'beast_water_walk_sheet',
    'beast_fire': 'beast_fire_walk_sheet',
    'beast_shrine_fox_spirit': 'beast_shrine_fox_spirit_walk_sheet',
    'beast_sacred_fawnling': 'beast_sacred_fawnling_walk_sheet',
    'beast_white_serpent_shrine': 'beast_white_serpent_shrine_walk_sheet',
    'beast_deepsea_noble': 'beast_deepsea_noble_walk_sheet'
  };

  if(walkSheetMap[kind]){
    const sheetKind = walkSheetMap[kind];
    const anim=new PIXI.Container();
    anim.anchor={x:.5,y:(a.anchorY??1)};
    const fr=[];
    for(let i=0;i<4;i++){
      const sp=new PIXI.Sprite(); sp.anchor.set(.5, a.anchorY??1); sp.visible=i===0;
      fr.push(sp); anim.addChild(sp);
    }
    loadTex(`assets/sprites/${sheetKind}.png?v=2`).then(tex=>{
      const source=tex.source;
      const cols=4;
      const fw=Math.floor(source.width/cols);
      const fh=source.height;
      fr.forEach((sp,i)=>{
        const frame=new PIXI.Rectangle(i*fw,0,fw,fh);
        // 每帧独立 Texture:Texture.from(source) 有缓存,4 帧会共用同一纹理导致灵兽不动
        sp.texture=new PIXI.Texture({source, frame});
        sp.width=a.w; sp.height=a.h;
      });
      let idx=0, acc=0;
      anim._tick=(dt)=>{
        acc+=dt;
        if(acc>=0.1){
          acc=0; fr[idx].visible=false; idx=(idx+1)%fr.length; fr[idx].visible=true;
        }
      };
    }).catch(()=>{
      // Fallback to static sprite if walk sheet not found yet
      loadTex(a.src).then(tex=>{
        fr[0].texture=tex; fr[0].width=a.w; fr[0].height=a.h;
      });
    });
    anim._baseScaleX=1; anim._baseScaleY=1;
    node._bw=1; node._bh=1;
    node.addChild(anim); node._body=anim; node._graded=true; node._kind=kind;
    return node;
  }
  if(a.src){
    const sp=new PIXI.Sprite(); sp.anchor.set(.5, a.anchorY??1);
    loadTex(a.src).then(tex=>{sp.texture=tex; sp.width=a.w; sp.height=a.h;});
    node.addChild(sp); node._body=sp; node._graded=true; node._kind=kind;
    if(a.season){
      const alt=new PIXI.Sprite(); alt.anchor.set(.5, a.anchorY??1); alt.alpha=0;
      node.addChild(alt); node._alt=alt; node._seasonIdx=1; node._fadeT=1;
    }
    if(a.bladesSrc){
      const bl=new PIXI.Sprite(); bl.anchor.set(.5);
      loadTex(a.bladesSrc).then(tex=>{bl.texture=tex; bl.width=a.bladesW; bl.height=a.bladesW;});
      bl.y=a.h*(a.hubY||-0.6); node.addChild(bl); node._blades=bl;
    }
    if(kind==='house'){
      const lamp=new PIXI.Sprite(TEX_GLOW); lamp.anchor.set(.5);
      lamp.width=lamp.height=a.w*.6; lamp.y=-a.h*.36; lamp.tint=0xffc878;
      lamp.blendMode='add'; lamp.alpha=0; node.addChild(lamp); node._lamp=lamp;
    }
    return node;
  }
  // All sprite assets now loaded from src, Graphics placeholders removed
  // Fallback for crop which uses dynamic rendering
  if(kind==='crop'){
    const cv=new PIXI.Graphics(); node.addChild(cv); node._canopy=cv; node._isCrop=true;
  }
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

  // 为核心交互点添加呼吸光环（强化版：更大、更亮、带色彩编码）
  if(o.glow && (o.kind==='portal'||o.kind==='incubator'||o.kind==='furnace')){
    const glow=new PIXI.Sprite(TEX_GLOW); glow.anchor.set(.5);
    glow.width=a.w*2.2; glow.height=a.w*2.2; glow.y=-a.h*0.5;          // 扩大到2.2倍
    glow.tint=o.kind==='portal'?0xb68cff:o.kind==='incubator'?0x9fdc7b:0xffb24a;
    glow.blendMode='add'; glow.alpha=0; n.addChild(glow); n._glow=glow;
  }
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
    // 序列帧行走动画:walk_sheet 按宽度切 4 帧;加载失败回退静态图
    const sp=new PIXI.AnimatedSprite([PIXI.Texture.WHITE]); sp.anchor.set(.5,1);
    sp.animationSpeed=0.15; sp.loop=true;
    loadTex('assets/sprites/player_walk_sheet.png').then(tex=>{
      const src=tex.source||tex.baseTexture, fw=Math.floor(tex.width/4), frames=[];
      for(let i=0;i<4;i++) frames.push(new PIXI.Texture({source:src, frame:new PIXI.Rectangle(i*fw,0,fw,tex.height)}));
      sp.textures=frames; sp.gotoAndStop(0); sp.width=a.w; sp.height=a.h;
    }).catch(()=>loadTex(a.src).then(tex=>{sp.textures=[tex]; sp.gotoAndStop(0); sp.width=a.w; sp.height=a.h;}));
    rig.addChild(sp); node._anim=sp;
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

/* WASD input */
const keys={};
const movementKeys=new Set(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright']);
addEventListener('keydown',e=>{
  if(window.Battle&&Battle.active) return;          // 战斗中禁用世界输入
  const key=e.key.toLowerCase();
  keys[key]=true;
  if(movementKeys.has(key)) e.preventDefault();
  if(e.code==='Space'){ e.preventDefault(); if(entered) interact(); }
  if(e.key==='f'||e.key==='F') timeScale=timeScale===1?10:1;
  const k=parseInt(e.key); if(k>=1&&k<=4) elapsed=((k-1)*SEASON_DAYS+3.5)*DAY_SECONDS;
});
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});
addEventListener('blur',()=>{
  Object.keys(keys).forEach(k=>{keys[k]=false;});
});

const SPEED=235;
const movementEnhancer = typeof MovementFeelEnhancer !== 'undefined' ? new MovementFeelEnhancer() : null;
const dustParticles = [];

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
function animateWalk(dt,moving,speed){
  walkPh+=dt*(moving?11:4);
  const squash=moving?Math.sin(walkPh)*.045:Math.sin(walkPh)*.012;
  const PS=1.25, fd=ASSETS.player.faceDir||1;    // fd: 原画朝向(-1=朝左)

  // 应用游戏手感增强的 squash & stretch
  const enhance = movementEnhancer ? movementEnhancer.getSquashStretch(speed || 0, SPEED) : {scaleX: 1, scaleY: 1, offsetY: 0};
  const finalScaleX = facing*fd*PS*(1-squash*.6) * enhance.scaleX;
  const finalScaleY = PS*(1+squash) * enhance.scaleY;

  player._rig.scale.set(finalScaleX, finalScaleY);
  player._rig.y = (moving? -Math.abs(Math.sin(walkPh))*3.2 : 0) + enhance.offsetY;

  const anim=player._anim;
  if(anim&&anim.textures&&anim.textures.length>1){
    if(moving){ if(!anim.playing) anim.play(); }
    else if(anim.playing||anim.currentFrame!==0){ anim.gotoAndStop(0); }
  }
}
function keyboardInputX(){ return (keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0); }
function keyboardInputY(){ return (keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0); }
function currentMoveInput(){
  return { x: keyboardInputX(), y: keyboardInputY() };
}
function manualMove(dt){                          // keyboard direct movement
  const input=currentMoveInput();
  let inputX=input.x;
  let inputY=input.y;

  // 使用游戏手感增强器计算移动
  const movement = movementEnhancer ? movementEnhancer.updateMovement(inputX, inputY, dt) : {dx: inputX*SPEED*dt, dy: inputY*SPEED*dt, speed: Math.hypot(inputX, inputY)*SPEED, moving: inputX!==0 || inputY!==0};

  // 应用碰撞检测
  const nx = player.x + movement.dx;
  const ny = player.y + movement.dy;
  if(movement.dx && !collides(nx, player.y)) player.x = nx;
  if(movement.dy && !collides(player.x, ny)) player.y = ny;

  player.zIndex = player.y;

  // 更新朝向
  if(Math.abs(movement.dx) > 0.1) facing = movement.dx > 0 ? 1 : -1;

  // 生成尘埃粒子
  if(movement.moving && movementEnhancer) {
    const newDust = movementEnhancer.spawnDustParticles(player.x, player.y + 4, movement.speed, dt);
    dustParticles.push(...newDust);
  }

  // 教程检测
  if((movement.moving || Math.abs(movement.dx) > 0.1 || Math.abs(movement.dy) > 0.1) && !tutorialState._moved) {
    tutorialState._moved = true;
  }

  animateWalk(dt, movement.moving, movement.speed);
}
function followPath(dt){                           // 沿 A* 路径自动行走（加速/减速增强版）
  const wp=player._path[0];
  let targetDx=wp.wx-player.x, targetDy=wp.wy-player.y;
  const d=Math.hypot(targetDx,targetDy);
  if(d<5){ player._path.shift();
    if(!player._path.length){ player._path=null; onArrive(); animateWalk(dt,false,0); if(movementEnhancer) movementEnhancer.reset(); }
    return; }

  // 归一化目标方向
  const inputX = targetDx / d;
  const inputY = targetDy / d;

  // 使用游戏手感增强器
  const movement = movementEnhancer ? movementEnhancer.updateMovement(inputX, inputY, dt) : {dx: inputX*SPEED*dt, dy: inputY*SPEED*dt, speed: SPEED, moving: true};

  const px=player.x, py=player.y;
  const nx=px+movement.dx, ny=py+movement.dy;
  if(!collides(nx,py)) player.x=nx;               // 轴分离:贴着障碍滑行,不整段放弃
  if(!collides(player.x,ny)) player.y=ny;

  if(Math.hypot(player.x-px,player.y-py) < SPEED*dt*0.3){   // 几乎没动 → 累计卡顿
    player._stuck=(player._stuck||0)+dt;
    if(player._stuck>0.5){ player._path=null; pendingAction=null; player._stuck=0; if(movementEnhancer) movementEnhancer.reset(); }
  } else player._stuck=0;

  player.zIndex=player.y;
  if(!tutorialState._moved && (Math.abs(player.x-px) > 0.1 || Math.abs(player.y-py) > 0.1)) tutorialState._moved = true;
  if(Math.abs(movement.dx)>.05) facing=movement.dx>0?1:-1;

  // 生成尘埃粒子
  if(movement.moving && movementEnhancer) {
    const newDust = movementEnhancer.spawnDustParticles(player.x, player.y + 4, movement.speed, dt);
    dustParticles.push(...newDust);
  }

  animateWalk(dt, movement.moving, movement.speed);
}
function movePlayer(dt){
  const hasDirectInput=keyboardInputX()||keyboardInputY();
  if(hasDirectInput){ if(player._path){player._path=null;pendingAction=null;if(movementEnhancer) movementEnhancer.reset();} manualMove(dt); return; }
  if(player._path){ followPath(dt); return; }

  // 待机状态：应用摩擦力让速度自然衰减到0
  const movement = movementEnhancer ? movementEnhancer.updateMovement(0, 0, dt) : {dx: 0, dy: 0, speed: 0, moving: false};
  if(movement.speed > 0.1) {
    const nx = player.x + movement.dx;
    const ny = player.y + movement.dy;
    if(!collides(nx, player.y)) player.x = nx;
    if(!collides(player.x, ny)) player.y = ny;
    player.zIndex = player.y;
  }

  animateWalk(dt, movement.moving, movement.speed);
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
function spawnWorldRipple(wx, wy, tint=0xf4d03f, label=''){
  // 增强点击波纹效果
  if(window.AnimationManager){
    // 使用 AnimationManager 的增强波纹
    const canvas = app.view;
    const rect = canvas.getBoundingClientRect();

    // 将世界坐标转换为屏幕坐标
    const screenX = rect.left + (wx - cam.x + cam.sw/2);
    const screenY = rect.top + (wy - cam.y + cam.sh/2);

    AnimationManager.ripple(screenX, screenY, { maxSize: 140, duration: 700 });
  }

  // 保留原有 PixiJS 波纹
  const ring=new PIXI.Graphics(); ring.x=wx; ring.y=wy; overlayL.addChild(ring);
  const t0=performance.now(), dur=560;
  (function step(){
    const p=Math.min(1,(performance.now()-t0)/dur), eased=1-Math.pow(1-p,3);
    ring.clear(); ring.alpha=1-p;
    ring.lineStyle(2.2, tint, .9*(1-p)); ring.drawEllipse(0,0,18+eased*34,8+eased*18);
    ring.lineStyle(1, 0xffffff, .45*(1-p)); ring.drawEllipse(0,0,8+eased*20,3+eased*9);
    if(p<1) requestAnimationFrame(step); else { if(ring.parent) ring.parent.removeChild(ring); ring.destroy(); }
  })();
  if(label) toastHint(label);
}
/* 点击/触摸 → 路由: 树→走到旁边砍伐; 耕地→走过去种/收; 空地→走过去 */
function commandTo(wx,wy){
  spawnWorldRipple(wx,wy,0xf4d03f);
  const tx=Math.floor(wx/TS), ty=Math.floor(wy/TS);
  const sx=Math.floor(player.x/TS), sy=Math.floor(player.y/TS);
  const o=objectAtTile(tx,ty);
  if(o && (o.kind==='tree'||o.kind==='cherry')){          // → 砍伐
    rebuildSolidTiles(); const nw=nearestWalkable(tx,ty);
    if(!nw) return; const path=tilePath(sx,sy,nw.x,nw.y);
    if(path){ player._path=path; pendingAction={type:'chop',obj:o}; toastHint('前往伐木…'); }
    return;
  }
  if(o && o.kind==='portal'){                             // → 进入深渊副本
    rebuildSolidTiles(); const nw=nearestWalkable(tx,ty);
    if(!nw) return; const path=tilePath(sx,sy,nw.x,nw.y);
    if(path){ player._path=path; pendingAction={type:'portal'}; toastHint('前往深渊之门…'); }
    return;
  }
  if(o && o.kind==='incubator'){                          // → 灵兽孵化阵
    rebuildSolidTiles(); const nw=nearestWalkable(tx,ty);
    if(!nw) return; const path=tilePath(sx,sy,nw.x,nw.y);
    if(path){ player._path=path; pendingAction={type:'breed'}; toastHint('前往孵化阵…'); }
    return;
  }
  if(o && o.kind==='furnace'){                            // → 农场升级面板
    rebuildSolidTiles(); const nw=nearestWalkable(tx,ty);
    if(!nw) return; const path=tilePath(sx,sy,nw.x,nw.y);
    if(path){ player._path=path; pendingAction={type:'upgrade'}; toastHint('前往工坊升级…'); }
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
  const arriveLabel={farm:'抵达耕地',chop:'开始伐木',portal:'深渊之门',breed:'孵化阵',upgrade:'工坊'}[a.type];
  spawnWorldRipple(player.x,player.y,a.type==='portal'?0xb68cff:a.type==='farm'?0x9fdc7b:0xf4d03f,arriveLabel);
  if(a.type==='farm') interactFarm(a.key);
  else if(a.type==='chop'){ chopLoop.obj=a.obj; chopLoop.t=0; }
  else if(a.type==='portal'){
    // 传送门直接进入战斗（暂时禁用 DungeonMap 选择界面）
    tutorialState._portalVisited = true;
    enterBattle();
  }
  else if(a.type==='breed') openBreed();
  else if(a.type==='upgrade'){ if(window.FarmUpgrade) FarmUpgrade.open(); }
}
function nearestPortal(){
  for(const o of OBJECTS){ if(o.kind!=='portal') continue;
    if(Math.hypot(o.node.x-player.x,o.node.y-player.y)<110) return o; }
  return null;
}
function enterBattle(){
  if(!window.Battle || Battle.active) return;

  // 使用 AnimationManager 的 zoom 转场替代黑屏硬切
  if(window.AnimationManager){
    // 相机 zoom + 转场效果
    AnimationManager.transition.zoom(async () => {
      // 场景切换回调
      Battle.enter({
        deck: farm.inventory.cards,
        onWin(loot){
          for(const k in loot) farm.inventory.materials[k]=(farm.inventory.materials[k]||0)+loot[k];
          const label=Object.entries(loot||{}).map(([k,v])=>`${k}×${v}`).join(' · ')||'无';
          Terra.save(); updateDock(); toastHint(`凯旋 · 带回 ${label}`);
        },
        onLose(){ toastHint('败退 · 已退回农场'); },
      });
    }, { duration: 900, zoomIn: true });
  } else {
    // Fallback 保留原有逻辑
    let fl=document.getElementById('battleFlash');
    if(!fl){ fl=document.createElement('div'); fl.id='battleFlash';
      fl.style.cssText='position:fixed;inset:0;z-index:79;background:#160f24;opacity:0;pointer-events:none;transition:opacity .45s'; document.body.appendChild(fl); }
    fl.style.opacity='1';
    setTimeout(()=>{
      Battle.enter({
        deck: farm.inventory.cards,
        onWin(loot){
          for(const k in loot) farm.inventory.materials[k]=(farm.inventory.materials[k]||0)+loot[k];
          const label=Object.entries(loot||{}).map(([k,v])=>`${k}×${v}`).join(' · ')||'无';
          Terra.save(); updateDock(); toastHint(`凯旋 · 带回 ${label}`); fl.style.opacity='0'; },
        onLose(){ toastHint('败退 · 已退回农场'); fl.style.opacity='0'; },
      });
      setTimeout(()=>{ fl.style.opacity='0'; }, 200);
    }, 460);
  }
}

/* ================= 8.6 水灵兽 AI(状态机:闲逛→前往→浇水) ================= */
const beast=makeNode('beast_water');
beast.x=29*TS+TS/2; beast.y=30*TS+TS/2; beast.zIndex=beast.y;
objL.addChild(beast);
const beastAI={ state:'idle', t:1.5, path:null, target:null, home:{x:beast.x,y:beast.y}, bob:0, trailClock:0 };
const trails=[];                                         // 移动残影拖尾粒子
function spawnTrail(x,y,tint){
  const t=new PIXI.Graphics(); t.circle(0,0,5+Math.random()*3).fill({color:tint,alpha:.6});
  t.x=x+(Math.random()*12-6); t.y=y+(Math.random()*12-6); t._life=0;
  overlayL.addChild(t); trails.push(t);
}
function stepTrails(dt){
  for(let i=trails.length-1;i>=0;i--){const t=trails[i]; t._life+=dt; t.alpha=Math.max(0,.6-t._life*1.8);
    if(t._life>.35){overlayL.removeChild(t);trails.splice(i,1);}}
}
function beastGoto(tx,ty){
  const sx=Math.floor(beast.x/TS), sy=Math.floor(beast.y/TS);
  const path=tilePath(sx,sy,tx,ty);
  if(!path) return false; beastAI.path=path; return true;
}
function beastStep(dt){
  const moving = !!(beastAI.path && beastAI.path.length);
  beast._body?._tick?.(dt);
  if(beast._body){
    const bw=beast._body._baseScaleX||beast._bw||1, bh=beast._body._baseScaleY||beast._bh||1;
    if(beastAI.state==='water'){                  // 浇水:等比脉冲+上浮,不拉伸脸/身体
      beastAI.bob+=dt*10; const pulse=Math.abs(Math.sin(beastAI.bob));
      const s=1+pulse*0.045;
      beast._body.y=-pulse*7;
      beast._body.rotation=Math.sin(beastAI.bob*.5)*0.025;
      beast._body.scale.set(bw*s, bh*s);
    } else if(moving){                            // 移动:弹跳+轻微等比放大,不做 squash/stretch
      beastAI.hop=(beastAI.hop||0)+dt*9; const h=Math.abs(Math.sin(beastAI.hop));
      const s=1+h*0.025;
      beast._body.y=-h*10;
      beast._body.rotation=Math.sin(beastAI.hop*.5)*0.018;
      beast._body.scale.set(bw*s, bh*s);
    } else {                                      // 待机:等比呼吸
      beastAI.bob+=dt*2.6; const br=Math.sin(beastAI.bob)*0.018;
      beast._body.y=Math.sin(beastAI.bob)*2.4;
      beast._body.rotation=Math.sin(beastAI.bob*.42)*0.012;
      beast._body.scale.set(bw*(1+br), bh*(1+br));
    }
  }
  beast._shadow.alpha=.22+ (moving? Math.abs(Math.sin(beastAI.hop||0))*0.12 : 0);
  // 沿路径移动 + 拖尾粒子
  if(beastAI.path && beastAI.path.length){
    const wp=beastAI.path[0]; let dx=wp.wx-beast.x, dy=wp.wy-beast.y; const d=Math.hypot(dx,dy);
    if(d<5){ beastAI.path.shift(); }
    else {
      dx/=d;dy/=d; const sp=145; beast.x+=dx*sp*dt; beast.y+=dy*sp*dt; beast.zIndex=beast.y;
      beastAI.trailClock+=dt;                        // 每 0.08s 留一个蓝色残影
      if(beastAI.trailClock>=0.08){ beastAI.trailClock=0; spawnTrail(beast.x,beast.y,0x6ac8e0); }
    }
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
    if(pc && !pc.watered){
      const habitat=farm.upgrades?.includes('beast_capacity');
      const waterLevel=waterPower();
      beastAI.state='water'; beastAI.t=Math.max(0.55, (habitat ? 1.05 : 2.0) - (waterLevel-1)*0.22); setBeastStatus('water');
    }
    else { beastAI.state='idle'; beastAI.t=.3; }
  } else if(beastAI.state==='water'){
    if((beastAI.t*4|0)!==((beastAI.t+dt)*4|0)) spawnSplash(beastAI.target);  // 周期水花爆发
    if(beastAI.t<=0){
      const pc=planted[beastAI.target];
      if(pc){ pc.watered=true; pc.boost=true; toastHint(`水系灵兽群 Lv.${waterPower().toFixed(1)} 灌溉 · 生长加速${farm.upgrades?.includes('beast_capacity')?' · 栖地加成':''}`); }
      beastAI.state='idle'; beastAI.t=.5; setBeastStatus('idle');
    }
  }
}
function findDryPlot(){
  for(const key in planted){ const pc=planted[key]; if(!pc.mature&&!pc.watered) return key; }
  return null;
}
const waterDrops=[];
function spawnSplash(key){                          // 在耕地处喷涌一束蓝色水花(上抛+重力下落)
  let cx=beast.x, cy=beast.y-16;
  if(key && tileMeta[key]){ const [tx,ty]=key.split(',').map(Number); cx=tx*TS+TS/2; cy=ty*TS+TS/2; }
  const n=4+(Math.random()*3|0);
  for(let i=0;i<n;i++){
    const g=new PIXI.Graphics(); g.circle(0,0,2+Math.random()*2.4).fill({color:0x9fdcf0,alpha:.95});
    g.x=cx+(Math.random()*18-9); g.y=cy;
    g._vx=(Math.random()*60-30); g._vy=-70-Math.random()*55; g._life=0;
    overlayL.addChild(g); waterDrops.push(g);
  }
}
function stepWaterDrops(dt){
  for(let i=waterDrops.length-1;i>=0;i--){const g=waterDrops[i];
    g._life+=dt; g._vy+=260*dt;                    // 重力
    g.x+=g._vx*dt; g.y+=g._vy*dt; g.alpha=Math.max(0,1-g._life*1.2);
    if(g._life>.8){overlayL.removeChild(g);waterDrops.splice(i,1);}}
}

/* ================= 8.7 灵兽繁育 + 火灵兽(工坊熔炉增益) ================= */
let fireBeast=null, fireAI=null, forgeHot=false;
const embers=[];
function furnacePos(){ const o=OBJECTS.find(o=>o.kind==='furnace'); return o?{x:o.node.x,y:o.node.y}:{x:25*TS,y:22*TS}; }
function spawnEmber(x,y){
  const g=new PIXI.Graphics(); g.circle(0,0,2+Math.random()*2).fill({color:Math.random()<.5?0xffb24a:0xff7a2a,alpha:.95});
  g.x=x+(Math.random()*16-8); g.y=y; g._vy=-30-Math.random()*30; g._vx=(Math.random()*20-10); g._life=0;
  overlayL.addChild(g); embers.push(g);
}
function stepEmbers(dt){
  for(let i=embers.length-1;i>=0;i--){const g=embers[i]; g._life+=dt; g.x+=g._vx*dt; g.y+=g._vy*dt;
    g.alpha=Math.max(0,.95-g._life*1.1); if(g._life>.9){overlayL.removeChild(g);embers.splice(i,1);}}
}
function hatchFire(){
  if(fireBeast) return;
  fireBeast=makeNode('beast_fire');
  const fp=furnacePos(); fireBeast.x=fp.x+TS; fireBeast.y=fp.y+TS*1.2; fireBeast.zIndex=fireBeast.y;
  objL.addChild(fireBeast);
  fireAI={state:'idle',t:1.2,path:null,bob:0,hop:0};
  if(!fireSpirit()) farm.beasts.push({id:'fire_spirit_ember',species:'fire_spirit',element:'fire',level:1,xp:0,stamina:100,evolution:{diet:{},laborHistory:{}},assignment:'forge'});
  Terra.save();
}
function fireGoto(tx,ty){ const sx=Math.floor(fireBeast.x/TS),sy=Math.floor(fireBeast.y/TS);
  const p=tilePath(sx,sy,tx,ty); if(!p) return false; fireAI.path=p; return true; }
function fireStep(dt){
  if(!fireBeast) return;
  const moving=!!(fireAI.path&&fireAI.path.length);
  fireBeast._body?._tick?.(dt);
  if(fireBeast._body){
    const bw=fireBeast._body._baseScaleX||fireBeast._bw||1, bh=fireBeast._body._baseScaleY||fireBeast._bh||1;
    if(moving){ fireAI.hop+=dt*9; const h=Math.abs(Math.sin(fireAI.hop)); const s=1+h*0.025; fireBeast._body.y=-h*8; fireBeast._body.rotation=Math.sin(fireAI.hop*.55)*0.022; fireBeast._body.scale.set(bw*s,bh*s); }
    else { fireAI.bob+=dt*3; const br=Math.sin(fireAI.bob)*0.016; fireBeast._body.y=Math.sin(fireAI.bob)*2; fireBeast._body.rotation=Math.sin(fireAI.bob*.5)*0.014; fireBeast._body.scale.set(bw*(1+br),bh*(1+br)); }
  }
  fireBeast._shadow.alpha=.2;
  if(moving){ const wp=fireAI.path[0]; let dx=wp.wx-fireBeast.x,dy=wp.wy-fireBeast.y; const d=Math.hypot(dx,dy);
    if(d<5) fireAI.path.shift();
    else {
      dx/=d;dy/=d; fireBeast.x+=dx*150*dt; fireBeast.y+=dy*150*dt; fireBeast.zIndex=fireBeast.y;
      fireAI.trailClock=(fireAI.trailClock||0)+dt;   // 每 0.07s 留橙色残影
      if(fireAI.trailClock>=0.07){ fireAI.trailClock=0; spawnTrail(fireBeast.x,fireBeast.y,0xff9a4a); }
    }
    if(fireAI.path&&!fireAI.path.length) fireAI.path=null; forgeHot=false; return; }
  fireAI.t-=dt;
  const fp=furnacePos();
  if(fireAI.state==='idle'){ forgeHot=false;
    if(fireAI.t<=0){ const tx=Math.floor(fp.x/TS), ty=Math.floor(fp.y/TS)+1;
      rebuildSolidTiles(); const nw=nearestWalkable(tx,ty);
      if(nw && fireGoto(nw.x,nw.y)) fireAI.state='seekForge'; else fireAI.t=2; }
  } else if(fireAI.state==='seekForge'){           // 到达熔炉
    const fireLevel=beastLevel('fire_spirit');
    fireAI.state='work'; fireAI.t=6+fireLevel*1.5; forgeHot=true; toastHint(`火灵兽 Lv.${fireLevel} 点燃熔炉 · 锻造品质提升`); updateDock();
  } else if(fireAI.state==='work'){
    forgeHot=true;
    if(Math.random()<0.5) spawnEmber(fireBeast.x, fireBeast.y-12);
    if(fireAI.t<=0){ fireAI.state='idle'; fireAI.t=3+Math.random()*3; forgeHot=false; updateDock(); }
  }
}
/* 繁育面板(运行时注入) */
let breedEl=null;
function buildBreedPanel(){
  if(breedEl) return; breedEl=document.createElement('div'); breedEl.id='breedPanel';
  breedEl.style.cssText='position:fixed;left:50%;top:50%;transform:translate(-50%,-50%) scale(.88);z-index:45;'+
    'width:min(500px,90vw);'+
    'background:linear-gradient(135deg, #f4ecd8 0%, #e8dcbf 100%);'+
    'border:3px double #8b7355;border-radius:8px;padding:40px 42px;'+
    'box-shadow:0 36px 90px rgba(0,0,0,.6),inset 0 0 60px rgba(139,115,85,.1);opacity:0;pointer-events:none;'+
    'transition:opacity .4s,transform .4s cubic-bezier(.34,1.56,.64,1);font-family:"Cormorant Garamond",serif;color:#2a2520;position:relative;';
  breedEl.innerHTML=`
    <div style="position:absolute;inset:8px;border:1px solid rgba(212,175,55,.5);border-radius:4px;pointer-events:none"></div>
    <div style="position:absolute;top:12px;left:12px;width:36px;height:36px;border-left:2px solid #d4af37;border-top:2px solid #d4af37;pointer-events:none"></div>
    <div style="position:absolute;bottom:12px;right:12px;width:36px;height:36px;border-right:2px solid #d4af37;border-bottom:2px solid #d4af37;pointer-events:none"></div>
    <div style="font-size:12px;letter-spacing:.7em;color:#8b7355;text-transform:uppercase;font-style:italic;margin-bottom:12px">Incubation · 孵化阵</div>
    <h3 style="font-weight:400;font-size:34px;letter-spacing:.18em;margin:10px 0 8px;color:#d4af37;text-shadow:0 2px 8px rgba(0,0,0,.2)">灵兽培育</h3>
    <div id="breedLoot" style="font-size:14px;letter-spacing:.12em;opacity:.75;margin-bottom:28px;font-family:'Noto Serif SC',serif"></div>
    <div id="breedOpts" style="display:flex;flex-direction:column;gap:16px"></div>
    <div id="breedClose" style="position:absolute;top:30px;right:32px;cursor:pointer;font-size:26px;width:38px;height:38px;display:flex;align-items:center;justify-content:center;border-radius:50%;border:2px solid #d4af37;background:rgba(244,236,216,.6);color:#2a2520;opacity:.6;transition:all .3s;box-shadow:0 4px 12px rgba(0,0,0,.2)">×</div>`;
  document.body.appendChild(breedEl);
  const closeBtn=breedEl.querySelector('#breedClose');
  closeBtn.onmouseenter=()=>{closeBtn.style.opacity='1';closeBtn.style.transform='scale(1.15)';closeBtn.style.boxShadow='0 0 16px rgba(212,175,55,.5),0 4px 12px rgba(0,0,0,.3)'};
  closeBtn.onmouseleave=()=>{closeBtn.style.opacity='.6';closeBtn.style.transform='scale(1)';closeBtn.style.boxShadow='0 4px 12px rgba(0,0,0,.2)'};
  closeBtn.onclick=closeBreed;
}
function breedBtn(label,sub,enabled,onClick){
  const b=document.createElement('button');
  b.style.cssText='text-align:left;border:2px solid '+(enabled?'#d4af37':'rgba(139,115,85,.4)')+';'+
    'background:'+(enabled?'linear-gradient(135deg, rgba(244,236,216,.4), rgba(232,220,191,.5))':'rgba(232,220,191,.2)')+';'+
    'border-radius:6px;padding:18px 22px;cursor:'+(enabled?'pointer':'default')+';opacity:'+(enabled?1:.35)+';'+
    'font-family:"Cormorant Garamond",serif;color:#2a2520;transition:all .3s cubic-bezier(.34,1.56,.64,1);'+
    'box-shadow:'+(enabled?'0 4px 12px rgba(0,0,0,.15),inset 0 1px 0 rgba(255,255,255,.3)':'none')+';position:relative';
  b.innerHTML=`<div style="font-size:18px;letter-spacing:.14em;font-weight:500">${label}</div><div style="font-size:12px;opacity:.7;margin-top:7px;letter-spacing:.04em;font-family:'Noto Serif SC',serif">${sub}</div>`;
  if(enabled){
    b.onmouseenter=()=>{b.style.background='linear-gradient(135deg, rgba(212,175,55,.2), rgba(201,162,75,.15))';b.style.transform='translateY(-3px)';b.style.boxShadow='0 0 24px rgba(212,175,55,.4),0 8px 24px rgba(0,0,0,.2)'};
    b.onmouseleave=()=>{b.style.background='linear-gradient(135deg, rgba(244,236,216,.4), rgba(232,220,191,.5))';b.style.transform='translateY(0)';b.style.boxShadow='0 4px 12px rgba(0,0,0,.15),inset 0 1px 0 rgba(255,255,255,.3)'};
    b.onclick=()=>{
      // 添加点击波纹
      if(window.AnimationManager){
        const rect=b.getBoundingClientRect();
        AnimationManager.ripple(rect.left+rect.width/2, rect.top+rect.height/2, {maxSize:100, duration:500});
      }
      onClick();
    };
  }
  return b;
}
function openBreed(){
  buildBreedPanel();
  const soul=farm.inventory.materials.beast_soul||0, seed=farm.inventory.materials.blight_seed||0;
  const water=waterSpirit(), fire=fireSpirit();
  breedEl.querySelector('#breedLoot').textContent=`库存战利品 · 灵兽灵魂 ${soul} · 污染种子 ${seed} · 水灵兽 Lv.${water?.level||1}${fire?` · 火灵兽 Lv.${fire.level}`:''}`;
  const opts=breedEl.querySelector('#breedOpts'); opts.innerHTML='';
  opts.appendChild(breedBtn(
    fire?'火灵兽 · 已孵化':'孵化 火灵兽 🔥',
    fire?`Lv.${fire.level} · 熔炉高温持续更久，刷新后仍会回到工坊`:'消耗 灵兽灵魂×1 + 污染种子×1 · 自动为锻造加热熔炉',
    !fire && soul>=1 && seed>=1,
    ()=>{ farm.inventory.materials.beast_soul--; farm.inventory.materials.blight_seed--;
      hatchFire(); Terra.save(); updateDock(); toastHint('火灵兽破壳而出!'); openBreed(); }));
  opts.appendChild(breedBtn(
    `巡田进化 · 润野型 💧 Lv.${water?.level||1} → Lv.${(water?.level||1)+1}`,
    `消耗 灵兽灵魂×1 · 灌溉施法更快，水系灵兽群降低虫害压力`,
    soul>=1,
    ()=>{ farm.inventory.materials.beast_soul--; const w=waterSpirit(); w.level=Math.min(9,(w.level||1)+1); w.xp=(w.xp||0)+1; w.evolutionBranch='irrigation';
      if(beast._bw){ beast._bw*=1.08; beast._bh*=1.08; }
      Terra.save(); updateDock(); updateBeastRosterUI(); toastHint(`润野型进化 Lv.${w.level} · 巡田效率提升`); openBreed(); }));
  opts.appendChild(breedBtn(
    `灵脉进化 · 汲泉型 ✦ Lv.${water?.level||1} → Lv.${(water?.level||1)+1}`,
    `消耗 灵兽灵魂×1 + 污染种子×1 · 收获品质与灵脉充能更高`,
    soul>=1 && seed>=1,
    ()=>{ farm.inventory.materials.beast_soul--; farm.inventory.materials.blight_seed--; const w=waterSpirit(); w.level=Math.min(9,(w.level||1)+1); w.xp=(w.xp||0)+1; w.evolutionBranch='mana';
      if(beast._bw){ beast._bw*=1.05; beast._bh*=1.12; }
      Terra.save(); updateDock(); updateBeastRosterUI(); toastHint(`汲泉型进化 Lv.${w.level} · 灵脉共鸣增强`); openBreed(); }));
  for(const [species,def] of Object.entries(SELECTED_PET_DEFS)){
    const pet=beastBySpecies(species);
    if(!pet) continue;
    const branch=pet.evolutionBranch || def.branches[0];
    const mat=def.cost||{};
    const needSoul=mat.beast_soul||0, needSeed=mat.blight_seed||0;
    const enabled=soul>=needSoul && seed>=needSeed;
    opts.appendChild(breedBtn(
      `${def.name} · ${pet.evolutionBranch?'进阶':'觉醒'} ${branch} Lv.${pet.level||1} → Lv.${Math.min(9,(pet.level||1)+1)}`,
      `消耗 ${needSoul?`灵兽灵魂×${needSoul}`:''}${needSoul&&needSeed?' + ':''}${needSeed?`污染种子×${needSeed}`:''} · ${def.passive} / ${def.active} · ${def.role}`,
      enabled,
      ()=>{
        farm.inventory.materials.beast_soul-=needSoul;
        farm.inventory.materials.blight_seed-=needSeed;
        pet.level=Math.min(9,(pet.level||1)+1);
        pet.xp=(pet.xp||0)+1;
        pet.evolutionBranch=branch;
        pet.activeSkill=def.active;
        pet.passiveSkill=def.passive;
        Terra.save(); syncCompanionPets(); updatePetCodex(); updateDock(); updateBeastRosterUI(); toastHint(`${def.name} ${branch} Lv.${pet.level} · ${def.passive} 生效`); openBreed();
      }));
  }
  breedEl.style.opacity='1'; breedEl.style.pointerEvents='auto'; breedEl.style.transform='translate(-50%,-50%) scale(1)';
}
function closeBreed(){ if(!breedEl)return; breedEl.style.opacity='0'; breedEl.style.pointerEvents='none'; breedEl.style.transform='translate(-50%,-50%) scale(.88)'; }
function nearestIncubator(){ for(const o of OBJECTS){ if(o.kind!=='incubator')continue;
  if(Math.hypot(o.node.x-player.x,o.node.y-player.y)<110) return o; } return null; }
function nearestFurnace(){ for(const o of OBJECTS){ if(o.kind!=='furnace')continue;
  if(Math.hypot(o.node.x-player.x,o.node.y-player.y)<110) return o; } return null; }

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

/* 季节粒子(屏幕空间) — v9.14: 升级为 sprite-based 高级粒子系统 */
let advancedParticleSystem = null;
if (typeof SeasonalParticleSystem !== 'undefined') {
  advancedParticleSystem = new SeasonalParticleSystem(partC);
  console.log('[Terra] Advanced particle system initialized');
} else {
  // 降级: 旧版简单粒子系统
  console.warn('[Terra] Advanced particles not loaded, using legacy system');
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
    wind=Math.sin(elapsed*.13)*.6+Math.sin(elapsed*.047)*.4;
    const rateBase = s===1?(night?2:0) : s===3?5 : 3.5;
    const rate = quality===2 ? rateBase : rateBase*.55;
    emitAcc+=dt*rate;
    while(emitAcc>=1){
      emitAcc-=1;
      if(parts.length>(quality===2?72:34)) break;
      let p;
      const sc=.45+Math.random()*.65;
      if(s===1&&night){
        p=new PIXI.Sprite(TEX_GLOW); p.width=p.height=8+sc*6; p.blendMode='add'; p.tint=0xffe896;
        p._fire=true; p._vx=0; p._vy=0;
        p.x=Math.random()*vw; p.y=vh*(.3+Math.random()*.5);
      } else {
        p=new PIXI.Sprite(s===0?TEX_PETAL:s===2?TEX_LEAF:TEX_SNOW);
        p.scale.set(sc);
        const depth=.5+sc*.8;
        p._vy=vh*(s===3? .055+sc*.05 : .07+sc*.06)*depth;
        p._vx=vh*(s===2?-.030:s===0?.012:-.008)*depth;
        p._spin=s===3?(Math.random()-.5)*.7:(Math.random()-.5)*3.2;
        p._swayA=(s===3?.006+Math.random()*.008:.010+Math.random()*.016)*vh;
        p._swayF=.7+Math.random()*.9;
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
}

/* ================= 10. 时间系统与主循环 ================= */
// 初始时间设为正午(白天最亮时刻),避免进入游戏后黑屏
let elapsed=DAY_SECONDS*0.5, timeScale=1, entered=false;
let recolorClock=0, cullClock=0, hudClock=0, curWaterBase=[84,150,164], curCrop=0x96be64;

/* —— 自适应画质: FPS 不足时逐级降载(软渲染/低端机自救) + AnimationManager 联动 —— */
let quality=2, fpsN=0, fpsT0=performance.now(), fpsLast=0, seasonFilterOn=true;
const isHeadlessEnv = navigator.webdriver || navigator.userAgent.includes('HeadlessChrome');

function setQuality(q){
  if(q>=quality) return; quality=q;

  // 同步到 AnimationManager
  if(window.AnimationManager){
    const qualityMap = {2: 'high', 1: 'medium', 0: 'low'};
    AnimationManager.setQuality(qualityMap[q] || 'low');
  }

  if(q===1){ app.renderer.resolution=1; cloudShadows.forEach(c=>c.visible=false); }
  if(q===0){ app.renderer.resolution=.75; cloudShadows.forEach(c=>c.visible=false);
    golden.visible=false; vignette.visible=false;
    // 低画质下关闭水面位移滤镜
    if(waterL && waterL.filters) waterL.filters=[];
  }
  if(q>=1 && waterDisp && !waterDispFilter && !isHeadlessEnv){  // headless 环境永不启用位移滤镜
    try{ waterDispFilter=new PIXI.DisplacementFilter({sprite:waterDisp, scale:10});
         waterL.filters=[waterDispFilter]; }catch(e){ console.warn('disp filter unavailable',e); }
  }
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
    const f=fpsN*1000/(fnow-fpsT0); fpsLast=f; fpsN=0; fpsT0=fnow;

    // 自适应画质调整 + AnimationManager 联动
    if(!window.__lockQ){
      if(f<15) setQuality(0);
      else if(f<30) setQuality(1);

      // 移动端检测 - 降低动画复杂度
      if(window.AnimationManager && (f<25 || /Mobi|Android/i.test(navigator.userAgent))){
        AnimationManager.setQuality('low');
      }
    }
  }
  elapsed+=dt*timeScale;
  const st=(elapsed/DAY_SECONDS/SEASON_DAYS)%4;
  const sun=sunlight(), night=1-sun;
  const currentDayPhase = (elapsed % DAY_SECONDS) / DAY_SECONDS;
  const currentDay = Math.floor(elapsed / DAY_SECONDS);

  /* —— 强化昼夜循环更新 —— */
  if (window.updateDayNightCycle && world) {
    window.updateDayNightCycle(currentDayPhase, currentDay, world, dt);
  }

  /* —— 世界调色: 重活 150ms 节流 —— */
  recolorClock-=dt;
  if(recolorClock<=0){ recolorClock=.15;
    applySeasonGrade(st);                                  // 四季微调级(主季节色由专属贴图承担)
    const si=((Math.floor(st)%4)+4)%4;
    if(si!==seasonIdx){
      seasonIdx=si;
      swapSeason(si);
      // 通知高级粒子系统季节切换
      if (advancedParticleSystem) {
        advancedParticleSystem.setSeason(si);
      }
    }
    for(const o of OBJECTS){                                // 非季节物件(石/栅栏/传送门)无需调色
      const n=o.node; if(n._graded && !ASSETS[o.kind].season) n._body.tint=0xffffff;
      n._shadow.alpha=.25+sun*.45;
    }
    for(const key in planted){                                         // 作物视觉(生长累计见每帧块)
      const pc=planted[key];
      const g=Math.min(1,(pc.grown||0)/GROW_SECONDS);
      pc.node._body.tint=pc.mature?(pc.grade==='灵脉'?0xd9a8ff:pc.grade==='珍品'?0xffd56a:0xffe9b0):(pc.watered?0xb8f7d3:0xffffff);                  // 成熟/浇水品质反馈
      if(!pc.mature){
        pc.node.scale.set(.32+g*.72);
        // Growth stage texture switching (0-33%: seedling, 34-66%: growing, 67-100%: mature sprite)
        const stage = g < 0.33 ? 0 : g < 0.67 ? 1 : 2;
        if(pc._stage !== stage){
          pc._stage = stage;
          const a = ASSETS[pc.species==='dewberry'?'crop_dewberry':'crop'];
          if(a.growth && a.growth[stage]){
            loadTex(a.growth[stage]).then(tex=>{
              if(pc.node && pc.node._body) {
                pc.node._body.texture = tex;
                pc.node._body.width = a.w;
                pc.node._body.height = a.h;
              }
            });
          }
        }
      }
    }
  }
  /* —— 每帧轻活: 水面闪烁/季节交叉淡入/风车/夜灯/树摇/呼吸光环 —— */
  snowL.alpha += (snowTarget-snowL.alpha)*Math.min(1,dt*2.2);          // 雪地淡入淡出
  snowL.visible = snowL.alpha>0.02;
  if(grassSwap){ grassSwap.t+=dt/0.7;                                  // 草地 alpha-dip 换图
    const ph=grassSwap.t, a=Math.max(.45, ph<.5? 1-ph*1.1 : .45+(ph-.5)*1.1);
    if(ph>=.5 && !grassSwap.done && grassSwap.tex){ for(const g of grassTiles) g.texture=grassSwap.tex; grassSwap.done=true; }
    for(const g of grassTiles) g.alpha=Math.min(1,a);
    if(ph>=1){ for(const g of grassTiles) g.alpha=1; grassSwap=null; }
  }
  const wph=elapsed*2;
  for(const sp of waterTiles){ if(!sp.visible) continue;        // 流水:沿河道移动的亮带(非逐格随机)
    const flow=Math.sin((sp.position.y*0.03+sp.position.x*0.013)-elapsed*1.5)*0.5+0.5;
    const b=0.94+flow*0.10; sp.tint=hex([108*b,176*b,198*b]);
  }
  for(const f of foamL.children) f.alpha=.16+Math.sin(elapsed*1.6+f._ph)*.11;   // 泡沫脉动
  if(waterDisp){ waterDisp.x=(waterDisp.x+dt*9)%384; waterDisp.y=Math.sin(elapsed*.5)*18; }
  if(waterDispFilter && !isHeadlessEnv){ const on=quality>0;                       // headless 永不启用波纹滤镜
    if((waterL.filters&&waterL.filters.length>0)!==on) waterL.filters=on?[waterDispFilter]:[]; }
  for(const o of OBJECTS){
    const n=o.node;
    if(n._alt && n._fadeT<1){                                          // 树木季节交叉淡入
      n._fadeT=Math.min(1,n._fadeT+dt/0.8);
      n._alt.alpha=n._fadeT; n._body.alpha=1-n._fadeT;
      if(n._fadeT>=1){ const a=ASSETS[o.kind];
        n._body.texture=n._alt.texture; n._body.width=a.w; n._body.height=a.h; n._body.alpha=1; n._alt.alpha=0; }
    }
    if(!n.visible) continue;
    if(n._blades) n._blades.rotation+=dt*1.1;                          // 风车叶片旋转
    if(n._lamp) n._lamp.alpha=night>.5?(night-.5)*1.6:0;
    if(n._graded&&(o.kind==='tree'||o.kind==='cherry')){
      n._body.rotation=Math.sin(elapsed*1.1+n.x*.01)*.008;
      if(n._alt) n._alt.rotation=n._body.rotation;
    }
    // 核心交互点呼吸光环（强化辉光半径与频率）
    if(n._glow){
      const glowPhase=Math.sin(elapsed*1.8)*0.5+0.5;                   // 频率加快
      n._glow.alpha=0.28+glowPhase*0.22;                               // 更亮
      n._glow.scale.set(1+glowPhase*0.18);                             // 更大的脉动幅度
    }
    if(o._shake>0){                                // 伐木受击晃动 + 屏幕震动
      o._shake-=dt*2.4;
      n.scale.set(1+Math.sin(o._shake*26)*.05*Math.max(0,o._shake));

      // 添加屏幕震动反馈
      if(o._shake > 0.8 && window.AnimationManager){
        AnimationManager.shake(world, 3, 100);
      }

      if(o._shake<=0) n.scale.set(1);
    }
  }
  /* 玩家与镜头 */
  if(entered && !(window.Battle&&Battle.active)){ movePlayer(dt); }
  updateCamera(dt);

  // 更新尘埃粒子
  if(dustParticles.length > 0 && movementEnhancer) {
    const alive = movementEnhancer.updateDustParticles(dustParticles, dt);
    dustParticles.length = 0;
    dustParticles.push(...alive);

    // 渲染尘埃粒子到 overlayL
    for(const p of dustParticles) {
      if(!p._sprite) {
        const g = new PIXI.Graphics();
        g.circle(0, 0, p.size).fill({color: 0xd4c4a8, alpha: p.currentAlpha || 0.3});
        g.blendMode = 'add';
        overlayL.addChild(g);
        p._sprite = g;
      }
      p._sprite.x = p.x;
      p._sprite.y = p.y;
      p._sprite.alpha = p.currentAlpha || 0.3;
    }

    // 清理死亡粒子的精灵
    for(let i = overlayL.children.length - 1; i >= 0; i--) {
      const child = overlayL.children[i];
      if(child._isDustParticle && !dustParticles.find(p => p._sprite === child)) {
        overlayL.removeChild(child);
        child.destroy();
      }
    }

    // 标记尘埃粒子精灵
    dustParticles.forEach(p => {
      if(p._sprite) p._sprite._isDustParticle = true;
    });
  }

  /* 作物生长累计(浇水 boost 加速) + 灵兽 AI + 连续伐木 */
  for(const key in planted){ const pc=planted[key];
    if(!pc.mature){
      const prevGrown = pc.grown || 0;
      pc.grown = prevGrown + dt * timeScale * (pc.boost ? 1.8 : 1);

      // 成熟瞬间触发发光动画
      if(prevGrown < GROW_SECONDS && pc.grown >= GROW_SECONDS){
        pc.mature = true;
        if(feedbackSystem){
          feedbackSystem.animateMature(pc.node);
        }
      }
    }
  }
  if(entered){ updateEcology(dt); beastStep(dt); stepWaterDrops(dt); stepTrails(dt); fireStep(dt); stepEmbers(dt); stepCompanionPets(dt);
    // 更新交互反馈系统
    if(feedbackSystem) feedbackSystem.update(dt);
    if(chopLoop.obj){ const o=chopLoop.obj;
      if(o.felled||staminaUsed>=6) chopLoop.obj=null;
      else if(Math.hypot(o.node.x-player.x,o.node.y-player.y)>100) chopLoop.obj=null;
      else { chopLoop.t-=dt; if(chopLoop.t<=0){ chopLoop.t=.5; chop(o); } } }
  }
  seasonFilterOn = false;                      // world 级滤镜会触发 Pixi 离屏裁剪黑块,先关闭以保证全图稳定渲染
  if(world.filters && world.filters.length>0) world.filters=[];
  cullClock-=dt;
  if(cullClock<=0){ cullClock=.12; cullWorld(); updateHint(); }

  /* 氛围 */
  const vw=app.screen.width, vh=app.screen.height;
  ambient.width=vw; ambient.height=vh;
  const amb=pal('ambient',st);
  // 提高夜晚最低亮度,确保即使在夜晚也能看清世界(从70→110, 86→120, 132→160)
  ambient.tint=hex([lerp(amb[0],110,night*.65),lerp(amb[1],120,night*.60),lerp(amb[2],160,night*.50)]);
  const p=dayPhase(), dusk=Math.max(0,1-Math.abs(p-.42)*9)+Math.max(0,1-Math.abs(p-.08)*9);
  golden.x=vw*.5; golden.y=vh*.55; golden.width=vw*1.5; golden.height=vh*1.2;
  golden.tint=0xe89646; golden.alpha=dusk*.34;
  vignette.width=vw; vignette.height=vh;
  for(const c of cloudShadows){ c.x+=c._v*dt; if(c.x>MAP*TS+600)c.x=-600; }

  // 粒子系统更新 (v9.14: 优先使用高级粒子系统)
  if (advancedParticleSystem) {
    advancedParticleSystem.update();
  } else {
    spawnParticles(st,dt,night>.62);
    updateParticles(dt,((Math.floor(st)%4)+4)%4);
  }

  hudClock-=dt;
  if(hudClock<=0){ hudClock=.1; updateHUD(st,Math.floor(elapsed/DAY_SECONDS)); updateEcoHUD(); updatePerfHUD(); }
  updateInteractionIndicators();
  if(tutorialState.active){
    // 教程进度兜底检测（无论玩家用 WASD 还是点击寻路靠近，都能推进）
    if(tutorialState._alchemyOpened && !tutorialState._alchemyClosed){
      const alchemyPanel = document.querySelector('#alchemy.on,#alchemyPanel.on,.alchemy-overlay.on,.alchemy-overlay.panel-on,#alchemyUI.panel-on,#alchemyUI.on');
      if(!alchemyPanel) tutorialState._alchemyClosed = true;
    }
    if(tutorialState._alchemyClosed && !tutorialState._portalVisited && nearestPortal()) tutorialState._portalVisited = true;
    advanceTutorial();
  }
  springTick(dt);
});

/* ================= 11. HUD(DOM) ================= */
const $=id=>document.getElementById(id);
(function buildDial(){
  const NS='http://www.w3.org/2000/svg';
  const seasonColors=[
    {stroke:'#a8d5a2',decorations:[{type:'petal',cx:54,cy:12,r:2},{type:'petal',cx:62,cy:18,r:1.8},{type:'petal',cx:70,cy:28,r:2.2}]},
    {stroke:'#e8c870',decorations:[{type:'wheat',cx:88,cy:54},{type:'wheat',cx:92,cy:48}]},
    {stroke:'#d4a574',decorations:[{type:'leaf',cx:54,cy:96,r:2.5},{type:'leaf',cx:48,cy:88,r:2.2},{type:'leaf',cx:60,cy:90,r:2}]},
    {stroke:'#9ec5d8',decorations:[{type:'snow',cx:16,cy:54},{type:'snow',cx:12,cy:48},{type:'snow',cx:20,cy:60}]}
  ];
  for(let i=0;i<4;i++){
    const a0=i*90-90+4,a1=(i+1)*90-90-4,r=50,c=54,rad=x=>x*Math.PI/180;
    const pth=document.createElementNS(NS,'path');
    pth.setAttribute('d',`M ${c+r*Math.cos(rad(a0))} ${c+r*Math.sin(rad(a0))} A ${r} ${r} 0 0 1 ${c+r*Math.cos(rad(a1))} ${c+r*Math.sin(rad(a1))}`);
    pth.setAttribute('fill','none');
    pth.setAttribute('stroke',seasonColors[i].stroke);
    pth.setAttribute('stroke-width','1');
    pth.setAttribute('opacity','0.35');
    pth.id='arc'+i;
    pth.classList.add(['spring','summer','autumn','winter'][i]);
    $('dialRing').appendChild(pth);

    // 添加季节装饰元素
    const deco=seasonColors[i].decorations;
    if(deco){
      deco.forEach(d=>{
        if(d.type==='petal'){
          const circle=document.createElementNS(NS,'circle');
          circle.setAttribute('cx',d.cx);circle.setAttribute('cy',d.cy);circle.setAttribute('r',d.r||2);
          circle.setAttribute('fill',seasonColors[i].stroke);circle.setAttribute('opacity','0.5');
          $('dialRing').appendChild(circle);
        }else if(d.type==='wheat'){
          const line=document.createElementNS(NS,'line');
          line.setAttribute('x1',d.cx);line.setAttribute('y1',d.cy-6);
          line.setAttribute('x2',d.cx);line.setAttribute('y2',d.cy+2);
          line.setAttribute('stroke',seasonColors[i].stroke);line.setAttribute('stroke-width','1.5');line.setAttribute('opacity','0.5');
          $('dialRing').appendChild(line);
        }else if(d.type==='leaf'){
          const path=document.createElementNS(NS,'path');
          path.setAttribute('d',`M ${d.cx} ${d.cy} Q ${d.cx+2} ${d.cy-3} ${d.cx+4} ${d.cy} Q ${d.cx+2} ${d.cy+1} ${d.cx} ${d.cy}`);
          path.setAttribute('fill',seasonColors[i].stroke);path.setAttribute('opacity','0.5');
          $('dialRing').appendChild(path);
        }else if(d.type==='snow'){
          const g=document.createElementNS(NS,'g');
          g.setAttribute('transform',`translate(${d.cx},${d.cy})`);
          for(let a=0;a<6;a++){
            const line=document.createElementNS(NS,'line');
            const ang=a*60*Math.PI/180;
            line.setAttribute('x1',0);line.setAttribute('y1',0);
            line.setAttribute('x2',Math.cos(ang)*2.5);line.setAttribute('y2',Math.sin(ang)*2.5);
            line.setAttribute('stroke',seasonColors[i].stroke);line.setAttribute('stroke-width','0.8');line.setAttribute('opacity','0.5');
            g.appendChild(line);
          }
          $('dialRing').appendChild(g);
        }
      });
    }
  }
})();
const leaves=[];
for(let i=0;i<6;i++){const d=document.createElement('div');d.className='leaf';$('stamina').appendChild(d);leaves.push(d);}
let staminaUsed=0;
const syncLeaves=()=>leaves.forEach((l,i)=>l.classList.toggle('spent', i<staminaUsed));
const WEATHER=[['细雨润物','花瓣随风','溪水初涨'],['烈日当空','麦浪翻金','夜萤点点'],['西风渐紧','落叶铺金','果实低垂'],['初雪无声','炉火可亲','大地休眠']];
let lastDay=-1,lastSI=-1,lastWeatherChange=0;
function updateHUD(st,day){
  const si=((Math.floor(st)%4)+4)%4, ang=st/4*360;
  $('dialDot').setAttribute('cx',54+50*Math.cos((ang-90)*Math.PI/180));
  $('dialDot').setAttribute('cy',54+50*Math.sin((ang-90)*Math.PI/180));

  // 季节进度环更新
  const seasonDay = (day % SEASON_DAYS);
  const seasonProgress = seasonDay / SEASON_DAYS;
  const circumference = 2 * Math.PI * 52;
  const progressRing = $('seasonProgressRing');
  if(progressRing) progressRing.setAttribute('stroke-dasharray', `${circumference * seasonProgress} ${circumference}`);

  // 季节弧段样式更新
  for(let i=0;i<4;i++){
    const arc=$('arc'+i);
    if(!arc) continue;
    arc.classList.remove('active');
    if(i===si) arc.classList.add('active');
  }

  // 季节切换动画 + 天气标签动态更新 + 触发季节事件
  if(si!==lastSI){
    lastSI=si;
    const label=$('dialLabel');
    if(label){
      label.classList.add('transitioning');
      setTimeout(()=>label.classList.remove('transitioning'), 1200);
    }
    $('seasonName').textContent=SEASONS[si].name;
    $('seasonLatin').textContent=SEASONS[si].latin;
    changeWeather(si);

    // 触发季节爆发事件
    if(window.updateSeasonalEvents) {
      window.updateSeasonalEvents(day);
    }
  }

  // 每3天或季节变化时更新天气
  if(day!==lastDay){
    lastDay=day;
    $('dayNum').textContent=String(day%28+1).padStart(2,'0');
    if(day - lastWeatherChange >= 3 || si !== lastSI){
      changeWeather(si);
      lastWeatherChange = day;
    }
    staminaUsed=0; syncLeaves();
    for(let i=fellQueue.length-1;i>=0;i--){
      const f=fellQueue[i];
      if(day>=f.day){ f.o.felled=false; f.o.hp=2;
        if(f.o._col) colliders.push(f.o._col);
        fellQueue.splice(i,1); }
    }

    // 每日检查季节事件触发
    if(window.updateSeasonalEvents) {
      window.updateSeasonalEvents(day);
    }
  }
}

function changeWeather(seasonIndex){
  const tag=$('weatherTag');
  if(!tag) return;
  const newWeather='— '+WEATHER[seasonIndex][(Math.random()*3)|0]+' —';
  tag.classList.add('changing-out');
  setTimeout(()=>{
    tag.textContent=newWeather;
    tag.classList.remove('changing-out');
    tag.classList.add('changing-in');
    setTimeout(()=>tag.classList.remove('changing-in'), 400);
  }, 200);
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
function bindMobileControls(){
  const action=document.getElementById('touchAction');
  if(action){
    action.addEventListener('pointerdown',e=>{ e.preventDefault(); if(entered) interact(); });
  }
}
bindMobileControls();

/* 卡牌 3D 悬停 */
addEventListener('mousemove',e=>{
  const c=$('cardPeek'),f=c.querySelector('.face'),r=c.getBoundingClientRect();
  if(e.clientX>r.left-40&&e.clientX<r.right+40&&e.clientY>r.top-40&&e.clientY<r.bottom+40){
    const dx=(e.clientX-(r.left+r.width/2))/r.width,dy=(e.clientY-(r.top+r.height/2))/r.height;
    f.style.transform=`rotateY(${dx*22}deg) rotateX(${-dy*22}deg)`;
  }else f.style.transform='';
});

/* ================= 13. 五层引导体系 ================= */
// (1) 序列式高亮引导 (2) 距离感应交互提示 (3) 复杂面板遮罩聚光 (4) 战斗能量预判 (5) 屏幕边缘方向指示

const tutorialState = {
  active: false,
  step: 0,
  completed: false,
  steps: [
    { id: 'move', title: 'WASD 移动', check: () => tutorialState._moved },
    { id: 'chop', title: '点击树木伐木', target: 'tree', check: () => tutorialState._chopped || (farm.inventory.materials.wood||0) > 8 },
    { id: 'alchemy', title: '打开炼金面板', target: 'fab', check: () => tutorialState._alchemyOpened },
    { id: 'close', title: '关闭炼金面板', check: () => tutorialState._alchemyClosed },
    { id: 'portal', title: '前往深渊传送门', target: 'portal', check: () => tutorialState._portalVisited }
  ],
  _moved: false,
  _chopped: false,
  _alchemyOpened: false,
  _alchemyClosed: false,
  _portalVisited: false
};
window.tutorialState = tutorialState;
function startTutorial() {
  const save = window.Terra?.farm?.tutorialCompleted;
  if(save) { tutorialState.completed = true; return; }
  tutorialState.active = true;
  tutorialState.step = 0;
  tutorialState._alchemyClosed = false;
  renderTutorial();
}

function advanceTutorial() {
  const current = tutorialState.steps[tutorialState.step];
  if(current && current.check()) {
    tutorialState.step++;
    if(tutorialState.step >= tutorialState.steps.length) {
      tutorialState.completed = true;
      tutorialState.active = false;
      if(window.Terra?.farm) window.Terra.farm.tutorialCompleted = true;
      window.Terra?.save();
      removeTutorialUI();
      toastHint('引导完成 · 自由探索大陆');
    } else {
      renderTutorial();
    }
  }
}

function renderTutorial() {
  if(!tutorialState.active) return;
  let overlay = document.getElementById('tutorialOverlay');
  if(!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'tutorialOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:147;pointer-events:none;transition:opacity .4s';
    document.body.appendChild(overlay);
  }
  const step = tutorialState.steps[tutorialState.step];
  const touchMode = matchMedia('(hover:none), (pointer:coarse), (max-width:760px)').matches;
  let markerHtml = '';
  if(step.target === 'fab') {
    const fab = document.getElementById('craftFAB');
    if(fab) {
      const r = fab.getBoundingClientRect();
      markerHtml = `<div class="tutorialMarker" style="position:absolute;left:${r.left + r.width/2}px;top:${r.top + r.height/2}px;width:${Math.max(78,r.width+22)}px;height:${Math.max(78,r.height+22)}px;transform:translate(-50%,-50%);border:3px solid rgba(244,208,63,.92);border-radius:50%;box-shadow:0 0 28px rgba(244,208,63,.38);animation:tutorialPulse 1.5s ease-in-out infinite;pointer-events:none"></div>`;
    }
  } else if(step.target === 'portal') {
    const portal = OBJECTS.find(o => o.kind === 'portal');
    if(portal) {
      const screenPos = worldToScreen(portal.node.x, portal.node.y);
      if(screenPos) markerHtml = `<div class="tutorialMarker" style="position:absolute;left:${screenPos.x}px;top:${screenPos.y}px;width:80px;height:80px;transform:translate(-50%,-50%);border:3px solid rgba(244,208,63,.8);border-radius:50%;animation:tutorialPulse 1.5s ease-in-out infinite;pointer-events:none"></div>`;
    }
  }
  const title = step.id === 'move' && touchMode ? '点按地面移动' : step.title;
  const hint = step.id === 'move'
    ? (touchMode ? '点按任意可行走地面，角色会自动寻路' : '点击地面寻路，或按住 WASD / 方向键')
    : step.id === 'chop'
      ? (touchMode ? '靠近树木后点右下「交互」或直接点击树木' : '点击树木或靠近后按空格')
      : step.id === 'alchemy'
        ? (touchMode ? '点击金色炼金按钮打开工坊；材料不足也可以先进入查看' : '点击金色炼金按钮打开工坊')
        : step.id === 'close'
          ? '关闭炼金面板后，再前往传送门开始第一次战斗'
          : '点击或移动到传送门附近';
  if(window.Battle&&Battle.active){overlay.innerHTML='';}else overlay.innerHTML = `
    <div style="position:absolute;inset:0;background:rgba(0,0,0,.12);pointer-events:none;"></div>
    <div style="position:absolute;left:50%;top:18%;transform:translateX(-50%);width:min(86vw,520px);text-align:center;color:#f6f1e7;pointer-events:none;text-shadow:0 4px 18px rgba(0,0,0,.95)">
      <div style="font-size:clamp(20px,5vw,28px);letter-spacing:.18em;margin-bottom:12px;color:#f4d03f">${title}</div>
      <div style="font-size:13px;letter-spacing:.12em;line-height:1.8;opacity:.9">${hint}</div>
      <div style="font-size:12px;letter-spacing:.1em;opacity:.72;margin-top:8px">步骤 ${tutorialState.step + 1} / ${tutorialState.steps.length}</div>
    </div>
    ${markerHtml}
  `;
}

function removeTutorialUI() {
  const overlay = document.getElementById('tutorialOverlay');
  if(overlay) overlay.remove();
}

function worldToScreen(wx, wy) {
  if(!world || !app) return null;
  const sx = wx * world.scale.x + world.x;
  const sy = wy * world.scale.y + world.y;
  return { x: sx, y: sy };
}

/* ================= 13.1 距离感应交互提示 ================= */
const interactionIndicators = new Map(); // key -> sprite

function updateInteractionIndicators() {
  if(!entered || !objL) return;

  // 检测玩家附近3格内的可交互物件
  for(const o of OBJECTS) {
    if(o.felled) continue;
    const dist = Math.hypot(o.node.x - player.x, o.node.y - player.y);
    const inRange = dist < TS * 3;
    const key = `${o.kind}_${o.node.x}_${o.node.y}`;

    if(inRange && (o.kind === 'tree' || o.kind === 'cherry' || o.kind === 'portal' || o.kind === 'incubator' || o.kind === 'furnace')) {
      if(!interactionIndicators.has(key)) {
        const indicator = new PIXI.Container();

        // 金色光圈（强化：更粗边框+辉光）
        const ring = new PIXI.Graphics();
        ring.circle(0, 0, 36).stroke({ width: 2.5, color: 0xf4d03f, alpha: 0.95 });
        indicator.addChild(ring);

        // 向上箭头（强化：更大+边缘光）
        const arrow = new PIXI.Graphics();
        arrow.moveTo(0, -12).lineTo(-7, 0).lineTo(7, 0).closePath().fill({ color: 0xf4d03f, alpha: 1 });
        arrow.y = -50;
        indicator.addChild(arrow);

        // 提示文字（强化：更清晰阴影）
        const label = new PIXI.Text({
          text: '空格 交互',
          style: {
            fontFamily: 'Noto Serif SC, serif',
            fontSize: 12,
            fill: 0xfefdfb,
            letterSpacing: 2.5,
            dropShadow: true,
            dropShadowDistance: 0,
            dropShadowBlur: 8,
            dropShadowAlpha: 0.95,
            dropShadowColor: 0x000000
          }
        });
        label.anchor.set(0.5);
        label.y = -68;
        indicator.addChild(label);

        indicator.x = o.node.x;
        indicator.y = o.node.y - ASSETS[o.kind].h * 0.5;
        indicator._t = 0;

        overlayL.addChild(indicator);
        interactionIndicators.set(key, indicator);
      }
    } else {
      if(interactionIndicators.has(key)) {
        const indicator = interactionIndicators.get(key);
        overlayL.removeChild(indicator);
        indicator.destroy();
        interactionIndicators.delete(key);
      }
    }
  }

  // 更新动画（强化：更平滑的正弦浮动）
  for(const indicator of interactionIndicators.values()) {
    indicator._t += 0.02;
    indicator.y += Math.sin(indicator._t * 4) * 0.4;
    indicator.alpha = 0.75 + Math.sin(indicator._t * 2.5) * 0.25;
  }
}

/* ================= 13.2 农场交互闭环(state.js 接线) ================= */
/* 种地(空格) → 成熟 → 收获入库(originFertility 继承地块肥力)
   → Dock 显示背包 → 锻造按钮调用 Terra.craftCard → 卡牌翻面揭示 */
if(!Terra.load()) Terra.newGame('local');
const farm=Terra.farm;
farm.inventory ??= { crops:{}, materials:{}, cards:[] };
farm.inventory.crops ??= {};
farm.inventory.materials ??= {};
farm.inventory.cards ??= [];
farm.tech ??= { agriculture:0, military:0, magic:0, unlockedRecipes:['card_sprout_guard'] };
farm.tech.unlockedRecipes ??= ['card_sprout_guard'];
farm.upgrades ??= [];
farm.beasts ??= [];
function normalizeBeasts(){
  const selectedSpecies=new Set(Object.keys(SELECTED_PET_DEFS));
  farm.beasts = (farm.beasts||[]).filter(b=>!(selectedSpecies.has(b.species) && (!b.obtainedFrom || b.id?.endsWith('_companion')))).map((b,i)=>({
    id:b.id || `${b.species||'beast'}_${i}`,
    species:b.species || 'water_spirit',
    element:b.element || (b.species==='fire_spirit'?'fire':'water'),
    level:Math.max(1, b.level||1),
    xp:b.xp||0,
    stamina:b.stamina??100,
    evolution:b.evolution||{diet:{},laborHistory:{}},
    assignment:b.assignment||null,
  }));
  if(!farm.beasts.some(b=>b.species==='water_spirit')){
    farm.beasts.unshift({id:'water_spirit_starter',species:'water_spirit',element:'water',level:1,xp:0,stamina:100,evolution:{diet:{},laborHistory:{}},assignment:'irrigate'});
  }
  const seen=new Set();
  farm.beasts=farm.beasts.filter(b=>{
    const key=b.species;
    if((key==='water_spirit'||key==='fire_spirit') && seen.has(key)) return false;
    seen.add(key); return true;
  });
}
window.normalizeBeasts=normalizeBeasts;
normalizeBeasts();
const beastBySpecies=species=>farm.beasts.find(b=>b.species===species);
const beastLevel=species=>beastBySpecies(species)?.level||1;
const selectedPetEntries=()=>farm.beasts.filter(b=>SELECTED_PET_DEFS[b.species]);
function selectedPetPower(){
  return selectedPetEntries().reduce((acc,b)=>{
    const def=SELECTED_PET_DEFS[b.species], level=b.level||1, branch=b.evolutionBranch||'';
    const branchBonus=branch ? 1.25 : 1;
    for(const [key,val] of Object.entries(def.effect||{})) acc[key]=(acc[key]||0)+val*level*branchBonus;
    return acc;
  },{water:0,grow:0,quality:0,soil:0,pest:0,rare:0,dewberryQuality:0,spiritCharm:0});
}
function selectedPetSummary(){
  return selectedPetEntries().map(b=>{
    const def=SELECTED_PET_DEFS[b.species];
    return {species:b.species,name:def.name,level:b.level||1,branch:b.evolutionBranch||'未分支',passive:def.passive,active:def.active,role:def.role,src:ASSETS[b.species]?.src||''};
  });
}
function grantSelectedPet(species, source='debug'){
  const def=SELECTED_PET_DEFS[species];
  if(!def) return null;
  let pet=beastBySpecies(species);
  if(!pet){
    pet={id:`${species}_${Date.now().toString(36)}`,species,element:def.element,level:1,xp:0,stamina:100,evolution:{diet:{},laborHistory:{}},assignment:'idle',obtainedFrom:source};
    farm.beasts.push(pet);
  }
  pet.obtainedFrom ||= source;
  Terra.save();
  if(typeof syncCompanionPets==='function') syncCompanionPets();
  if(typeof updatePetCodex==='function') updatePetCodex();
  if(typeof updateBeastRosterUI==='function') updateBeastRosterUI();
  return pet;
}
function useSelectedPetActive(species){
  const pet=beastBySpecies(species), def=SELECTED_PET_DEFS[species];
  if(!pet||!def) return false;
  const materials=farm.inventory.materials;
  if(species==='beast_shrine_fox_spirit'){
    materials.spirit_charm=(materials.spirit_charm||0)+1+(pet.level||1);
    toastHint(`神社狐灵 · 御札标记 · 灵符残片 +${1+(pet.level||1)}`);
  }else if(species==='beast_sacred_fawnling'){
    for(const pc of Object.values(planted)){ if(!pc.mature) pc.grown=(pc.grown||0)+GROW_SECONDS*.22; }
    ecoState.soil=Math.min(100,ecoState.soil+8+(pet.level||1));
    toastHint('御鹿幼灵 · 踏青祝福 · 作物成长与土壤恢复');
  }else if(species==='beast_white_serpent_shrine'){
    ecoState.pest=Math.max(0,ecoState.pest-12-(pet.level||1)*2);
    materials.water_essence=(materials.water_essence||0)+1;
    toastHint('白蛇社灵 · 蛇行净流 · 虫害下降 / 水脉精华 +1');
  }else if(species==='beast_deepsea_noble'){
    materials.tide_pearl=(materials.tide_pearl||0)+1;
    for(const pc of Object.values(planted)){ if(pc.species==='dewberry') pc.boost=true; }
    toastHint('深海贵族 · 蓝宝石潮声 · 潮汐珍珠 +1 / 露莓加速');
  }else return false;
  pet.activeUses=(pet.activeUses||0)+1;
  pet.lastActiveAt=Date.now();
  Terra.save(); updateDock(); updatePetCodex(); updateEcoHUD();
  return true;
}
const waterSpirit=()=>beastBySpecies('water_spirit');
const waterBeasts=()=>farm.beasts.filter(b=>b.element==='water'||b.species==='water_spirit'||b.species==='spring_drop');
function waterPower(){ return waterBeasts().reduce((sum,b)=>sum+(b.level||1)+(b.evolutionBranch==='mana'?.35:0),0)+(selectedPetPower().water||0); }
const fireSpirit=()=>beastBySpecies('fire_spirit');
farm.inventory.materials.wood ??= 8;           // 初始木材(伐木系统未上线前)
if(fireSpirit()) hatchFire();

let whisperTimer;
function toastHint(t){ const w=$('whisper'); w.textContent=t; w.style.opacity=1;
  clearTimeout(whisperTimer); whisperTimer=setTimeout(()=>w.style.opacity=0,2600); }

const playerTileKey=()=>Math.floor(player.x/TS)+','+Math.floor((player.y-4)/TS);

/* 伐木 */
const fellQueue=[];
const ecoState={score:72,pest:18,soil:76,predator:0,status:'平衡',detail:'虫害低 · 水灵兽巡田 · 土壤稳定',clock:0};
function updateEcology(dt){
  ecoState.clock+=dt;
  if(ecoState.clock<.8) return;
  ecoState.clock=0;
  const plantedKeys=Object.keys(planted);
  const day=Math.floor(elapsed/DAY_SECONDS);
  const season=((Math.floor(elapsed/(DAY_SECONDS*7))%4)+4)%4;
  if(plantedKeys.length===0){
    const petPower=selectedPetPower();
    ecoState.pest=Math.max(4, [8,14,18,10][season]-Math.min(18,waterPower()*3)-(petPower.pest<0?Math.abs(petPower.pest):0));
    ecoState.soil=78+Math.min(18,waterPower()*2+(petPower.soil||0));
    ecoState.predator=waterPower()*5+(petPower.rare||0)*50;
    ecoState.score=Math.max(0,Math.min(100,Math.round(ecoState.soil*.72 + (100-ecoState.pest)*.28)));
    ecoState.status=ecoState.score>=78?'休耕丰饶':'休耕稳定';
    ecoState.detail=`暂无作物 · 虫害${ecoState.pest<28?'低':'中'} · ${waterPower()>0?`水系灵兽巡田 Lv.${waterPower().toFixed(1)}`:'等待灵兽巡田'}${selectedPetEntries().length?` · 精选灵兽 ${selectedPetEntries().length}只`:''}`;
    return;
  }
  const avgMeta=plantedKeys.reduce((a,k)=>{ const m=tileMeta[k]||{}; a.f+=(m.fert||60); a.m+=(m.moist||50); a.p+=(m.pest||20); return a; },{f:0,m:0,p:0});
  const count=Math.max(1,plantedKeys.length);
  const waterBonus=waterPower()*5;
  const petPower=selectedPetPower();
  const firePenalty=forgeHot?4:0;
  const seasonPest=[4,12,18,8][season];
  ecoState.pest=Math.max(0,Math.min(100,Math.round(avgMeta.p/count + plantedKeys.length*2 + seasonPest - waterBonus*.45 + firePenalty + Math.min(0,petPower.pest||0))));
  ecoState.soil=Math.max(0,Math.min(100,Math.round(avgMeta.f/count*.72 + avgMeta.m/count*.18 + (waterSpirit()?8:0) + (petPower.soil||0) - ecoState.pest*.18)));
  ecoState.predator=waterBonus;
  ecoState.score=Math.max(0,Math.min(100,Math.round(ecoState.soil*.72 + (100-ecoState.pest)*.28)));
  ecoState.status=ecoState.score>=78?'丰饶':ecoState.score>=58?'平衡':ecoState.score>=38?'失衡':'虫潮';
  ecoState.detail=`虫害${ecoState.pest<28?'低':ecoState.pest<55?'中':'高'} · ${waterPower()>0?`水系灵兽巡田 Lv.${waterPower().toFixed(1)}`:'缺少巡田灵兽'} · 土壤${ecoState.soil>=70?'稳定':ecoState.soil>=48?'波动':'衰退'}${selectedPetEntries().length?` · ${selectedPetEntries().map(b=>SELECTED_PET_DEFS[b.species].passive).join(' / ')}`:''}`;
}
function updateEcoHUD(){
  const panel=$('ecoPanel'); if(!panel) return;
  panel.className=ecoState.score<38?'danger':ecoState.score<58?'warn':'';
  $('ecoStatus').textContent=ecoState.status;
  $('ecoScore').textContent=ecoState.score;
  $('ecoBar').style.transform=`scaleX(${ecoState.score/100})`;
  $('ecoDetail').textContent=ecoState.detail;
}
function updatePerfHUD(){
  const fps=$('fpsVal'), q=$('qualityVal'); if(!fps || !q) return;
  fps.textContent=fpsLast?Math.round(fpsLast):'—';
  q.textContent=quality===2?'HIGH':quality===1?'LOW':'AUTO';
}
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
  tutorialState._chopped=true;             // 教程: 伐木一次即推进(不依赖具体木材数)
  Terra.save(); updateDock();

  // 伐木粒子爆发 + 增强屏幕震动
  if(feedbackSystem){
    const treeType = o.kind === 'cherry' ? 'cherry' : 'oak';
    feedbackSystem.burstChopParticles(o.node.x, o.node.y, treeType);

    // 数字飘字（飘向HUD木材图标）
    const hudWoodPos = {x: 120, y: window.innerHeight - 60}; // 根据实际HUD位置调整
    feedbackSystem.floatNumber(o.node.x, o.node.y, 'wood', 2, hudWoodPos);

    // 屏幕震动反馈
    if(window.BattleEffects) window.BattleEffects.screenShake(8, 180, document.body);
  }

  toastHint('伐木 · 木材 +2');
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
    const meta=tileMeta[key];
    const species=(meta.moist>=72 || meta.mana>=72)?'dewberry':'starwheat';
    const c=makeNode(species==='dewberry'?'crop_dewberry':'crop');
    const [tx,ty]=key.split(',').map(Number);
    c.x=tx*TS+TS/2; c.y=ty*TS+TS/2+16; c._shadow.visible=false; c.scale.set(.32);
    overlayL.addChild(c); crops.push(c);
    planted[key]={node:c, grown:0, mature:false, watered:false, boost:false, species, _stage:-1};

    // 播种弹出动画 + 土壤粒子
    if(feedbackSystem){
      feedbackSystem.animatePlant(c, () => {
        toastHint(`播种 ${species==='dewberry'?'露莓':'星麦'} · 静待生长`);
      });
      // 土壤粒子爆发
      spawnSoilParticles(c.x, c.y);
    } else {
      toastHint(`播种 ${species==='dewberry'?'露莓':'星麦'} · 静待生长`);
    }
  } else if(pc.mature){                           // 收获:质量继承土壤四维与灵兽灌溉
    const meta=tileMeta[key];
    const q=calcHarvestQuality(meta, pc);
    pc.grade=harvestGrade(q);
    const bonus=farm.upgrades?.includes('farmland_2') ? 1 : 0;
    const total=1+bonus;
    for(let i=0;i<total;i++){
      (farm.inventory.crops[pc.species] ??= []).push({
        species:pc.species, quality:+(q/100).toFixed(2), originFertility:q,
        grade:pc.grade, watered:!!pc.watered,
        soil:{fert:meta.fert,moist:meta.moist,pest:meta.pest,mana:meta.mana} });
    }
    Terra.save(); updateDock();

    // 收获粒子爆发 + 数字飘字 + 屏幕震动
    if(feedbackSystem){
      feedbackSystem.burstHarvestParticles(pc.node.x, pc.node.y, pc.species, pc.grade);

      // 数字飘字（飘向HUD作物图标）
      const hudCropPos = {x: 60, y: window.innerHeight - 60}; // 根据实际HUD位置调整
      feedbackSystem.floatNumber(pc.node.x, pc.node.y, pc.species, total, hudCropPos);

      // 品质越高震动越强
      const shakeMag = pc.grade==='灵脉'?12:pc.grade==='珍品'?8:pc.grade==='良品'?5:3;
      if(window.BattleEffects) window.BattleEffects.screenShake(shakeMag, 200, document.body);
    }

    toastHint(`收获 ${pc.grade}${pc.species==='dewberry'?'露莓':'星麦'} ×${total} · 品质 ${q}${pc.watered?' · 灵兽灌溉':''}${bonus?' · 扩建加成':''}`);
    overlayL.removeChild(pc.node);
    const ci=crops.indexOf(pc.node); if(ci>=0)crops.splice(ci,1);
    delete planted[key];
  } else toastHint('成长中 · 再等等');
}
function calcHarvestQuality(meta, pc){
  const pestPressure=Math.max(meta.pest||0, ecoState.pest||0);
  const petPower=selectedPetPower();
  const cropPetBonus=(pc.species==='dewberry'?(petPower.dewberryQuality||0):0)+(petPower.quality||0);
  const raw=meta.fert*.65 + meta.moist*.15 + meta.mana*.12 - pestPressure*.18 + (pc.watered?10:0) + (pc.boost?4:0) + Math.max(0,ecoState.score-70)*.08 + waterBeasts().filter(b=>b.evolutionBranch==='mana').length*3 + cropPetBonus;
  return Math.round(Math.max(35, Math.min(118, raw)));
}
function harvestGrade(q){ return q>=92?'灵脉':q>=80?'珍品':q>=65?'良品':'粗麦'; }
const companionPets=[];
const companionBehaviors={
  beast_shrine_fox_spirit:{float:2.0, bob:2.0, sway:0.08, hop:5.0, mode:'fox'},
  beast_sacred_fawnling:{float:1.4, bob:1.2, sway:0.03, hop:0.0, mode:'deer'},
  beast_white_serpent_shrine:{float:1.2, bob:0.8, sway:0.12, hop:0.0, mode:'serpent'},
  beast_deepsea_noble:{float:0.9, bob:0.7, sway:0.06, hop:0.0, mode:'deepsea'},
};
function spawnCompanionPet(kind, tx, ty, phase=0){
  const node=makeNode(kind);
  node.x=tx*TS+TS/2; node.y=ty*TS+TS/2; node.zIndex=node.y;
  node._petBaseY=node.y; node._petPhase=phase; node._shadow.alpha=.18;
  objL.addChild(node); companionPets.push(node);
  return node;
}
const companionSlots={
  beast_shrine_fox_spirit:[18.6,30.7,0.1],
  beast_sacred_fawnling:[19.8,31.2,1.4],
  beast_white_serpent_shrine:[16.4,30.6,2.1],
  beast_deepsea_noble:[28.2,31.1,2.8],
};
function syncCompanionPets(){
  const owned=new Set(selectedPetEntries().map(b=>b.species));
  for(let i=companionPets.length-1;i>=0;i--){
    const pet=companionPets[i];
    if(!owned.has(pet._kind)){ objL.removeChild(pet); companionPets.splice(i,1); }
  }
  const spawned=new Set(companionPets.map(p=>p._kind));
  for(const [kind,slot] of Object.entries(companionSlots)){
    if(owned.has(kind) && !spawned.has(kind)) spawnCompanionPet(kind, ...slot);
  }
}
syncCompanionPets();
function stepCompanionPets(dt){
  for(const p of companionPets){
    p._petPhase+=dt*2.2;
    const behavior=companionBehaviors[p._kind] || {float:1.6, bob:1.6, sway:0.04, hop:0.0, mode:'default'};
    const bob=Math.sin(p._petPhase*behavior.bob)*3.2*behavior.float;
    p.y=p._petBaseY+bob;
    p.zIndex=p.y;
    if(p._body){
      if(p._bw===undefined && p._body.texture && p._body.texture.width>1){ p._bw=p._body.scale.x; p._bh=p._body.scale.y; }
      const bw=p._bw||p._body.scale.x||1, bh=p._bh||p._body.scale.y||1;
      const br=Math.sin(p._petPhase)*behavior.sway;
      p._body.scale.set(bw*(1-br), bh*(1+br));
      if(behavior.mode==='fox'){
        p._body.y=-Math.abs(Math.sin(p._petPhase*3.2))*3.5;
      } else if(behavior.mode==='deer'){
        p._body.y=Math.sin(p._petPhase*1.3)*1.6;
      } else if(behavior.mode==='serpent'){
        p._body.y=Math.sin(p._petPhase*1.8)*2.0;
      } else if(behavior.mode==='deepsea'){
        p._body.y=Math.sin(p._petPhase*1.1)*1.8;
      }
    }
  }
}
function interact(){                              // 空格:在当前位置就近交互
  const key=playerTileKey();
  if(tileMeta[key]){ interactFarm(key); return; }
  if(nearestIncubator()){ openBreed(); return; }
  if(nearestFurnace()){ if(window.FarmUpgrade) FarmUpgrade.open(); return; }
  if(nearestPortal()){ if(window.DungeonMap) DungeonMap.open(); return; }
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
    if(pc&&pc.mature){ const q=calcHarvestQuality(tileMeta[key],pc); pc.grade=harvestGrade(q); }
    const cropName=pc?.species==='dewberry'?'露莓':'星麦';
    txt.textContent = !pc? '播种 · 体力×1' : pc.mature? `收获${pc.grade||'成熟'}${cropName}` : (pc.watered?'已灌溉 · 成长加速':'成长中 · 等待灌溉');
    el.style.opacity = (!pc||pc.mature)? 1 : .55;
    return;
  }
  if(nearestIncubator()){ txt.textContent='灵兽孵化阵'; el.style.opacity=1; return; }
  if(nearestFurnace()){ txt.textContent='农场升级面板'; el.style.opacity=1; return; }
  if(nearestPortal()){ txt.textContent='查看深渊路线图'; el.style.opacity=1; return; }
  if(nearestChoppable()){ txt.textContent='伐木 · 体力×1'; el.style.opacity=1; return; }
  el.style.opacity=0;
}

function updateResourceDisplay(elemId, newVal){
  const el=document.getElementById(elemId);
  if(!el) return;
  const oldVal=parseInt(el.dataset.value||'0');
  if(newVal===oldVal) return;
  const delta=newVal-oldVal;
  if(delta>0){
    const deltaSpan=document.createElement('span');
    deltaSpan.className='delta';
    deltaSpan.textContent=`+${delta}`;
    el.appendChild(deltaSpan);
    setTimeout(()=>deltaSpan.remove(), 850);
  }
  el.textContent=newVal;
  el.dataset.value=newVal;
  if(newVal>0 && newVal%10===0){
    el.classList.add('milestone');
    setTimeout(()=>el.classList.remove('milestone'),420);
  }
}
function updateDock(){
  const wheat=(farm.inventory.crops.starwheat||[]).length;
  const wood=farm.inventory.materials.wood||0;
  const cards=farm.inventory.cards.length;
  updateResourceDisplay('invWheat', wheat);
  updateResourceDisplay('invWood', wood);
  updateResourceDisplay('invCards', cards);
  const fire=fireSpirit();
  // FAB按钮状态更新（主次分级 + 状态矩阵）
  const fab=document.getElementById('craftFAB');
  const tooltip=document.getElementById('craftBtnTooltip');
  if(fab){
    const canCraft = wheat>=3 && wood>=2;
    if(canCraft){
      fab.classList.remove('disabled');
      fab.style.opacity='1';
      fab.style.pointerEvents='auto';
      fab.style.animation='fabBob 2.6s ease-in-out infinite';
      if(forgeHot) fab.classList.add('hot');
      else fab.classList.remove('hot');
      // 清空 tooltip（可用时不显示）
      if(tooltip) tooltip.style.opacity='0';
    } else {
      fab.classList.add('disabled');
      fab.classList.remove('hot');
      // 更新 tooltip 内容
      if(tooltip){
        const wheatNeed = Math.max(0, 3-wheat);
        const woodNeed = Math.max(0, 2-wood);
        let parts = [];
        if(wheatNeed > 0) parts.push(`星麦 <span class="lack">×3 (缺${wheatNeed})</span>`);
        else parts.push(`星麦 ✓ ×3`);
        if(woodNeed > 0) parts.push(`木材 <span class="lack">×2 (缺${woodNeed})</span>`);
        else parts.push(`木材 ✓ ×2`);
        tooltip.innerHTML = `需要：${parts.join(' | ')}`;
      }
    }
  }
}
// 绑定FAB点击事件（添加 hover 显示 tooltip）
const fabBtn=document.getElementById('craftFAB');
const fabTooltip=document.getElementById('craftBtnTooltip');
if(fabBtn){
  fabBtn.onclick=()=>{
    if(window.Alchemy){
      tutorialState._alchemyOpened = true;
      Alchemy.open();
    }
    else toastHint('炼金工坊载入中…');
  };
  // FAB disabled 时悬停显示 tooltip
  fabBtn.addEventListener('mouseenter',()=>{
    if(fabBtn.classList.contains('disabled') && fabTooltip){
      fabTooltip.style.opacity='1';
      fabTooltip.style.pointerEvents='auto';
    }
  });
  fabBtn.addEventListener('mouseleave',()=>{
    if(fabTooltip){
      fabTooltip.style.opacity='0';
      fabTooltip.style.pointerEvents='none';
    }
  });
}
$('cardReveal').onclick=()=>$('cardReveal').classList.remove('on');
updateDock();

/* 灵兽状态面板 */
const BEAST_STATE={idle:'闲逛中 …',seek:'前往灌溉 …',water:'正在浇水 …'};
function setBeastStatus(s){ const el=$('beastState'); if(el) el.textContent=`水灵兽 Lv.${beastLevel('water_spirit')} · ${BEAST_STATE[s]||'—'}`; }
function updateBeastRosterUI(){
  const named=$('beastName'); if(!named) return;
  const waterCount=farm.beasts.filter(b=>b.element==='water' || b.species==='water_spirit' || b.species==='spring_drop').length;
  named.textContent=waterCount>1?`春露兽群 · ${waterCount} 只`:'水灵兽 · 未名';
  updatePetCodex();
}
window.updateBeastRosterUI=updateBeastRosterUI;
updateBeastRosterUI();
setBeastStatus('idle');

function updatePetCodex(){
  const list=$('petCodexList'); if(!list) return;
  const pets=selectedPetSummary();
  list.innerHTML=pets.map(p=>`<div class="pet"><img src="${p.src}" alt=""><div><b>${p.name} · Lv.${p.level}</b><div class="role">${p.role} · ${p.branch}</div><div class="skill">被动: ${p.passive}<br>主动: ${p.active}</div><button class="petUse" data-species="${p.species}">发动主动</button></div></div>`).join('');
  list.querySelectorAll('.petUse').forEach(btn=>btn.onclick=(e)=>{e.stopPropagation(); useSelectedPetActive(btn.dataset.species);});
}
updatePetCodex();
const petPanel=$('beastPanel'), petCodex=$('petCodex'), petCodexClose=$('petCodexClose');
if(petPanel&&petCodex) petPanel.onclick=()=>petCodex.classList.toggle('on');
if(petCodexClose&&petCodex) petCodexClose.onclick=(e)=>{e.stopPropagation(); petCodex.classList.remove('on');};

/* ================= 12. 标题 → 世界 转场 ================= */
function enterWorld(){
  if(entered)return; entered=true;
  console.log('[Terra] Entering world - Time:', elapsed.toFixed(1), 'Day phase:', dayPhase().toFixed(2), 'Sunlight:', sunlight().toFixed(2));
  const title=$('title');
  // 立即禁用标题屏交互，允许游戏世界接收点击
  title.style.pointerEvents='none';
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
  // 镜头降落到主角 + HUD淡入
  setTimeout(()=>{title.style.opacity=0;
    cam.zoom=.5;cam.tzoom=1;
    document.body.classList.add('hud-on');
    // 显示炼金FAB（从标题进入后立即可见）
    const fab=document.getElementById('craftFAB');
    if(fab){fab.style.display='flex';fab.style.opacity='1';}
  },900);
  setTimeout(()=>{title.remove();
    $('whisper').style.opacity=1;
    setTimeout(()=>{$('whisper').style.opacity=0;},10000);
    startTutorial();
  },3200);
}
window.enterWorld=enterWorld;  // 暴露给 MultiplayerUI
$('enter').onclick=enterWorld;

/* 初始化联机 UI（在加载完成后） */
setTimeout(()=>{
  if(typeof MultiplayerUI !== 'undefined'){
    const wsUrl = window.location.hostname === 'localhost'
      ? 'ws://localhost:8866'
      : 'wss://terra.bz9.me/ws';
    MultiplayerUI.init(wsUrl);
  }
}, 100);

/* 调试句柄(性能排查/控制台实验用) */
window.__dbg={app,world,groundL,waterL,snowL,overlayL,objL,fxScreen,player,cam,beast,beastAI,
  seasonFilter, findPath, planted, commandTo, interactFarm, enterWorld,
  beastStep, get ecology(){return ecoState}, get quality(){return quality}, get fps(){return fpsLast}, get fireBeast(){return fireBeast}, get forgeHot(){return forgeHot}, openBreed, hatchFire, useSelectedPetActive, grantSelectedPet, syncCompanionPets,
  get beasts(){return farm.beasts}, get companionPets(){return companionPets}, get companionBehaviors(){return companionBehaviors},
  get selectedPets(){return selectedPetSummary()},
  get ready(){return entered && !!app?.renderer && app.screen.width>0 && app.screen.height>0},
  get farm(){return Terra.farm},
  get scripts(){return [...document.scripts].map(s=>s.src).filter(Boolean)},
  get plantedCount(){return Object.keys(planted).length},
  get cardCount(){return farm.inventory.cards.length},
  get parts(){return parts.length},
  get objects(){return OBJECTS},
  commandTo, interact};

/* Loading screen fade-out (after first successful frame) */
setTimeout(()=>{
  const loader=document.getElementById('loading');
  if(loader){ loader.classList.add('ready'); setTimeout(()=>loader.remove(),800); }
},100);

})();
