#!/usr/bin/env python3
"""视觉统一重生成: 战斗背景/怪物/头像/六边形地块 — 全部焊死吉卜力锚点"""
import json, base64, io, os, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageFilter
from visual_style_contract import API_BASE, API_URL, STYLE_ANCHOR, anchored, require_api_key
API=API_URL; KEY=require_api_key()
ROOT="/root/terra-chronicle-game"
ANCHOR=("MUST STRICTLY USE: Studio Ghibli art style, Legend of Zelda Breath of the Wild style, "
 "bright and warm pastel colors, cute and stylized flat shading. "
 "ABSOLUTELY NO dark fantasy, NO photorealism, NO horror elements, no text, no watermark.")
MAG=("single isolated game sprite centered on a perfectly flat solid pure magenta background (#FF00FF), "
 "the magenta covers the entire background evenly, no shadow cast on the background, ")
def call(prompt,size="1024x1024",tries=3):
    body=json.dumps({"model":"gpt-image-2","prompt":anchored(prompt),"size":size,"quality":"high","n":1}).encode()
    for i in range(tries):
        try:
            req=urllib.request.Request(API,data=body,headers={"Authorization":"Bearer "+KEY,"Content-Type":"application/json"})
            with urllib.request.urlopen(req,timeout=460) as r: d=json.load(r)
            return base64.b64decode(d["data"][0]["b64_json"])
        except Exception as e:
            print(f"retry {i+1}: {e}",flush=True); time.sleep(8)
    raise RuntimeError("api failed")
def chroma(im,thr=100):
    im=im.convert("RGBA");px=im.load();w,h=im.size
    cs=[px[3,3],px[w-4,3],px[3,h-4],px[w-4,h-4]]
    br=sum(c[0] for c in cs)//4;bg=sum(c[1] for c in cs)//4;bb=sum(c[2] for c in cs)//4
    for y in range(h):
        for x in range(w):
            r,g,b,a=px[x,y]
            if (r-br)**2+(g-bg)**2+(b-bb)**2<thr*thr: px[x,y]=(0,0,0,0)
            elif r>g+35 and b>g+35:
                m=min(r,b);px[x,y]=(min(r,m+(r-m)//2),g,min(b,m+(b-m)//2),a)
    im.putalpha(im.getchannel("A").filter(ImageFilter.MinFilter(3)))
    return im
def sprite(name,desc,out,mx=760):
    raw=call(MAG+desc+", "+ANCHOR)
    im=chroma(Image.open(io.BytesIO(raw)))
    bbox=im.getbbox()
    if bbox: im=im.crop(bbox)
    if max(im.size)>mx:
        s=mx/max(im.size);im=im.resize((int(im.width*s),int(im.height*s)),Image.LANCZOS)
    im.save(out);print("OK",name,im.size,flush=True)
def flat(name,desc,out,sz=None,jpg=False):
    raw=call(desc+", "+ANCHOR)
    im=Image.open(io.BytesIO(raw)).convert("RGB")
    if sz: im=im.resize(sz,Image.LANCZOS)
    im.save(out,quality=90) if jpg else im.save(out)
    print("OK",name,flush=True)
JOBS=[
 lambda: flat("battle_bg","serene glowing enchanted forest clearing dotted with ancient magical stone ruins, "
   "mossy arches with softly glowing cyan runes, warm god rays through the canopy, floating fireflies and petals, "
   "wide game battle background, peaceful yet mysterious",f"{ROOT}/assets/ui/battle_bg.jpg",None,True),
 lambda: sprite("enemy_root_worm","one giant berserk treant forest spirit wrapped in wisps of dark mist, "
   "a huge cute-but-dangerous tree creature with big expressive angry eyes, leafy branch arms raised, bark body, "
   "front battle view, full body visible",f"{ROOT}/assets/sprites/enemy_root_worm.png"),
 lambda: sprite("enemy_blight","one corrupted blossom spirit monster, cute but menacing oversized flower creature "
   "with a mischievous grin, faint dark haze curling around its petals, front battle view, full body visible",
   f"{ROOT}/assets/sprites/enemy_blight.png"),
]
for i,role in enumerate(["kind old farmer man with straw hat and grey beard",
 "young adventurer girl with red scarf and braided hair",
 "sturdy shepherd boy with freckles and wool cape",
 "gentle herbalist woman with flower crown and green hood"]):
    JOBS.append(lambda r=role,i=i: flat(f"avatar_{i+1}",
     "hand-drawn circular portrait bust of a medieval fantasy "+r+
     ", storybook illustration, warm parchment-toned background, game avatar icon",
     f"{ROOT}/assets/ui/avatar_{i+1}.png",(256,256)))
for b,d in [("forest","dense lush green forest canopy with tiny treetops, top-down view"),
 ("plains","rolling green grass meadow with tiny wildflowers, top-down view"),
 ("mountain","rocky grey-blue mountain peaks with snow caps, top-down view"),
 ("water","clear teal sea water with gentle painted waves, top-down view"),
 ("desert","warm golden sand dunes with soft ripples, top-down view")]:
    JOBS.append(lambda b=b,d=d: flat(f"hex_{b}",
     "seamless square hand-painted game terrain texture, "+d+", soft storybook watercolor",
     f"{ROOT}/assets/ui/hex_{b}.png",(256,256)))
with ThreadPoolExecutor(max_workers=4) as ex:
    for f in [ex.submit(j) for j in JOBS]:
        try: f.result()
        except Exception as e: print("FAIL:",e,flush=True)
print("ALL_VISUAL_UNIFY_DONE",flush=True)
