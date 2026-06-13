#!/usr/bin/env python3
"""英雄资产高质量重生: gpt-image-2 quality=high(此代理实测最大 ~1254²),
   品红色键 + 1px alpha 腐蚀去毛边 + 去品红溢色, 无损 PNG-32, 长边上限 512。
   同步写入 live 与 _src512。"""
import json, base64, io, os, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageFilter
API="https://ai.input.im/v1/images/generations"; KEY="20090603_WeHaveToBeinHKU"
OUT="/root/terra-chronicle-game/assets/sprites"; SRC=OUT+"/_src512"; RAW=OUT+"/_raw"
os.makedirs(SRC,exist_ok=True); os.makedirs(RAW,exist_ok=True)
STYLE=("hand-painted storybook game art, crisp clean confident brushwork, high detail, "
       "Studio Ghibli warmth, soft volumetric light, masterpiece quality, sharp focus, "
       "no text, no watermark, no border, no frame")
MAGENTA=("a single isolated game asset perfectly centered, on a 100% flat uniform pure magenta "
         "background (RGB 255,0,255) filling the entire frame, the subject does NOT touch the "
         "edges, no drop shadow on the background, ")
HEROES=[
 ("player_idle","an adorable young farmer hero standing front three-quarter view, wearing a wide "
  "woven straw hat, a cream linen tunic with rolled sleeves, sturdy trousers and boots, a wooden "
  "harvest backpack/basket on the back, friendly face, charming hand-painted RPG character, full body"),
 ("tree_oak","one lush green deciduous oak tree, full rounded layered canopy, thick sturdy trunk, "
  "gentle painterly leaf detail, three-quarter top-down RPG game view, whole tree in frame"),
 ("tree_cherry","one elegant blooming cherry blossom tree, abundant soft pink petals, graceful dark "
  "trunk and branches, three-quarter top-down RPG game view, whole tree in frame"),
 ("rock","one weathered grey granite boulder with moss patches and subtle cracks, soft rounded form, "
  "three-quarter top-down RPG game view"),
]
def call_api(prompt,tries=3):
    body=json.dumps({"model":"gpt-image-2","prompt":prompt,"size":"1024x1024","quality":"high","n":1}).encode()
    for i in range(tries):
        try:
            req=urllib.request.Request(API,data=body,headers={"Authorization":"Bearer "+KEY,"Content-Type":"application/json"})
            with urllib.request.urlopen(req,timeout=460) as r: d=json.load(r)
            return base64.b64decode(d["data"][0]["b64_json"])
        except Exception as e:
            print("  retry",i+1,e,flush=True); time.sleep(8)
    raise RuntimeError("api failed")
def process(name,raw):
    open(f"{RAW}/{name}_hi.png","wb").write(raw)
    im=Image.open(io.BytesIO(raw)).convert("RGBA"); px=im.load(); w,h=im.size
    cs=[px[3,3],px[w-4,3],px[3,h-4],px[w-4,h-4]]
    br=sum(c[0] for c in cs)//4; bg=sum(c[1] for c in cs)//4; bb=sum(c[2] for c in cs)//4
    thr=100
    for y in range(h):
        for x in range(w):
            r,g,b,a=px[x,y]
            if (r-br)**2+(g-bg)**2+(b-bb)**2<thr*thr: px[x,y]=(0,0,0,0)
            elif r>g+35 and b>g+35:                       # 去品红溢色
                m=min(r,b); px[x,y]=(min(r,m+(r-m)//2),g,min(b,m+(b-m)//2),a)
    # 1px alpha 腐蚀: 吃掉残留半透明毛边
    al=im.getchannel("A").filter(ImageFilter.MinFilter(3))
    im.putalpha(al)
    im=im.crop(im.getbbox())
    pad=Image.new("RGBA",(im.width+12,im.height+12),(0,0,0,0)); pad.paste(im,(6,6))
    if max(pad.size)>512:
        s=512/max(pad.size); pad=pad.resize((round(pad.width*s),round(pad.height*s)),Image.LANCZOS)
    pad.save(f"{OUT}/{name}.png"); pad.save(f"{SRC}/{name}.png")
    print("OK",name,pad.size,flush=True)
def run(item): process(item[0],call_api(MAGENTA+item[1]+", "+STYLE))
with ThreadPoolExecutor(max_workers=4) as ex:
    for f in [ex.submit(run,i) for i in HEROES]: f.result()
print("HEROES_DONE",flush=True)
