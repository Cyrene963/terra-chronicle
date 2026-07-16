#!/usr/bin/env python3
import json, os, subprocess, time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BATCH=os.environ.get('TERRA_BATCH_ID',time.strftime('%Y%m%dT%H%M%SZ',time.gmtime()))
OUT=ROOT/'dogfood-output'/'ultra-regression-20'/BATCH
OUT.mkdir(parents=True,exist_ok=True)
BASE=os.environ.get('TERRA_PUBLIC_BASE_URL','http://127.0.0.1:8871')
CHROME=os.environ.get('TERRA_CHROMIUM_PATH','/root/.cloakbrowser/chromium-146.0.7680.177.5/chrome')
MIN_MEM=int(os.environ.get('TERRA_MIN_MEM_MB','700'))
MIN_SWAP=int(os.environ.get('TERRA_MIN_SWAP_MB','128'))
scenarios=[
 ('entry-mobile',['node','tools/entry_responsiveness_smoke.js'],{'TERRA_ENTRY_DEVICE':'mobile'}),
 ('tutorial-tree-plot',['node','tools/tutorial_tree_plot_probe.js'],{}),
 ('slow-main',['node','tools/ultra_new_player_20run.js'],{'TERRA_RUN_INDEX':'6'}),
 ('double-enter',['node','tools/ultra_new_player_20run.js'],{'TERRA_RUN_INDEX':'7'}),
 ('rapid-surfaces',['node','tools/ultra_new_player_20run.js'],{'TERRA_RUN_INDEX':'8'}),
 ('map-touch-drag',['node','tools/ultra_new_player_20run.js'],{'TERRA_RUN_INDEX':'9'}),
 ('battle-switch',['node','tools/ultra_new_player_20run.js'],{'TERRA_RUN_INDEX':'10'}),
 ('full-new-player-iphone',['python3','tools/full_new_player_checkpoint_flow.py'],{}),
 ('atomic-economy-save-failure',['python3','tools/atomic_failure_suite.py'],{}),
 ('plant-reload',['node','tools/ultra_new_player_20run.js'],{'TERRA_RUN_INDEX':'13'}),
 ('corrupt-json',['node','tools/ultra_new_player_20run.js'],{'TERRA_RUN_INDEX':'16'}),
 ('partial-schema',['node','tools/ultra_new_player_20run.js'],{'TERRA_RUN_INDEX':'17'}),
 ('background-resume',['node','tools/ultra_new_player_20run.js'],{'TERRA_RUN_INDEX':'18'}),
 ('resize-rotate',['node','tools/ultra_new_player_20run.js'],{'TERRA_RUN_INDEX':'19'}),
 ('coordinate-roundtrip',['node','tools/coordinate_roundtrip_smoke.js'],{}),
 ('alchemy-transaction',['node','tools/alchemy_transaction_smoke.js'],{}),
 ('reward-routing',['node','tools/reward_routing_smoke.js'],{}),
 ('checkpoint-harvest',['node','tools/checkpoint_harvest_smoke.js'],{}),
 ('checkpoint-alchemy',['node','tools/checkpoint_alchemy_smoke.js'],{}),
 ('portal-dungeon-battle',['node','tools/portal_dungeon_route_smoke.js'],{}),
]
def memory_state_mb():
 data={}
 for line in Path('/proc/meminfo').read_text().splitlines():
  k,v,*_=line.replace(':','').split();data[k]=int(v)
 return data.get('MemAvailable',0)//1024,data.get('SwapFree',0)//1024
def test_class(name):
 if name.startswith('checkpoint-') or name in {'full-new-player-iphone','portal-dungeon-battle'}: return 'checkpoint-resume-smoke'
 if name in {'rapid-surfaces','battle-switch','coordinate-roundtrip','alchemy-transaction','reward-routing'}: return 'api-transaction-smoke'
 return 'real-input-e2e'
def has_success_evidence(cmd,output):
 script=cmd[-1]
 compact=' '.join(output.split())
 if script.endswith('ultra_new_player_20run.js'):
  return '"total": 1' in compact and '"passed": 1' in compact and '"failed": 0' in compact
 return '"ok": true' in compact
records=[]
for i,(name,cmd,extra) in enumerate(scenarios,1):
 env={**os.environ,**extra,'TERRA_PUBLIC_BASE_URL':BASE,'TERRA_CHROMIUM_PATH':CHROME,'TERRA_BATCH_ID':BATCH}
 attempts=[]
 status='infrastructure_failed';failure='no_attempt_executed';output=''
 for attempt in range(1,3):
  waited=0
  mem_avail,swap_free=memory_state_mb()
  while (mem_avail<MIN_MEM or swap_free<MIN_SWAP) and waited<180:
   time.sleep(10);waited+=10;mem_avail,swap_free=memory_state_mb()
  started=time.time();output=''
  if mem_avail<MIN_MEM or swap_free<MIN_SWAP:
   status='infrastructure_failed';failure='memory_window_unavailable';return_code=None
  else:
   try:
    timeout=300 if cmd[-1].endswith(('full_new_player_checkpoint_flow.py','atomic_failure_suite.py')) else 150
    p=subprocess.run(cmd,cwd=ROOT,env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=timeout)
    return_code=p.returncode;output=p.stdout[-12000:]
    infra_markers=('Target page, context or browser has been closed','zygote_communication','shared_memory_switch','resource allocation failed')
    if p.returncode==0 and has_success_evidence(cmd,output): status='passed';failure=None
    elif p.returncode==0:status='failed';failure='worker_exit_0_without_success_evidence'
    elif p.returncode in (-15,143):status='infrastructure_failed';failure='sigterm'
    elif any(marker in output for marker in infra_markers) and 'semantic assertion failed' not in output:status='infrastructure_failed';failure='browser_resource_exit'
    else:status='failed';failure=f'worker_exit_{p.returncode}'
   except subprocess.TimeoutExpired as exc:
    raw=exc.stdout or '';output=raw if isinstance(raw,str) else raw.decode(errors='replace');status='infrastructure_failed';failure='timeout';return_code=None
  attempts.append({'attempt':attempt,'status':status,'failureClass':failure,'returnCode':return_code,'durationMs':round((time.time()-started)*1000),'memAvailableMbBefore':mem_avail,'swapFreeMbBefore':swap_free,'waitedForMemorySec':waited,'outputTail':output[-12000:]})
  if status!='infrastructure_failed' or attempt==2:break
  print(f'[{i}/20] {name}: infrastructure_failed attempt {attempt}; retrying',flush=True);time.sleep(10)
 rec={'run':i,'name':name,'testClass':test_class(name),'status':status,'failureClass':failure,'durationMs':sum(a['durationMs'] for a in attempts),'memAvailableMbBefore':attempts[-1]['memAvailableMbBefore'],'swapFreeMbBefore':attempts[-1]['swapFreeMbBefore'],'waitedForMemorySec':sum(a['waitedForMemorySec'] for a in attempts),'command':' '.join(cmd),'attempts':attempts,'outputTail':output[-12000:]}
 records.append(rec);(OUT/f'run-{i:02d}.json').write_text(json.dumps(rec,ensure_ascii=False,indent=2)+'\n')
 print(f'[{i}/20] {name}: {status}',flush=True);time.sleep(3)
report={'batchId':BATCH,'base':BASE,'total':20,'classCounts':{kind:sum(r['testClass']==kind for r in records) for kind in ('real-input-e2e','api-transaction-smoke','checkpoint-resume-smoke')},'passed':sum(r['status']=='passed' for r in records),'productFailed':sum(r['status']=='failed' for r in records),'infrastructureFailed':sum(r['status']=='infrastructure_failed' for r in records),'runs':records}
(OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:report[k] for k in ('total','passed','productFailed','infrastructureFailed')},ensure_ascii=False))
raise SystemExit(0 if report['passed']==report['total'] and report['productFailed']==0 and report['infrastructureFailed']==0 else 1)
