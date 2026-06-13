#!/usr/bin/env python3
"""冬季覆雪变体贴图生成(品红抠图,同 gen_sprites 工艺)"""
import json, base64, io, os, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

API="https://ai.input.im/v1/images/generations"; KEY="20090603_WeHaveToBeinHKU"
OUT="/root/terra-chronicle-game/assets/sprites"; RAW=OUT+"/_raw"
STYLE=("hand-painted storybook game art, soft watercolor texture with clean shapes, "
       "Studio Ghibli warmth, gentle painterly shading, masterpiece quality, no text, no watermark")
MAGENTA=("single isolated game sprite centered, displayed on a perfectly flat solid pure magenta "
         "background (#FF00FF), the magenta covers the entire background evenly, no shadow, ")
ITEMS=[
 ("tree_oak_winter","one deciduous oak tree in deep winter, branches and remaining canopy heavily "
  "covered in thick white snow, cold muted palette, top-down three-quarter game view, whole tree visible"),
 ("tree_cherry_winter","one slender cherry tree in deep winter, bare elegant dark branches dusted "
  "with snow, a few frozen pink buds, top-down three-quarter game view, whole tree visible"),
 ("bush_winter","one round leafy bush in winter completely capped with thick snow, hints of dark "
  "green underneath, top-down three-quarter game view"),
 ("house_winter","one cozy small farmhouse in winter, white plaster walls with timber frame, "
  "terracotta roof covered in thick snow, glowing warm windows, icicles on eaves, chimney with smoke, "
  "top-down three-quarter game view, whole building visible"),
]
def call_api(prompt,tries=3):
    body=json.dumps({"model":"gpt-image-2","prompt":prompt,"size":"1024x1024","n":1}).encode()
    for i in range(tries):
        try:
            req=urllib.request.Request(API,data=body,headers={"Authorization":"Bearer "+KEY,"Content-Type":"application/json"})
            with urllib.request.urlopen(req,timeout=420) as r: d=json.load(r)
            return base64.b64decode(d["data"][0]["b64_json"])
        except Exception as e:
            print("  retry",i+1,e,flush=True); time.sleep(8)
    raise RuntimeError("api failed")
def key_trim(name,raw,thr=95):
    open(f"{RAW}/{name}.png","wb").write(raw)
    im=Image.open(io.BytesIO(raw)).convert("RGBA"); px=im.load(); w,h=im.size
    cs=[px[3,3],px[w-4,3],px[3,h-4],px[w-4,h-4]]
    br=sum(c[0] for c in cs)//4; bg=sum(c[1] for c in cs)//4; bb=sum(c[2] for c in cs)//4
    for y in range(h):
        for x in range(w):
            r,g,b,a=px[x,y]
            if (r-br)**2+(g-bg)**2+(b-bb)**2<thr*thr: px[x,y]=(0,0,0,0)
            elif r>g+40 and b>g+40:
                m=min(r,b); px[x,y]=(min(r,m+(r-m)//2),g,min(b,m+(b-m)//2),a)
    im=im.crop(im.getbbox())
    out=Image.new("RGBA",(im.width+16,im.height+16),(0,0,0,0)); out.paste(im,(8,8))
    if max(out.size)>512:
        s=512/max(out.size); out=out.resize((int(out.width*s),int(out.height*s)),Image.LANCZOS)
    out.save(f"{OUT}/{name}.png"); print("OK",name,out.size,flush=True)
def run(item):
    name,desc=item; key_trim(name,call_api(MAGENTA+desc+", "+STYLE))
with ThreadPoolExecutor(max_workers=4) as ex:
    for f in [ex.submit(run,i) for i in ITEMS]: f.result()
print("WINTER_DONE",flush=True)
