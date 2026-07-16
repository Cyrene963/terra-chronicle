const fs=require('fs');
const path=require('path');
const {chromium}=require('playwright');
const {badConsole,scriptVersions}=require('./smoke_common');

const ROOT=path.resolve(__dirname,'..');
const BATCH=process.env.TERRA_BATCH_ID||`solo-${new Date().toISOString().replace(/[:.]/g,'')}`;
const OUT=path.join(ROOT,'dogfood-output','ultra-20run',BATCH);
const BASE=process.env.TERRA_PUBLIC_BASE_URL||'http://127.0.0.1:8871';
const CHROME=process.env.TERRA_CHROMIUM_PATH||'/root/.cloakbrowser/chromium-146.0.7680.177.5/chrome';
const EXPECTED=scriptVersions(path.join(ROOT,'index.html'));
fs.mkdirSync(OUT,{recursive:true});
const jsonl=path.join(OUT,'runs.jsonl');
const onlyRun=Number(process.env.TERRA_RUN_INDEX||0);
const stopAfterPlant=process.env.TERRA_STOP_AFTER_PLANT==='1';
if(!onlyRun)fs.writeFileSync(jsonl,'');

const profiles={
 iphone:{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'},
 narrow:{viewport:{width:360,height:740},isMobile:true,hasTouch:true,deviceScaleFactor:1,userAgent:'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36'},
 ipad:{viewport:{width:820,height:1180},isMobile:true,hasTouch:true,deviceScaleFactor:1,userAgent:'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'},
 ipadland:{viewport:{width:1180,height:820},isMobile:true,hasTouch:true,deviceScaleFactor:1,userAgent:'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'},
 desktop:{viewport:{width:1280,height:800},isMobile:false,hasTouch:false,deviceScaleFactor:1},
};
const matrix=[
 ['fresh-iphone','iphone','full'],['fresh-narrow','narrow','full'],['fresh-ipad','ipad','full'],['fresh-ipad-land','ipadland','full'],['fresh-desktop','desktop','full'],
 ['slow-main-first-tap','iphone','slow'],['double-enter','narrow','double'],['rapid-surfaces','iphone','surfaces'],['map-tap-drag','ipad','map'],['battle-switch','iphone','battle'],
 ['reload-empty','desktop','reload'],['reload-after-move','iphone','reloadMove'],['reload-after-plant','desktop','plantReload'],['reload-after-harvest','ipad','harvestReload'],['reload-after-alchemy','iphone','alchemyReload'],
 ['corrupt-json','desktop','corrupt'],['partial-schema','iphone','partial'],['background-resume','ipad','background'],['resize-rotate','ipadland','resize'],['full-loop','desktop','full'],
];
function append(row){fs.appendFileSync(jsonl,JSON.stringify(row)+'\n')}
async function checkpoint(page,run,stage){
 const data=await page.evaluate(()=>localStorage.getItem('terra_farm'));
 const dir=path.join(OUT,'checkpoints');fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,`run-${run}-${stage}.json`),JSON.stringify({run,stage,data,savedAt:new Date().toISOString()},null,2));
}
async function waitReady(page){await page.waitForFunction(()=>window.__dbg?.ready&&document.body.classList.contains('hud-on'),null,{timeout:60000});}
// Camera lerps to the player for ~1.5s after entry; tapping a pre-computed worldToClient point before it settles
// (under load) resolves to the wrong tile. Wait for the world transform to hold steady before interacting.
async function waitCameraSettle(page,timeout=8000){const t0=Date.now();let prev=null,stable=0;while(Date.now()-t0<timeout){const c=await page.evaluate(()=>{const t=window.__dbg&&__dbg.worldTransform;return t?Math.round(t.x)+','+Math.round(t.y)+','+(+t.scale.toFixed(3)):null;}).catch(()=>null);if(c&&c===prev){if(++stable>=3)return;}else{stable=0;prev=c;}await page.waitForTimeout(120);}}
async function snapshot(page,label){return page.evaluate(label=>({label,title:!!document.querySelector('#title'),surface:SurfaceLifecycle?.active||null,locked:SurfaceLifecycle?.isInputLocked?.()||false,tutorial:{active:tutorialState.active,step:tutorialState.step,completed:tutorialState.completed,moved:tutorialState._moved,chopped:tutorialState._chopped,card:tutorialState._firstCardCrafted},farm:{wood:Terra.farm.inventory.materials.wood||0,cards:Terra.farm.inventory.cards.length,star:(Terra.farm.inventory.crops.starwheat||[]).length,dew:(Terra.farm.inventory.crops.dewberry||[]).length,tutorialCompleted:!!Terra.farm.tutorialCompleted},planted:__dbg.plantedCount,player:{x:__dbg.player.x,y:__dbg.player.y},battle:{active:!!window.Battle?.active,hand:document.querySelectorAll('#battle.on .card').length},body:document.body.className}),label);}
async function clickWorld(page,wx,wy,touch=false){await waitCameraSettle(page,4000);const p=await page.evaluate(({wx,wy})=>__dbg.worldToClient(wx,wy),{wx,wy}),vp=page.viewportSize();if(p.x<2||p.y<2||p.x>vp.width-2||p.y>vp.height-2)throw new Error(`world target offscreen ${JSON.stringify(p)}`);const hasTouch=await page.evaluate(()=>navigator.maxTouchPoints>0);if(touch&&hasTouch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);return p;}
async function enter(page,mode){await page.waitForSelector('#enter',{timeout:15000});if(mode==='double'){await page.evaluate(()=>{const b=document.querySelector('#enter');b&&b.click();const again=document.querySelector('#enter');again&&again.click();});}else await page.click('#enter');await waitReady(page);await waitCameraSettle(page);}
async function visiblePlot(page,species='starwheat',used=[]){return page.evaluate(({species,used})=>__dbg.plotMeta.filter(p=>!used.includes(p.key)&&((p.moist>=72||p.mana>=72)?'dewberry':'starwheat')===species).map(p=>{const [x,y]=p.key.split(',').map(Number),c=__dbg.worldToClient(x*64+32,y*64+32);return{...p,tx:x,ty:y,c,d:Math.hypot(x*64+32-__dbg.player.x,y*64+32-__dbg.player.y)}}).filter(p=>p.c.x>45&&p.c.x<innerWidth-45&&p.c.y>120&&p.c.y<innerHeight-120).sort((a,b)=>a.d-b.d)[0]||null,{species,used});}
async function visibleTree(page){return page.evaluate(()=>__dbg.objects.filter(o=>!o.felled&&(o.kind==='tree'||o.kind==='cherry')).map(o=>({wx:o.node.x,wy:o.node.y,c:__dbg.worldToClient(o.node.x,o.node.y),d:Math.hypot(o.node.x-__dbg.player.x,o.node.y-__dbg.player.y),tutorial:!!o.tutorial})).filter(o=>o.c.x>55&&o.c.x<innerWidth-55&&o.c.y>130&&o.c.y<innerHeight-130).sort((a,b)=>Number(b.tutorial)-Number(a.tutorial)||a.d-b.d)[0]||null);}
async function chopTree(page){const tree=await visibleTree(page);if(!tree)throw new Error('no visible tree for real chop');const before=await page.evaluate(()=>Terra.farm.inventory.materials.wood||0);await clickWorld(page,tree.wx,tree.wy,true);const trace=[];for(let i=0;i<25;i++){await page.waitForTimeout(1000);const state=await page.evaluate(()=>({wood:Terra.farm.inventory.materials.wood||0,player:{x:__dbg.player.x,y:__dbg.player.y},pending:__dbg.pendingAction,path:__dbg.pathLength,chop:__dbg.chopState,commands:__dbg.commandTrace}));trace.push(state);if(state.wood>before)return{tree,trace};}throw new Error(`real chop stalled ${JSON.stringify({tree,before,trace})}`);}
async function plantVisible(page,species,used){const p=await visiblePlot(page,species,used);if(!p)throw new Error(`no visible ${species} plot`);const before=await page.evaluate(()=>__dbg.plantedCount);const hit=await page.evaluate(({x,y})=>{const el=document.elementFromPoint(x,y),chain=[];for(let n=el;n&&chain.length<6;n=n.parentElement)chain.push({tag:n.tagName,id:n.id,cls:n.className,pe:getComputedStyle(n).pointerEvents});const ids=['stage','hud','mobileControls','touchAction','dock','beastPanel','tutorialOverlay'];const rects={};for(const id of ids){const n=document.getElementById(id);if(n){const r=n.getBoundingClientRect();rects[id]={x:r.x,y:r.y,w:r.width,h:r.height,pe:getComputedStyle(n).pointerEvents,display:getComputedStyle(n).display}}}return{chain,rects};},p.c);const clicked=await clickWorld(page,p.tx*64+32,p.ty*64+32,true);const trace=[];for(let i=0;i<20;i++){await page.waitForTimeout(1000);const state=await page.evaluate(()=>({planted:__dbg.plantedCount,player:{x:__dbg.player.x,y:__dbg.player.y},pending:__dbg.pendingAction,path:__dbg.pathLength,commands:__dbg.commandTrace,whisper:document.getElementById('whisper')?.textContent||''}));trace.push(state);if(state.planted>before){used.push(p.key);return{...p,hit,clicked,trace};}}throw new Error(`real plant stalled ${JSON.stringify({plot:p,hit,clicked,before,trace})}`);}
async function harvest(page,p){await clickWorld(page,p.tx*64+32,p.ty*64+32,true);await page.waitForFunction(key=>!__dbg.planted[key],p.key,{timeout:15000});}
async function runScenario(page,scenario,steps,profile){if(scenario==='surfaces'){for(const api of ['Alchemy','FarmUpgrade','DungeonMap']){await page.evaluate(api=>window[api].open(),api);await page.waitForTimeout(80);steps.push(await snapshot(page,api+'-open'));await page.evaluate(api=>window[api].close({immediate:true}),api);await page.waitForTimeout(650);steps.push(await snapshot(page,api+'-close'));}return;}
 if(scenario==='map'){await page.evaluate(()=>WorldMapIntegration.openMap());await page.waitForTimeout(150);const r=await page.evaluate(()=>{const c=document.getElementById('worldMapCanvas'),b=c.getBoundingClientRect();let hits=[],o=WorldMap.onHexClick;WorldMap.onHexClick=h=>hits.push(h);const fire=(n,touches,changed)=>{const e=new Event(n,{bubbles:true,cancelable:true});Object.defineProperties(e,{touches:{value:touches},changedTouches:{value:changed}});c.dispatchEvent(e)};const tap={clientX:b.left+b.width/2,clientY:b.top+b.height/2};fire('touchstart',[tap],[tap]);fire('touchend',[],[tap]);const dragStart={clientX:b.left+b.width*.35,clientY:b.top+b.height*.45},dragEnd={clientX:dragStart.clientX+45,clientY:dragStart.clientY+35};fire('touchstart',[dragStart],[dragStart]);fire('touchmove',[dragEnd],[dragEnd]);fire('touchend',[],[dragEnd]);WorldMap.onHexClick=o;return{hit:hits[0]||null,hitCount:hits.length,rect:[b.x,b.y,b.width,b.height],renderLoop:WorldMap._renderLoopStarted}});await page.evaluate(()=>WorldMapIntegration.closeMap({immediate:true}));await page.waitForTimeout(80);r.stopped=await page.evaluate(()=>!WorldMap._renderLoopStarted);steps.push({label:'map-touch',...r});return;}
 if(scenario==='battle'){await page.evaluate(()=>Battle.enter({deck:[],debugHand:[{name:'划击',type:'atk',val:6,cost:1,desc:'伤害'},{name:'格挡',type:'def',val:5,cost:1,desc:'护甲'}],onWin(){},onLose(){}}));await page.waitForSelector('#battle.on');await page.evaluate(()=>Alchemy.open());await page.waitForTimeout(300);steps.push(await snapshot(page,'battle-to-alchemy'));await page.evaluate(()=>Alchemy.close({immediate:true}));return;}
 if(scenario==='reload'||scenario==='reloadMove'){if(scenario==='reloadMove'){await page.touchscreen?.tap?.(195,430).catch(()=>{});await page.mouse.click(220,430).catch(()=>{});await page.waitForTimeout(500);}const before=await snapshot(page,'before-reload');await page.reload({waitUntil:'domcontentloaded'});await enter(page);steps.push(before,await snapshot(page,'after-reload'));return;}
 if(scenario==='plantReload'||scenario==='harvestReload'||scenario==='alchemyReload'||scenario==='full'){
   await chopTree(page);steps.push(await snapshot(page,'after-real-chop'));await checkpoint(page,Number(process.env.TERRA_RUN_INDEX)||0,'chop');await page.waitForTimeout(2500);
   const used=[];const planted=[];const need=scenario==='plantReload'?1:3;for(let i=0;i<need;i++)planted.push(await plantVisible(page,'starwheat',used));steps.push(await snapshot(page,'after-plant'));await checkpoint(page,Number(process.env.TERRA_RUN_INDEX)||0,'plant');
   if(scenario==='full'&&stopAfterPlant)return;
   if(scenario==='plantReload'){await page.reload({waitUntil:'domcontentloaded'});await enter(page);steps.push(await snapshot(page,'plant-after-reload'));return;}
   const touchDevice=await page.evaluate(()=>navigator.maxTouchPoints>0);
   if(!touchDevice)await page.keyboard.press('f');
   await page.waitForFunction(keys=>keys.every(k=>__dbg.planted[k]&&__dbg.planted[k].mature),planted.map(p=>p.key),{timeout:60000});
   for(const p of planted)await harvest(page,p);steps.push(await snapshot(page,'after-harvest'));
   if(scenario==='harvestReload'){await page.reload({waitUntil:'domcontentloaded'});await enter(page);steps.push(await snapshot(page,'harvest-after-reload'));return;}
   await page.click('#craftFAB');await page.waitForSelector('#alchemyUI.panel-on');for(let i=0;i<3;i++)await page.click('#addWheat');for(let i=0;i<2;i++)await page.click('#addWood');await page.click('#alchemyBrew');await page.waitForTimeout(1600);steps.push(await snapshot(page,'after-alchemy'));
   if(scenario==='alchemyReload'){await page.reload({waitUntil:'domcontentloaded'});await enter(page);steps.push(await snapshot(page,'alchemy-after-reload'));}
   if(scenario==='full'){
     await page.evaluate(()=>Alchemy.close({immediate:true}));
     const portal=await page.evaluate(()=>{const o=__dbg.objects.filter(x=>x.kind==='portal').sort((a,b)=>Math.hypot(a.node.x-__dbg.player.x,a.node.y-__dbg.player.y)-Math.hypot(b.node.x-__dbg.player.x,b.node.y-__dbg.player.y))[0];return __dbg.worldToClient(o.node.x,o.node.y)});
     if(profiles[profile].hasTouch)await page.touchscreen.tap(portal.x,portal.y);else await page.mouse.click(portal.x,portal.y);
     await page.waitForFunction(()=>SurfaceLifecycle.active==='dungeon',null,{timeout:20000});await page.waitForSelector('#dungeonMap.on');
     for(let i=0;i<3&&!await page.evaluate(()=>Battle.active);i++){const node=page.locator('#dungeonMap .node.current:not(.locked)').first();await node.click();await page.waitForTimeout(800);}
     await page.waitForSelector('#battle.on .card',{timeout:15000});steps.push(await snapshot(page,'full-battle-ready'));
   }return;
 }
 if(scenario==='background'){const before=await page.evaluate(()=>({ticker:__dbg.tickerStarted,saved:Terra.farm.lastSavedAt||0}));const hidden=await page.evaluate(()=>{__dbg.setPageHiddenForTest(true);return{ticker:__dbg.tickerStarted,saved:Terra.farm.lastSavedAt||0}});await page.waitForTimeout(80);const active=await page.evaluate(()=>{__dbg.setPageHiddenForTest(false);return{ticker:__dbg.tickerStarted,surface:SurfaceLifecycle.active,locked:SurfaceLifecycle.isInputLocked()}});steps.push({label:'background-handler-contract',before,hidden,active,physicalVisibilityNotEmulated:true});return;}
 if(scenario==='resize'){await page.setViewportSize({width:820,height:1180});await page.waitForTimeout(250);steps.push(await snapshot(page,'rotated'));return;}
 steps.push(await snapshot(page,'fresh-ready'));
}
function assertScenario(scenario,steps){
 const last=steps.at(-1)||{};
 const fail=message=>{throw new Error(`semantic assertion failed: ${message}`);};
 if(scenario==='plantReload'&&last.planted!==1)fail(`planted reload expected 1, got ${last.planted}`);
 if(scenario==='harvestReload'&&(last.farm?.star||0)<3)fail(`harvest reload expected starwheat >=3, got ${last.farm?.star}`);
 if(scenario==='alchemyReload'&&(last.farm?.cards||0)<1)fail(`alchemy reload expected card >=1, got ${last.farm?.cards}`);
 if(scenario==='full'&&stopAfterPlant&&(last.planted!==3||!last.tutorial?.chopped))fail('full-loop plant checkpoint did not preserve real chop + 3 planted plots');
 if(scenario==='full'&&!stopAfterPlant&&((last.farm?.cards||0)<1||last.surface!=='battle'||!last.battle?.active||last.battle?.hand<1||!last.farm?.tutorialCompleted))fail('full loop did not reach persisted card + completed tutorial + playable battle');
 if(scenario==='surfaces'&&steps.some(s=>s.label?.endsWith('-close')&&(s.surface||s.locked)))fail('surface residue remains');
 if(scenario==='map'&&(!last.hit||last.hitCount!==1||!last.renderLoop||!last.stopped))fail('map tap/drag/render-loop contract failed');
 if(scenario==='battle'&&(last.surface!=='alchemy'||!last.locked))fail('battle did not hand ownership to alchemy');
 if(scenario==='background'&&(!last.before?.ticker||last.hidden?.ticker||last.hidden?.saved<last.before?.saved||!last.active?.ticker||last.active?.surface||last.active?.locked))fail('background handler ticker/save/lifecycle contract failed');
 if(scenario==='corrupt'&&(!last.ready||!last.backup||!last.currentValid))fail('corrupt save did not recover to a playable backed-up state');
 if(scenario==='partial'&&(!last.ready||!last.normalized))fail('partial schema was not normalized');
}
(async()=>{const summaries=[];
 const indices=onlyRun?[onlyRun-1]:matrix.map((_,i)=>i);
 for(const i of indices){const[name,profile,scenario]=matrix[i],started=Date.now(),steps=[],errors=[];let browser,context,loadedScripts=[];try{browser=await chromium.launch({headless:true,executablePath:CHROME,args:['--no-sandbox','--disable-gpu','--disable-gpu-compositing',...(process.env.TERRA_CHROME_EXTRA_ARGS?process.env.TERRA_CHROME_EXTRA_ARGS.trim().split(/\s+/):[])]});context=await browser.newContext(profiles[profile]);await context.addInitScript(({scenario})=>{if(!sessionStorage.getItem('terra_test_initialized')){localStorage.clear();if(scenario==='corrupt')localStorage.setItem('terra_farm','{bad json');if(scenario==='partial')localStorage.setItem('terra_farm',JSON.stringify({ownerId:'partial',inventory:{materials:{}},tech:{}}));sessionStorage.setItem('terra_test_initialized','1');}},{scenario});const page=await context.newPage();page.on('pageerror',e=>errors.push('page:'+e.message));page.on('console',m=>{if(m.type()==='error')errors.push('console:'+m.text())});if(scenario==='slow')await page.route('**/src/main.js?v=*',async r=>{await new Promise(x=>setTimeout(x,1200));await r.continue()});const response=await page.goto(`${BASE}/?ultra=${i+1}-${Date.now()}`,{waitUntil:'domcontentloaded',timeout:60000});steps.push({label:'http',status:response?.status()});if(scenario==='corrupt'){
  await enter(page,scenario);
  steps.push(await page.evaluate(()=>{const keys=Object.keys(localStorage),raw=localStorage.getItem('terra_farm');let valid=false;try{valid=!!JSON.parse(raw)}catch{}return{label:'corrupt-result',ready:!!window.__dbg?.ready,backup:keys.some(k=>k.startsWith('terra_farm_corrupt_')),currentValid:valid}}));
  assertScenario(scenario,steps);
}else{
  await enter(page,scenario);steps.push(await snapshot(page,'entered'));await runScenario(page,scenario,steps,profile);
  if(scenario==='partial')steps.push(await page.evaluate(()=>({label:'partial-result',ready:!!window.__dbg?.ready,normalized:!!Terra.farm&&Array.isArray(Terra.farm.inventory.cards)&&Array.isArray(Terra.farm.beasts)&&Terra.farm.runtimeState?.felledTrees&&typeof Terra.farm.fieldState==='object'})));
  assertScenario(scenario,steps);
}loadedScripts=await page.evaluate(()=>[...document.scripts].map(s=>s.src).filter(src=>src.includes('/src/')));const missingScripts=Object.entries(EXPECTED).filter(([name,version])=>!loadedScripts.some(src=>src.includes(`/src/${name}?v=${version}`)));if(missingScripts.length)throw new Error(`semantic assertion failed: served script version mismatch ${JSON.stringify(missingScripts)}`);const result={run:i+1,name,profile,scenario,base:BASE,loadedScripts,status:errors.length?'failed':'passed',durationMs:Date.now()-started,steps,errors};append(result);summaries.push(result);console.log(`[${i+1}/20] ${name}: ${result.status}`);}catch(e){const result={run:i+1,name,profile,scenario,status:'failed',durationMs:Date.now()-started,steps,errors:[...errors,String(e.stack||e)]};append(result);summaries.push(result);console.log(`[${i+1}/20] ${name}: failed ${e.message}`);}finally{await context?.close().catch(()=>{});await browser?.close().catch(()=>{});await new Promise(r=>setTimeout(r,1000));}}
 const report={base:BASE,total:summaries.length,passed:summaries.filter(r=>r.status==='passed').length,failed:summaries.filter(r=>r.status==='failed').length,runs:summaries};if(!onlyRun)fs.writeFileSync(path.join(OUT,'baseline-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({total:report.total,passed:report.passed,failed:report.failed},null,2));process.exit(report.failed?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
