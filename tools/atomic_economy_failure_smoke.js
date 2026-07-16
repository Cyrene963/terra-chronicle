const fs=require('fs');
const path=require('path');
const{chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const CHROME=process.env.TERRA_CHROMIUM_PATH;
const BASE=process.env.TERRA_PUBLIC_BASE_URL||'http://127.0.0.1:8871';
const args=['--no-sandbox','--disable-gpu','--disable-gpu-compositing'];
async function enter(page){await page.click('#enter');await page.waitForFunction(()=>window.__dbg?.ready,null,{timeout:60000});}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:CHROME,args});
 const errors=[];
 const chopContext=await browser.newContext({viewport:{width:360,height:740},isMobile:true,hasTouch:true});
 await chopContext.addInitScript(()=>localStorage.clear());
 const chopPage=await chopContext.newPage();chopPage.on('pageerror',e=>errors.push(e.message));
 await chopPage.goto(`${BASE}/?atomic-chop=${Date.now()}`,{waitUntil:'domcontentloaded'});await enter(chopPage);
 const tree=await chopPage.evaluate(()=>{const o=__dbg.objects.find(x=>x.tutorial&&x.kind==='tree');return __dbg.worldToClient(o.node.x,o.node.y-ASSETS.tree.h*.35)});
 await chopPage.evaluate(()=>{Terra.save=()=>false});
 await chopPage.touchscreen.tap(tree.x,tree.y);
 await chopPage.waitForTimeout(6000);
 const chop=await chopPage.evaluate(()=>{const o=__dbg.objects.find(x=>x.tutorial&&x.kind==='tree');return{wood:Terra.farm.inventory.materials.wood||0,stamina:Terra.farm.runtimeState.staminaUsed||0,felled:o.felled,visible:o.node.visible,keys:Object.keys(Terra.farm.runtimeState.felledTrees||{})}});
 const plantPoint=await chopPage.evaluate(()=>__dbg.worldToClient(22*64+32,29*64+32));
 await chopPage.touchscreen.tap(plantPoint.x,plantPoint.y);await chopPage.waitForTimeout(4000);
 const plant=await chopPage.evaluate(()=>({planted:__dbg.plantedCount,stamina:Terra.farm.runtimeState.staminaUsed||0,fieldKeys:Object.keys(Terra.farm.fieldState||{})}));
 await chopContext.close();

 const fixture=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/fixtures/ultra/run-15-plant.json')));
 const farm=JSON.parse(fixture.data);for(const state of Object.values(farm.fieldState)) {state.grown=999;state.mature=true;}fixture.data=JSON.stringify(farm);
 const harvestContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await harvestContext.addInitScript(data=>localStorage.setItem('terra_farm',data),fixture.data);
 const harvestPage=await harvestContext.newPage();harvestPage.on('pageerror',e=>errors.push(e.message));
 await harvestPage.goto(`${BASE}/?atomic-harvest=${Date.now()}`,{waitUntil:'domcontentloaded'});await enter(harvestPage);
 await harvestPage.evaluate(()=>{Terra.save=()=>false});
 const plot=await harvestPage.evaluate(()=>__dbg.worldToClient(22*64+32,29*64+32));
 await harvestPage.touchscreen.tap(plot.x,plot.y);await harvestPage.waitForTimeout(4000);
 const harvest=await harvestPage.evaluate(()=>({star:(Terra.farm.inventory.crops.starwheat||[]).length,planted:__dbg.plantedCount,field:!!Terra.farm.fieldState?.['22,29'],mature:!!Terra.farm.fieldState?.['22,29']?.mature}));
 await harvestContext.close();await browser.close();
 const ok=!errors.length&&chop.wood===0&&chop.stamina===0&&!chop.felled&&chop.visible&&chop.keys.length===0&&plant.planted===0&&plant.stamina===0&&plant.fieldKeys.length===0&&harvest.star===0&&harvest.planted===3&&harvest.field&&harvest.mature;
 console.log(JSON.stringify({testClass:'real-input-failure-injection',ok,chop,plant,harvest,errors},null,2));if(!ok)process.exit(1);
})().catch(e=>{console.error(e.stack);process.exit(1)});
